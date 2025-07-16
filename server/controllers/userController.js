const mockDB = require('../services/mockDatabase');
const bcrypt = require('bcryptjs');

exports.getProfile = (req, res) => {
  const user = mockDB.users.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
  res.json({ success: true, data: { username: user.username, email: user.email } });
};

exports.updateProfile = (req, res) => {
  const { username, email } = req.body;
  const userIndex = mockDB.users.findIndex(u => u.id === req.user.userId);
  if (userIndex === -1) return res.status(404).json({ success: false, message: '用户不存在' });
  if (username) mockDB.users[userIndex].username = username;
  if (email) mockDB.users[userIndex].email = email;
  res.json({ success: true, data: mockDB.users[userIndex] });
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userIndex = mockDB.users.findIndex(u => u.id === req.user.userId);
  if (userIndex === -1) return res.status(404).json({ success: false, message: '用户不存在' });
  const user = mockDB.users[userIndex];
  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) return res.status(400).json({ success: false, message: '当前密码错误' });
  user.password_hash = await bcrypt.hash(newPassword, 10);
  res.json({ success: true, message: '密码修改成功' });
};