const { User } = require('../models/index');
const bcrypt = require('bcryptjs');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
    res.json({ success: true, data: { username: user.username, email: user.email } });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    const updates = {};
    if (username) updates.username = username;
    if (email) updates.email = email;
    const [updated] = await User.update(updates, { where: { id: req.user.userId } });
    if (updated === 0) return res.status(404).json({ success: false, message: '用户不存在' });
    const updatedUser = await User.findByPk(req.user.userId);
    res.json({ success: true, data: { username: updatedUser.username, email: updatedUser.email } });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) return res.status(400).json({ success: false, message: '当前密码错误' });
    const newHash = await bcrypt.hash(newPassword, 10);
    console.log('New password hash:', newHash);
    const [updated] = await User.update({ password_hash: newHash }, { where: { id: user.id } });
    console.log('Password update result:', updated);
    if (updated === 0) return res.status(404).json({ success: false, message: '无法更新密码' });
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};