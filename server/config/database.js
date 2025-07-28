console.log('Loading database.js');
const logger = require('../utils/logger');

const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: process.env.NODE_ENV === 'production' ? 'mysql' : 'sqlite',
  storage: process.env.NODE_ENV !== 'production' ? '/tmp/database.sqlite' : undefined,
  host: process.env.DB_HOST,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  logging: (msg) => logger.info(msg)
});



module.exports = {
  sequelize,
  isMock: false
};