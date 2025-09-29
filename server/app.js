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
const shareRoutes = require('./routes/share');

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
app.use('/api/share', authenticateToken, shareRoutes);

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

  // 在SQLite环境下，安全地为旧表添加缺失的列，避免alter带来的整表重建与唯一约束问题
  async function ensureSqliteSchema() {
    try {
      if (sequelize.getDialect() !== 'sqlite') return;
      // 检查Tasks表是否存在shareCode列
      const [taskColumns] = await sequelize.query(`PRAGMA table_info('Tasks');`);
      const hasShareCode = Array.isArray(taskColumns) && taskColumns.some(c => c.name === 'shareCode');
      if (!hasShareCode) {
        console.log('Adding missing column Tasks.shareCode via ALTER TABLE');
        await sequelize.query(`ALTER TABLE "Tasks" ADD COLUMN "shareCode" VARCHAR(255)`);
        console.log('Column Tasks.shareCode added');
      }
      // ensure folder column exists
      const hasFolder = Array.isArray(taskColumns) && taskColumns.some(c => c.name === 'folder');
      if (!hasFolder) {
        console.log('Adding missing column Tasks.folder via ALTER TABLE');
        await sequelize.query(`ALTER TABLE "Tasks" ADD COLUMN "folder" VARCHAR(255)`);
        console.log('Column Tasks.folder added');
      }
      
      // 检查SharedLists缺失列（secondUserId, version, onlyOwnerCanDelete）并补齐
      const [sharedListCols] = await sequelize.query(`PRAGMA table_info('SharedLists');`);
      const colNames = Array.isArray(sharedListCols) ? sharedListCols.map(c => c.name) : [];
      if (colNames.length) {
        if (!colNames.includes('secondUserId')) {
          console.log('Adding missing column SharedLists.secondUserId via ALTER TABLE');
          await sequelize.query(`ALTER TABLE "SharedLists" ADD COLUMN "secondUserId" INTEGER`);
          console.log('Column SharedLists.secondUserId added');
        }
        if (!colNames.includes('version')) {
          console.log('Adding missing column SharedLists.version via ALTER TABLE');
          await sequelize.query(`ALTER TABLE "SharedLists" ADD COLUMN "version" INTEGER DEFAULT 1`);
          console.log('Column SharedLists.version added');
        }
        if (!colNames.includes('onlyOwnerCanDelete')) {
          console.log('Adding missing column SharedLists.onlyOwnerCanDelete via ALTER TABLE');
          await sequelize.query(`ALTER TABLE "SharedLists" ADD COLUMN "onlyOwnerCanDelete" TINYINT(1) DEFAULT 0`);
          console.log('Column SharedLists.onlyOwnerCanDelete added');
        }
      }
      // 其余表（ListChanges）若不存在，将由sequelize.sync({force:false})创建；如果存在但缺列，后续功能使用到时再按需补齐
    } catch (e) {
      console.error('ensureSqliteSchema error:', e);
    }
  }

  (async () => {
    await ensureSqliteSchema();
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
            socket.on('join_list', ({ code }) => {
              if (typeof code === 'string' && code) {
                socket.join(`list:${code}`);
                console.log(`Socket ${socket.id} joined room list:${code}`);
              }
            });
            socket.on('leave_list', ({ code }) => {
              if (typeof code === 'string' && code) {
                socket.leave(`list:${code}`);
                console.log(`Socket ${socket.id} left room list:${code}`);
              }
            });
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
  })();
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
