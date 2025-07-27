const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/index');

// 用户注册
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    console.log('JWT_SECRET during register:', process.env.JWT_SECRET);
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: '邮箱已被注册' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password_hash: hashedPassword });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ data: { user: { id: user.id }, token } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

// 用户登录
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('JWT_SECRET during login:', process.env.JWT_SECRET);
    const user = await User.findOne({ where: { email } });
    console.log('User found:', !!user, 'Email:', email);
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ success: false, message: '用户不存在' });
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log('Password match:', isMatch, 'Provided password:', password);
    if (!isMatch) {
      console.log('Password mismatch for user:', user.id);
      return res.status(401).json({ success: false, message: '密码错误' });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ data: { token } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

module.exports = { register, login };