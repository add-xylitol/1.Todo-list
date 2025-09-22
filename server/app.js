require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const { sequelize } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 8000;
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : '*';
const corsConfig =
  allowedOrigins === '*'
    ? { origin: '*' }
    : { origin: allowedOrigins, credentials: true };

app.use(cors(corsConfig));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

async function startServer() {
  if (!process.env.NETLIFY) {
    await sequelize.authenticate();
    await sequelize.sync();
  }

  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Unable to start server:', error);
    process.exit(1);
  });
}

module.exports = app;
module.exports.startServer = startServer;
