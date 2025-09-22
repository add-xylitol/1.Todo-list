const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const userRoutes = require('./users');
const taskRoutes = require('./tasks');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tasks', taskRoutes);

router.use('*', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

module.exports = router;