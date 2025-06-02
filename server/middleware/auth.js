const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const database = require('../config/database');

// 检查是否使用模拟数据库
const isMockMode = database.isMock;
const mockDB = database.mockDB;
let User = null;
let UserSession = null;

if (!isMockMode) {
  try {
    const models = require('../models');
    User = models.User;
    UserSession = models.UserSession;
  } catch (error) {
    console.log('⚠️  Sequelize 模型加载失败，使用模拟数据库模式');
  }
} else {
  // 从数据库配置中获取模型
  User = database.User;
  UserSession = database.UserSession;
}

// JWT认证中间件
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问令牌不能为空'
      });
    }

    // 验证 JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 查找用户
    let user;
    if (isMockMode) {
      user = await mockDB.findUserById(decoded.userId);
    } else {
      if (!User) {
        return res.status(500).json({
          success: false,
          message: '数据库连接失败'
        });
      }
      user = await User.findByPk(decoded.userId);
    }

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: '用户不存在或已被禁用'
      });
    }

    // 将用户信息添加到请求对象
    req.user = {
      userId: user.id,
      email: user.email,
      username: user.username
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token 无效'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token 已过期'
      });
    }

    logger.error('认证中间件错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 可选认证中间件（用户可能已登录也可能未登录）
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ['password_hash'] }
      });
      
      if (user && user.is_active) {
        req.user = user;
        req.userId = user.id;
        
        if (decoded.sessionId) {
          const session = await UserSession.findByPk(decoded.sessionId);
          if (session && session.isValid()) {
            await session.updateActivity();
            req.session = session;
          }
        }
      }
    }
    
    next();
  } catch (error) {
    // 可选认证失败时不阻止请求继续
    logger.debug('可选认证失败:', error.message);
    next();
  }
};

// 管理员权限检查
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: '需要登录',
      code: 'LOGIN_REQUIRED'
    });
  }
  
  if (req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({
      error: '需要管理员权限',
      code: 'ADMIN_REQUIRED'
    });
  }
  
  next();
};

// 高级会员权限检查
const requirePremium = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: '需要登录',
      code: 'LOGIN_REQUIRED'
    });
  }
  
  if (!req.user.isPremium()) {
    return res.status(403).json({
      error: '需要高级会员权限',
      code: 'PREMIUM_REQUIRED',
      upgrade_url: '/pricing'
    });
  }
  
  next();
};

// 验证用户邮箱
const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: '需要登录',
      code: 'LOGIN_REQUIRED'
    });
  }
  
  if (!req.user.is_verified) {
    return res.status(403).json({
      error: '需要验证邮箱',
      code: 'EMAIL_VERIFICATION_REQUIRED'
    });
  }
  
  next();
};

// 检查任务创建权限
const checkTaskLimit = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: '需要登录',
        code: 'LOGIN_REQUIRED'
      });
    }
    
    const canCreate = await req.user.canCreateTask();
    if (!canCreate) {
      const remainingTasks = await req.user.getRemainingTasks();
      return res.status(403).json({
        error: '已达到任务数量限制',
        code: 'TASK_LIMIT_EXCEEDED',
        remaining_tasks: remainingTasks,
        upgrade_url: '/pricing'
      });
    }
    
    next();
  } catch (error) {
    logger.error('检查任务限制失败:', error);
    return res.status(500).json({
      error: '服务器错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 速率限制检查
const checkRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const identifier = req.user ? req.user.id : req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // 清理过期的请求记录
    if (requests.has(identifier)) {
      const userRequests = requests.get(identifier).filter(time => time > windowStart);
      requests.set(identifier, userRequests);
    } else {
      requests.set(identifier, []);
    }
    
    const userRequests = requests.get(identifier);
    
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        error: '请求过于频繁',
        code: 'RATE_LIMIT_EXCEEDED',
        retry_after: Math.ceil(windowMs / 1000)
      });
    }
    
    userRequests.push(now);
    next();
  };
};

// 资源所有权检查
const checkResourceOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const userId = req.user.id;
      
      let resource;
      switch (resourceType) {
        case 'task':
          const { Task } = require('../config/database');
          resource = await Task.findByPk(resourceId);
          break;
        case 'category':
          const { Category } = require('../config/database');
          resource = await Category.findByPk(resourceId);
          break;
        default:
          return res.status(400).json({
            error: '不支持的资源类型',
            code: 'UNSUPPORTED_RESOURCE_TYPE'
          });
      }
      
      if (!resource) {
        return res.status(404).json({
          error: '资源不存在',
          code: 'RESOURCE_NOT_FOUND'
        });
      }
      
      if (resource.user_id !== userId) {
        return res.status(403).json({
          error: '无权访问此资源',
          code: 'ACCESS_DENIED'
        });
      }
      
      req.resource = resource;
      next();
    } catch (error) {
      logger.error('检查资源所有权失败:', error);
      return res.status(500).json({
        error: '服务器错误',
        code: 'SERVER_ERROR'
      });
    }
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requirePremium,
  requireVerified,
  checkTaskLimit,
  checkRateLimit,
  checkResourceOwnership
};