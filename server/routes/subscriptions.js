const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateRequest } = require('../utils/validation');
const { subscriptionSchemas } = require('../utils/validation');

// 获取用户订阅列表
router.get('/', 
  authenticateToken,
  subscriptionController.getSubscriptions
);

// 获取单个订阅详情
router.get('/:id', 
  authenticateToken,
  subscriptionController.getSubscription
);

// 取消订阅
router.post('/:id/cancel', 
  authenticateToken,
  subscriptionController.cancelSubscription
);

// 暂停订阅
router.post('/:id/pause', 
  authenticateToken,
  subscriptionController.pauseSubscription
);

// 恢复订阅
router.post('/:id/resume', 
  authenticateToken,
  subscriptionController.resumeSubscription
);

// 续费订阅
router.post('/:id/renew', 
  authenticateToken,
  subscriptionController.renewSubscription
);

// 获取订阅统计
router.get('/stats/overview', 
  authenticateToken,
  subscriptionController.getSubscriptionStats
);

// 检查订阅状态
router.get('/status/check', 
  authenticateToken,
  subscriptionController.checkSubscriptionStatus
);

// 管理员路由 - 获取所有订阅
router.get('/admin/all', 
  authenticateToken,
  requireAdmin,
  subscriptionController.getAllSubscriptionsAdmin
);

// 管理员路由 - 更新订阅状态
router.put('/admin/:id/status', 
  authenticateToken,
  requireAdmin,
  validateRequest(subscriptionSchemas.updateStatus),
  subscriptionController.updateSubscriptionStatusAdmin
);

module.exports = router;