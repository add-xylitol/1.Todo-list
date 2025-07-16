const jwt = require('jsonwebtoken');
const mockDB = require('../services/mockDatabase');

// JWT认证中间件
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Missing token' });
    }

    // 验证 JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    
    // 查找用户
    const user = await mockDB.findUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // 将用户信息添加到请求对象
    req.user = {
      userId: user.id,
      email: user.email,
      username: user.username
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }

    next(error);
  }
};

module.exports = { authenticateToken };