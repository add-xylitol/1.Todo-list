const { Task } = require('../models/index');

exports.getTasks = async (req, res) => {
  try {
    // 仅返回当前用户的任务
    const tasks = await Task.findAll({ where: { userId: req.user.userId } });
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Task operation error:', error.message);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

exports.getTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task || task.userId !== req.user.userId) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { title, description } = req.body;
    const newTask = await Task.create({
      title,
      description,
      completed: false,
      userId: req.user.userId
    });
    // WebSocket 广播
    const io = req.app.get('io');
    if (io) io.emit('tasks:changed', { action: 'create', task: newTask });

    res.status(201).json({ success: true, data: newTask });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task || task.userId !== req.user.userId) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }

    const allowed = {};
    if (typeof req.body.title === 'string') allowed.title = req.body.title;
    if (typeof req.body.description === 'string') allowed.description = req.body.description;
    if (typeof req.body.completed === 'boolean') allowed.completed = req.body.completed;

    const updatedTask = await task.update(allowed);

    // WebSocket 广播
    const io = req.app.get('io');
    if (io) io.emit('tasks:changed', { action: 'update', task: updatedTask });

    res.json({ success: true, data: updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task || task.userId !== req.user.userId) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }

    await task.destroy();

    // WebSocket 广播
    const io = req.app.get('io');
    if (io) io.emit('tasks:changed', { action: 'delete', taskId: Number(req.params.id) });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};