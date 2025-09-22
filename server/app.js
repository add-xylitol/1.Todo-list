require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { authenticateToken } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 8000;
// Trust first proxy (Cloudflare/Reverse proxies)
app.set('trust proxy', 1);

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/tasks', authenticateToken, taskRoutes);

// Health endpoints for tunnels/load balancers
app.get('/healthz', (req, res) => res.status(200).json({ ok: true }));
app.get('/readyz', async (req, res) => {
  try {
    const { sequelize } = require('./config/database');
    if (sequelize && typeof sequelize.authenticate === 'function') {
      await sequelize.authenticate();
      return res.status(200).json({ ready: true });
    }
    return res.status(200).json({ ready: true, note: 'No DB auth required' });
  } catch (e) {
    return res.status(503).json({ ready: false, error: e.message });
  }
});

// Serve index.html for root to load the H5 app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Only initialize DB and Socket.IO when not running in serverless environment
if (!process.env.NETLIFY) {
  const { sequelize } = require('./config/database');
  sequelize
    .sync({ force: false })
    .then(() => {
      console.log('Database synced');
      if (require.main === module) {
        // Create HTTP server and bind Socket.IO
        const server = http.createServer(app);
        const io = new Server(server, {
          cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
        });

        // Expose io to routes/controllers via req.app.get('io')
        app.set('io', io);

        io.on('connection', (socket) => {
          console.log('Socket connected:', socket.id);
          socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
        });

        server.listen(PORT, () => {
          console.log(`Server running on port ${PORT}`);
        });
      }
    })
    .catch((err) => {
      console.error('Unable to sync database:', err);
    });
} else {
  // For Netlify, use mock database, no sync or Socket.IO needed
  console.log('Running on Netlify, using mock database');
  if (require.main === module) {
    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}

module.exports = app;
