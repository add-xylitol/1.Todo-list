console.log('Loading database.js');
const logger = require('../utils/logger');

const { Sequelize } = require('sequelize');
const path = require('path');

console.log('Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    CONTEXT: process.env.CONTEXT,
    AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME
  });
  const sequelize = new Sequelize({
  dialect: process.env.AWS_LAMBDA_FUNCTION_NAME ? 'mysql' : 'sqlite',
  storage: process.env.AWS_LAMBDA_FUNCTION_NAME ? undefined : '/tmp/database.sqlite',
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