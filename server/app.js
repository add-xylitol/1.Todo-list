require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

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
const paymentRoutes = require('./routes/payment');
// const adminRoutes = require('./routes/admin'); // 文件不存在，暂时注释

const app = express();
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || 'localhost';

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:8000", "http://localhost:8080"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
    },
  },
}));

// CORS配置
const corsOptions = {
  origin: function (origin, callback) {
    // 允许来自 localhost 和 127.0.0.1 的任何端口，以及 process.env.CORS_ORIGIN 中定义的源
    const allowedOriginsFromEnv = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];
    const defaultAllowedOrigins = [
      'http://localhost:3001', 
      'http://localhost:8000', 
      'http://localhost:9100'
      // 注意：不再需要硬编码 127.0.0.1 的特定端口，因为下面的逻辑会处理
    ];
    const allowedOrigins = [...new Set([...allowedOriginsFromEnv, ...defaultAllowedOrigins])];

    if (!origin || allowedOrigins.some(o => origin.startsWith(o)) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      logger.warn(`CORS: Origin ${origin} not allowed.`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// 压缩中间件
app.use(compression());

// 日志中间件
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/web', express.static(path.join(__dirname, '../web')));

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

// 启动Electron应用的API端点
app.post('/api/launch-electron', (req, res) => {
  const { spawn } = require('child_process');
  const electronPath = path.join(__dirname, '../electron_app');
  
  try {
    // 检查electron_app目录是否存在
    const fs = require('fs');
    if (!fs.existsSync(electronPath)) {
      return res.status(404).json({
        error: 'Electron应用目录不存在',
        path: electronPath
      });
    }
    
    // 启动Electron应用
    const electronProcess = spawn('npm', ['start'], {
      cwd: electronPath,
      detached: true,
      stdio: 'ignore'
    });
    
    electronProcess.unref();
    
    res.json({
      success: true,
      message: 'Electron应用启动中...',
      pid: electronProcess.pid
    });
    
  } catch (error) {
    logger.error('启动Electron应用失败:', error);
    res.status(500).json({
      error: '启动Electron应用失败',
      message: error.message
    });
  }
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/tasks', authenticateToken, taskRoutes);
app.use('/api/categories', authenticateToken, categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payment', paymentRoutes);
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
    if (sequelize) {
      await sequelize.authenticate();
      logger.info('数据库连接成功');
      
      // 同步数据库模型
      if (process.env.NODE_ENV === 'development') {
        await sequelize.sync();
        logger.info('数据库模型同步完成');
      }
    } else {
      logger.info('使用模拟数据库模式，跳过数据库连接和同步');
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
    
    // 优雅关闭 - 仅在生产环境启用
    if (process.env.NODE_ENV === 'production') {
      process.on('SIGTERM', () => {
        logger.info('收到SIGTERM信号，开始优雅关闭...');
        server.close(() => {
          logger.info('HTTP服务器已关闭');
          if (sequelize && !isMock) {
            sequelize.close().then(() => {
              logger.info('数据库连接已关闭');
              process.exit(0);
            });
          } else {
            logger.info('模拟数据库模式，跳过数据库关闭');
            process.exit(0);
          }
        });
      });
    }
    
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
