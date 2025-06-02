const { User, UserSession, Task, Category } = require('../models');
const { PasswordManager } = require('../utils/encryption');
const { userSchemas, validate, customValidators } = require('../utils/validation');
const { BusinessError, ValidationError, NotFoundError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// 获取用户资料
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password', 'passwordResetToken', 'emailVerificationToken'] }
  });
  
  if (!user) {
    throw new NotFoundError('用户不存在', 'USER_NOT_FOUND');
  }
  
  // 获取用户统计信息
  const [totalTasks, completedTasks, totalCategories] = await Promise.all([
    Task.count({ where: { userId: user.id, isArchived: false } }),
    Task.count({ where: { userId: user.id, status: 'completed', isArchived: false } }),
    Category.count({ where: { userId: user.id, isArchived: false } })
  ]);
  
  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        bio: user.bio,
        isEmailVerified: user.isEmailVerified,
        membershipType: user.membershipType,
        membershipExpiresAt: user.membershipExpiresAt,
        preferences: {
          timezone: user.timezone,
          language: user.language,
          dateFormat: user.dateFormat,
          timeFormat: user.timeFormat,
          emailNotifications: user.emailNotifications,
          pushNotifications: user.pushNotifications
        },
        stats: {
          totalTasks,
          completedTasks,
          totalCategories,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          tasksCreated: user.tasksCreated,
          tasksCompleted: user.tasksCompleted,
          lastLoginAt: user.lastLoginAt
        },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    }
  });
});

// 更新用户资料
const updateProfile = asyncHandler(async (req, res) => {
  const validatedData = validate(userSchemas.updateProfile, req.body);
  const userId = req.user.id;
  
  const user = await User.findByPk(userId);
  if (!user) {
    throw new NotFoundError('用户不存在', 'USER_NOT_FOUND');
  }
  
  // 更新用户信息
  await user.update(validatedData);
  
  // 记录更新日志
  logger.info('用户资料更新', {
    userId,
    updatedFields: Object.keys(validatedData),
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '资料更新成功',
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        bio: user.bio,
        preferences: {
          timezone: user.timezone,
          language: user.language,
          dateFormat: user.dateFormat,
          timeFormat: user.timeFormat,
          emailNotifications: user.emailNotifications,
          pushNotifications: user.pushNotifications
        },
        updatedAt: user.updatedAt
      }
    }
  });
});

// 修改密码
const changePassword = asyncHandler(async (req, res) => {
  const validatedData = validate(userSchemas.changePassword, req.body);
  const { currentPassword, newPassword } = validatedData;
  const userId = req.user.id;
  
  const user = await User.findByPk(userId);
  if (!user) {
    throw new NotFoundError('用户不存在', 'USER_NOT_FOUND');
  }
  
  // 验证当前密码
  const isCurrentPasswordValid = await PasswordManager.verify(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    throw new ValidationError('当前密码错误', 'currentPassword', 'INVALID_PASSWORD');
  }
  
  // 检查新密码是否与当前密码相同
  const isSamePassword = await PasswordManager.verify(newPassword, user.password);
  if (isSamePassword) {
    throw new ValidationError('新密码不能与当前密码相同', 'newPassword', 'SAME_PASSWORD');
  }
  
  // 哈希新密码
  const hashedNewPassword = await PasswordManager.hash(newPassword);
  
  // 更新密码
  await user.update({
    password: hashedNewPassword,
    passwordChangedAt: new Date()
  });
  
  // 禁用除当前会话外的所有活跃会话
  const authHeader = req.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const { TokenManager } = require('../utils/encryption');
    const decoded = TokenManager.decodeToken(token);
    
    await UserSession.update(
      { isActive: false, loggedOutAt: new Date() },
      { 
        where: { 
          userId,
          isActive: true,
          createdAt: { [Op.lt]: new Date(decoded.iat * 1000) }
        } 
      }
    );
  }
  
  // 记录密码修改日志
  logger.info('用户修改密码', {
    userId,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    success: true,
    message: '密码修改成功，其他设备已自动登出'
  });
});

// 获取用户会话列表
const getSessions = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const sessions = await UserSession.findAll({
    where: {
      userId,
      isActive: true
    },
    order: [['lastActivityAt', 'DESC']],
    attributes: [
      'id', 'deviceType', 'deviceName', 'ipAddress', 'location',
      'createdAt', 'lastActivityAt', 'expiresAt'
    ]
  });
  
  // 获取当前会话ID
  let currentSessionId = null;
  const authHeader = req.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const { TokenManager } = require('../utils/encryption');
    try {
      const decoded = TokenManager.decodeToken(token);
      const currentSession = sessions.find(session => 
        session.createdAt <= new Date(decoded.iat * 1000)
      );
      if (currentSession) {
        currentSessionId = currentSession.id;
      }
    } catch (error) {
      // 忽略解码错误
    }
  }
  
  const formattedSessions = sessions.map(session => ({
    id: session.id,
    deviceType: session.deviceType,
    deviceName: session.deviceName,
    ipAddress: session.ipAddress,
    location: session.location,
    isCurrent: session.id === currentSessionId,
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
    expiresAt: session.expiresAt
  }));
  
  res.json({
    success: true,
    data: {
      sessions: formattedSessions,
      total: formattedSessions.length
    }
  });
});

// 撤销指定会话
const revokeSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;
  
  if (!sessionId) {
    throw new ValidationError('会话ID不能为空', 'sessionId', 'MISSING_SESSION_ID');
  }
  
  const session = await UserSession.findOne({
    where: {
      id: sessionId,
      userId,
      isActive: true
    }
  });
  
  if (!session) {
    throw new NotFoundError('会话不存在或已失效', 'SESSION_NOT_FOUND');
  }
  
  // 禁用会话
  await session.update({
    isActive: false,
    loggedOutAt: new Date()
  });
  
  // 记录会话撤销日志
  logger.info('用户撤销会话', {
    userId,
    sessionId,
    deviceType: session.deviceType,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '会话已撤销'
  });
});

// 撤销所有其他会话
const revokeAllOtherSessions = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  // 获取当前会话时间戳
  let currentSessionTime = new Date();
  const authHeader = req.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const { TokenManager } = require('../utils/encryption');
    try {
      const decoded = TokenManager.decodeToken(token);
      currentSessionTime = new Date(decoded.iat * 1000);
    } catch (error) {
      // 忽略解码错误
    }
  }
  
  // 禁用除当前会话外的所有活跃会话
  const result = await UserSession.update(
    { isActive: false, loggedOutAt: new Date() },
    { 
      where: { 
        userId,
        isActive: true,
        createdAt: { [Op.ne]: currentSessionTime }
      } 
    }
  );
  
  // 记录批量撤销日志
  logger.info('用户撤销所有其他会话', {
    userId,
    revokedCount: result[0],
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: `已撤销 ${result[0]} 个其他会话`
  });
});

// 获取用户统计信息
const getStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { period = '30d' } = req.query;
  
  // 计算时间范围
  let startDate;
  switch (period) {
    case '7d':
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }
  
  // 获取统计数据
  const [user, totalTasks, completedTasks, pendingTasks, overdueTasks, totalCategories] = await Promise.all([
    User.findByPk(userId, { attributes: ['tasksCreated', 'tasksCompleted', 'createdAt'] }),
    Task.count({ where: { userId, isArchived: false } }),
    Task.count({ where: { userId, status: 'completed', isArchived: false } }),
    Task.count({ where: { userId, status: 'pending', isArchived: false } }),
    Task.count({ 
      where: { 
        userId, 
        status: { [Op.ne]: 'completed' },
        dueDate: { [Op.lt]: new Date() },
        isArchived: false 
      } 
    }),
    Category.count({ where: { userId, isArchived: false } })
  ]);
  
  // 获取时间段内的任务完成趋势
  const completionTrend = await Task.findAll({
    where: {
      userId,
      status: 'completed',
      completedAt: { [Op.gte]: startDate },
      isArchived: false
    },
    attributes: [
      [require('sequelize').fn('DATE', require('sequelize').col('completedAt')), 'date'],
      [require('sequelize').fn('COUNT', '*'), 'count']
    ],
    group: [require('sequelize').fn('DATE', require('sequelize').col('completedAt'))],
    order: [[require('sequelize').fn('DATE', require('sequelize').col('completedAt')), 'ASC']]
  });
  
  // 获取优先级分布
  const priorityDistribution = await Task.findAll({
    where: {
      userId,
      isArchived: false
    },
    attributes: [
      'priority',
      [require('sequelize').fn('COUNT', '*'), 'count']
    ],
    group: ['priority']
  });
  
  // 获取分类任务分布
  const categoryDistribution = await Task.findAll({
    where: {
      userId,
      isArchived: false
    },
    include: [{
      model: Category,
      as: 'category',
      attributes: ['id', 'name', 'color']
    }],
    attributes: [
      'categoryId',
      [require('sequelize').fn('COUNT', '*'), 'count']
    ],
    group: ['categoryId', 'category.id']
  });
  
  res.json({
    success: true,
    data: {
      overview: {
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        totalCategories,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        allTimeStats: {
          tasksCreated: user.tasksCreated,
          tasksCompleted: user.tasksCompleted,
          memberSince: user.createdAt
        }
      },
      trends: {
        period,
        completionTrend: completionTrend.map(item => ({
          date: item.getDataValue('date'),
          count: parseInt(item.getDataValue('count'))
        }))
      },
      distributions: {
        priority: priorityDistribution.map(item => ({
          priority: item.priority,
          count: parseInt(item.getDataValue('count'))
        })),
        category: categoryDistribution.map(item => ({
          categoryId: item.categoryId,
          categoryName: item.category ? item.category.name : '未分类',
          categoryColor: item.category ? item.category.color : '#6B7280',
          count: parseInt(item.getDataValue('count'))
        }))
      }
    }
  });
});

// 删除用户账户
const deleteAccount = asyncHandler(async (req, res) => {
  const { password, confirmation } = req.body;
  const userId = req.user.id;
  
  if (!password) {
    throw new ValidationError('请输入密码确认删除', 'password', 'MISSING_PASSWORD');
  }
  
  if (confirmation !== 'DELETE') {
    throw new ValidationError('请输入 "DELETE" 确认删除账户', 'confirmation', 'INVALID_CONFIRMATION');
  }
  
  const user = await User.findByPk(userId);
  if (!user) {
    throw new NotFoundError('用户不存在', 'USER_NOT_FOUND');
  }
  
  // 验证密码
  const isPasswordValid = await PasswordManager.verify(password, user.password);
  if (!isPasswordValid) {
    throw new ValidationError('密码错误', 'password', 'INVALID_PASSWORD');
  }
  
  // 软删除用户数据
  await Promise.all([
    // 归档所有任务
    Task.update(
      { isArchived: true, archivedAt: new Date() },
      { where: { userId } }
    ),
    // 归档所有分类
    Category.update(
      { isArchived: true, archivedAt: new Date() },
      { where: { userId } }
    ),
    // 禁用所有会话
    UserSession.update(
      { isActive: false, loggedOutAt: new Date() },
      { where: { userId } }
    ),
    // 标记用户为已删除
    user.update({
      isActive: false,
      deletedAt: new Date(),
      email: `deleted_${userId}_${user.email}`,
      username: `deleted_${userId}_${user.username}`
    })
  ]);
  
  // 记录账户删除日志
  logger.info('用户删除账户', {
    userId,
    email: user.email,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    success: true,
    message: '账户已删除'
  });
});

// 导出用户数据
const exportData = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { format = 'json' } = req.query;
  
  // 获取用户完整数据
  const [user, tasks, categories] = await Promise.all([
    User.findByPk(userId, {
      attributes: { exclude: ['password', 'passwordResetToken', 'emailVerificationToken'] }
    }),
    Task.findAll({
      where: { userId },
      include: [{ model: Category, as: 'category', attributes: ['name', 'color'] }]
    }),
    Category.findAll({ where: { userId } })
  ]);
  
  const exportData = {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio,
      membershipType: user.membershipType,
      preferences: {
        timezone: user.timezone,
        language: user.language,
        dateFormat: user.dateFormat,
        timeFormat: user.timeFormat
      },
      createdAt: user.createdAt
    },
    tasks: tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      category: task.category ? task.category.name : null,
      tags: task.tags,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    })),
    categories: categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      icon: category.icon,
      createdAt: category.createdAt
    })),
    exportedAt: new Date().toISOString()
  };
  
  // 记录数据导出日志
  logger.info('用户导出数据', {
    userId,
    format,
    taskCount: tasks.length,
    categoryCount: categories.length,
    ip: req.ip
  });
  
  if (format === 'csv') {
    // 简单的CSV格式（仅任务数据）
    const csvHeader = 'Title,Description,Status,Priority,Due Date,Category,Created At\n';
    const csvData = tasks.map(task => 
      `"${task.title}","${task.description || ''}","${task.status}","${task.priority}","${task.dueDate || ''}","${task.category ? task.category.name : ''}","${task.createdAt}"`
    ).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="todolist-export-${Date.now()}.csv"`);
    res.send(csvHeader + csvData);
  } else {
    // JSON格式
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="todolist-export-${Date.now()}.json"`);
    res.json(exportData);
  }
});

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getSessions,
  revokeSession,
  revokeAllOtherSessions,
  getStats,
  deleteAccount,
  exportData
};