const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 限制登录尝试次数
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次尝试
  message: {
    error: '登录尝试次数过多，请15分钟后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 限制注册频率
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 3, // 最多3次注册
  message: {
    error: '注册频率过高，请1小时后再试'
  }
});

// 验证schemas
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required().messages({
    'string.alphanum': '用户名只能包含字母和数字',
    'string.min': '用户名至少3个字符',
    'string.max': '用户名最多30个字符',
    'any.required': '用户名不能为空'
  }),
  email: Joi.string().email().required().messages({
    'string.email': '请输入有效的邮箱地址',
    'any.required': '邮箱不能为空'
  }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.min': '密码至少6个字符',
    'string.max': '密码最多128个字符',
    'any.required': '密码不能为空'
  }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': '两次输入的密码不一致',
    'any.required': '请确认密码'
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': '请输入有效的邮箱地址',
    'any.required': '邮箱不能为空'
  }),
  password: Joi.string().required().messages({
    'any.required': '密码不能为空'
  })
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': '请输入有效的邮箱地址',
    'any.required': '邮箱不能为空'
  })
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': '重置令牌不能为空'
  }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.min': '密码至少6个字符',
    'string.max': '密码最多128个字符',
    'any.required': '密码不能为空'
  }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': '两次输入的密码不一致',
    'any.required': '请确认密码'
  })
});

// 生成JWT令牌
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  
  return { accessToken, refreshToken };
};

// 用户注册
router.post('/register', registerLimiter, async (req, res) => {
  try {
    // 验证输入
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    const { username, email, password } = value;
    
    // 检查用户是否已存在
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: existingUser.email === email ? '邮箱已被注册' : '用户名已被使用'
      });
    }
    
    // 创建新用户
    const user = new User({
      username,
      email,
      password // 密码会在User模型中自动加密
    });
    
    await user.save();
    
    // 生成令牌
    const { accessToken, refreshToken } = generateTokens(user._id);
    
    // 更新用户的refreshToken
    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    await user.save();
    
    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isPremium: user.isPremium(),
          createdAt: user.createdAt
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
    
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 用户登录
router.post('/login', loginLimiter, async (req, res) => {
  try {
    // 验证输入
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    const { email, password } = value;
    
    // 查找用户
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: '邮箱或密码错误'
      });
    }
    
    // 检查账户状态
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: '账户已被暂停，请联系客服'
      });
    }
    
    if (user.status === 'deleted') {
      return res.status(403).json({
        success: false,
        error: '账户已被删除'
      });
    }
    
    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: '邮箱或密码错误'
      });
    }
    
    // 生成令牌
    const { accessToken, refreshToken } = generateTokens(user._id);
    
    // 更新用户登录信息
    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    user.loginCount += 1;
    await user.save();
    
    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isPremium: user.isPremium(),
          subscriptionExpiresAt: user.subscription.expiresAt,
          lastLoginAt: user.lastLoginAt
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
    
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 刷新令牌
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: '刷新令牌不能为空'
      });
    }
    
    // 验证刷新令牌
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: '无效的刷新令牌'
      });
    }
    
    // 查找用户并验证令牌
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        error: '刷新令牌已失效'
      });
    }
    
    // 生成新的令牌
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
    
    // 更新用户的refreshToken
    user.refreshToken = newRefreshToken;
    await user.save();
    
    res.json({
      success: true,
      data: {
        tokens: {
          accessToken,
          refreshToken: newRefreshToken
        }
      }
    });
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: '刷新令牌无效或已过期'
      });
    }
    
    console.error('刷新令牌错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 登出
router.post('/logout', auth, async (req, res) => {
  try {
    // 清除用户的refreshToken
    const user = await User.findById(req.user.userId);
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
    
    res.json({
      success: true,
      message: '登出成功'
    });
    
  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 获取当前用户信息
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.profile.avatar,
          isPremium: user.isPremium(),
          subscription: {
            type: user.subscription.type,
            expiresAt: user.subscription.expiresAt,
            daysLeft: user.getSubscriptionDaysLeft()
          },
          usage: user.usage,
          settings: user.settings,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        }
      }
    });
    
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 忘记密码
router.post('/forgot-password', async (req, res) => {
  try {
    // 验证输入
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    const { email } = value;
    
    const user = await User.findOne({ email });
    if (!user) {
      // 为了安全，不透露用户是否存在
      return res.json({
        success: true,
        message: '如果该邮箱已注册，您将收到密码重置邮件'
      });
    }
    
    // 生成重置令牌
    const resetToken = jwt.sign(
      { userId: user._id, type: 'reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // 这里应该发送邮件，暂时只返回令牌（生产环境中不应该返回）
    // TODO: 集成邮件服务
    
    res.json({
      success: true,
      message: '密码重置邮件已发送',
      // 开发环境下返回令牌，生产环境应删除
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });
    
  } catch (error) {
    console.error('忘记密码错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 重置密码
router.post('/reset-password', async (req, res) => {
  try {
    // 验证输入
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    const { token, password } = value;
    
    // 验证重置令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'reset') {
      return res.status(400).json({
        success: false,
        error: '无效的重置令牌'
      });
    }
    
    // 查找用户并更新密码
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    user.password = password; // 密码会在保存时自动加密
    user.refreshToken = null; // 清除所有刷新令牌
    await user.save();
    
    res.json({
      success: true,
      message: '密码重置成功，请重新登录'
    });
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        error: '重置令牌无效或已过期'
      });
    }
    
    console.error('重置密码错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 修改密码
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // 验证输入
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: '所有字段都不能为空'
      });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: '新密码确认不一致'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: '新密码至少6个字符'
      });
    }
    
    // 查找用户并验证当前密码
    const user = await User.findById(req.user.userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: '当前密码错误'
      });
    }
    
    // 更新密码
    user.password = newPassword;
    user.refreshToken = null; // 清除所有刷新令牌，强制重新登录
    await user.save();
    
    res.json({
      success: true,
      message: '密码修改成功，请重新登录'
    });
    
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

module.exports = router;