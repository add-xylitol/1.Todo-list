const logger = require('../utils/logger');

// 始终使用模拟数据库
console.log('🔧 使用模拟数据库模式');
module.exports = {
  sequelize: null,
  mockDB: require('../services/mockDatabase'),
  isMock: true
};