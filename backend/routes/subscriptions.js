const express = require('express');
const Joi = require('joi');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const { auth, premiumAuth } = require('../middleware/auth');

const router = express.Router();

// 验证schemas
const createSubscriptionSchema = Joi.object({
  priceId: Joi.string().required().messages({
    'any.required': '价格ID不能为空'
  }),
  paymentMethodId: Joi.string().required().messages({
    'any.required': '支付方式ID不能为空'
  })
});

const verifyPaymentSchema = Joi.object({
  platform: Joi.string().valid('stripe', 'apple', 'google', 'wechat', 'alipay').required(),
  transactionId: Joi.string().required(),
  receipt: Joi.string().when('platform', {
    is: Joi.string().valid('apple', 'google'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  productId: Joi.string().required(),
  purchaseTime: Joi.date().required()
});

// 获取订阅计划
router.get('/plans', async (req, res) => {
  try {
    const plans = [
      {
        id: 'free',
        name: '免费版',
        price: 0,
        currency: 'CNY',
        interval: 'lifetime',
        features: [
          '本地存储任务',
          '基础任务管理',
          '最多100个任务',
          '基础分类和标签'
        ],
        limits: {
          tasks: 100,
          categories: 5,
          tags: 10,
          attachments: 0,
          sync: false
        }
      },
      {
        id: 'premium_monthly',
        name: '高级版（月付）',
        price: 100, // 1元 = 100分
        currency: 'CNY',
        interval: 'month',
        stripePrice: process.env.STRIPE_PRICE_MONTHLY,
        features: [
          '云端同步',
          '无限任务数量',
          '高级分类和标签',
          '文件附件支持',
          '多设备同步',
          '数据备份',
          '优先客服支持'
        ],
        limits: {
          tasks: -1, // 无限制
          categories: -1,
          tags: -1,
          attachments: 10, // 10MB
          sync: true
        }
      },
      {
        id: 'premium_yearly',
        name: '高级版（年付）',
        price: 1000, // 10元 = 1000分
        currency: 'CNY',
        interval: 'year',
        stripePrice: process.env.STRIPE_PRICE_YEARLY,
        discount: '17%',
        features: [
          '云端同步',
          '无限任务数量',
          '高级分类和标签',
          '文件附件支持',
          '多设备同步',
          '数据备份',
          '优先客服支持',
          '年付优惠17%'
        ],
        limits: {
          tasks: -1,
          categories: -1,
          tags: -1,
          attachments: 50, // 50MB
          sync: true
        }
      }
    ];
    
    res.json({
      success: true,
      data: { plans }
    });
    
  } catch (error) {
    console.error('获取订阅计划错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 获取用户订阅状态
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    const subscription = {
      type: user.subscription.type,
      status: user.subscription.status,
      expiresAt: user.subscription.expiresAt,
      daysLeft: user.getSubscriptionDaysLeft(),
      isPremium: user.isPremium(),
      autoRenew: user.subscription.autoRenew,
      paymentMethod: user.subscription.paymentMethod
    };
    
    // 如果有Stripe订阅，获取详细信息
    if (user.subscription.stripeSubscriptionId) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          user.subscription.stripeSubscriptionId
        );
        subscription.stripeStatus = stripeSubscription.status;
        subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      } catch (stripeError) {
        console.error('获取Stripe订阅信息错误:', stripeError);
      }
    }
    
    res.json({
      success: true,
      data: { subscription }
    });
    
  } catch (error) {
    console.error('获取订阅状态错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 创建Stripe订阅
router.post('/stripe/create', auth, async (req, res) => {
  try {
    // 验证输入
    const { error, value } = createSubscriptionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    const { priceId, paymentMethodId } = value;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    // 创建或获取Stripe客户
    let customerId = user.subscription.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.username,
        metadata: {
          userId: user._id.toString()
        }
      });
      customerId = customer.id;
      
      user.subscription.stripeCustomerId = customerId;
      await user.save();
    }
    
    // 附加支付方式到客户
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId
    });
    
    // 设置为默认支付方式
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });
    
    // 创建订阅
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: user._id.toString()
      }
    });
    
    // 更新用户订阅信息
    user.subscription.stripeSubscriptionId = subscription.id;
    user.subscription.stripeCustomerId = customerId;
    user.subscription.status = 'active';
    user.subscription.type = priceId.includes('yearly') ? 'yearly' : 'monthly';
    user.subscription.expiresAt = new Date(subscription.current_period_end * 1000);
    user.subscription.autoRenew = true;
    user.subscription.paymentMethod = 'stripe';
    
    await user.save();
    
    res.json({
      success: true,
      message: '订阅创建成功',
      data: {
        subscriptionId: subscription.id,
        status: subscription.status,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret
      }
    });
    
  } catch (error) {
    console.error('创建Stripe订阅错误:', error);
    
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        success: false,
        error: '支付失败：' + error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 取消订阅
router.post('/cancel', premiumAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    // 如果是Stripe订阅，取消Stripe订阅
    if (user.subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
        cancel_at_period_end: true
      });
    }
    
    // 更新用户订阅状态
    user.subscription.autoRenew = false;
    user.subscription.status = 'cancelled';
    
    await user.save();
    
    res.json({
      success: true,
      message: '订阅已取消，将在到期后停止服务'
    });
    
  } catch (error) {
    console.error('取消订阅错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 恢复订阅
router.post('/resume', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    if (user.subscription.status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        error: '订阅未被取消'
      });
    }
    
    // 如果是Stripe订阅，恢复Stripe订阅
    if (user.subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
        cancel_at_period_end: false
      });
    }
    
    // 更新用户订阅状态
    user.subscription.autoRenew = true;
    user.subscription.status = 'active';
    
    await user.save();
    
    res.json({
      success: true,
      message: '订阅已恢复'
    });
    
  } catch (error) {
    console.error('恢复订阅错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 验证移动端支付
router.post('/verify-payment', auth, async (req, res) => {
  try {
    // 验证输入
    const { error, value } = verifyPaymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    const { platform, transactionId, receipt, productId, purchaseTime } = value;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    let isValid = false;
    let subscriptionType = 'monthly';
    let expiresAt = new Date();
    
    switch (platform) {
      case 'apple':
        // 验证苹果应用商店收据
        isValid = await verifyAppleReceipt(receipt, transactionId);
        break;
      case 'google':
        // 验证Google Play收据
        isValid = await verifyGoogleReceipt(receipt, transactionId);
        break;
      case 'wechat':
      case 'alipay':
        // 验证微信/支付宝支付
        isValid = await verifyChinesePayment(platform, transactionId);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: '不支持的支付平台'
        });
    }
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: '支付验证失败'
      });
    }
    
    // 根据产品ID确定订阅类型和到期时间
    if (productId.includes('yearly')) {
      subscriptionType = 'yearly';
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      subscriptionType = 'monthly';
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }
    
    // 更新用户订阅信息
    user.subscription.type = subscriptionType;
    user.subscription.status = 'active';
    user.subscription.expiresAt = expiresAt;
    user.subscription.paymentMethod = platform;
    user.subscription.autoRenew = true;
    
    // 记录支付信息
    user.subscription.paymentHistory.push({
      platform,
      transactionId,
      productId,
      amount: productId.includes('yearly') ? 1000 : 100,
      currency: 'CNY',
      paidAt: new Date(purchaseTime),
      status: 'completed'
    });
    
    await user.save();
    
    res.json({
      success: true,
      message: '支付验证成功，订阅已激活',
      data: {
        subscription: {
          type: user.subscription.type,
          status: user.subscription.status,
          expiresAt: user.subscription.expiresAt,
          daysLeft: user.getSubscriptionDaysLeft()
        }
      }
    });
    
  } catch (error) {
    console.error('验证支付错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// Stripe Webhook处理
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook签名验证失败:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      default:
        console.log(`未处理的事件类型: ${event.type}`);
    }
    
    res.json({ received: true });
    
  } catch (error) {
    console.error('处理Webhook事件错误:', error);
    res.status(500).json({ error: '处理事件失败' });
  }
});

// 获取支付历史
router.get('/payment-history', premiumAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    const paymentHistory = user.subscription.paymentHistory
      .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))
      .slice(0, 50); // 最近50条记录
    
    res.json({
      success: true,
      data: { paymentHistory }
    });
    
  } catch (error) {
    console.error('获取支付历史错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 辅助函数：验证苹果收据
async function verifyAppleReceipt(receipt, transactionId) {
  // TODO: 实现苹果收据验证逻辑
  // 这里需要调用苹果的验证API
  console.log('验证苹果收据:', { receipt, transactionId });
  return true; // 临时返回true，实际需要实现验证逻辑
}

// 辅助函数：验证Google Play收据
async function verifyGoogleReceipt(receipt, transactionId) {
  // TODO: 实现Google Play收据验证逻辑
  console.log('验证Google Play收据:', { receipt, transactionId });
  return true; // 临时返回true，实际需要实现验证逻辑
}

// 辅助函数：验证中国支付平台
async function verifyChinesePayment(platform, transactionId) {
  // TODO: 实现微信/支付宝支付验证逻辑
  console.log('验证中国支付:', { platform, transactionId });
  return true; // 临时返回true，实际需要实现验证逻辑
}

// Webhook处理函数
async function handlePaymentSucceeded(invoice) {
  const customerId = invoice.customer;
  const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
  
  if (user) {
    user.subscription.status = 'active';
    user.subscription.paymentHistory.push({
      platform: 'stripe',
      transactionId: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency.toUpperCase(),
      paidAt: new Date(invoice.created * 1000),
      status: 'completed'
    });
    await user.save();
  }
}

async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;
  const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
  
  if (user) {
    user.subscription.status = 'past_due';
    await user.save();
  }
}

async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;
  const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
  
  if (user) {
    user.subscription.status = 'cancelled';
    user.subscription.autoRenew = false;
    await user.save();
  }
}

async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer;
  const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
  
  if (user) {
    user.subscription.expiresAt = new Date(subscription.current_period_end * 1000);
    user.subscription.status = subscription.status === 'active' ? 'active' : 'cancelled';
    await user.save();
  }
}

module.exports = router;