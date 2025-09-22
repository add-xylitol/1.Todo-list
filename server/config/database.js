console.log('Loading database.js');
const logger = require('../utils/logger');

const { Sequelize } = require('sequelize');

// Prefer DATABASE_URL (e.g. on Railway/Render), fallback to sqlite
const hasUrl = !!process.env.DATABASE_URL;
const sequelize = hasUrl
  ? new Sequelize(process.env.DATABASE_URL, {
      dialectOptions: {
        ssl: process.env.PGSSL === 'require' ? { require: true, rejectUnauthorized: false } : undefined,
      },
      logging: (msg) => logger.info(msg)
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: process.env.SQLITE_PATH || '/tmp/database.sqlite',
      logging: (msg) => logger.info(msg)
    });

module.exports = {
  sequelize,
  isMock: false
};