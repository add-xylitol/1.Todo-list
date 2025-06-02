const { Category, Task, User } = require('../models');
const { categorySchemas, validate, customValidators } = require('../utils/validation');
const { BusinessError, ValidationError, NotFoundError, PermissionError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// 创建分类
const createCategory = asyncHandler(async (req, res) => {
  const validatedData = validate(categorySchemas.create, req.body);
  const userId = req.user.id;
  
  // 检查分类数量限制
  await customValidators.validateCategoryLimit(userId);
  
  // 检查分类名称是否重复
  const existingCategory = await Category.findOne({
    where: {
      userId,
      name: validatedData.name,
      isArchived: false
    }
  });
  
  if (existingCategory) {
    throw new ValidationError('分类名称已存在', 'name', 'CATEGORY_NAME_EXISTS');
  }
  
  // 如果设置为默认分类，取消其他默认分类
  if (validatedData.isDefault) {
    await Category.update(
      { isDefault: false },
      { where: { userId, isDefault: true } }
    );
  }
  
  // 获取下一个位置
  if (!validatedData.position) {
    const maxPosition = await Category.max('position', {
      where: { userId, isArchived: false }
    });
    validatedData.position = (maxPosition || 0) + 1;
  }
  
  // 创建分类
  const category = await Category.create({
    ...validatedData,
    userId
  });
  
  // 记录分类创建日志
  logger.info('分类创建成功', {
    userId,
    categoryId: category.id,
    name: category.name,
    isDefault: category.isDefault,
    ip: req.ip
  });
  
  res.status(201).json({
    success: true,
    message: '分类创建成功',
    data: {
      category
    }
  });
});

// 获取分类列表
const getCategories = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { includeArchived = false, includeTaskCount = true } = req.query;
  
  // 构建查询条件
  const where = { userId };
  if (!includeArchived) {
    where.isArchived = false;
  }
  
  // 查询分类
  const categories = await Category.findAll({
    where,
    order: [['position', 'ASC'], ['createdAt', 'ASC']],
    ...(includeTaskCount && {
      include: [{
        model: Task,
        as: 'tasks',
        where: { isArchived: false },
        attributes: [],
        required: false
      }],
      attributes: {
        include: [
          [
            require('sequelize').fn('COUNT', require('sequelize').col('tasks.id')),
            'taskCount'
          ]
        ]
      },
      group: ['Category.id']
    })
  });
  
  res.json({
    success: true,
    data: {
      categories: categories.map(category => ({
        ...category.toJSON(),
        taskCount: includeTaskCount ? parseInt(category.getDataValue('taskCount') || 0) : undefined
      }))
    }
  });
});

// 获取单个分类
const getCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { includeTaskCount = true } = req.query;
  
  // 查询分类
  const category = await Category.findOne({
    where: { id, userId },
    ...(includeTaskCount && {
      include: [{
        model: Task,
        as: 'tasks',
        where: { isArchived: false },
        attributes: [],
        required: false
      }],
      attributes: {
        include: [
          [
            require('sequelize').fn('COUNT', require('sequelize').col('tasks.id')),
            'taskCount'
          ]
        ]
      },
      group: ['Category.id']
    })
  });
  
  if (!category) {
    throw new NotFoundError('分类不存在', 'CATEGORY_NOT_FOUND');
  }
  
  res.json({
    success: true,
    data: {
      category: {
        ...category.toJSON(),
        taskCount: includeTaskCount ? parseInt(category.getDataValue('taskCount') || 0) : undefined
      }
    }
  });
});

// 更新分类
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const validatedData = validate(categorySchemas.update, req.body);
  const userId = req.user.id;
  
  // 验证分类所有权
  const category = await customValidators.validateCategoryOwnership(id, userId);
  
  // 检查分类名称是否重复（排除当前分类）
  if (validatedData.name) {
    const existingCategory = await Category.findOne({
      where: {
        userId,
        name: validatedData.name,
        id: { [Op.ne]: id },
        isArchived: false
      }
    });
    
    if (existingCategory) {
      throw new ValidationError('分类名称已存在', 'name', 'CATEGORY_NAME_EXISTS');
    }
  }
  
  // 如果设置为默认分类，取消其他默认分类
  if (validatedData.isDefault === true) {
    await Category.update(
      { isDefault: false },
      { where: { userId, isDefault: true, id: { [Op.ne]: id } } }
    );
  }
  
  // 更新分类
  await category.update(validatedData);
  
  // 记录分类更新日志
  logger.info('分类更新成功', {
    userId,
    categoryId: category.id,
    updatedFields: Object.keys(validatedData),
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '分类更新成功',
    data: {
      category
    }
  });
});

// 删除分类
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { moveTasksTo } = req.body;
  const userId = req.user.id;
  
  // 验证分类所有权
  const category = await customValidators.validateCategoryOwnership(id, userId);
  
  // 检查是否为默认分类
  if (category.isDefault) {
    throw new BusinessError('不能删除默认分类', 'CANNOT_DELETE_DEFAULT_CATEGORY');
  }
  
  // 检查分类下是否有任务
  const taskCount = await Task.count({
    where: {
      categoryId: id,
      userId,
      isArchived: false
    }
  });
  
  if (taskCount > 0) {
    if (moveTasksTo) {
      // 验证目标分类所有权
      await customValidators.validateCategoryOwnership(moveTasksTo, userId);
      
      // 移动任务到指定分类
      await Task.update(
        { categoryId: moveTasksTo },
        {
          where: {
            categoryId: id,
            userId,
            isArchived: false
          }
        }
      );
    } else {
      // 将任务移动到默认分类或设为无分类
      const defaultCategory = await Category.findOne({
        where: { userId, isDefault: true, isArchived: false }
      });
      
      await Task.update(
        { categoryId: defaultCategory ? defaultCategory.id : null },
        {
          where: {
            categoryId: id,
            userId,
            isArchived: false
          }
        }
      );
    }
  }
  
  // 软删除分类（归档）
  await category.update({
    isArchived: true,
    archivedAt: new Date()
  });
  
  // 记录分类删除日志
  logger.info('分类删除成功', {
    userId,
    categoryId: category.id,
    name: category.name,
    taskCount,
    moveTasksTo,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '分类删除成功',
    data: {
      movedTasksCount: taskCount
    }
  });
});

// 重新排序分类
const reorderCategories = asyncHandler(async (req, res) => {
  const validatedData = validate(categorySchemas.reorder, req.body);
  const { categoryIds } = validatedData;
  const userId = req.user.id;
  
  // 验证所有分类的所有权
  const categories = await Category.findAll({
    where: {
      id: { [Op.in]: categoryIds },
      userId,
      isArchived: false
    }
  });
  
  if (categories.length !== categoryIds.length) {
    throw new PermissionError('部分分类不存在或无权访问', 'INVALID_CATEGORY_ACCESS');
  }
  
  // 批量更新位置
  const updatePromises = categoryIds.map((categoryId, index) => 
    Category.update(
      { position: index + 1 },
      { where: { id: categoryId, userId } }
    )
  );
  
  await Promise.all(updatePromises);
  
  // 记录重新排序日志
  logger.info('分类重新排序', {
    userId,
    categoryIds,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '分类排序更新成功'
  });
});

// 设置默认分类
const setDefaultCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  // 验证分类所有权
  const category = await customValidators.validateCategoryOwnership(id, userId);
  
  if (category.isArchived) {
    throw new BusinessError('不能将已归档的分类设为默认分类', 'CANNOT_SET_ARCHIVED_AS_DEFAULT');
  }
  
  // 取消其他默认分类
  await Category.update(
    { isDefault: false },
    { where: { userId, isDefault: true } }
  );
  
  // 设置当前分类为默认
  await category.update({ isDefault: true });
  
  // 记录设置默认分类日志
  logger.info('设置默认分类', {
    userId,
    categoryId: category.id,
    name: category.name,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '默认分类设置成功',
    data: {
      category
    }
  });
});

// 恢复已删除的分类
const restoreCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const category = await Category.findOne({
    where: {
      id,
      userId,
      isArchived: true
    }
  });
  
  if (!category) {
    throw new NotFoundError('已删除的分类不存在', 'ARCHIVED_CATEGORY_NOT_FOUND');
  }
  
  // 检查分类数量限制
  await customValidators.validateCategoryLimit(userId);
  
  // 检查分类名称是否重复
  const existingCategory = await Category.findOne({
    where: {
      userId,
      name: category.name,
      isArchived: false
    }
  });
  
  if (existingCategory) {
    throw new ValidationError('分类名称已存在，请先修改名称后再恢复', 'name', 'CATEGORY_NAME_EXISTS');
  }
  
  // 恢复分类
  await category.update({
    isArchived: false,
    archivedAt: null
  });
  
  // 记录分类恢复日志
  logger.info('分类恢复成功', {
    userId,
    categoryId: category.id,
    name: category.name,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '分类恢复成功',
    data: {
      category
    }
  });
});

// 获取已删除的分类列表
const getArchivedCategories = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20 } = req.query;
  
  const offset = (page - 1) * limit;
  
  const { count, rows: categories } = await Category.findAndCountAll({
    where: {
      userId,
      isArchived: true
    },
    order: [['archivedAt', 'DESC']],
    limit: parseInt(limit),
    offset
  });
  
  const totalPages = Math.ceil(count / limit);
  
  res.json({
    success: true,
    data: {
      categories,
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

// 永久删除分类
const permanentDeleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const category = await Category.findOne({
    where: {
      id,
      userId,
      isArchived: true
    }
  });
  
  if (!category) {
    throw new NotFoundError('已删除的分类不存在', 'ARCHIVED_CATEGORY_NOT_FOUND');
  }
  
  // 检查是否还有关联的已归档任务
  const archivedTaskCount = await Task.count({
    where: {
      categoryId: id,
      userId,
      isArchived: true
    }
  });
  
  if (archivedTaskCount > 0) {
    // 将已归档任务的分类设为null
    await Task.update(
      { categoryId: null },
      {
        where: {
          categoryId: id,
          userId,
          isArchived: true
        }
      }
    );
  }
  
  // 永久删除分类
  await category.destroy();
  
  // 记录永久删除日志
  logger.info('分类永久删除', {
    userId,
    categoryId: category.id,
    name: category.name,
    archivedTaskCount,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '分类已永久删除'
  });
});

// 获取分类统计信息
const getCategoryStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  // 获取分类统计
  const [totalCategories, archivedCategories] = await Promise.all([
    Category.count({ where: { userId, isArchived: false } }),
    Category.count({ where: { userId, isArchived: true } })
  ]);
  
  // 获取每个分类的任务统计
  const categoryStats = await Category.findAll({
    where: { userId, isArchived: false },
    include: [{
      model: Task,
      as: 'tasks',
      where: { isArchived: false },
      attributes: [],
      required: false
    }],
    attributes: [
      'id', 'name', 'color', 'icon',
      [
        require('sequelize').fn('COUNT', require('sequelize').col('tasks.id')),
        'totalTasks'
      ],
      [
        require('sequelize').fn('SUM', 
          require('sequelize').literal("CASE WHEN tasks.status = 'completed' THEN 1 ELSE 0 END")
        ),
        'completedTasks'
      ],
      [
        require('sequelize').fn('SUM', 
          require('sequelize').literal("CASE WHEN tasks.status = 'pending' THEN 1 ELSE 0 END")
        ),
        'pendingTasks'
      ],
      [
        require('sequelize').fn('SUM', 
          require('sequelize').literal(
            "CASE WHEN tasks.status != 'completed' AND tasks.due_date < NOW() THEN 1 ELSE 0 END"
          )
        ),
        'overdueTasks'
      ]
    ],
    group: ['Category.id'],
    order: [['position', 'ASC']]
  });
  
  // 获取无分类任务统计
  const [uncategorizedTotal, uncategorizedCompleted, uncategorizedPending, uncategorizedOverdue] = await Promise.all([
    Task.count({ where: { userId, categoryId: null, isArchived: false } }),
    Task.count({ where: { userId, categoryId: null, status: 'completed', isArchived: false } }),
    Task.count({ where: { userId, categoryId: null, status: 'pending', isArchived: false } }),
    Task.count({ 
      where: { 
        userId, 
        categoryId: null,
        status: { [Op.ne]: 'completed' },
        dueDate: { [Op.lt]: new Date() },
        isArchived: false 
      } 
    })
  ]);
  
  const formattedStats = categoryStats.map(category => ({
    id: category.id,
    name: category.name,
    color: category.color,
    icon: category.icon,
    totalTasks: parseInt(category.getDataValue('totalTasks') || 0),
    completedTasks: parseInt(category.getDataValue('completedTasks') || 0),
    pendingTasks: parseInt(category.getDataValue('pendingTasks') || 0),
    overdueTasks: parseInt(category.getDataValue('overdueTasks') || 0),
    completionRate: function() {
      const total = this.totalTasks;
      const completed = this.completedTasks;
      return total > 0 ? Math.round((completed / total) * 100) : 0;
    }()
  }));
  
  // 添加无分类统计
  if (uncategorizedTotal > 0) {
    formattedStats.push({
      id: null,
      name: '无分类',
      color: '#6B7280',
      icon: 'inbox',
      totalTasks: uncategorizedTotal,
      completedTasks: uncategorizedCompleted,
      pendingTasks: uncategorizedPending,
      overdueTasks: uncategorizedOverdue,
      completionRate: uncategorizedTotal > 0 ? Math.round((uncategorizedCompleted / uncategorizedTotal) * 100) : 0
    });
  }
  
  res.json({
    success: true,
    data: {
      overview: {
        totalCategories,
        archivedCategories,
        categoriesWithTasks: formattedStats.filter(cat => cat.totalTasks > 0).length
      },
      categoryStats: formattedStats
    }
  });
});

module.exports = {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  setDefaultCategory,
  restoreCategory,
  getArchivedCategories,
  permanentDeleteCategory,
  getCategoryStats
};