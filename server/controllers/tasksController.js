const { Task, SharedList, ListChange } = require('../models/index');

exports.getTasks = async (req, res) => {
  try {
    const shareCode = req.get('X-Share-Code');
    const folder = (req.query.folder || '').trim();
    if (shareCode) {
      const list = await SharedList.findOne({ where: { code: shareCode } });
      if (!list) return res.status(404).json({ success: false, message: '共享不存在' });
      const uid = req.user.userId;
      const isMember = uid === list.ownerId || uid === list.secondUserId;
      if (!isMember) return res.status(403).json({ success: false, message: '无权访问该共享' });
      const where = { shareCode };
      if (folder) where.folder = folder === '__none__' ? null : folder;
      const tasks = await Task.findAll({ where });
      return res.json({ success: true, data: tasks, meta: { shareCode, version: list.version, onlyOwnerCanDelete: !!list.onlyOwnerCanDelete, ownerId: list.ownerId, secondUserId: list.secondUserId } });
    }
    // 仅返回当前用户的任务（可选按文件夹过滤）
    const where = { userId: req.user.userId };
    if (folder) where.folder = folder === '__none__' ? null : folder;
    const tasks = await Task.findAll({ where });
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Task operation error:', error.message);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

exports.getTask = async (req, res) => {
  try {
    const shareCode = req.get('X-Share-Code');
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: '任务不存在' });
    if (shareCode) {
      const list = await SharedList.findOne({ where: { code: shareCode } });
      if (!list) return res.status(404).json({ success: false, message: '共享不存在' });
      const uid = req.user.userId;
      const isMember = uid === list.ownerId || uid === list.secondUserId;
      if (!isMember || task.shareCode !== shareCode) return res.status(403).json({ success: false, message: '无权访问该共享任务' });
      return res.json({ success: true, data: task, meta: { shareCode, version: list.version, onlyOwnerCanDelete: !!list.onlyOwnerCanDelete } });
    }
    if (task.userId !== req.user.userId) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

exports.createTask = async (req, res) => {
  try {
    const shareCode = req.get('X-Share-Code');
    const folder = typeof req.body.folder === 'string' ? (req.body.folder.trim() || null) : null;
    if (shareCode) {
      const clientVersion = Number(req.get('X-List-Version') || 0);
      const list = await SharedList.findOne({ where: { code: shareCode } });
      if (!list) return res.status(404).json({ success: false, message: '共享不存在' });
      const uid = req.user.userId;
      const isMember = uid === list.ownerId || uid === list.secondUserId;
      if (!isMember) return res.status(403).json({ success: false, message: '无权访问该共享' });

      const { title, description } = req.body;
      const newTask = await Task.create({ title, description, completed: false, userId: uid, shareCode, folder });

      const newVersion = (list.version || 1) + 1;
      await SharedList.update({ version: newVersion }, { where: { code: shareCode } });
      await ListChange.create({ listCode: shareCode, action: 'create', taskId: newTask.id, userId: uid, version: newVersion, details: JSON.stringify({ title, description, folder }) });

      const io = req.app.get('io');
      if (io) io.to(`list:${shareCode}`).emit('tasks:changed', { action: 'create', task: newTask, code: shareCode, version: newVersion });

      const conflict = clientVersion && clientVersion < newVersion;
      return res.status(201).json({ success: true, data: newTask, meta: { shareCode, version: newVersion, conflict } });
    }

    const { title, description } = req.body;
    const newTask = await Task.create({ title, description, completed: false, userId: req.user.userId, folder });
    const io = req.app.get('io');
    if (io) io.emit('tasks:changed', { action: 'create', task: newTask });
    res.status(201).json({ success: true, data: newTask });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const shareCode = req.get('X-Share-Code');
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: '任务不存在' });

    const allowed = {};
    if (typeof req.body.title === 'string') allowed.title = req.body.title;
    if (typeof req.body.description === 'string') allowed.description = req.body.description;
    if (typeof req.body.completed === 'boolean') allowed.completed = req.body.completed;
    if (typeof req.body.folder === 'string') allowed.folder = req.body.folder.trim() || null;

    if (shareCode) {
      const clientVersion = Number(req.get('X-List-Version') || 0);
      const list = await SharedList.findOne({ where: { code: shareCode } });
      if (!list) return res.status(404).json({ success: false, message: '共享不存在' });
      const uid = req.user.userId;
      const isMember = uid === list.ownerId || uid === list.secondUserId;
      if (!isMember || task.shareCode !== shareCode) return res.status(403).json({ success: false, message: '无权编辑该共享任务' });

      const updatedTask = await task.update(allowed);
      const newVersion = (list.version || 1) + 1;
      await SharedList.update({ version: newVersion }, { where: { code: shareCode } });
      await ListChange.create({ listCode: shareCode, action: 'update', taskId: updatedTask.id, userId: uid, version: newVersion, details: JSON.stringify(allowed) });

      const io = req.app.get('io');
      if (io) io.to(`list:${shareCode}`).emit('tasks:changed', { action: 'update', task: updatedTask, code: shareCode, version: newVersion });

      const conflict = clientVersion && clientVersion < newVersion;
      return res.json({ success: true, data: updatedTask, meta: { shareCode, version: newVersion, conflict } });
    }

    if (task.userId !== req.user.userId) return res.status(404).json({ success: false, message: '任务不存在' });

    const updatedTask = await task.update(allowed);

    const io = req.app.get('io');
    if (io) io.emit('tasks:changed', { action: 'update', task: updatedTask });

    res.json({ success: true, data: updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const shareCode = req.get('X-Share-Code');
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: '任务不存在' });

    if (shareCode) {
      const clientVersion = Number(req.get('X-List-Version') || 0);
      const list = await SharedList.findOne({ where: { code: shareCode } });
      if (!list) return res.status(404).json({ success: false, message: '共享不存在' });
      const uid = req.user.userId;
      const isMember = uid === list.ownerId || uid === list.secondUserId;
      if (!isMember || task.shareCode !== shareCode) return res.status(403).json({ success: false, message: '无权删除该共享任务' });
      if (list.onlyOwnerCanDelete && uid !== list.ownerId) return res.status(403).json({ success: false, message: '仅创建者可删除条目' });

      await task.destroy();

      const newVersion = (list.version || 1) + 1;
      await SharedList.update({ version: newVersion }, { where: { code: shareCode } });
      await ListChange.create({ listCode: shareCode, action: 'delete', taskId: Number(req.params.id), userId: uid, version: newVersion, details: '' });

      const io = req.app.get('io');
      if (io) io.to(`list:${shareCode}`).emit('tasks:changed', { action: 'delete', taskId: Number(req.params.id), code: shareCode, version: newVersion });

      const conflict = clientVersion && clientVersion < newVersion;
      return res.json({ success: true, meta: { shareCode, version: newVersion, conflict } });
    }

    if (task.userId !== req.user.userId) return res.status(404).json({ success: false, message: '任务不存在' });

    await task.destroy();

    const io = req.app.get('io');
    if (io) io.emit('tasks:changed', { action: 'delete', taskId: Number(req.params.id) });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};