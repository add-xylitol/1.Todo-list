const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken, checkTaskLimit, checkResourceOwnership } = require('../middleware/auth');
const { validateRequest } = require('../utils/validation');
const { categorySchemas } = require('../utils/validation');

// 创建分类
router.post('/', 
  authenticateToken,
  validateRequest(categorySchemas.create),
  categoryController.createCategory
);

// 获取分类列表
router.get('/', 
  authenticateToken,
  categoryController.getCategories
);

// 获取单个分类
router.get('/:id', 
  authenticateToken,
  checkResourceOwnership('category'),
  categoryController.getCategory
);

// 更新分类
router.put('/:id', 
  authenticateToken,
  checkResourceOwnership('category'),
  validateRequest(categorySchemas.update),
  categoryController.updateCategory
);

// 删除分类
router.delete('/:id', 
  authenticateToken,
  checkResourceOwnership('category'),
  categoryController.deleteCategory
);

// 重新排序分类
router.put('/reorder/positions', 
  authenticateToken,
  validateRequest(categorySchemas.reorder),
  categoryController.reorderCategories
);

// 设置默认分类
router.post('/:id/set-default', 
  authenticateToken,
  checkResourceOwnership('category'),
  categoryController.setDefaultCategory
);

// 恢复已删除的分类
router.post('/:id/restore', 
  authenticateToken,
  categoryController.restoreCategory
);

// 获取已删除的分类列表
router.get('/archived/list', 
  authenticateToken,
  categoryController.getArchivedCategories
);

// 永久删除分类
router.delete('/:id/permanent', 
  authenticateToken,
  categoryController.permanentDeleteCategory
);

// 获取分类统计信息
router.get('/stats/overview', 
  authenticateToken,
  categoryController.getCategoryStats
);

module.exports = router;