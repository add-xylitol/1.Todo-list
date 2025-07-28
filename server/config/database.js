console.log('Loading database.js');
const logger = require('../utils/logger');

const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', '..', 'database.sqlite'),
  logging: (msg) => logger.info(msg)
});



module.exports = {
  sequelize,
  isMock: false
};