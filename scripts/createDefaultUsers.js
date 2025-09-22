require('dotenv').config();
const bcrypt = require('bcryptjs');
const logger = require('../server/utils/logger');
const { sequelize } = require('../server/config/database');
const { User } = require('../server/models');

const users = [
  {
    username: process.env.SEED_USER1_NAME || 'PartnerOne',
    email: process.env.SEED_USER1_EMAIL || 'partner.one@example.com',
    password: process.env.SEED_USER1_PASSWORD || 'TodoList#1',
  },
  {
    username: process.env.SEED_USER2_NAME || 'PartnerTwo',
    email: process.env.SEED_USER2_EMAIL || 'partner.two@example.com',
    password: process.env.SEED_USER2_PASSWORD || 'TodoList#2',
  },
];

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    for (const user of users) {
      const existing = await User.findOne({ where: { email: user.email } });
      if (existing) {
        logger.info(`User ${user.email} already exists, skipping.`);
        continue;
      }

      const password_hash = await bcrypt.hash(user.password, 10);
      await User.create({
        username: user.username,
        email: user.email,
        password_hash,
      });
      logger.info(`Created account for ${user.username} (${user.email}).`);
    }

    await sequelize.close();
    logger.info('Seeding complete.');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to seed default users', error);
    process.exit(1);
  }
})();
