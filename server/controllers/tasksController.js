const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const database = require('../config/database');

// 检查是否使用模拟数据库
const isMockMode = database.isMock;
const mockDB = database.mockDB;

// 简化的错误处理
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 获取任务列表
 */
const getTasks = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { status, priority, page = 1, limit = 10 } = req.query;
  
  const offset = (page - 1) * limit;
  
  let result;
  if (isMockMode) {
    result = await mockDB.findTasksByUserId(userId, {
      status,
      priority,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } else {
    return res.status(500).json({
      success: false,
      message: '数据库连接失败，请配置 PostgreSQL 或使用模拟模式'
    });
  }
  
  res.json({
    success: true,
    data: {
      tasks: result.tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    }
  });
});

/**
 * 获取单个任务
 */
const getTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  
  let task;
  if (isMockMode) {
    task = await mockDB.findTaskById(id, userId);
  } else {
    return res.status(500).json({
      success: false,
      message: '数据库连接失败'
    });
  }
  
  if (!task) {
    return res.status(404).json({
      success: false,
      message: '任务不存在'
    });
  }
  
  res.json({
    success: true,
    data: { task }
  });
});

/**
 * 创建任务
 */
const createTask = asyncHandler(async (req, res) => {
  // 验证输入
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '输入验证失败',
      errors: errors.array()
    });
  }
  
  const userId = req.user.userId;
  const { title, description, priority, dueDate, categoryId } = req.body;
  
  let task;
  if (isMockMode) {
    task = await mockDB.createTask({
      title,
      description,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      categoryId: categoryId || 1, // 默认分类
      userId
    });
  } else {
    return res.status(500).json({
      success: false,
      message: '数据库连接失败'
    });
  }
  
  logger.info(`任务创建成功: ${title} (用户: ${userId})`);
  
  res.status(201).json({
    success: true,
    message: '任务创建成功',
    data: { task }
  });
});

/**
 * 更新任务
 */
const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const updateData = req.body;
  
  let task;
  if (isMockMode) {
    task = await mockDB.updateTask(id, userId, updateData);
  } else {
    return res.status(500).json({
      success: false,
      message: '数据库连接失败'
    });
  }
  
  if (!task) {
    return res.status(404).json({
      success: false,
      message: '任务不存在或无权限修改'
    });
  }
  
  logger.info(`任务更新成功: ${task.title} (用户: ${userId})`);
  
  res.json({
    success: true,
    message: '任务更新成功',
    data: { task }
  });
});

/**
 * 删除任务
 */
const deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  
  let success;
  if (isMockMode) {
    success = await mockDB.deleteTask(id, userId);
  } else {
    return res.status(500).json({
      success: false,
      message: '数据库连接失败'
    });
  }
  
  if (!success) {
    return res.status(404).json({
      success: false,
      message: '任务不存在或无权限删除'
    });
  }
  
  logger.info(`任务删除成功: ID ${id} (用户: ${userId})`);
  
  res.json({
    success: true,
    message: '任务删除成功'
  });
});

/**
 * 更新任务状态
 */
const updateTaskStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.userId;
  
  if (!['pending', 'in_progress', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: '无效的任务状态'
    });
  }
  
  let task;
  if (isMockMode) {
    task = await mockDB.updateTask(id, userId, { 
      status,
      completedAt: status === 'completed' ? new Date() : null
    });
  } else {
    return res.status(500).json({
      success: false,
      message: '数据库连接失败'
    });
  }
  
  if (!task) {
    return res.status(404).json({
      success: false,
      message: '任务不存在或无权限修改'
    });
  }
  
  logger.info(`任务状态更新: ${task.title} -> ${status} (用户: ${userId})`);
  
  res.json({
    success: true,
    message: '任务状态更新成功',
    data: { task }
  });
});

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus
};