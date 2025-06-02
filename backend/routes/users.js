const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Task = require('../models/Task');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// 验证schemas
const updateProfileSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).messages({
    'string.alphanum': '用户名只能包含字母和数字',
    'string.min': '用户名至少3个字符',
    'string.max': '用户名最多30个字符'
  }),
  firstName: Joi.string().trim().max(50).allow(''),
  lastName: Joi.string().trim().max(50).allow(''),
  bio: Joi.string().trim().max(500).allow(''),
  avatar: Joi.string().uri().allow(''),
  timezone: Joi.string().max(50),
  language: Joi.string().valid('zh-CN', 'en-US', 'ja-JP', 'ko-KR').default('zh-CN')
});

const updateSettingsSchema = Joi.object({
  theme: Joi.string().valid('light', 'dark', 'auto').default('auto'),
  notifications: Joi.object({
    email: Joi.boolean().default(true),
    push: Joi.boolean().default(true),
    reminder: Joi.boolean().default(true),
    marketing: Joi.boolean().default(false)
  }),
  privacy: Joi.object({
    profilePublic: Joi.boolean().default(false),
    showOnlineStatus: Joi.boolean().default(true),
    allowDataCollection: Joi.boolean().default(true)
  }),
  preferences: Joi.object({
    defaultView: Joi.string().valid('list', 'grid', 'calendar').default('list'),
    sortBy: Joi.string().valid('createdAt', 'dueDate', 'priority', 'title').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    showCompleted: Joi.boolean().default(false),
    autoArchive: Joi.boolean().default(true),
    reminderTime: Joi.number().integer().min(5).max(1440).default(60) // 分钟
  })
});

const generateApiKeySchema = Joi.object({
  name: Joi.string().trim().min(1).max(50).required().messages({
    'string.min': 'API密钥名称不能为空',
    'string.max': 'API密钥名称最多50个字符',
    'any.required': 'API密钥名称不能为空'
  }),
  permissions: Joi.array().items(
    Joi.string().valid('read', 'write', 'delete')
  ).min(1).default(['read'])
});

// 获取用户资料
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profile: user.profile,
          subscription: {
            type: user.subscription.type,
            status: user.subscription.status,
            expiresAt: user.subscription.expiresAt,
            daysLeft: user.getSubscriptionDaysLeft(),
            isPremium: user.isPremium()
          },
          usage: user.usage,
          settings: user.settings,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          loginCount: user.loginCount
        }
      }
    });
    
  } catch (error) {
    console.error('获取用户资料错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 更新用户资料
router.put('/profile', auth, async (req, res) => {
  try {
    // 验证输入
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    // 检查用户名是否已被使用
    if (value.username && value.username !== user.username) {
      const existingUser = await User.findOne({ username: value.username });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: '用户名已被使用'
        });
      }
    }
    
    // 更新用户资料
    if (value.username) user.username = value.username;
    if (value.firstName !== undefined) user.profile.firstName = value.firstName;
    if (value.lastName !== undefined) user.profile.lastName = value.lastName;
    if (value.bio !== undefined) user.profile.bio = value.bio;
    if (value.avatar !== undefined) user.profile.avatar = value.avatar;
    if (value.timezone) user.profile.timezone = value.timezone;
    if (value.language) user.profile.language = value.language;
    
    await user.save();
    
    res.json({
      success: true,
      message: '资料更新成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profile: user.profile
        }
      }
    });
    
  } catch (error) {
    console.error('更新用户资料错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 获取用户设置
router.get('/settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      data: {
        settings: user.settings
      }
    });
    
  } catch (error) {
    console.error('获取用户设置错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 更新用户设置
router.put('/settings', auth, async (req, res) => {
  try {
    // 验证输入
    const { error, value } = updateSettingsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    // 更新设置
    if (value.theme) user.settings.theme = value.theme;
    if (value.notifications) {
      user.settings.notifications = { ...user.settings.notifications, ...value.notifications };
    }
    if (value.privacy) {
      user.settings.privacy = { ...user.settings.privacy, ...value.privacy };
    }
    if (value.preferences) {
      user.settings.preferences = { ...user.settings.preferences, ...value.preferences };
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: '设置更新成功',
      data: {
        settings: user.settings
      }
    });
    
  } catch (error) {
    console.error('更新用户设置错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 获取用户统计信息
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    // 获取任务统计
    const taskStats = await Task.getUserStats(req.user.userId);
    
    // 获取本月统计
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const monthlyStats = await Task.aggregate([
      {
        $match: {
          userId: req.user.userId,
          isDeleted: false,
          createdAt: { $gte: monthStart, $lte: monthEnd }
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
    
    const monthData = monthlyStats[0] || { created: 0, completed: 0 };
    
    // 获取分类统计
    const categoryStats = await Task.aggregate([
      {
        $match: {
          userId: req.user.userId,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          completed: { $sum: { $cond: ['$completed', 1, 0] } }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      success: true,
      data: {
        user: {
          joinedAt: user.createdAt,
          loginCount: user.loginCount,
          lastLoginAt: user.lastLoginAt,
          isPremium: user.isPremium(),
          subscriptionDaysLeft: user.getSubscriptionDaysLeft()
        },
        tasks: taskStats,
        monthly: monthData,
        categories: categoryStats,
        usage: user.usage
      }
    });
    
  } catch (error) {
    console.error('获取用户统计错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 生成API密钥
router.post('/api-keys', auth, async (req, res) => {
  try {
    // 验证输入
    const { error, value } = generateApiKeySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    const { name, permissions } = value;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    // 检查API密钥数量限制
    const maxApiKeys = user.isPremium() ? 10 : 3;
    if (user.apiKeys.length >= maxApiKeys) {
      return res.status(400).json({
        success: false,
        error: `最多只能创建${maxApiKeys}个API密钥`
      });
    }
    
    // 生成API密钥
    const apiKey = 'tk_' + require('crypto').randomBytes(32).toString('hex');
    
    user.apiKeys.push({
      name,
      key: apiKey,
      permissions,
      isActive: true,
      createdAt: new Date(),
      lastUsedAt: null,
      usageCount: 0
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'API密钥创建成功',
      data: {
        apiKey: {
          id: user.apiKeys[user.apiKeys.length - 1]._id,
          name,
          key: apiKey,
          permissions,
          createdAt: new Date()
        }
      }
    });
    
  } catch (error) {
    console.error('生成API密钥错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 获取API密钥列表
router.get('/api-keys', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    const apiKeys = user.apiKeys.map(key => ({
      id: key._id,
      name: key.name,
      key: key.key.substring(0, 8) + '...' + key.key.substring(key.key.length - 4), // 隐藏部分密钥
      permissions: key.permissions,
      isActive: key.isActive,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      usageCount: key.usageCount
    }));
    
    res.json({
      success: true,
      data: { apiKeys }
    });
    
  } catch (error) {
    console.error('获取API密钥列表错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 删除API密钥
router.delete('/api-keys/:keyId', auth, async (req, res) => {
  try {
    const { keyId } = req.params;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    const keyIndex = user.apiKeys.findIndex(key => key._id.toString() === keyId);
    if (keyIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'API密钥不存在'
      });
    }
    
    user.apiKeys.splice(keyIndex, 1);
    await user.save();
    
    res.json({
      success: true,
      message: 'API密钥已删除'
    });
    
  } catch (error) {
    console.error('删除API密钥错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 切换API密钥状态
router.patch('/api-keys/:keyId/toggle', auth, async (req, res) => {
  try {
    const { keyId } = req.params;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    const apiKey = user.apiKeys.find(key => key._id.toString() === keyId);
    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API密钥不存在'
      });
    }
    
    apiKey.isActive = !apiKey.isActive;
    await user.save();
    
    res.json({
      success: true,
      message: `API密钥已${apiKey.isActive ? '启用' : '禁用'}`,
      data: {
        isActive: apiKey.isActive
      }
    });
    
  } catch (error) {
    console.error('切换API密钥状态错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 导出用户数据
router.get('/export', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    // 获取用户的所有任务
    const tasks = await Task.find({
      userId: req.user.userId,
      isDeleted: false
    }).lean();
    
    const exportData = {
      user: {
        username: user.username,
        email: user.email,
        profile: user.profile,
        settings: user.settings,
        createdAt: user.createdAt
      },
      tasks: tasks.map(task => ({
        title: task.title,
        description: task.description,
        completed: task.completed,
        priority: task.priority,
        dueDate: task.dueDate,
        category: task.category,
        tags: task.tags,
        subtasks: task.subtasks,
        createdAt: task.createdAt,
        completedAt: task.completedAt
      })),
      exportedAt: new Date()
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="todolist-export-${Date.now()}.json"`);
    res.json(exportData);
    
  } catch (error) {
    console.error('导出用户数据错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 删除用户账户
router.delete('/account', auth, async (req, res) => {
  try {
    const { password, confirmation } = req.body;
    
    if (!password || !confirmation) {
      return res.status(400).json({
        success: false,
        error: '请提供密码和确认信息'
      });
    }
    
    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({
        success: false,
        error: '请输入正确的确认信息: DELETE_MY_ACCOUNT'
      });
    }
    
    const user = await User.findById(req.user.userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: '密码错误'
      });
    }
    
    // 软删除用户和相关数据
    user.status = 'deleted';
    user.deletedAt = new Date();
    user.email = `deleted_${user._id}@deleted.com`; // 避免邮箱冲突
    user.username = `deleted_${user._id}`;
    await user.save();
    
    // 软删除用户的所有任务
    await Task.updateMany(
      { userId: req.user.userId },
      { isDeleted: true, deletedAt: new Date() }
    );
    
    res.json({
      success: true,
      message: '账户已删除'
    });
    
  } catch (error) {
    console.error('删除用户账户错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 管理员路由：获取用户列表
router.get('/admin/users', adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      subscription
    } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    if (subscription) {
      query['subscription.type'] = subscription;
    }
    
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -refreshToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
    
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 管理员路由：更新用户状态
router.patch('/admin/users/:userId/status', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;
    
    if (!['active', 'suspended', 'deleted'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: '无效的状态值'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    user.status = status;
    if (status === 'suspended' || status === 'deleted') {
      user.statusReason = reason || '';
      user.statusChangedAt = new Date();
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: `用户状态已更新为${status}`,
      data: {
        userId: user._id,
        status: user.status,
        statusReason: user.statusReason,
        statusChangedAt: user.statusChangedAt
      }
    });
    
  } catch (error) {
    console.error('更新用户状态错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

module.exports = router;