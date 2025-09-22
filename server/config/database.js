const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const useMySQL =
  process.env.DB_DIALECT === 'mysql' ||
  !!process.env.DB_HOST ||
  !!process.env.AWS_LAMBDA_FUNCTION_NAME;

let sequelize;

if (useMySQL) {
  sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    dialect: 'mysql',
    logging: (msg) => logger.info(msg),
    dialectOptions: process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {},
  });
} else {
  const storagePath = process.env.DB_STORAGE || path.join(__dirname, '..', 'data', 'todolist.sqlite');
  fs.mkdirSync(path.dirname(storagePath), { recursive: true });

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: process.env.DB_LOGGING === 'true' ? (msg) => logger.info(msg) : false,
  });
}

module.exports = {
  sequelize,
};
