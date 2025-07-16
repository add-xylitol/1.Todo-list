const mockDB = require('../services/mockDatabase');

exports.getTasks = (req, res) => {
  const userId = req.user.userId;
  const tasks = mockDB.tasks.filter(t => t.user_id === userId);
  res.json({ success: true, data: tasks });
};

exports.getTask = (req, res) => {
  const { id } = req.params;
  const task = mockDB.tasks.find(t => t.id == id && t.user_id === req.user.userId);
  if (!task) return res.status(404).json({ success: false, message: '任务不存在' });
  res.json({ success: true, data: task });
};

exports.createTask = (req, res) => {
  const { title, description } = req.body;
  const newTask = {
    id: mockDB.tasks.length + 1,
    user_id: req.user.userId,
    title,
    description,
    completed: false,
    created_at: new Date()
  };
  mockDB.tasks.push(newTask);
  res.status(201).json({ success: true, data: newTask });
};

exports.updateTask = (req, res) => {
  const { id } = req.params;
  const taskIndex = mockDB.tasks.findIndex(t => t.id == id && t.user_id === req.user.userId);
  if (taskIndex === -1) return res.status(404).json({ success: false, message: '任务不存在' });
  Object.assign(mockDB.tasks[taskIndex], req.body);
  res.json({ success: true, data: mockDB.tasks[taskIndex] });
};

exports.deleteTask = (req, res) => {
  const { id } = req.params;
  const taskIndex = mockDB.tasks.findIndex(t => t.id == id && t.user_id === req.user.userId);
  if (taskIndex === -1) return res.status(404).json({ success: false, message: '任务不存在' });
  mockDB.tasks.splice(taskIndex, 1);
  res.json({ success: true });
};