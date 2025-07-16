const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mockDB = require('../services/mockDatabase');

// 用户注册
const register = async (req, res) => {
  const { username, email, password } = req.body;
  const existingUser = mockDB.users.find(u => u.email === email);
  if (existingUser) {
    return res.status(409).json({ success: false, message: '用户已存在' });
  }
  const hashedPassword = await bcrypt.hash(password, 12);
  const newUser = {
    id: mockDB.users.length + 1,
    username,
    email,
    password_hash: hashedPassword,
    created_at: new Date()
  };
  mockDB.users.push(newUser);
  const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.status(201).json({ success: true, data: { user: { id: newUser.id, username, email }, token } });
};

// 用户登录
const login = async (req, res) => {
  const { email, password } = req.body;
  const user = mockDB.users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ success: false, message: '邮箱或密码错误' });
  }
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ success: true, data: { user: { id: user.id, username: user.username, email }, token } });
};

module.exports = {
  register,
  login
};