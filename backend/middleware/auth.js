const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 基础认证中间件
const auth = async (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: '访问被拒绝，未提供认证令牌'
      });
    }
    
    // 检查Bearer格式
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: '认证令牌格式错误'
      });
    }
    
    const token = authHeader.substring(7); // 移除'Bearer '前缀
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: '访问被拒绝，未提供认证令牌'
      });
    }
    
    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 检查用户是否存在
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    // 检查用户状态
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: '账户已被暂停'
      });
    }
    
    if (user.status === 'deleted') {
      return res.status(403).json({
        success: false,
        error: '账户已被删除'
      });
    }
    
    // 将用户信息添加到请求对象
    req.user = {
      userId: user._id,
      username: user.username,
      email: user.email,
      isPremium: user.isPremium(),
      subscription: user.subscription
    };
    
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: '无效的认证令牌'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: '认证令牌已过期'
      });
    }
    
    console.error('认证中间件错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
};

// 可选认证中间件（不强制要求登录）
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // 没有token，继续执行但不设置用户信息
      req.user = null;
      return next();
    }
    
    const token = authHeader.substring(7);
    
    if (!token) {
      req.user = null;
      return next();
    }
    
    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 检查用户是否存在
    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'active') {
      req.user = null;
      return next();
    }
    
    // 设置用户信息
    req.user = {
      userId: user._id,
      username: user.username,
      email: user.email,
      isPremium: user.isPremium(),
      subscription: user.subscription
    };
    
    next();
    
  } catch (error) {
    // 可选认证失败时不返回错误，只是不设置用户信息
    req.user = null;
    next();
  }
};

// 高级用户认证中间件
const premiumAuth = async (req, res, next) => {
  try {
    // 先执行基础认证
    await new Promise((resolve, reject) => {
      auth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // 检查是否为高级用户
    if (!req.user.isPremium) {
      return res.status(403).json({
        success: false,
        error: '此功能需要高级会员',
        code: 'PREMIUM_REQUIRED'
      });
    }
    
    next();
    
  } catch (error) {
    // 如果基础认证失败，错误已经在auth中间件中处理
    return;
  }
};

// 管理员认证中间件
const adminAuth = async (req, res, next) => {
  try {
    // 先执行基础认证
    await new Promise((resolve, reject) => {
      auth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // 检查用户角色
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '需要管理员权限'
      });
    }
    
    next();
    
  } catch (error) {
    return;
  }
};

// 验证用户拥有资源的中间件工厂
const ownershipAuth = (resourceModel, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      // 先执行基础认证
      await new Promise((resolve, reject) => {
        auth(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: '资源ID不能为空'
        });
      }
      
      // 查找资源
      const resource = await resourceModel.findById(resourceId);
      if (!resource) {
        return res.status(404).json({
          success: false,
          error: '资源不存在'
        });
      }
      
      // 检查所有权
      if (resource.userId.toString() !== req.user.userId.toString()) {
        return res.status(403).json({
          success: false,
          error: '无权访问此资源'
        });
      }
      
      // 将资源添加到请求对象
      req.resource = resource;
      
      next();
      
    } catch (error) {
      console.error('所有权验证错误:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误'
      });
    }
  };
};

// API密钥认证中间件（用于第三方集成）
const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.header('X-API-Key');
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: '需要API密钥'
      });
    }
    
    // 查找拥有此API密钥的用户
    const user = await User.findOne({ 'apiKeys.key': apiKey, 'apiKeys.isActive': true });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: '无效的API密钥'
      });
    }
    
    // 更新API密钥使用统计
    const apiKeyObj = user.apiKeys.find(key => key.key === apiKey);
    if (apiKeyObj) {
      apiKeyObj.lastUsedAt = new Date();
      apiKeyObj.usageCount += 1;
      await user.save();
    }
    
    // 设置用户信息
    req.user = {
      userId: user._id,
      username: user.username,
      email: user.email,
      isPremium: user.isPremium(),
      subscription: user.subscription,
      authType: 'api_key'
    };
    
    next();
    
  } catch (error) {
    console.error('API密钥认证错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
};

// 速率限制中间件工厂
const createRateLimit = (windowMs, max, message) => {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message || '请求过于频繁，请稍后再试'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // 基于用户ID的限制
    keyGenerator: (req) => {
      return req.user ? req.user.userId : req.ip;
    }
  });
};

// 使用量检查中间件
const usageCheck = (usageType, limit) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: '需要登录'
        });
      }
      
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: '用户不存在'
        });
      }
      
      // 检查使用量限制
      const currentUsage = user.usage[usageType] || 0;
      const userLimit = req.user.isPremium ? limit.premium : limit.free;
      
      if (currentUsage >= userLimit) {
        return res.status(429).json({
          success: false,
          error: `${usageType}使用量已达上限`,
          code: 'USAGE_LIMIT_EXCEEDED',
          usage: {
            current: currentUsage,
            limit: userLimit,
            type: usageType
          }
        });
      }
      
      next();
      
    } catch (error) {
      console.error('使用量检查错误:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误'
      });
    }
  };
};

module.exports = {
  auth,
  optionalAuth,
  premiumAuth,
  adminAuth,
  ownershipAuth,
  apiKeyAuth,
  createRateLimit,
  usageCheck
};