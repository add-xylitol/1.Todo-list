const express = require('express');
const router = express.Router();

// 导入各个路由模块
const authRoutes = require('./auth');
const userRoutes = require('./users');
const taskRoutes = require('./tasks');
const categoryRoutes = require('./categories');
const orderRoutes = require('./orders');
const subscriptionRoutes = require('./subscriptions');

// API 健康检查
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API 服务正常运行',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API 信息
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'TodoList API',
      version: '1.0.0',
      description: '一个功能完整的待办事项管理系统 API',
      author: 'AI Assistant',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        tasks: '/api/tasks',
        categories: '/api/categories',
        orders: '/api/orders',
        subscriptions: '/api/subscriptions'
      },
      features: [
        '用户认证与授权',
        '任务管理',
        '分类管理',
        '订单管理',
        '订阅管理',
        '数据统计',
        '文件导出'
      ]
    }
  });
});

// 注册路由
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tasks', taskRoutes);
router.use('/categories', categoryRoutes);
router.use('/orders', orderRoutes);
router.use('/subscriptions', subscriptionRoutes);

// 404 处理
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的 API 端点不存在',
    error: 'ENDPOINT_NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;