const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, checkAdmin } = require('../middleware/auth');
const { validateRequest } = require('../utils/validation');
const { userSchemas } = require('../utils/validation');

// 获取用户资料
router.get('/profile', 
  authenticateToken,
  userController.getProfile
);

// 更新用户资料
router.put('/profile', 
  authenticateToken,
  validateRequest(userSchemas.updateProfile),
  userController.updateProfile
);

// 修改密码
router.put('/password', 
  authenticateToken,
  validateRequest(userSchemas.changePassword),
  userController.changePassword
);

// 获取用户会话
router.get('/sessions', 
  authenticateToken,
  userController.getSessions
);

// 撤销指定会话
router.delete('/sessions/:sessionId', 
  authenticateToken,
  userController.revokeSession
);

// 撤销其他所有会话
router.delete('/sessions', 
  authenticateToken,
  userController.revokeAllOtherSessions
);

// 获取用户统计
router.get('/stats', 
  authenticateToken,
  userController.getStats
);

// 获取任务完成趋势
router.get('/stats/completion-trend', 
  authenticateToken,
  userController.getStats
);

// 获取任务优先级分布
router.get('/stats/priority-distribution', 
  authenticateToken,
  userController.getStats
);

// 获取分类任务统计
router.get('/stats/category-stats', 
  authenticateToken,
  userController.getStats
);

// 导出用户数据 (JSON)
router.get('/export/json', 
  authenticateToken,
  userController.exportData
);

// 导出用户数据 (CSV)
router.get('/export/csv', 
  authenticateToken,
  userController.exportData
);

// 删除用户账户
router.delete('/account', 
  authenticateToken,
  validateRequest(userSchemas.deleteAccount),
  userController.deleteAccount
);

// 管理员路由暂时注释掉，因为控制器中未实现这些方法
// router.get('/', 
//   authenticateToken,
//   checkAdmin,
//   userController.getAllUsers
// );

// router.get('/:userId', 
//   authenticateToken,
//   checkAdmin,
//   userController.getUserById
// );

// router.put('/:userId/status', 
//   authenticateToken,
//   checkAdmin,
//   validateRequest(userSchemas.updateUserStatus),
//   userController.updateUserStatus
// );

// router.put('/:userId/reset-password', 
//   authenticateToken,
//   checkAdmin,
//   userController.adminResetPassword
// );

module.exports = router;