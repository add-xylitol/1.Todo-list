const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { sequelize, isMock } = require('./config/database');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');

// 导入路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orders');
const subscriptionRoutes = require('./routes/subscriptions');
// const paymentRoutes = require('./routes/payment'); // 文件不存在，暂时注释
// const adminRoutes = require('./routes/admin'); // 文件不存在，暂时注释

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
    },
  },
}));

// CORS配置
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// 压缩中间件
app.use(compression());

// 日志中间件
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// 请求限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 限制每个IP 15分钟内最多100个请求
  message: {
    error: '请求过于频繁，请稍后再试',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 解析中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../')));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: require('../package.json').version
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/tasks', authenticateToken, taskRoutes);
app.use('/api/categories', authenticateToken, categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
// app.use('/api/payment', paymentRoutes); // 文件不存在，暂时注释
// app.use('/api/admin', authMiddleware, adminRoutes); // 文件不存在，暂时注释

// API文档 (开发环境) - 暂时注释，需要安装swagger-ui-express
// if (process.env.NODE_ENV === 'development' && process.env.ENABLE_SWAGGER === 'true') {
//   const swaggerUi = require('swagger-ui-express');
//   const swaggerDocument = require('./config/swagger.json');
//   app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
// }

// 前端路由处理 (SPA)
app.get('*', (req, res) => {
  // 如果是API请求但没有匹配到路由，返回404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: 'API端点不存在',
      code: 'API_NOT_FOUND',
      path: req.path
    });
  }
  
  // 其他请求返回前端页面
  res.sendFile(path.join(__dirname, '../index.html'));
});

// 错误处理中间件
app.use(errorHandler);

// 数据库连接和服务器启动
async function startServer() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');
    
    // 同步数据库模型
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('数据库模型同步完成');
    }
    
    // 启动服务器
    const server = app.listen(PORT, HOST, () => {
      logger.info(`服务器运行在 http://${HOST}:${PORT}`);
      logger.info(`环境: ${process.env.NODE_ENV}`);
      logger.info(`前端地址: ${process.env.FRONTEND_URL}`);
      
      if (process.env.NODE_ENV === 'development') {
        logger.info(`API文档: http://${HOST}:${PORT}/api-docs`);
        logger.info(`健康检查: http://${HOST}:${PORT}/health`);
      }
    });
    
    // 优雅关闭
    process.on('SIGTERM', () => {
      logger.info('收到SIGTERM信号，开始优雅关闭...');
      server.close(() => {
        logger.info('HTTP服务器已关闭');
        sequelize.close().then(() => {
          logger.info('数据库连接已关闭');
          process.exit(0);
        });
      });
    });
    
    process.on('SIGINT', () => {
      logger.info('收到SIGINT信号，开始优雅关闭...');
      server.close(() => {
        logger.info('HTTP服务器已关闭');
        sequelize.close().then(() => {
          logger.info('数据库连接已关闭');
          process.exit(0);
        });
      });
    });
    
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 启动服务器
startServer();

module.exports = app;