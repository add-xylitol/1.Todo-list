const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateRequest } = require('../utils/validation');
const { orderSchemas } = require('../utils/validation');

// 创建订单
router.post('/', 
  authenticateToken,
  validateRequest(orderSchemas.create),
  orderController.createOrder
);

// 获取用户订单列表
router.get('/', 
  authenticateToken,
  orderController.getOrders
);

// 获取单个订单详情
router.get('/:id', 
  authenticateToken,
  orderController.getOrder
);

// 取消订单
router.post('/:id/cancel', 
  authenticateToken,
  orderController.cancelOrder
);

// 模拟支付成功（开发测试用）
router.post('/:id/simulate-payment', 
  authenticateToken,
  orderController.simulatePayment
);

// 获取订单统计
router.get('/stats/overview', 
  authenticateToken,
  orderController.getOrderStats
);

// 支付回调路由
// 微信支付回调
router.post('/callback/wechat', 
  orderController.handleWechatCallback
);

// 支付宝支付回调
router.post('/callback/alipay', 
  orderController.handleAlipayCallback
);

// 管理员路由 - 获取所有订单
router.get('/admin/all', 
  authenticateToken,
  requireAdmin,
  orderController.getAllOrdersAdmin
);

// 管理员路由 - 更新订单状态
router.put('/admin/:id/status', 
  authenticateToken,
  requireAdmin,
  validateRequest(orderSchemas.updateStatus),
  orderController.updateOrderStatusAdmin
);

module.exports = router;