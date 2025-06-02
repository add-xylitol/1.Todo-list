const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const database = require('../config/database');

// 检查是否使用模拟数据库
const isMockMode = database.isMock;
const mockDB = database.mockDB;
let User = null;

if (!isMockMode) {
  try {
    const models = require('../models');
    User = models.User;
  } catch (error) {
    console.log('⚠️  Sequelize 模型加载失败，使用模拟数据库模式');
  }
}

// 简化的错误处理
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 用户注册
const register = asyncHandler(async (req, res) => {
  // 验证输入数据
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '输入验证失败',
      errors: errors.array()
    });
  }

  const { username, email, password } = req.body;

  // 检查用户是否已存在
  let existingUser;
  if (isMockMode) {
    existingUser = await mockDB.findUserByEmail(email);
  } else {
    if (!User) {
      return res.status(500).json({
        success: false,
        message: '数据库连接失败，请配置 PostgreSQL 或使用模拟模式'
      });
    }
    existingUser = await User.findOne({ where: { email } });
  }

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: '用户已存在'
    });
  }

  // 加密密码
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // 创建用户
  let newUser;
  if (isMockMode) {
    newUser = await mockDB.createUser({
      username,
      email,
      password: hashedPassword
    });
  } else {
    newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      isActive: true
    });
  }

  // 生成 JWT token
  const token = jwt.sign(
    { 
      userId: newUser.id, 
      email: newUser.email 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  // 生成刷新 token
  const refreshToken = jwt.sign(
    { userId: newUser.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  logger.info(`用户注册成功: ${email}`);

  res.status(201).json({
    success: true,
    message: '注册成功',
    data: {
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      },
      token,
      refreshToken
    }
  });
});

// 用户登录
const login = asyncHandler(async (req, res) => {
  // 验证请求数据
  const validatedData = validate(userSchemas.login, req.body);
  
  const { email, password, rememberMe, deviceInfo } = validatedData;
  
  // 查找用户
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new ValidationError('邮箱或密码错误', 'credentials', 'INVALID_CREDENTIALS');
  }
  
  // 检查用户状态
  if (!user.isActive) {
    throw new BusinessError('账户已被禁用，请联系管理员', 'ACCOUNT_DISABLED', 403);
  }
  
  // 验证密码
  const isPasswordValid = await PasswordManager.verify(password, user.password);
  if (!isPasswordValid) {
    // 记录登录失败
    await user.increment('failedLoginAttempts');
    await user.update({ lastFailedLoginAt: new Date() });
    
    logger.warn('登录失败 - 密码错误', {
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      failedAttempts: user.failedLoginAttempts + 1
    });
    
    throw new ValidationError('邮箱或密码错误', 'credentials', 'INVALID_CREDENTIALS');
  }
  
  // 检查登录尝试次数
  if (user.failedLoginAttempts >= 5) {
    const lockoutTime = 15 * 60 * 1000; // 15分钟
    const timeSinceLastFailed = Date.now() - new Date(user.lastFailedLoginAt).getTime();
    
    if (timeSinceLastFailed < lockoutTime) {
      throw new BusinessError('账户已被临时锁定，请15分钟后重试', 'ACCOUNT_LOCKED', 423);
    }
  }
  
  // 生成令牌
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    membershipType: user.membershipType
  };
  
  const accessToken = TokenManager.generateAccessToken(tokenPayload);
  const refreshToken = TokenManager.generateRefreshToken(tokenPayload, rememberMe ? '30d' : '7d');
  
  // 创建用户会话
  const sessionData = {
    userId: user.id,
    sessionToken: RandomGenerator.hex(32),
    refreshToken,
    deviceType: deviceInfo?.deviceType || 'web',
    deviceName: deviceInfo?.deviceName || 'Unknown Device',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    location: req.get('CF-IPCountry') || 'Unknown',
    isActive: true,
    expiresAt: new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000)
  };
  
  const session = await UserSession.create(sessionData);
  
  // 更新用户登录信息
  await user.update({
    lastLoginAt: new Date(),
    lastLoginIp: req.ip,
    failedLoginAttempts: 0,
    lastFailedLoginAt: null
  });
  
  // 清理过期会话
  await UserSession.destroy({
    where: {
      userId: user.id,
      expiresAt: { [require('sequelize').Op.lt]: new Date() }
    }
  });
  
  // 记录登录日志
  logger.info('用户登录成功', {
    userId: user.id,
    email: user.email,
    sessionId: session.id,
    deviceType: sessionData.deviceType,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    success: true,
    message: '登录成功',
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        membershipType: user.membershipType,
        membershipExpiresAt: user.membershipExpiresAt,
        preferences: {
          timezone: user.timezone,
          language: user.language,
          dateFormat: user.dateFormat,
          timeFormat: user.timeFormat
        }
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60 // 15分钟
      },
      session: {
        id: session.id,
        deviceType: session.deviceType,
        deviceName: session.deviceName,
        createdAt: session.createdAt
      }
    }
  });
});

// 刷新令牌
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    throw new ValidationError('刷新令牌不能为空', 'refreshToken', 'MISSING_REFRESH_TOKEN');
  }
  
  // 验证刷新令牌
  let decoded;
  try {
    decoded = TokenManager.verifyToken(refreshToken, 'refresh');
  } catch (error) {
    throw new ValidationError('无效的刷新令牌', 'refreshToken', 'INVALID_REFRESH_TOKEN');
  }
  
  // 查找用户会话
  const session = await UserSession.findOne({
    where: {
      userId: decoded.userId,
      refreshToken,
      isActive: true
    },
    include: [{ model: User, as: 'user' }]
  });
  
  if (!session) {
    throw new ValidationError('会话不存在或已失效', 'session', 'SESSION_NOT_FOUND');
  }
  
  // 检查会话是否过期
  if (session.expiresAt < new Date()) {
    await session.update({ isActive: false });
    throw new ValidationError('会话已过期，请重新登录', 'session', 'SESSION_EXPIRED');
  }
  
  // 生成新的访问令牌
  const tokenPayload = {
    userId: session.user.id,
    email: session.user.email,
    membershipType: session.user.membershipType
  };
  
  const newAccessToken = TokenManager.generateAccessToken(tokenPayload);
  
  // 更新会话活动时间
  await session.update({ lastActivityAt: new Date() });
  
  // 记录令牌刷新日志
  logger.info('令牌刷新成功', {
    userId: session.user.id,
    sessionId: session.id,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '令牌刷新成功',
    data: {
      accessToken: newAccessToken,
      expiresIn: 15 * 60 // 15分钟
    }
  });
});

// 用户登出
const logout = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  const userId = req.user.id;
  
  if (sessionId) {
    // 登出指定会话
    await UserSession.update(
      { isActive: false, loggedOutAt: new Date() },
      { where: { id: sessionId, userId } }
    );
  } else {
    // 登出当前会话
    const authHeader = req.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = TokenManager.decodeToken(token);
      
      await UserSession.update(
        { isActive: false, loggedOutAt: new Date() },
        { 
          where: { 
            userId,
            createdAt: { [require('sequelize').Op.gte]: new Date(decoded.iat * 1000) }
          } 
        }
      );
    }
  }
  
  // 记录登出日志
  logger.info('用户登出', {
    userId,
    sessionId,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '登出成功'
  });
});

// 登出所有设备
const logoutAll = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  // 禁用所有活跃会话
  await UserSession.update(
    { isActive: false, loggedOutAt: new Date() },
    { where: { userId, isActive: true } }
  );
  
  // 记录登出日志
  logger.info('用户登出所有设备', {
    userId,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '已登出所有设备'
  });
});

// 邮箱验证
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  
  if (!token) {
    throw new ValidationError('验证令牌不能为空', 'token', 'MISSING_TOKEN');
  }
  
  // 验证令牌
  let decoded;
  try {
    decoded = TokenManager.verifyToken(token, 'verification');
  } catch (error) {
    throw new ValidationError('无效或已过期的验证令牌', 'token', 'INVALID_TOKEN');
  }
  
  // 查找用户
  const user = await User.findOne({
    where: {
      email: decoded.email,
      emailVerificationToken: token
    }
  });
  
  if (!user) {
    throw new NotFoundError('用户不存在或令牌已使用', 'USER_NOT_FOUND');
  }
  
  if (user.isEmailVerified) {
    throw new BusinessError('邮箱已经验证过了', 'EMAIL_ALREADY_VERIFIED');
  }
  
  // 更新用户验证状态
  await user.update({
    isEmailVerified: true,
    emailVerifiedAt: new Date(),
    emailVerificationToken: null
  });
  
  // 记录验证日志
  logger.info('邮箱验证成功', {
    userId: user.id,
    email: user.email,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '邮箱验证成功'
  });
});

// 重发验证邮件
const resendVerification = asyncHandler(async (req, res) => {
  const validatedData = validate(userSchemas.forgotPassword, req.body);
  const { email } = validatedData;
  
  // 查找用户
  const user = await User.findOne({ where: { email } });
  if (!user) {
    // 为了安全，不透露用户是否存在
    return res.json({
      success: true,
      message: '如果邮箱存在，验证邮件已发送'
    });
  }
  
  if (user.isEmailVerified) {
    throw new BusinessError('邮箱已经验证过了', 'EMAIL_ALREADY_VERIFIED');
  }
  
  // 生成新的验证令牌
  const verificationToken = TokenManager.generateVerificationToken({ email });
  
  // 更新用户验证令牌
  await user.update({ emailVerificationToken: verificationToken });
  
  // 发送验证邮件
  try {
    await emailService.sendVerificationEmail(email, verificationToken, user.firstName || user.username);
  } catch (error) {
    logger.error('发送验证邮件失败:', error);
    throw new BusinessError('发送验证邮件失败，请稍后重试', 'EMAIL_SEND_FAILED');
  }
  
  // 记录重发日志
  logger.info('重发验证邮件', {
    userId: user.id,
    email,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '验证邮件已发送'
  });
});

// 忘记密码
const forgotPassword = asyncHandler(async (req, res) => {
  const validatedData = validate(userSchemas.forgotPassword, req.body);
  const { email } = validatedData;
  
  // 查找用户
  const user = await User.findOne({ where: { email } });
  if (!user) {
    // 为了安全，不透露用户是否存在
    return res.json({
      success: true,
      message: '如果邮箱存在，重置密码邮件已发送'
    });
  }
  
  // 生成重置令牌
  const resetToken = TokenManager.generateResetToken({ userId: user.id, email });
  
  // 更新用户重置令牌
  await user.update({
    passwordResetToken: resetToken,
    passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1小时
  });
  
  // 发送重置密码邮件
  try {
    await emailService.sendPasswordResetEmail(email, resetToken, user.firstName || user.username);
  } catch (error) {
    logger.error('发送重置密码邮件失败:', error);
    throw new BusinessError('发送重置密码邮件失败，请稍后重试', 'EMAIL_SEND_FAILED');
  }
  
  // 记录重置密码请求日志
  logger.info('请求重置密码', {
    userId: user.id,
    email,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '重置密码邮件已发送'
  });
});

// 重置密码
const resetPassword = asyncHandler(async (req, res) => {
  const validatedData = validate(userSchemas.resetPassword, req.body);
  const { token, password } = validatedData;
  
  // 验证重置令牌
  let decoded;
  try {
    decoded = TokenManager.verifyToken(token, 'reset');
  } catch (error) {
    throw new ValidationError('无效或已过期的重置令牌', 'token', 'INVALID_TOKEN');
  }
  
  // 查找用户
  const user = await User.findOne({
    where: {
      id: decoded.userId,
      email: decoded.email,
      passwordResetToken: token
    }
  });
  
  if (!user) {
    throw new NotFoundError('用户不存在或令牌已使用', 'USER_NOT_FOUND');
  }
  
  // 检查令牌是否过期
  if (user.passwordResetExpiresAt < new Date()) {
    throw new ValidationError('重置令牌已过期', 'token', 'TOKEN_EXPIRED');
  }
  
  // 哈希新密码
  const hashedPassword = await PasswordManager.hash(password);
  
  // 更新用户密码
  await user.update({
    password: hashedPassword,
    passwordResetToken: null,
    passwordResetExpiresAt: null,
    passwordChangedAt: new Date()
  });
  
  // 禁用所有活跃会话
  await UserSession.update(
    { isActive: false, loggedOutAt: new Date() },
    { where: { userId: user.id, isActive: true } }
  );
  
  // 记录密码重置日志
  logger.info('密码重置成功', {
    userId: user.id,
    email: user.email,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '密码重置成功，请重新登录'
  });
});

// 获取当前用户信息
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password', 'passwordResetToken', 'emailVerificationToken'] }
  });
  
  if (!user) {
    throw new NotFoundError('用户不存在', 'USER_NOT_FOUND');
  }
  
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

// 检查用户名可用性
const checkUsernameAvailability = asyncHandler(async (req, res) => {
  const { username } = req.params;
  
  let existingUser;
  if (isMockMode) {
    existingUser = await mockDB.findUserByUsername(username);
  } else {
    if (!User) {
      return res.status(500).json({
        success: false,
        message: '数据库连接失败'
      });
    }
    existingUser = await User.findOne({ where: { username } });
  }
  
  res.json({
    success: true,
    data: {
      available: !existingUser
    }
  });
});

// 检查邮箱可用性
const checkEmailAvailability = asyncHandler(async (req, res) => {
  const { email } = req.params;
  
  let existingUser;
  if (isMockMode) {
    existingUser = await mockDB.findUserByEmail(email);
  } else {
    if (!User) {
      return res.status(500).json({
        success: false,
        message: '数据库连接失败'
      });
    }
    existingUser = await User.findOne({ where: { email } });
  }
  
  res.json({
    success: true,
    data: {
      available: !existingUser
    }
  });
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  checkUsernameAvailability,
  checkEmailAvailability
};