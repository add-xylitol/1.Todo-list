const { Task, Category, User } = require('../models');
const { taskSchemas, validate, customValidators } = require('../utils/validation');
const { BusinessError, ValidationError, NotFoundError, PermissionError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// 创建任务
const createTask = asyncHandler(async (req, res) => {
  const validatedData = validate(taskSchemas.create, req.body);
  const userId = req.user.id;
  
  // 检查任务数量限制
  await customValidators.validateTaskLimit(userId);
  
  // 如果指定了分类，验证分类所有权
  if (validatedData.categoryId) {
    await customValidators.validateCategoryOwnership(validatedData.categoryId, userId);
  }
  
  // 创建任务
  const task = await Task.create({
    ...validatedData,
    userId,
    status: validatedData.status || 'pending'
  });
  
  // 更新用户任务创建统计
  await User.increment('tasksCreated', { where: { id: userId } });
  
  // 获取完整任务信息（包含分类）
  const fullTask = await Task.findByPk(task.id, {
    include: [{
      model: Category,
      as: 'category',
      attributes: ['id', 'name', 'color', 'icon']
    }]
  });
  
  // 记录任务创建日志
  logger.info('任务创建成功', {
    userId,
    taskId: task.id,
    title: task.title,
    categoryId: task.categoryId,
    priority: task.priority,
    ip: req.ip
  });
  
  res.status(201).json({
    success: true,
    message: '任务创建成功',
    data: {
      task: fullTask
    }
  });
});

// 获取任务列表
const getTasks = asyncHandler(async (req, res) => {
  const validatedQuery = validate(taskSchemas.search, req.query);
  const userId = req.user.id;
  
  const {
    q, status, priority, categoryId, tags, dueDateFrom, dueDateTo,
    createdFrom, createdTo, page, limit, sortBy, sortOrder
  } = validatedQuery;
  
  // 构建查询条件
  const where = {
    userId,
    isArchived: false
  };
  
  // 文本搜索
  if (q) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${q}%` } },
      { description: { [Op.iLike]: `%${q}%` } }
    ];
  }
  
  // 状态筛选
  if (status) {
    where.status = Array.isArray(status) ? { [Op.in]: status } : status;
  }
  
  // 优先级筛选
  if (priority) {
    where.priority = Array.isArray(priority) ? { [Op.in]: priority } : priority;
  }
  
  // 分类筛选
  if (categoryId) {
    where.categoryId = Array.isArray(categoryId) ? { [Op.in]: categoryId } : categoryId;
  }
  
  // 标签筛选
  if (tags) {
    const tagArray = Array.isArray(tags) ? tags : [tags];
    where.tags = { [Op.overlap]: tagArray };
  }
  
  // 截止日期筛选
  if (dueDateFrom || dueDateTo) {
    where.dueDate = {};
    if (dueDateFrom) where.dueDate[Op.gte] = new Date(dueDateFrom);
    if (dueDateTo) where.dueDate[Op.lte] = new Date(dueDateTo);
  }
  
  // 创建日期筛选
  if (createdFrom || createdTo) {
    where.createdAt = {};
    if (createdFrom) where.createdAt[Op.gte] = new Date(createdFrom);
    if (createdTo) where.createdAt[Op.lte] = new Date(createdTo);
  }
  
  // 分页计算
  const offset = (page - 1) * limit;
  
  // 排序
  const order = [[sortBy, sortOrder.toUpperCase()]];
  
  // 查询任务
  const { count, rows: tasks } = await Task.findAndCountAll({
    where,
    include: [{
      model: Category,
      as: 'category',
      attributes: ['id', 'name', 'color', 'icon']
    }],
    order,
    limit,
    offset
  });
  
  // 计算分页信息
  const totalPages = Math.ceil(count / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  res.json({
    success: true,
    data: {
      tasks,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage
      },
      filters: {
        q, status, priority, categoryId, tags,
        dueDateFrom, dueDateTo, createdFrom, createdTo
      }
    }
  });
});

// 获取单个任务
const getTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const task = await Task.findOne({
    where: { id, userId },
    include: [{
      model: Category,
      as: 'category',
      attributes: ['id', 'name', 'color', 'icon']
    }]
  });
  
  if (!task) {
    throw new NotFoundError('任务不存在', 'TASK_NOT_FOUND');
  }
  
  res.json({
    success: true,
    data: {
      task
    }
  });
});

// 更新任务
const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const validatedData = validate(taskSchemas.update, req.body);
  const userId = req.user.id;
  
  // 验证任务所有权
  const task = await customValidators.validateTaskOwnership(id, userId);
  
  // 如果更新分类，验证分类所有权
  if (validatedData.categoryId) {
    await customValidators.validateCategoryOwnership(validatedData.categoryId, userId);
  }
  
  // 处理状态变更
  const oldStatus = task.status;
  const newStatus = validatedData.status;
  
  if (newStatus && newStatus !== oldStatus) {
    if (newStatus === 'completed' && oldStatus !== 'completed') {
      // 任务完成
      validatedData.completedAt = new Date();
      // 更新用户完成任务统计
      await User.increment('tasksCompleted', { where: { id: userId } });
    } else if (oldStatus === 'completed' && newStatus !== 'completed') {
      // 取消完成
      validatedData.completedAt = null;
      // 减少用户完成任务统计
      await User.decrement('tasksCompleted', { where: { id: userId } });
    }
  }
  
  // 更新任务
  await task.update(validatedData);
  
  // 获取更新后的完整任务信息
  const updatedTask = await Task.findByPk(task.id, {
    include: [{
      model: Category,
      as: 'category',
      attributes: ['id', 'name', 'color', 'icon']
    }]
  });
  
  // 记录任务更新日志
  logger.info('任务更新成功', {
    userId,
    taskId: task.id,
    updatedFields: Object.keys(validatedData),
    statusChange: oldStatus !== newStatus ? `${oldStatus} -> ${newStatus}` : null,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '任务更新成功',
    data: {
      task: updatedTask
    }
  });
});

// 批量更新任务
const bulkUpdateTasks = asyncHandler(async (req, res) => {
  const validatedData = validate(taskSchemas.bulkUpdate, req.body);
  const { taskIds, updates } = validatedData;
  const userId = req.user.id;
  
  // 验证所有任务的所有权
  const tasks = await Task.findAll({
    where: {
      id: { [Op.in]: taskIds },
      userId
    }
  });
  
  if (tasks.length !== taskIds.length) {
    throw new PermissionError('部分任务不存在或无权访问', 'INVALID_TASK_ACCESS');
  }
  
  // 如果更新分类，验证分类所有权
  if (updates.categoryId) {
    await customValidators.validateCategoryOwnership(updates.categoryId, userId);
  }
  
  // 处理状态变更统计
  let completedCountChange = 0;
  if (updates.status) {
    for (const task of tasks) {
      if (updates.status === 'completed' && task.status !== 'completed') {
        completedCountChange++;
      } else if (task.status === 'completed' && updates.status !== 'completed') {
        completedCountChange--;
      }
    }
    
    // 如果状态变为完成，设置完成时间
    if (updates.status === 'completed') {
      updates.completedAt = new Date();
    } else if (updates.status !== 'completed') {
      updates.completedAt = null;
    }
  }
  
  // 批量更新任务
  await Task.update(updates, {
    where: {
      id: { [Op.in]: taskIds },
      userId
    }
  });
  
  // 更新用户完成任务统计
  if (completedCountChange !== 0) {
    if (completedCountChange > 0) {
      await User.increment('tasksCompleted', { by: completedCountChange, where: { id: userId } });
    } else {
      await User.decrement('tasksCompleted', { by: Math.abs(completedCountChange), where: { id: userId } });
    }
  }
  
  // 记录批量更新日志
  logger.info('任务批量更新成功', {
    userId,
    taskIds,
    updatedFields: Object.keys(updates),
    taskCount: taskIds.length,
    completedCountChange,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: `成功更新 ${taskIds.length} 个任务`,
    data: {
      updatedCount: taskIds.length,
      updates
    }
  });
});

// 删除任务
const deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  // 验证任务所有权
  const task = await customValidators.validateTaskOwnership(id, userId);
  
  // 如果任务已完成，减少完成统计
  if (task.status === 'completed') {
    await User.decrement('tasksCompleted', { where: { id: userId } });
  }
  
  // 软删除任务（归档）
  await task.update({
    isArchived: true,
    archivedAt: new Date()
  });
  
  // 记录任务删除日志
  logger.info('任务删除成功', {
    userId,
    taskId: task.id,
    title: task.title,
    wasCompleted: task.status === 'completed',
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '任务删除成功'
  });
});

// 批量删除任务
const bulkDeleteTasks = asyncHandler(async (req, res) => {
  const { taskIds } = req.body;
  const userId = req.user.id;
  
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    throw new ValidationError('任务ID列表不能为空', 'taskIds', 'MISSING_TASK_IDS');
  }
  
  if (taskIds.length > 100) {
    throw new ValidationError('一次最多只能删除100个任务', 'taskIds', 'TOO_MANY_TASKS');
  }
  
  // 验证所有任务的所有权
  const tasks = await Task.findAll({
    where: {
      id: { [Op.in]: taskIds },
      userId,
      isArchived: false
    }
  });
  
  if (tasks.length === 0) {
    throw new NotFoundError('没有找到可删除的任务', 'NO_TASKS_FOUND');
  }
  
  // 计算已完成任务数量
  const completedTasksCount = tasks.filter(task => task.status === 'completed').length;
  
  // 批量归档任务
  await Task.update(
    {
      isArchived: true,
      archivedAt: new Date()
    },
    {
      where: {
        id: { [Op.in]: tasks.map(task => task.id) },
        userId
      }
    }
  );
  
  // 更新用户完成任务统计
  if (completedTasksCount > 0) {
    await User.decrement('tasksCompleted', { by: completedTasksCount, where: { id: userId } });
  }
  
  // 记录批量删除日志
  logger.info('任务批量删除成功', {
    userId,
    taskIds: tasks.map(task => task.id),
    deletedCount: tasks.length,
    completedTasksCount,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: `成功删除 ${tasks.length} 个任务`,
    data: {
      deletedCount: tasks.length
    }
  });
});

// 恢复已删除的任务
const restoreTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const task = await Task.findOne({
    where: {
      id,
      userId,
      isArchived: true
    }
  });
  
  if (!task) {
    throw new NotFoundError('已删除的任务不存在', 'ARCHIVED_TASK_NOT_FOUND');
  }
  
  // 检查任务数量限制
  await customValidators.validateTaskLimit(userId);
  
  // 恢复任务
  await task.update({
    isArchived: false,
    archivedAt: null
  });
  
  // 如果任务已完成，增加完成统计
  if (task.status === 'completed') {
    await User.increment('tasksCompleted', { where: { id: userId } });
  }
  
  // 记录任务恢复日志
  logger.info('任务恢复成功', {
    userId,
    taskId: task.id,
    title: task.title,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '任务恢复成功',
    data: {
      task
    }
  });
});

// 获取已删除的任务列表
const getArchivedTasks = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20 } = req.query;
  
  const offset = (page - 1) * limit;
  
  const { count, rows: tasks } = await Task.findAndCountAll({
    where: {
      userId,
      isArchived: true
    },
    include: [{
      model: Category,
      as: 'category',
      attributes: ['id', 'name', 'color', 'icon']
    }],
    order: [['archivedAt', 'DESC']],
    limit: parseInt(limit),
    offset
  });
  
  const totalPages = Math.ceil(count / limit);
  
  res.json({
    success: true,
    data: {
      tasks,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  });
});

// 永久删除任务
const permanentDeleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const task = await Task.findOne({
    where: {
      id,
      userId,
      isArchived: true
    }
  });
  
  if (!task) {
    throw new NotFoundError('已删除的任务不存在', 'ARCHIVED_TASK_NOT_FOUND');
  }
  
  // 永久删除任务
  await task.destroy();
  
  // 记录永久删除日志
  logger.info('任务永久删除', {
    userId,
    taskId: task.id,
    title: task.title,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '任务已永久删除'
  });
});

// 获取任务统计信息
const getTaskStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  // 获取基本统计
  const [totalTasks, completedTasks, pendingTasks, inProgressTasks, overdueTasks] = await Promise.all([
    Task.count({ where: { userId, isArchived: false } }),
    Task.count({ where: { userId, status: 'completed', isArchived: false } }),
    Task.count({ where: { userId, status: 'pending', isArchived: false } }),
    Task.count({ where: { userId, status: 'in_progress', isArchived: false } }),
    Task.count({ 
      where: { 
        userId, 
        status: { [Op.ne]: 'completed' },
        dueDate: { [Op.lt]: new Date() },
        isArchived: false 
      } 
    })
  ]);
  
  // 获取今日任务统计
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const [todayTasks, todayCompleted] = await Promise.all([
    Task.count({ 
      where: { 
        userId, 
        dueDate: { [Op.gte]: today, [Op.lt]: tomorrow },
        isArchived: false 
      } 
    }),
    Task.count({ 
      where: { 
        userId, 
        dueDate: { [Op.gte]: today, [Op.lt]: tomorrow },
        status: 'completed',
        isArchived: false 
      } 
    })
  ]);
  
  // 获取本周任务统计
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  
  const [weekTasks, weekCompleted] = await Promise.all([
    Task.count({ 
      where: { 
        userId, 
        dueDate: { [Op.gte]: weekStart, [Op.lt]: weekEnd },
        isArchived: false 
      } 
    }),
    Task.count({ 
      where: { 
        userId, 
        dueDate: { [Op.gte]: weekStart, [Op.lt]: weekEnd },
        status: 'completed',
        isArchived: false 
      } 
    })
  ]);
  
  res.json({
    success: true,
    data: {
      overview: {
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        overdueTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      },
      today: {
        totalTasks: todayTasks,
        completedTasks: todayCompleted,
        completionRate: todayTasks > 0 ? Math.round((todayCompleted / todayTasks) * 100) : 0
      },
      thisWeek: {
        totalTasks: weekTasks,
        completedTasks: weekCompleted,
        completionRate: weekTasks > 0 ? Math.round((weekCompleted / weekTasks) * 100) : 0
      }
    }
  });
});

// 标记任务为完成
const markTaskComplete = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  
  const task = await Task.findOne({
    where: { id: taskId, userId }
  });
  
  if (!task) {
    throw new NotFoundError('任务不存在');
  }
  
  if (task.status === 'completed') {
    return res.json({
      success: true,
      message: '任务已经是完成状态',
      data: task
    });
  }
  
  // 更新任务状态
  await task.update({
    status: 'completed',
    completedAt: new Date()
  });
  
  // 更新用户完成任务统计
  await User.increment('tasksCompleted', { where: { id: userId } });
  
  logger.info('任务标记为完成', {
    userId,
    taskId,
    title: task.title,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '任务已标记为完成',
    data: task
  });
});

// 标记任务为未完成
const markTaskIncomplete = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  
  const task = await Task.findOne({
    where: { id: taskId, userId }
  });
  
  if (!task) {
    throw new NotFoundError('任务不存在');
  }
  
  if (task.status !== 'completed') {
    return res.json({
      success: true,
      message: '任务已经不是完成状态',
      data: task
    });
  }
  
  // 更新任务状态
  await task.update({
    status: 'pending',
    completedAt: null
  });
  
  // 更新用户完成任务统计
  await User.decrement('tasksCompleted', { where: { id: userId } });
  
  logger.info('任务标记为未完成', {
    userId,
    taskId,
    title: task.title,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '任务已标记为未完成',
    data: task
  });
});

// 更新任务优先级
const updateTaskPriority = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  const { priority } = req.body;
  
  const task = await Task.findOne({
    where: { id: taskId, userId }
  });
  
  if (!task) {
    throw new NotFoundError('任务不存在');
  }
  
  await task.update({ priority });
  
  logger.info('任务优先级更新', {
    userId,
    taskId,
    oldPriority: task.priority,
    newPriority: priority,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '任务优先级更新成功',
    data: task
  });
});

// 更新任务截止日期
const updateTaskDueDate = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  const { dueDate } = req.body;
  
  const task = await Task.findOne({
    where: { id: taskId, userId }
  });
  
  if (!task) {
    throw new NotFoundError('任务不存在');
  }
  
  await task.update({ dueDate });
  
  logger.info('任务截止日期更新', {
    userId,
    taskId,
    oldDueDate: task.dueDate,
    newDueDate: dueDate,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '任务截止日期更新成功',
    data: task
  });
});

// 移动任务到分类
const moveTaskToCategory = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  const { categoryId } = req.body;
  
  const task = await Task.findOne({
    where: { id: taskId, userId }
  });
  
  if (!task) {
    throw new NotFoundError('任务不存在');
  }
  
  // 如果指定了分类，验证分类所有权
  if (categoryId) {
    await customValidators.validateCategoryOwnership(categoryId, userId);
  }
  
  await task.update({ categoryId });
  
  logger.info('任务分类更新', {
    userId,
    taskId,
    oldCategoryId: task.categoryId,
    newCategoryId: categoryId,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '任务分类更新成功',
    data: task
  });
});

// 复制任务
const duplicateTask = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  
  const originalTask = await Task.findOne({
    where: { id: taskId, userId }
  });
  
  if (!originalTask) {
    throw new NotFoundError('任务不存在');
  }
  
  // 检查任务数量限制
  await customValidators.validateTaskLimit(userId);
  
  // 创建任务副本
  const duplicatedTask = await Task.create({
    title: `${originalTask.title} (副本)`,
    description: originalTask.description,
    priority: originalTask.priority,
    dueDate: originalTask.dueDate,
    categoryId: originalTask.categoryId,
    userId,
    status: 'pending'
  });
  
  // 更新用户任务创建统计
  await User.increment('tasksCreated', { where: { id: userId } });
  
  logger.info('任务复制成功', {
    userId,
    originalTaskId: taskId,
    duplicatedTaskId: duplicatedTask.id,
    ip: req.ip
  });
  
  res.status(201).json({
    success: true,
    message: '任务复制成功',
    data: duplicatedTask
  });
});

// 获取今日任务
const getTodayTasks = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const tasks = await Task.findAll({
    where: {
      userId,
      isArchived: false,
      [Op.or]: [
        {
          dueDate: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        },
        {
          createdAt: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        }
      ]
    },
    include: [{
      model: Category,
      as: 'category',
      attributes: ['id', 'name', 'color', 'icon']
    }],
    order: [['priority', 'DESC'], ['createdAt', 'DESC']]
  });
  
  res.json({
    success: true,
    data: tasks
  });
});

// 获取本周任务
const getWeekTasks = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  
  const tasks = await Task.findAll({
    where: {
      userId,
      isArchived: false,
      dueDate: {
        [Op.gte]: startOfWeek,
        [Op.lt]: endOfWeek
      }
    },
    include: [{
      model: Category,
      as: 'category',
      attributes: ['id', 'name', 'color', 'icon']
    }],
    order: [['dueDate', 'ASC'], ['priority', 'DESC']]
  });
  
  res.json({
    success: true,
    data: tasks
  });
});

// 获取逾期任务
const getOverdueTasks = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  
  const tasks = await Task.findAll({
    where: {
      userId,
      isArchived: false,
      status: { [Op.ne]: 'completed' },
      dueDate: { [Op.lt]: now }
    },
    include: [{
      model: Category,
      as: 'category',
      attributes: ['id', 'name', 'color', 'icon']
    }],
    order: [['dueDate', 'ASC']]
  });
  
  res.json({
    success: true,
    data: tasks
  });
});

// 获取即将到期的任务
const getUpcomingTasks = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  const threeDaysLater = new Date();
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  
  const tasks = await Task.findAll({
    where: {
      userId,
      isArchived: false,
      status: { [Op.ne]: 'completed' },
      dueDate: {
        [Op.gte]: now,
        [Op.lte]: threeDaysLater
      }
    },
    include: [{
      model: Category,
      as: 'category',
      attributes: ['id', 'name', 'color', 'icon']
    }],
    order: [['dueDate', 'ASC']]
  });
  
  res.json({
    success: true,
    data: tasks
  });
});

// 搜索任务
const searchTasks = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { q, category, status, priority } = req.query;
  
  const whereClause = {
    userId,
    isArchived: false
  };
  
  if (q) {
    whereClause[Op.or] = [
      { title: { [Op.iLike]: `%${q}%` } },
      { description: { [Op.iLike]: `%${q}%` } }
    ];
  }
  
  if (category) {
    whereClause.categoryId = category;
  }
  
  if (status) {
    whereClause.status = status;
  }
  
  if (priority) {
    whereClause.priority = priority;
  }
  
  const tasks = await Task.findAll({
    where: whereClause,
    include: [{
      model: Category,
      as: 'category',
      attributes: ['id', 'name', 'color', 'icon']
    }],
    order: [['priority', 'DESC'], ['createdAt', 'DESC']]
  });
  
  res.json({
    success: true,
    data: tasks
  });
});

// 获取任务完成趋势
const getTaskCompletionTrend = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { days = 7 } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));
  startDate.setHours(0, 0, 0, 0);
  
  const completedTasks = await Task.findAll({
    where: {
      userId,
      status: 'completed',
      completedAt: { [Op.gte]: startDate }
    },
    attributes: [
      [require('sequelize').fn('DATE', require('sequelize').col('completedAt')), 'date'],
      [require('sequelize').fn('COUNT', '*'), 'count']
    ],
    group: [require('sequelize').fn('DATE', require('sequelize').col('completedAt'))],
    order: [[require('sequelize').fn('DATE', require('sequelize').col('completedAt')), 'ASC']]
  });
  
  res.json({
    success: true,
    data: completedTasks
  });
});

// 获取任务优先级分布
const getTaskPriorityDistribution = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const distribution = await Task.findAll({
    where: {
      userId,
      isArchived: false,
      status: { [Op.ne]: 'completed' }
    },
    attributes: [
      'priority',
      [require('sequelize').fn('COUNT', '*'), 'count']
    ],
    group: ['priority'],
    order: [['priority', 'DESC']]
  });
  
  res.json({
    success: true,
    data: distribution
  });
});

// 获取每日任务统计
const getDailyTaskStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const [totalTasks, completedTasks, createdTasks] = await Promise.all([
    Task.count({
      where: {
        userId,
        isArchived: false,
        dueDate: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    }),
    Task.count({
      where: {
        userId,
        status: 'completed',
        completedAt: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    }),
    Task.count({
      where: {
        userId,
        createdAt: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    })
  ]);
  
  res.json({
    success: true,
    data: {
      totalTasks,
      completedTasks,
      createdTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    }
  });
});

// 获取每周任务统计
const getWeeklyTaskStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  
  const [totalTasks, completedTasks, createdTasks] = await Promise.all([
    Task.count({
      where: {
        userId,
        isArchived: false,
        dueDate: {
          [Op.gte]: startOfWeek,
          [Op.lt]: endOfWeek
        }
      }
    }),
    Task.count({
      where: {
        userId,
        status: 'completed',
        completedAt: {
          [Op.gte]: startOfWeek,
          [Op.lt]: endOfWeek
        }
      }
    }),
    Task.count({
      where: {
        userId,
        createdAt: {
          [Op.gte]: startOfWeek,
          [Op.lt]: endOfWeek
        }
      }
    })
  ]);
  
  res.json({
    success: true,
    data: {
      totalTasks,
      completedTasks,
      createdTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    }
  });
});

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  bulkUpdateTasks,
  deleteTask,
  bulkDeleteTasks,
  restoreTask,
  getArchivedTasks,
  permanentDeleteTask,
  getTaskStats,
  markTaskComplete,
  markTaskIncomplete,
  updateTaskPriority,
  updateTaskDueDate,
  moveTaskToCategory,
  duplicateTask,
  getTodayTasks,
  getWeekTasks,
  getOverdueTasks,
  getUpcomingTasks,
  searchTasks,
  getTaskCompletionTrend,
  getTaskPriorityDistribution,
  getDailyTaskStats,
  getWeeklyTaskStats
};