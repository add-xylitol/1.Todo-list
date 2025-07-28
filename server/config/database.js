console.log('Loading database.js');
const logger = require('../utils/logger');

const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  logging: (msg) => logger.info(msg)
});



module.exports = {
  sequelize,
  isMock: false
};