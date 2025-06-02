const { Subscription, User, Order } = require('../models');
const { subscriptionSchemas, validate } = require('../utils/validation');
const { BusinessError, ValidationError, NotFoundError, PermissionError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// 获取用户订阅列表
const getSubscriptions = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { includeInactive = false } = req.query;
  
  // 构建查询条件
  const where = { userId };
  if (!includeInactive) {
    where.status = { [Op.in]: ['active', 'paused'] };
  }
  
  const subscriptions = await Subscription.findAll({
    where,
    order: [['createdAt', 'DESC']],
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'username', 'email', 'membershipType']
    }]
  });
  
  // 为每个订阅添加状态信息
  const subscriptionsWithStatus = subscriptions.map(subscription => {
    const sub = subscription.toJSON();
    const now = new Date();
    const daysUntilExpiry = Math.ceil((new Date(sub.expiresAt) - now) / (1000 * 60 * 60 * 24));
    
    return {
      ...sub,
      isActive: subscription.isActive(),
      daysUntilExpiry: daysUntilExpiry > 0 ? daysUntilExpiry : 0,
      isExpired: new Date(sub.expiresAt) < now,
      canCancel: ['active', 'paused'].includes(sub.status),
      canPause: sub.status === 'active',
      canResume: sub.status === 'paused'
    };
  });
  
  res.json({
    success: true,
    data: {
      subscriptions: subscriptionsWithStatus
    }
  });
});

// 获取单个订阅详情
const getSubscription = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const subscription = await Subscription.findOne({
    where: { id, userId },
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'username', 'email', 'membershipType']
    }]
  });
  
  if (!subscription) {
    throw new NotFoundError('订阅不存在', 'SUBSCRIPTION_NOT_FOUND');
  }
  
  // 添加订阅状态信息
  const sub = subscription.toJSON();
  const now = new Date();
  const daysUntilExpiry = Math.ceil((new Date(sub.expiresAt) - now) / (1000 * 60 * 60 * 24));
  
  const subscriptionWithStatus = {
    ...sub,
    isActive: subscription.isActive(),
    daysUntilExpiry: daysUntilExpiry > 0 ? daysUntilExpiry : 0,
    isExpired: new Date(sub.expiresAt) < now,
    canCancel: ['active', 'paused'].includes(sub.status),
    canPause: sub.status === 'active',
    canResume: sub.status === 'paused'
  };
  
  res.json({
    success: true,
    data: {
      subscription: subscriptionWithStatus
    }
  });
});

// 取消订阅
const cancelSubscription = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, cancelImmediately = false } = req.body;
  const userId = req.user.id;
  
  const subscription = await Subscription.findOne({
    where: { id, userId }
  });
  
  if (!subscription) {
    throw new NotFoundError('订阅不存在', 'SUBSCRIPTION_NOT_FOUND');
  }
  
  if (!['active', 'paused'].includes(subscription.status)) {
    throw new BusinessError('只能取消活跃或暂停的订阅', 'CANNOT_CANCEL_SUBSCRIPTION');
  }
  
  // 取消订阅
  const cancelledAt = new Date();
  let expiresAt = subscription.expiresAt;
  
  if (cancelImmediately) {
    // 立即取消，设置到期时间为当前时间
    expiresAt = cancelledAt;
  }
  
  await subscription.update({
    status: 'cancelled',
    cancelledAt,
    expiresAt,
    metadata: {
      ...subscription.metadata,
      cancelReason: reason || '用户主动取消',
      cancelledBy: 'user',
      cancelImmediately
    }
  });
  
  // 如果立即取消，更新用户会员状态
  if (cancelImmediately) {
    await User.update(
      {
        membershipType: 'free',
        membershipExpiresAt: null
      },
      { where: { id: userId } }
    );
  }
  
  // 记录取消订阅日志
  logger.info('订阅取消', {
    userId,
    subscriptionId: subscription.id,
    productType: subscription.productType,
    reason: reason || '用户主动取消',
    cancelImmediately,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: cancelImmediately ? '订阅已立即取消' : '订阅将在当前周期结束后取消',
    data: {
      subscription
    }
  });
});

// 暂停订阅
const pauseSubscription = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user.id;
  
  const subscription = await Subscription.findOne({
    where: { id, userId }
  });
  
  if (!subscription) {
    throw new NotFoundError('订阅不存在', 'SUBSCRIPTION_NOT_FOUND');
  }
  
  if (subscription.status !== 'active') {
    throw new BusinessError('只能暂停活跃的订阅', 'CANNOT_PAUSE_SUBSCRIPTION');
  }
  
  // 暂停订阅
  await subscription.update({
    status: 'paused',
    pausedAt: new Date(),
    metadata: {
      ...subscription.metadata,
      pauseReason: reason || '用户主动暂停',
      pausedBy: 'user'
    }
  });
  
  // 记录暂停订阅日志
  logger.info('订阅暂停', {
    userId,
    subscriptionId: subscription.id,
    productType: subscription.productType,
    reason: reason || '用户主动暂停',
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '订阅已暂停',
    data: {
      subscription
    }
  });
});

// 恢复订阅
const resumeSubscription = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const subscription = await Subscription.findOne({
    where: { id, userId }
  });
  
  if (!subscription) {
    throw new NotFoundError('订阅不存在', 'SUBSCRIPTION_NOT_FOUND');
  }
  
  if (subscription.status !== 'paused') {
    throw new BusinessError('只能恢复暂停的订阅', 'CANNOT_RESUME_SUBSCRIPTION');
  }
  
  // 检查订阅是否已过期
  if (new Date() > new Date(subscription.expiresAt)) {
    throw new BusinessError('订阅已过期，无法恢复', 'SUBSCRIPTION_EXPIRED');
  }
  
  // 恢复订阅
  await subscription.update({
    status: 'active',
    resumedAt: new Date(),
    metadata: {
      ...subscription.metadata,
      resumedBy: 'user',
      resumedAt: new Date().toISOString()
    }
  });
  
  // 记录恢复订阅日志
  logger.info('订阅恢复', {
    userId,
    subscriptionId: subscription.id,
    productType: subscription.productType,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '订阅已恢复',
    data: {
      subscription
    }
  });
});

// 续费订阅
const renewSubscription = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { billingCycle } = req.body;
  const userId = req.user.id;
  
  const subscription = await Subscription.findOne({
    where: { id, userId }
  });
  
  if (!subscription) {
    throw new NotFoundError('订阅不存在', 'SUBSCRIPTION_NOT_FOUND');
  }
  
  // 计算续费金额
  const amount = calculateRenewalAmount(subscription.productType, billingCycle || subscription.billingCycle);
  
  // 创建续费订单
  const renewalOrder = await Order.create({
    userId,
    orderNumber: generateOrderNumber(),
    productType: subscription.productType,
    amount,
    currency: subscription.currency,
    billingCycle: billingCycle || subscription.billingCycle,
    paymentMethod: subscription.paymentMethod,
    status: 'pending',
    metadata: {
      type: 'renewal',
      originalSubscriptionId: subscription.id,
      renewalFor: subscription.subscriptionId
    }
  });
  
  // 记录续费订单创建日志
  logger.info('续费订单创建', {
    userId,
    subscriptionId: subscription.id,
    orderId: renewalOrder.id,
    orderNumber: renewalOrder.orderNumber,
    amount,
    billingCycle: billingCycle || subscription.billingCycle,
    ip: req.ip
  });
  
  res.status(201).json({
    success: true,
    message: '续费订单创建成功',
    data: {
      order: {
        id: renewalOrder.id,
        orderNumber: renewalOrder.orderNumber,
        amount: renewalOrder.amount,
        currency: renewalOrder.currency,
        billingCycle: renewalOrder.billingCycle,
        status: renewalOrder.status
      },
      subscription
    }
  });
});

// 获取订阅统计
const getSubscriptionStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  // 获取订阅统计
  const [activeSubscriptions, pausedSubscriptions, cancelledSubscriptions, expiredSubscriptions] = await Promise.all([
    Subscription.count({ where: { userId, status: 'active' } }),
    Subscription.count({ where: { userId, status: 'paused' } }),
    Subscription.count({ where: { userId, status: 'cancelled' } }),
    Subscription.count({ 
      where: { 
        userId, 
        status: { [Op.in]: ['active', 'paused'] },
        expiresAt: { [Op.lt]: new Date() }
      } 
    })
  ]);
  
  // 获取当前活跃订阅
  const currentSubscription = await Subscription.findOne({
    where: {
      userId,
      status: 'active',
      expiresAt: { [Op.gt]: new Date() }
    },
    order: [['expiresAt', 'DESC']]
  });
  
  // 计算总消费
  const totalSpent = await Subscription.sum('lastPaymentAmount', {
    where: {
      userId,
      status: { [Op.in]: ['active', 'paused', 'cancelled'] }
    }
  }) || 0;
  
  // 获取订阅历史
  const subscriptionHistory = await Subscription.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit: 10,
    attributes: [
      'id', 'subscriptionId', 'productType', 'status', 
      'amount', 'billingCycle', 'createdAt', 'expiresAt'
    ]
  });
  
  let currentSubscriptionInfo = null;
  if (currentSubscription) {
    const daysUntilExpiry = Math.ceil(
      (new Date(currentSubscription.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)
    );
    
    currentSubscriptionInfo = {
      id: currentSubscription.id,
      productType: currentSubscription.productType,
      status: currentSubscription.status,
      amount: currentSubscription.amount,
      billingCycle: currentSubscription.billingCycle,
      expiresAt: currentSubscription.expiresAt,
      daysUntilExpiry: daysUntilExpiry > 0 ? daysUntilExpiry : 0,
      isExpiringSoon: daysUntilExpiry <= 7 && daysUntilExpiry > 0
    };
  }
  
  res.json({
    success: true,
    data: {
      overview: {
        activeSubscriptions,
        pausedSubscriptions,
        cancelledSubscriptions,
        expiredSubscriptions,
        totalSpent: parseFloat(totalSpent.toFixed(2))
      },
      currentSubscription: currentSubscriptionInfo,
      subscriptionHistory
    }
  });
});

// 检查订阅状态
const checkSubscriptionStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  // 获取用户当前有效订阅
  const activeSubscription = await Subscription.findOne({
    where: {
      userId,
      status: 'active',
      expiresAt: { [Op.gt]: new Date() }
    },
    order: [['expiresAt', 'DESC']]
  });
  
  // 获取用户信息
  const user = await User.findByPk(userId, {
    attributes: ['id', 'membershipType', 'membershipExpiresAt']
  });
  
  let subscriptionStatus = {
    hasActiveSubscription: false,
    membershipType: 'free',
    features: {
      maxTasks: 50,
      maxCategories: 5,
      advancedFeatures: false,
      prioritySupport: false
    }
  };
  
  if (activeSubscription) {
    const daysUntilExpiry = Math.ceil(
      (new Date(activeSubscription.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)
    );
    
    subscriptionStatus = {
      hasActiveSubscription: true,
      membershipType: activeSubscription.productType,
      subscription: {
        id: activeSubscription.id,
        productType: activeSubscription.productType,
        status: activeSubscription.status,
        expiresAt: activeSubscription.expiresAt,
        daysUntilExpiry: daysUntilExpiry > 0 ? daysUntilExpiry : 0,
        isExpiringSoon: daysUntilExpiry <= 7 && daysUntilExpiry > 0
      },
      features: getFeaturesByMembershipType(activeSubscription.productType)
    };
  }
  
  res.json({
    success: true,
    data: subscriptionStatus
  });
});

// 辅助函数：生成订单号
function generateOrderNumber() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TD${timestamp}${random}`;
}

// 辅助函数：计算续费金额
function calculateRenewalAmount(productType, billingCycle) {
  const prices = {
    premium: {
      monthly: 29.99,
      quarterly: 79.99,
      yearly: 299.99
    },
    pro: {
      monthly: 59.99,
      quarterly: 159.99,
      yearly: 599.99
    }
  };
  
  return prices[productType]?.[billingCycle] || 29.99;
}

// 辅助函数：根据会员类型获取功能权限
function getFeaturesByMembershipType(membershipType) {
  const features = {
    free: {
      maxTasks: 50,
      maxCategories: 5,
      advancedFeatures: false,
      prioritySupport: false,
      cloudSync: false,
      teamCollaboration: false
    },
    premium: {
      maxTasks: 500,
      maxCategories: 20,
      advancedFeatures: true,
      prioritySupport: false,
      cloudSync: true,
      teamCollaboration: false
    },
    pro: {
      maxTasks: -1, // 无限制
      maxCategories: -1, // 无限制
      advancedFeatures: true,
      prioritySupport: true,
      cloudSync: true,
      teamCollaboration: true
    }
  };
  
  return features[membershipType] || features.free;
}

// 管理员获取所有订阅
const getAllSubscriptionsAdmin = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, productType } = req.query;
  const offset = (page - 1) * limit;
  
  const whereClause = {};
  if (status) whereClause.status = status;
  if (productType) whereClause.productType = productType;
  
  const { count, rows: subscriptions } = await Subscription.findAndCountAll({
    where: whereClause,
    include: [{
      model: User,
      attributes: ['id', 'username', 'email']
    }],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
  
  res.json({
    success: true,
    data: {
      subscriptions,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    }
  });
});

// 管理员更新订阅状态
const updateSubscriptionStatusAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const subscription = await Subscription.findByPk(id);
  if (!subscription) {
    throw new NotFoundError('订阅不存在');
  }
  
  await subscription.update({ status });
  
  res.json({
    success: true,
    message: '订阅状态更新成功',
    data: subscription
  });
});

module.exports = {
  getSubscriptions,
  getSubscription,
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  renewSubscription,
  getSubscriptionStats,
  checkSubscriptionStatus,
  getAllSubscriptionsAdmin,
  updateSubscriptionStatusAdmin
};