const express = require('express');
const Joi = require('joi');
const Task = require('../models/Task');
const User = require('../models/User');
const { auth, premiumAuth, ownershipAuth, usageCheck } = require('../middleware/auth');

const router = express.Router();

// 验证schemas
const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required().messages({
    'string.min': '任务标题不能为空',
    'string.max': '任务标题最多200个字符',
    'any.required': '任务标题不能为空'
  }),
  description: Joi.string().trim().max(1000).allow('').messages({
    'string.max': '任务描述最多1000个字符'
  }),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  dueDate: Joi.date().allow(null),
  reminderAt: Joi.date().allow(null),
  category: Joi.string().trim().max(50).default('默认'),
  tags: Joi.array().items(Joi.string().trim().max(30)).max(10),
  subtasks: Joi.array().items(Joi.object({
    title: Joi.string().trim().min(1).max(100).required(),
    order: Joi.number().integer().min(0).default(0)
  })).max(20),
  recurring: Joi.object({
    enabled: Joi.boolean().default(false),
    pattern: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly', 'custom').default('daily'),
    interval: Joi.number().integer().min(1).default(1),
    endDate: Joi.date().allow(null),
    daysOfWeek: Joi.array().items(Joi.number().integer().min(0).max(6)).max(7)
  }),
  order: Joi.number().integer().default(0),
  clientId: Joi.string().trim().max(50)
});

const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200),
  description: Joi.string().trim().max(1000).allow(''),
  completed: Joi.boolean(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
  dueDate: Joi.date().allow(null),
  reminderAt: Joi.date().allow(null),
  category: Joi.string().trim().max(50),
  tags: Joi.array().items(Joi.string().trim().max(30)).max(10),
  subtasks: Joi.array().items(Joi.object({
    _id: Joi.string(),
    title: Joi.string().trim().min(1).max(100).required(),
    completed: Joi.boolean().default(false),
    order: Joi.number().integer().min(0).default(0)
  })).max(20),
  recurring: Joi.object({
    enabled: Joi.boolean(),
    pattern: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly', 'custom'),
    interval: Joi.number().integer().min(1),
    endDate: Joi.date().allow(null),
    daysOfWeek: Joi.array().items(Joi.number().integer().min(0).max(6)).max(7)
  }),
  order: Joi.number().integer(),
  clientId: Joi.string().trim().max(50)
});

const batchUpdateSchema = Joi.object({
  tasks: Joi.array().items(Joi.object({
    _id: Joi.string().required(),
    order: Joi.number().integer().required()
  })).min(1).max(100).required()
});

// 获取任务列表
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      completed,
      priority,
      category,
      tags,
      dueDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeDeleted = false
    } = req.query;
    
    // 构建查询条件
    const query = {
      userId: req.user.userId,
      isDeleted: includeDeleted === 'true' ? { $in: [true, false] } : false
    };
    
    // 过滤条件
    if (completed !== undefined) {
      query.completed = completed === 'true';
    }
    
    if (priority) {
      query.priority = { $in: priority.split(',') };
    }
    
    if (category) {
      query.category = { $in: category.split(',') };
    }
    
    if (tags) {
      query.tags = { $in: tags.split(',') };
    }
    
    if (dueDate) {
      const date = new Date(dueDate);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      query.dueDate = { $gte: date, $lt: nextDate };
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    // 排序
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // 分页
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    
    // 执行查询
    const [tasks, total] = await Promise.all([
      Task.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Task.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
    
  } catch (error) {
    console.error('获取任务列表错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 获取单个任务
router.get('/:id', auth, ownershipAuth(Task), async (req, res) => {
  try {
    const task = req.resource; // 由ownershipAuth中间件设置
    
    // 更新查看次数
    task.stats.viewCount += 1;
    await task.save();
    
    res.json({
      success: true,
      data: { task }
    });
    
  } catch (error) {
    console.error('获取任务错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 创建任务
router.post('/', auth, usageCheck('tasksCreated', { free: 100, premium: 1000 }), async (req, res) => {
  try {
    // 验证输入
    const { error, value } = createTaskSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    // 创建任务
    const task = new Task({
      ...value,
      userId: req.user.userId
    });
    
    await task.save();
    
    // 更新用户使用统计
    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { 'usage.tasksCreated': 1 }
    });
    
    res.status(201).json({
      success: true,
      message: '任务创建成功',
      data: { task }
    });
    
  } catch (error) {
    console.error('创建任务错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 更新任务
router.put('/:id', auth, ownershipAuth(Task), async (req, res) => {
  try {
    // 验证输入
    const { error, value } = updateTaskSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    const task = req.resource;
    
    // 更新任务
    Object.assign(task, value);
    task.stats.editCount += 1;
    
    await task.save();
    
    res.json({
      success: true,
      message: '任务更新成功',
      data: { task }
    });
    
  } catch (error) {
    console.error('更新任务错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 切换任务完成状态
router.patch('/:id/toggle', auth, ownershipAuth(Task), async (req, res) => {
  try {
    const task = req.resource;
    
    await task.toggleComplete();
    
    res.json({
      success: true,
      message: task.completed ? '任务已完成' : '任务已标记为未完成',
      data: { task }
    });
    
  } catch (error) {
    console.error('切换任务状态错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 软删除任务
router.delete('/:id', auth, ownershipAuth(Task), async (req, res) => {
  try {
    const task = req.resource;
    
    await task.softDelete();
    
    res.json({
      success: true,
      message: '任务已删除'
    });
    
  } catch (error) {
    console.error('删除任务错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 恢复已删除的任务
router.patch('/:id/restore', auth, ownershipAuth(Task), async (req, res) => {
  try {
    const task = req.resource;
    
    if (!task.isDeleted) {
      return res.status(400).json({
        success: false,
        error: '任务未被删除'
      });
    }
    
    await task.restore();
    
    res.json({
      success: true,
      message: '任务已恢复',
      data: { task }
    });
    
  } catch (error) {
    console.error('恢复任务错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 永久删除任务
router.delete('/:id/permanent', auth, ownershipAuth(Task), async (req, res) => {
  try {
    const task = req.resource;
    
    await Task.findByIdAndDelete(task._id);
    
    res.json({
      success: true,
      message: '任务已永久删除'
    });
    
  } catch (error) {
    console.error('永久删除任务错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 批量更新任务顺序
router.patch('/batch/reorder', auth, async (req, res) => {
  try {
    // 验证输入
    const { error, value } = batchUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    const { tasks } = value;
    
    // 验证所有任务都属于当前用户
    const taskIds = tasks.map(t => t._id);
    const userTasks = await Task.find({
      _id: { $in: taskIds },
      userId: req.user.userId,
      isDeleted: false
    });
    
    if (userTasks.length !== tasks.length) {
      return res.status(400).json({
        success: false,
        error: '包含无效的任务ID'
      });
    }
    
    // 批量更新顺序
    await Task.updateTasksOrder(req.user.userId, tasks);
    
    res.json({
      success: true,
      message: '任务顺序更新成功'
    });
    
  } catch (error) {
    console.error('批量更新任务顺序错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 批量操作任务
router.patch('/batch/action', auth, async (req, res) => {
  try {
    const { taskIds, action, data } = req.body;
    
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '任务ID列表不能为空'
      });
    }
    
    if (taskIds.length > 100) {
      return res.status(400).json({
        success: false,
        error: '一次最多操作100个任务'
      });
    }
    
    // 验证任务所有权
    const tasks = await Task.find({
      _id: { $in: taskIds },
      userId: req.user.userId,
      isDeleted: false
    });
    
    if (tasks.length !== taskIds.length) {
      return res.status(400).json({
        success: false,
        error: '包含无效的任务ID'
      });
    }
    
    let updateData = {};
    let message = '';
    
    switch (action) {
      case 'complete':
        updateData = { completed: true, completedAt: new Date() };
        message = '任务已批量完成';
        break;
      case 'incomplete':
        updateData = { completed: false, completedAt: null };
        message = '任务已批量标记为未完成';
        break;
      case 'delete':
        updateData = { isDeleted: true, deletedAt: new Date() };
        message = '任务已批量删除';
        break;
      case 'update':
        if (!data) {
          return res.status(400).json({
            success: false,
            error: '更新数据不能为空'
          });
        }
        updateData = data;
        message = '任务已批量更新';
        break;
      default:
        return res.status(400).json({
          success: false,
          error: '无效的操作类型'
        });
    }
    
    // 执行批量更新
    await Task.updateMany(
      { _id: { $in: taskIds } },
      { ...updateData, lastModified: new Date() }
    );
    
    res.json({
      success: true,
      message,
      data: {
        affectedCount: tasks.length
      }
    });
    
  } catch (error) {
    console.error('批量操作任务错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 获取任务统计
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await Task.getUserStats(req.user.userId);
    
    // 获取今日任务统计
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const todayStats = await Task.aggregate([
      {
        $match: {
          userId: req.user.userId,
          isDeleted: false,
          createdAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          created: { $sum: 1 },
          completed: { $sum: { $cond: ['$completed', 1, 0] } }
        }
      }
    ]);
    
    const todayData = todayStats[0] || { created: 0, completed: 0 };
    
    res.json({
      success: true,
      data: {
        overall: stats,
        today: todayData
      }
    });
    
  } catch (error) {
    console.error('获取任务统计错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 同步任务（高级功能）
router.post('/sync', premiumAuth, async (req, res) => {
  try {
    const { lastSyncTime, clientTasks = [] } = req.body;
    
    if (!lastSyncTime) {
      return res.status(400).json({
        success: false,
        error: '最后同步时间不能为空'
      });
    }
    
    const syncTime = new Date(lastSyncTime);
    
    // 获取服务器端更新的任务
    const serverTasks = await Task.getTasksForSync(req.user.userId, syncTime);
    
    // 处理客户端任务
    const conflicts = [];
    const updates = [];
    
    for (const clientTask of clientTasks) {
      const serverTask = await Task.findOne({
        _id: clientTask._id,
        userId: req.user.userId
      });
      
      if (!serverTask) {
        // 服务器端不存在，创建新任务
        const newTask = new Task({
          ...clientTask,
          userId: req.user.userId
        });
        await newTask.save();
        updates.push(newTask);
      } else if (serverTask.lastModified > new Date(clientTask.lastModified)) {
        // 服务器端更新，存在冲突
        conflicts.push({
          taskId: serverTask._id,
          serverVersion: serverTask,
          clientVersion: clientTask
        });
      } else if (serverTask.lastModified < new Date(clientTask.lastModified)) {
        // 客户端更新，更新服务器端
        Object.assign(serverTask, clientTask);
        await serverTask.save();
        updates.push(serverTask);
      }
    }
    
    res.json({
      success: true,
      data: {
        serverTasks,
        conflicts,
        updates,
        syncTime: new Date()
      }
    });
    
  } catch (error) {
    console.error('同步任务错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

module.exports = router;