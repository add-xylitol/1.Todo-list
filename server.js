// 导入必要的模块
require('dotenv').config(); // 加载 .env 文件中的环境变量
const http = require('http');
const app = require('./server/app'); // 导入 Express 应用实例
const { connectDB, sequelize } = require('./server/config/database'); // 导入数据库连接和 Sequelize 实例
const logger = require('./server/utils/logger'); // 导入日志记录器

// 定义服务器端口，优先使用环境变量中的 PORT，否则默认为 3000
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// 创建 HTTP 服务器
const server = http.createServer(app);

// 优雅关闭函数
const gracefulShutdown = async (signal) => {
  logger.info(`接收到 ${signal} 信号，开始优雅关闭...`);
  server.close(async () => {
    logger.info('HTTP 服务器已关闭。');
    try {
      await sequelize.close();
      logger.info('数据库连接已关闭。');
    } catch (error) {
      logger.error('关闭数据库连接时出错:', error);
    }
    process.exit(0);
  });

  // 如果服务器在超时后仍未关闭，则强制退出
  setTimeout(() => {
    logger.warn('优雅关闭超时，强制退出。');
    process.exit(1);
  }, 10000); // 10 秒超时
};

// 监听终止信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  // 在记录错误后，根据需要决定是否退出进程
  // 对于某些类型的错误，可能需要立即停止应用以防止进一步的问题
  // process.exit(1); // 谨慎使用，确保已记录足够信息
});

// 未处理的 Promise拒绝处理
process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的 Promise 拒绝:', { promise, reason });
  // 同样，根据需要决定是否退出进程
  // process.exit(1);
});

// 启动服务器的异步函数
const startServer = async () => {
  try {
    // 1. 连接数据库
    await connectDB();
    logger.info('数据库连接成功。');

    // 2. 同步数据库模型 (仅在开发环境或根据配置)
    if (process.env.NODE_ENV === 'development' && process.env.DB_SYNC_FORCE === 'true') {
      await sequelize.sync({ force: true });
      logger.info('数据库模型已强制同步 (force: true)。');
    } else if (process.env.NODE_ENV === 'development' && process.env.DB_SYNC_ALTER === 'true') {
      await sequelize.sync({ alter: true });
      logger.info('数据库模型已同步 (alter: true)。');
    } else {
      await sequelize.sync();
      logger.info('数据库模型已同步。');
    }

    // 3. 启动 HTTP 服务器
    server.listen(PORT, HOST, () => {
      logger.info(`服务器正在运行在 http://${HOST}:${PORT}`);
      if (process.env.NODE_ENV === 'development' && process.env.ENABLE_SWAGGER === 'true') {
        logger.info(`Swagger API 文档可在 http://${HOST}:${PORT}/api-docs 访问`);
      }
      logger.info('按 CTRL+C 停止服务器。');
    });

  } catch (error) {
    logger.error('启动服务器失败:', error);
    process.exit(1); // 启动失败时退出进程
  }
};

// 调用启动服务器函数
startServer();

// 导出 server 实例，主要用于测试
module.exports = server;