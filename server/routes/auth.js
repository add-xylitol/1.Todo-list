const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validateRequest } = require('../utils/validation');
const { userSchemas } = require('../utils/validation');

// 用户注册
router.post('/register', 
  validateRequest(userSchemas.register),
  authController.register
);

// 用户登录
router.post('/login', 
  validateRequest(userSchemas.login),
  authController.login
);

// 刷新访问令牌
router.post('/refresh', 
  validateRequest(userSchemas.refreshToken),
  authController.refreshToken
);

// 用户登出
router.post('/logout', 
  authenticateToken,
  authController.logout
);

// 登出所有设备
router.post('/logout-all', 
  authenticateToken,
  authController.logoutAll
);

// 发送邮箱验证码
router.post('/send-verification', 
  validateRequest(userSchemas.sendVerification),
  authController.resendVerification
);

// 验证邮箱
router.post('/verify-email', 
  validateRequest(userSchemas.verifyEmail),
  authController.verifyEmail
);

// 发送密码重置邮件
router.post('/forgot-password', 
  validateRequest(userSchemas.forgotPassword),
  authController.forgotPassword
);

// 重置密码
router.post('/reset-password', 
  validateRequest(userSchemas.resetPassword),
  authController.resetPassword
);

// 获取当前用户信息
router.get('/me', 
  authenticateToken,
  authController.getCurrentUser
);

// 检查用户名是否可用
router.get('/check-username/:username', 
  authController.checkUsernameAvailability
);

// 检查邮箱是否可用
router.get('/check-email/:email', 
  authController.checkEmailAvailability
);

// 验证令牌有效性
router.get('/verify-token', 
  authenticateToken,
  (req, res) => {
    res.json({
      success: true,
      message: '令牌有效',
      data: {
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          membershipType: req.user.membershipType
        }
      }
    });
  }
);

module.exports = router;