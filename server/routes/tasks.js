const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticateToken, checkTaskLimit, checkResourceOwnership } = require('../middleware/auth');
const { validateRequest } = require('../utils/validation');
const { taskSchemas } = require('../utils/validation');

// 创建任务
router.post('/', 
  authenticateToken,
  checkTaskLimit,
  validateRequest(taskSchemas.create),
  taskController.createTask
);

// 获取任务列表
router.get('/', 
  authenticateToken,
  taskController.getTasks
);

// 获取单个任务
router.get('/:id', 
  authenticateToken,
  taskController.getTask
);

// 更新任务
router.put('/:id', 
  authenticateToken,
  validateRequest(taskSchemas.update),
  taskController.updateTask
);

// 批量更新任务
router.put('/bulk/update', 
  authenticateToken,
  validateRequest(taskSchemas.bulkUpdate),
  taskController.bulkUpdateTasks
);

// 删除任务（软删除/归档）
router.delete('/:id', 
  authenticateToken,
  taskController.deleteTask
);

// 批量删除任务
router.delete('/bulk/delete', 
  authenticateToken,
  validateRequest(taskSchemas.bulkDelete),
  taskController.bulkDeleteTasks
);

// 恢复已删除的任务
router.put('/:id/restore', 
  authenticateToken,
  taskController.restoreTask
);

// 获取已归档的任务
router.get('/archived', 
  authenticateToken,
  taskController.getArchivedTasks
);

// 永久删除任务
router.delete('/:id/permanent', 
  authenticateToken,
  taskController.permanentDeleteTask
);

// 标记任务为完成
router.post('/:id/complete', 
  authenticateToken,
  checkResourceOwnership('task'),
  taskController.markTaskComplete
);

// 标记任务为未完成
router.post('/:id/incomplete', 
  authenticateToken,
  checkResourceOwnership('task'),
  taskController.markTaskIncomplete
);

// 设置任务优先级
router.put('/:id/priority', 
  authenticateToken,
  checkResourceOwnership('task'),
  validateRequest(taskSchemas.updatePriority),
  taskController.updateTaskPriority
);

// 设置任务截止日期
router.put('/:id/due-date', 
  authenticateToken,
  checkResourceOwnership('task'),
  validateRequest(taskSchemas.updateDueDate),
  taskController.updateTaskDueDate
);

// 移动任务到分类
router.put('/:id/category', 
  authenticateToken,
  checkResourceOwnership('task'),
  validateRequest(taskSchemas.updateCategory),
  taskController.moveTaskToCategory
);

// 复制任务
router.post('/:id/duplicate', 
  authenticateToken,
  checkResourceOwnership('task'),
  checkTaskLimit,
  taskController.duplicateTask
);

// 获取任务统计信息
router.get('/stats/overview', 
  authenticateToken,
  taskController.getTaskStats
);

// 获取今日任务
router.get('/today/list', 
  authenticateToken,
  taskController.getTodayTasks
);

// 获取本周任务
router.get('/week/list', 
  authenticateToken,
  taskController.getWeekTasks
);

// 获取逾期任务
router.get('/overdue/list', 
  authenticateToken,
  taskController.getOverdueTasks
);

// 获取即将到期的任务
router.get('/upcoming/list', 
  authenticateToken,
  taskController.getUpcomingTasks
);

// 搜索任务
router.get('/search/query', 
  authenticateToken,
  taskController.searchTasks
);

// 获取任务完成趋势
router.get('/stats/completion-trend', 
  authenticateToken,
  taskController.getTaskCompletionTrend
);

// 获取任务优先级分布
router.get('/stats/priority-distribution', 
  authenticateToken,
  taskController.getTaskPriorityDistribution
);

// 获取每日任务统计
router.get('/stats/daily', 
  authenticateToken,
  taskController.getDailyTaskStats
);

// 获取每周任务统计
router.get('/stats/weekly', 
  authenticateToken,
  taskController.getWeeklyTaskStats
);

module.exports = router;