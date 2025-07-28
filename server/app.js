require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { authenticateToken } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = 8000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/tasks', authenticateToken, taskRoutes);
app.get('/', (req, res) => {
  res.send('<html><body><h1>Welcome to TodoList API</h1></body></html>');
});
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Conditional database setup
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const { sequelize } = require('./config/database');
  sequelize.sync({ force: false }).then(() => {
    console.log('Database synced');
    if (require.main === module) {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    }
  }).catch(err => {
    console.error('Unable to sync database:', err);
  });
} else {
  // For Netlify, use mock database, no sync needed
  console.log('Running on Netlify, using mock database');
  if (require.main === module) {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}

module.exports = app;
