const logger = require('../utils/logger');

// 错误处理中间件
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // 记录错误日志
  logger.error('API错误:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user.id : null
  });

  // Sequelize验证错误
  if (err.name === 'SequelizeValidationError') {
    const message = err.errors.map(error => error.message).join(', ');
    error = {
      message,
      code: 'VALIDATION_ERROR',
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message,
        value: e.value
      }))
    };
    return res.status(400).json({ error });
  }

  // Sequelize唯一约束错误
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0].path;
    const message = getUniqueErrorMessage(field);
    error = {
      message,
      code: 'DUPLICATE_ERROR',
      field
    };
    return res.status(409).json({ error });
  }

  // Sequelize外键约束错误
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    error = {
      message: '关联数据不存在',
      code: 'FOREIGN_KEY_ERROR'
    };
    return res.status(400).json({ error });
  }

  // Sequelize数据库连接错误
  if (err.name === 'SequelizeConnectionError') {
    error = {
      message: '数据库连接失败',
      code: 'DATABASE_CONNECTION_ERROR'
    };
    return res.status(503).json({ error });
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: '无效的访问令牌',
      code: 'INVALID_TOKEN'
    };
    return res.status(401).json({ error });
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      message: '访问令牌已过期',
      code: 'TOKEN_EXPIRED'
    };
    return res.status(401).json({ error });
  }

  // 文件上传错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      message: '文件大小超出限制',
      code: 'FILE_TOO_LARGE',
      maxSize: process.env.MAX_FILE_SIZE || '5MB'
    };
    return res.status(413).json({ error });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error = {
      message: '文件数量超出限制',
      code: 'TOO_MANY_FILES'
    };
    return res.status(413).json({ error });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = {
      message: '不支持的文件类型',
      code: 'UNSUPPORTED_FILE_TYPE'
    };
    return res.status(400).json({ error });
  }

  // 支付相关错误
  if (err.code && err.code.startsWith('PAYMENT_')) {
    return res.status(402).json({
      error: {
        message: err.message || '支付处理失败',
        code: err.code
      }
    });
  }

  // 业务逻辑错误
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code || 'BUSINESS_ERROR'
      }
    });
  }

  // 默认服务器错误
  const statusCode = error.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? '服务器内部错误' 
    : error.message || '服务器内部错误';

  res.status(statusCode).json({
    error: {
      message,
      code: 'INTERNAL_SERVER_ERROR',
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: error
      })
    }
  });
};

// 404处理中间件
const notFound = (req, res, next) => {
  const error = new Error(`路径 ${req.originalUrl} 不存在`);
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  next(error);
};

// 异步错误包装器
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 业务错误类
class BusinessError extends Error {
  constructor(message, code = 'BUSINESS_ERROR', statusCode = 400) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// 验证错误类
class ValidationError extends Error {
  constructor(message, field = null, code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.field = field;
    this.statusCode = 400;
  }
}

// 权限错误类
class PermissionError extends Error {
  constructor(message = '权限不足', code = 'PERMISSION_DENIED') {
    super(message);
    this.name = 'PermissionError';
    this.code = code;
    this.statusCode = 403;
  }
}

// 资源不存在错误类
class NotFoundError extends Error {
  constructor(message = '资源不存在', code = 'RESOURCE_NOT_FOUND') {
    super(message);
    this.name = 'NotFoundError';
    this.code = code;
    this.statusCode = 404;
  }
}

// 支付错误类
class PaymentError extends Error {
  constructor(message, code = 'PAYMENT_ERROR', statusCode = 402) {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// 获取唯一约束错误消息
function getUniqueErrorMessage(field) {
  const messages = {
    email: '邮箱地址已被使用',
    username: '用户名已被使用',
    order_number: '订单号已存在',
    transaction_id: '交易ID已存在',
    session_token: '会话令牌冲突',
    refresh_token: '刷新令牌冲突'
  };
  
  return messages[field] || `${field} 已存在`;
}

// 请求验证中间件
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));
      
      return res.status(400).json({
        error: {
          message: '请求数据验证失败',
          code: 'VALIDATION_ERROR',
          details
        }
      });
    }
    
    next();
  };
};

// 安全头部中间件
const securityHeaders = (req, res, next) => {
  // 防止点击劫持
  res.setHeader('X-Frame-Options', 'DENY');
  
  // 防止MIME类型嗅探
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS保护
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // 引用策略
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // 权限策略
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
  BusinessError,
  ValidationError,
  PermissionError,
  NotFoundError,
  PaymentError,
  validateRequest,
  securityHeaders
};