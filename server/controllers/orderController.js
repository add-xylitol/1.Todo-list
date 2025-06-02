const { Order, User, Subscription } = require('../models');
const { orderSchemas, validate } = require('../utils/validation');
const { BusinessError, ValidationError, NotFoundError, PaymentError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const crypto = require('crypto');

// 创建订单
const createOrder = asyncHandler(async (req, res) => {
  const validatedData = validate(orderSchemas.create, req.body);
  const userId = req.user.id;
  
  // 检查用户是否已有有效订阅
  const activeSubscription = await Subscription.findOne({
    where: {
      userId,
      status: 'active',
      expiresAt: { [Op.gt]: new Date() }
    }
  });
  
  if (activeSubscription && validatedData.productType === activeSubscription.productType) {
    throw new BusinessError('您已拥有有效的订阅，无需重复购买', 'ACTIVE_SUBSCRIPTION_EXISTS');
  }
  
  // 生成订单号
  const orderNumber = generateOrderNumber();
  
  // 计算订单金额（这里可以根据产品类型设置不同价格）
  const amount = calculateOrderAmount(validatedData.productType, validatedData.billingCycle);
  
  // 创建订单
  const order = await Order.create({
    userId,
    orderNumber,
    productType: validatedData.productType,
    amount,
    currency: 'CNY',
    billingCycle: validatedData.billingCycle || 'monthly',
    paymentMethod: validatedData.paymentMethod,
    status: 'pending',
    metadata: validatedData.metadata || {}
  });
  
  // 记录订单创建日志
  logger.info('订单创建成功', {
    userId,
    orderId: order.id,
    orderNumber: order.orderNumber,
    productType: order.productType,
    amount: order.amount,
    paymentMethod: order.paymentMethod,
    ip: req.ip
  });
  
  res.status(201).json({
    success: true,
    message: '订单创建成功',
    data: {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        productType: order.productType,
        amount: order.amount,
        currency: order.currency,
        billingCycle: order.billingCycle,
        paymentMethod: order.paymentMethod,
        status: order.status,
        createdAt: order.createdAt
      }
    }
  });
});

// 获取订单列表
const getOrders = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { 
    page = 1, 
    limit = 20, 
    status, 
    productType, 
    paymentMethod,
    startDate,
    endDate
  } = req.query;
  
  const offset = (page - 1) * limit;
  
  // 构建查询条件
  const where = { userId };
  
  if (status) {
    where.status = status;
  }
  
  if (productType) {
    where.productType = productType;
  }
  
  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt[Op.gte] = new Date(startDate);
    }
    if (endDate) {
      where.createdAt[Op.lte] = new Date(endDate);
    }
  }
  
  const { count, rows: orders } = await Order.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset,
    attributes: {
      exclude: ['metadata'] // 排除敏感信息
    }
  });
  
  const totalPages = Math.ceil(count / limit);
  
  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  });
});

// 获取单个订单
const getOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const order = await Order.findOne({
    where: { id, userId },
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'username', 'email']
    }]
  });
  
  if (!order) {
    throw new NotFoundError('订单不存在', 'ORDER_NOT_FOUND');
  }
  
  res.json({
    success: true,
    data: {
      order
    }
  });
});

// 取消订单
const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user.id;
  
  const order = await Order.findOne({
    where: { id, userId }
  });
  
  if (!order) {
    throw new NotFoundError('订单不存在', 'ORDER_NOT_FOUND');
  }
  
  if (order.status !== 'pending') {
    throw new BusinessError('只能取消待支付的订单', 'CANNOT_CANCEL_ORDER');
  }
  
  // 更新订单状态
  await order.update({
    status: 'cancelled',
    cancelledAt: new Date(),
    metadata: {
      ...order.metadata,
      cancelReason: reason || '用户主动取消',
      cancelledBy: 'user'
    }
  });
  
  // 记录订单取消日志
  logger.info('订单取消', {
    userId,
    orderId: order.id,
    orderNumber: order.orderNumber,
    reason: reason || '用户主动取消',
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '订单已取消',
    data: {
      order
    }
  });
});

// 模拟支付成功（开发测试用）
const simulatePayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { paymentId } = req.body;
  const userId = req.user.id;
  
  const order = await Order.findOne({
    where: { id, userId }
  });
  
  if (!order) {
    throw new NotFoundError('订单不存在', 'ORDER_NOT_FOUND');
  }
  
  if (order.status !== 'pending') {
    throw new BusinessError('订单状态不正确', 'INVALID_ORDER_STATUS');
  }
  
  // 模拟支付成功
  await order.update({
    status: 'paid',
    paidAt: new Date(),
    paymentId: paymentId || `sim_${Date.now()}`,
    metadata: {
      ...order.metadata,
      paymentMethod: 'simulation',
      simulatedPayment: true
    }
  });
  
  // 创建或更新订阅
  await createOrUpdateSubscription(order);
  
  // 更新用户会员状态
  await updateUserMembership(userId, order.productType);
  
  // 记录支付成功日志
  logger.info('模拟支付成功', {
    userId,
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: order.amount,
    paymentId: order.paymentId,
    ip: req.ip
  });
  
  res.json({
    success: true,
    message: '支付成功',
    data: {
      order
    }
  });
});

// 处理微信支付回调（占位符）
const handleWechatCallback = asyncHandler(async (req, res) => {
  // 这里应该验证微信支付回调的签名
  const { out_trade_no, transaction_id, trade_state } = req.body;
  
  if (trade_state === 'SUCCESS') {
    const order = await Order.findOne({
      where: { orderNumber: out_trade_no }
    });
    
    if (order && order.status === 'pending') {
      await order.update({
        status: 'paid',
        paidAt: new Date(),
        paymentId: transaction_id,
        metadata: {
          ...order.metadata,
          wechatTransactionId: transaction_id
        }
      });
      
      // 创建或更新订阅
      await createOrUpdateSubscription(order);
      
      // 更新用户会员状态
      await updateUserMembership(order.userId, order.productType);
      
      logger.info('微信支付成功', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        transactionId: transaction_id
      });
    }
  }
  
  res.json({ code: 'SUCCESS', message: '成功' });
});

// 处理支付宝支付回调（占位符）
const handleAlipayCallback = asyncHandler(async (req, res) => {
  // 这里应该验证支付宝回调的签名
  const { out_trade_no, trade_no, trade_status } = req.body;
  
  if (trade_status === 'TRADE_SUCCESS') {
    const order = await Order.findOne({
      where: { orderNumber: out_trade_no }
    });
    
    if (order && order.status === 'pending') {
      await order.update({
        status: 'paid',
        paidAt: new Date(),
        paymentId: trade_no,
        metadata: {
          ...order.metadata,
          alipayTradeNo: trade_no
        }
      });
      
      // 创建或更新订阅
      await createOrUpdateSubscription(order);
      
      // 更新用户会员状态
      await updateUserMembership(order.userId, order.productType);
      
      logger.info('支付宝支付成功', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tradeNo: trade_no
      });
    }
  }
  
  res.send('success');
});

// 获取订单统计
const getOrderStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { period = '30d' } = req.query;
  
  // 计算时间范围
  const endDate = new Date();
  const startDate = new Date();
  
  switch (period) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
  }
  
  // 获取订单统计
  const [totalOrders, paidOrders, cancelledOrders, pendingOrders] = await Promise.all([
    Order.count({ where: { userId, createdAt: { [Op.gte]: startDate } } }),
    Order.count({ where: { userId, status: 'paid', createdAt: { [Op.gte]: startDate } } }),
    Order.count({ where: { userId, status: 'cancelled', createdAt: { [Op.gte]: startDate } } }),
    Order.count({ where: { userId, status: 'pending', createdAt: { [Op.gte]: startDate } } })
  ]);
  
  // 获取总消费金额
  const totalAmount = await Order.sum('amount', {
    where: {
      userId,
      status: 'paid',
      createdAt: { [Op.gte]: startDate }
    }
  }) || 0;
  
  // 获取按产品类型分组的统计
  const productStats = await Order.findAll({
    where: {
      userId,
      createdAt: { [Op.gte]: startDate }
    },
    attributes: [
      'productType',
      [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
      [require('sequelize').fn('SUM', 
        require('sequelize').literal("CASE WHEN status = 'paid' THEN amount ELSE 0 END")
      ), 'totalAmount']
    ],
    group: ['productType']
  });
  
  // 获取最近的订单
  const recentOrders = await Order.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit: 5,
    attributes: ['id', 'orderNumber', 'productType', 'amount', 'status', 'createdAt']
  });
  
  res.json({
    success: true,
    data: {
      overview: {
        totalOrders,
        paidOrders,
        cancelledOrders,
        pendingOrders,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        successRate: totalOrders > 0 ? Math.round((paidOrders / totalOrders) * 100) : 0
      },
      productStats: productStats.map(stat => ({
        productType: stat.productType,
        count: parseInt(stat.getDataValue('count')),
        totalAmount: parseFloat((stat.getDataValue('totalAmount') || 0).toFixed(2))
      })),
      recentOrders,
      period
    }
  });
});

// 辅助函数：生成订单号
function generateOrderNumber() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TD${timestamp}${random}`;
}

// 辅助函数：计算订单金额
function calculateOrderAmount(productType, billingCycle = 'monthly') {
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

// 辅助函数：创建或更新订阅
async function createOrUpdateSubscription(order) {
  const expiresAt = new Date();
  
  // 根据计费周期计算到期时间
  switch (order.billingCycle) {
    case 'monthly':
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      break;
    case 'quarterly':
      expiresAt.setMonth(expiresAt.getMonth() + 3);
      break;
    case 'yearly':
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      break;
    default:
      expiresAt.setMonth(expiresAt.getMonth() + 1);
  }
  
  // 查找现有订阅
  const existingSubscription = await Subscription.findOne({
    where: {
      userId: order.userId,
      productType: order.productType
    }
  });
  
  if (existingSubscription) {
    // 更新现有订阅
    await existingSubscription.update({
      status: 'active',
      expiresAt,
      lastPaymentAt: new Date(),
      lastPaymentAmount: order.amount
    });
  } else {
    // 创建新订阅
    await Subscription.create({
      userId: order.userId,
      subscriptionId: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      productType: order.productType,
      status: 'active',
      paymentMethod: order.paymentMethod,
      amount: order.amount,
      currency: order.currency,
      billingCycle: order.billingCycle,
      expiresAt,
      lastPaymentAt: new Date(),
      lastPaymentAmount: order.amount
    });
  }
}

// 辅助函数：更新用户会员状态
async function updateUserMembership(userId, productType) {
  await User.update(
    {
      membershipType: productType,
      membershipExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1年后
    },
    { where: { id: userId } }
  );
}

// 管理员获取所有订单
const getAllOrdersAdmin = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, productType } = req.query;
  const offset = (page - 1) * limit;
  
  const whereClause = {};
  if (status) whereClause.status = status;
  if (productType) whereClause.productType = productType;
  
  const { count, rows: orders } = await Order.findAndCountAll({
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
      orders,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    }
  });
});

// 管理员更新订单状态
const updateOrderStatusAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const order = await Order.findByPk(id);
  if (!order) {
    throw new NotFoundError('订单不存在');
  }
  
  await order.update({ status });
  
  res.json({
    success: true,
    message: '订单状态更新成功',
    data: order
  });
});

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  cancelOrder,
  simulatePayment,
  handleWechatCallback,
  handleAlipayCallback,
  getOrderStats,
  getAllOrdersAdmin,
  updateOrderStatusAdmin
};