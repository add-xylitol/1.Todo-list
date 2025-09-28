const { SharedList, ListChange, Task, User } = require('../models');

function randomCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

exports.create = async (req, res) => {
  try {
    const { code, onlyOwnerCanDelete = false } = req.body || {};
    const creatorId = req.user.userId;
    const finalCode = (code && String(code).trim()) || randomCode();
    const exists = await SharedList.findOne({ where: { code: finalCode } });
    if (exists) return res.status(409).json({ success: false, message: '共享码已存在' });
    const rec = await SharedList.create({ code: finalCode, ownerId: creatorId, version: 1, onlyOwnerCanDelete });
    return res.status(201).json({ success: true, data: rec });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.join = async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ success: false, message: '缺少共享码' });
    const list = await SharedList.findOne({ where: { code } });
    if (!list) return res.status(404).json({ success: false, message: '共享不存在' });
    const uid = req.user.userId;
    if (list.ownerId !== uid && list.secondUserId && list.secondUserId !== uid) {
      return res.status(403).json({ success: false, message: '该共享只允许两人加入' });
    }
    if (list.ownerId !== uid && !list.secondUserId) {
      await SharedList.update({ secondUserId: uid }, { where: { code } });
    }
    return res.json({ success: true, data: { code, version: list.version, onlyOwnerCanDelete: list.onlyOwnerCanDelete } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.status = async (req, res) => {
  try {
    const { code } = req.params;
    const list = await SharedList.findOne({ where: { code } });
    if (!list) return res.status(404).json({ success: false, message: '共享不存在' });
    const uid = req.user.userId;
    const isMember = uid === list.ownerId || uid === list.secondUserId;
    if (!isMember) return res.status(403).json({ success: false, message: '无权访问该共享' });
    const tasks = await Task.findAll({ where: { shareCode: code } });
    return res.json({ success: true, data: { code, version: list.version, onlyOwnerCanDelete: list.onlyOwnerCanDelete, tasks } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.history = async (req, res) => {
  try {
    const { code } = req.params;
    const list = await SharedList.findOne({ where: { code } });
    if (!list) return res.status(404).json({ success: false, message: '共享不存在' });
    const uid = req.user.userId;
    const isMember = uid === list.ownerId || uid === list.secondUserId;
    if (!isMember) return res.status(403).json({ success: false, message: '无权访问该共享' });
    const records = await ListChange.findAll({ where: { listCode: code }, limit: 50, order: [['createdAt', 'DESC']] });
    return res.json({ success: true, data: records });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.setPermissions = async (req, res) => {
  try {
    const { code, onlyOwnerCanDelete } = req.body || {};
    if (!code) return res.status(400).json({ success: false, message: '缺少共享码' });
    const list = await SharedList.findOne({ where: { code } });
    if (!list) return res.status(404).json({ success: false, message: '共享不存在' });
    if (list.ownerId !== req.user.userId) return res.status(403).json({ success: false, message: '只有创建者可以修改权限' });
    await SharedList.update({ onlyOwnerCanDelete: !!onlyOwnerCanDelete }, { where: { code } });
    return res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};