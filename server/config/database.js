const { Sequelize } = require('sequelize');
const path = require('path');
const logger = require('../utils/logger');

// 检查是否使用模拟数据库
const useMockDB = process.env.USE_MOCK_DB === 'true';

if (useMockDB) {
  console.log('🔧 使用模拟数据库模式 (开发环境)');
  module.exports = {
    sequelize: null,
    mockDB: require('../services/mockDatabase'),
    isMock: true
  };
  return;
}

// 数据库配置
const config = {
  development: {
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'todolist_dev',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    logging: process.env.VERBOSE_LOGGING === 'true' ? console.log : false,
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: false,
    },
  },
  test: {
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'todolist_test',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    logging: false,
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: false,
    },
  },
  production: {
    dialect: 'postgres',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    logging: false,
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: false,
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false,
    } : false,
  },
};

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// 创建Sequelize实例
const sequelize = new Sequelize(dbConfig);

// 导入模型
const User = require('../models/User')(sequelize);
const Task = require('../models/Task')(sequelize);
const Category = require('../models/Category')(sequelize);
const Order = require('../models/Order')(sequelize);
const Subscription = require('../models/Subscription')(sequelize);
const UserSession = require('../models/UserSession')(sequelize);

// 定义关联关系
// 用户和任务的关系
User.hasMany(Task, {
  foreignKey: 'user_id',
  as: 'tasks',
  onDelete: 'CASCADE'
});
Task.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// 用户和分类的关系
User.hasMany(Category, {
  foreignKey: 'user_id',
  as: 'categories',
  onDelete: 'CASCADE'
});
Category.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// 分类和任务的关系
Category.hasMany(Task, {
  foreignKey: 'category_id',
  as: 'tasks',
  onDelete: 'SET NULL'
});
Task.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'category'
});

// 用户和订单的关系
User.hasMany(Order, {
  foreignKey: 'user_id',
  as: 'orders',
  onDelete: 'CASCADE'
});
Order.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// 用户和订阅的关系
User.hasMany(Subscription, {
  foreignKey: 'user_id',
  as: 'subscriptions',
  onDelete: 'CASCADE'
});
Subscription.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// 用户和会话的关系
User.hasMany(UserSession, {
  foreignKey: 'user_id',
  as: 'sessions',
  onDelete: 'CASCADE'
});
UserSession.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// 导出模型和sequelize实例
module.exports = {
  sequelize,
  User,
  Task,
  Category,
  Order,
  Subscription,
  UserSession,
  
  // 数据库操作辅助函数
  async testConnection() {
    try {
      await sequelize.authenticate();
      logger.info('数据库连接测试成功');
      return true;
    } catch (error) {
      logger.error('数据库连接测试失败:', error);
      return false;
    }
  },
  
  async syncDatabase(options = {}) {
    try {
      await sequelize.sync(options);
      logger.info('数据库同步完成');
      return true;
    } catch (error) {
      logger.error('数据库同步失败:', error);
      return false;
    }
  },
  
  async closeConnection() {
    try {
      await sequelize.close();
      logger.info('数据库连接已关闭');
      return true;
    } catch (error) {
      logger.error('关闭数据库连接失败:', error);
      return false;
    }
  }
};