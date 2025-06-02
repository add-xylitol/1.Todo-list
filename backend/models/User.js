const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // 基本信息
  username: {
    type: String,
    required: [true, '用户名不能为空'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少3个字符'],
    maxlength: [30, '用户名最多30个字符'],
    match: [/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线']
  },
  email: {
    type: String,
    required: [true, '邮箱不能为空'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, '请输入有效的邮箱地址']
  },
  password: {
    type: String,
    required: [true, '密码不能为空'],
    minlength: [6, '密码至少6个字符'],
    select: false // 默认查询时不返回密码
  },
  
  // 个人资料
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, '名字最多50个字符']
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, '姓氏最多50个字符']
    },
    avatar: {
      type: String,
      default: null
    },
    timezone: {
      type: String,
      default: 'Asia/Shanghai'
    },
    language: {
      type: String,
      enum: ['zh-CN', 'en-US', 'ja-JP'],
      default: 'zh-CN'
    }
  },
  
  // 订阅信息
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'premium'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'expired'],
      default: 'inactive'
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    stripeCustomerId: {
      type: String,
      default: null
    },
    stripeSubscriptionId: {
      type: String,
      default: null
    },
    autoRenew: {
      type: Boolean,
      default: true
    }
  },
  
  // 使用统计
  usage: {
    totalTasks: {
      type: Number,
      default: 0
    },
    completedTasks: {
      type: Number,
      default: 0
    },
    lastSyncAt: {
      type: Date,
      default: null
    },
    syncCount: {
      type: Number,
      default: 0
    }
  },
  
  // 设置
  settings: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      marketing: {
        type: Boolean,
        default: false
      }
    },
    privacy: {
      profilePublic: {
        type: Boolean,
        default: false
      },
      dataSharing: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // 账户状态
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  
  // 登录信息
  lastLoginAt: {
    type: Date,
    default: null
  },
  loginCount: {
    type: Number,
    default: 0
  },
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天
    }
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.refreshTokens;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      delete ret.__v;
      return ret;
    }
  }
});

// 索引
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'subscription.status': 1 });
userSchema.index({ createdAt: -1 });

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 实例方法：验证密码
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 实例方法：检查是否为高级用户
userSchema.methods.isPremium = function() {
  return this.subscription.plan === 'premium' && 
         this.subscription.status === 'active' &&
         this.subscription.endDate > new Date();
};

// 实例方法：获取订阅剩余天数
userSchema.methods.getSubscriptionDaysLeft = function() {
  if (!this.isPremium()) return 0;
  const now = new Date();
  const endDate = new Date(this.subscription.endDate);
  const diffTime = endDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// 实例方法：更新使用统计
userSchema.methods.updateUsage = function(taskCount = 0, completedCount = 0) {
  this.usage.totalTasks += taskCount;
  this.usage.completedTasks += completedCount;
  this.usage.lastSyncAt = new Date();
  this.usage.syncCount += 1;
  return this.save();
};

// 静态方法：查找活跃的高级用户
userSchema.statics.findPremiumUsers = function() {
  return this.find({
    'subscription.plan': 'premium',
    'subscription.status': 'active',
    'subscription.endDate': { $gt: new Date() }
  });
};

// 静态方法：查找即将到期的订阅
userSchema.statics.findExpiringSubscriptions = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    'subscription.plan': 'premium',
    'subscription.status': 'active',
    'subscription.endDate': {
      $gte: new Date(),
      $lte: futureDate
    }
  });
};

module.exports = mongoose.model('User', userSchema);