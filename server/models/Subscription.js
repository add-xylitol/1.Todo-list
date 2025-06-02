const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Subscription = sequelize.define('Subscription', {
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
    subscription_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    product_type: {
      type: DataTypes.ENUM('premium_monthly', 'premium_yearly', 'premium_lifetime'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'cancelled', 'expired', 'paused'),
      defaultValue: 'active',
      allowNull: false
    },
    payment_method: {
      type: DataTypes.ENUM('wechat', 'alipay', 'stripe', 'paypal'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'CNY',
      allowNull: false
    },
    billing_cycle: {
      type: DataTypes.ENUM('monthly', 'yearly', 'lifetime'),
      allowNull: false
    },
    next_billing_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    started_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    trial_ends_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      allowNull: false
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
    tableName: 'subscriptions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['subscription_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['next_billing_date']
      },
      {
        fields: ['expires_at']
      }
    ]
  });

  // 实例方法
  Subscription.prototype.cancel = async function(reason = '') {
    this.status = 'cancelled';
    this.cancelled_at = new Date();
    this.metadata = { ...this.metadata, cancellation_reason: reason };
    await this.save();
  };

  Subscription.prototype.pause = async function() {
    this.status = 'paused';
    await this.save();
  };

  Subscription.prototype.resume = async function() {
    this.status = 'active';
    await this.save();
  };

  Subscription.prototype.isActive = function() {
    return this.status === 'active' && (!this.expires_at || new Date() < this.expires_at);
  };

  Subscription.prototype.isExpired = function() {
    return this.expires_at && new Date() > this.expires_at;
  };

  Subscription.prototype.getDaysUntilExpiry = function() {
    if (!this.expires_at) return null;
    
    const now = new Date();
    const expiry = new Date(this.expires_at);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  return Subscription;
};