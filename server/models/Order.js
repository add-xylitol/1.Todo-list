const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    order_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      defaultValue: () => {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `TLP${timestamp}${random}`;
      }
    },
    product_type: {
      type: DataTypes.ENUM('premium_monthly', 'premium_yearly', 'premium_lifetime'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: {
          args: 0.01,
          msg: '订单金额必须大于0'
        }
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'CNY',
      allowNull: false
    },
    payment_method: {
      type: DataTypes.ENUM('wechat', 'alipay', 'stripe', 'paypal'),
      allowNull: false
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'cancelled', 'refunded', 'expired'),
      defaultValue: 'pending',
      allowNull: false
    },
    transaction_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true
    },
    payment_data: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    discount_code: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false
    },
    original_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    tax_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false
    },
    billing_info: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: () => {
        // 订单30分钟后过期
        return new Date(Date.now() + 30 * 60 * 1000);
      }
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    refunded_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    refund_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    refund_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['order_number']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['payment_status']
      },
      {
        fields: ['payment_method']
      },
      {
        fields: ['transaction_id']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['expires_at']
      }
    ],
    hooks: {
      beforeUpdate: (order) => {
        if (order.changed('payment_status')) {
          switch (order.payment_status) {
            case 'paid':
              order.paid_at = new Date();
              break;
            case 'cancelled':
              order.cancelled_at = new Date();
              break;
            case 'refunded':
              order.refunded_at = new Date();
              break;
          }
        }
      }
    }
  });

  // 实例方法
  Order.prototype.markAsPaid = async function(transactionId, paymentData = {}) {
    this.payment_status = 'paid';
    this.transaction_id = transactionId;
    this.payment_data = { ...this.payment_data, ...paymentData };
    this.paid_at = new Date();
    await this.save();
    
    // 更新用户会员状态
    await this.updateUserMembership();
  };

  Order.prototype.markAsFailed = async function(reason = '') {
    this.payment_status = 'failed';
    this.notes = reason;
    await this.save();
  };

  Order.prototype.cancel = async function(reason = '') {
    this.payment_status = 'cancelled';
    this.cancelled_at = new Date();
    this.notes = reason;
    await this.save();
  };

  Order.prototype.refund = async function(amount, reason = '') {
    this.payment_status = 'refunded';
    this.refunded_at = new Date();
    this.refund_amount = amount || this.amount;
    this.refund_reason = reason;
    await this.save();
    
    // 如果是全额退款，需要调整用户会员状态
    if (parseFloat(this.refund_amount) >= parseFloat(this.amount)) {
      await this.revertUserMembership();
    }
  };

  Order.prototype.isExpired = function() {
    return this.expires_at && new Date() > this.expires_at && this.payment_status === 'pending';
  };

  Order.prototype.updateUserMembership = async function() {
    const user = await this.getUser();
    if (!user) return;
    
    const now = new Date();
    let membershipExpires = null;
    
    switch (this.product_type) {
      case 'premium_monthly':
        membershipExpires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30天
        break;
      case 'premium_yearly':
        membershipExpires = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 365天
        break;
      case 'premium_lifetime':
        membershipExpires = null; // 终身会员
        break;
    }
    
    // 如果用户已经是会员，延长会员期限
    if (user.isPremium() && user.membership_expires && this.product_type !== 'premium_lifetime') {
      const currentExpires = new Date(user.membership_expires);
      if (currentExpires > now) {
        membershipExpires = new Date(currentExpires.getTime() + (membershipExpires.getTime() - now.getTime()));
      }
    }
    
    await user.update({
      membership_type: this.product_type,
      membership_expires: membershipExpires,
      task_limit: this.product_type === 'free' ? 10 : -1 // -1表示无限制
    });
  };

  Order.prototype.revertUserMembership = async function() {
    const user = await this.getUser();
    if (!user) return;
    
    // 简单处理：将用户降级为免费用户
    // 实际应用中可能需要更复杂的逻辑
    await user.update({
      membership_type: 'free',
      membership_expires: null,
      task_limit: 10
    });
  };

  Order.prototype.getProductInfo = function() {
    const products = {
      premium_monthly: {
        name: '高级会员（月付）',
        duration: '1个月',
        features: ['无限任务', '任务分类', '云端同步', '数据导出', '优先支持']
      },
      premium_yearly: {
        name: '高级会员（年付）',
        duration: '12个月',
        features: ['无限任务', '任务分类', '云端同步', '数据导出', '优先支持', '年付优惠']
      },
      premium_lifetime: {
        name: '高级会员（终身）',
        duration: '终身',
        features: ['无限任务', '任务分类', '云端同步', '数据导出', '优先支持', '终身使用']
      }
    };
    
    return products[this.product_type] || {};
  };

  Order.prototype.toJSON = function() {
    const order = Object.assign({}, this.get());
    
    // 添加产品信息
    order.product_info = this.getProductInfo();
    
    // 添加状态信息
    order.is_expired = this.isExpired();
    order.can_cancel = this.payment_status === 'pending' && !this.isExpired();
    order.can_refund = this.payment_status === 'paid';
    
    // 隐藏敏感信息
    if (order.payment_data && order.payment_data.sensitive) {
      delete order.payment_data.sensitive;
    }
    
    return order;
  };

  // 类方法
  Order.findByUser = function(userId, options = {}) {
    return this.findAll({
      where: { user_id: userId, ...options.where },
      order: [['created_at', 'DESC']],
      ...options
    });
  };

  Order.findByOrderNumber = function(orderNumber) {
    return this.findOne({ where: { order_number: orderNumber } });
  };

  Order.findByTransactionId = function(transactionId) {
    return this.findOne({ where: { transaction_id: transactionId } });
  };

  Order.findPendingOrders = function() {
    return this.findAll({
      where: { payment_status: 'pending' },
      order: [['created_at', 'ASC']]
    });
  };

  Order.findExpiredOrders = function() {
    return this.findAll({
      where: {
        payment_status: 'pending',
        expires_at: {
          [sequelize.Sequelize.Op.lt]: new Date()
        }
      }
    });
  };

  Order.getRevenueStats = async function(startDate, endDate) {
    const where = {
      payment_status: 'paid'
    };
    
    if (startDate && endDate) {
      where.paid_at = {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    }
    
    const orders = await this.findAll({ where });
    
    const stats = {
      total_revenue: 0,
      total_orders: orders.length,
      by_product: {},
      by_payment_method: {},
      by_month: {}
    };
    
    orders.forEach(order => {
      const amount = parseFloat(order.amount);
      stats.total_revenue += amount;
      
      // 按产品类型统计
      if (!stats.by_product[order.product_type]) {
        stats.by_product[order.product_type] = { count: 0, revenue: 0 };
      }
      stats.by_product[order.product_type].count++;
      stats.by_product[order.product_type].revenue += amount;
      
      // 按支付方式统计
      if (!stats.by_payment_method[order.payment_method]) {
        stats.by_payment_method[order.payment_method] = { count: 0, revenue: 0 };
      }
      stats.by_payment_method[order.payment_method].count++;
      stats.by_payment_method[order.payment_method].revenue += amount;
      
      // 按月份统计
      if (order.paid_at) {
        const month = order.paid_at.toISOString().substring(0, 7); // YYYY-MM
        if (!stats.by_month[month]) {
          stats.by_month[month] = { count: 0, revenue: 0 };
        }
        stats.by_month[month].count++;
        stats.by_month[month].revenue += amount;
      }
    });
    
    return stats;
  };

  Order.cleanupExpiredOrders = async function() {
    const expiredOrders = await this.findExpiredOrders();
    
    for (const order of expiredOrders) {
      await order.update({ payment_status: 'expired' });
    }
    
    return expiredOrders.length;
  };

  return Order;
};