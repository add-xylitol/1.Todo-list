// validation.js
const { body, validationResult } = require('express-validator');

// 简化的验证错误类
class ValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// 验证结果处理中间件
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '输入验证失败',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// 通用验证函数
const validate = (validationRules) => {
  return [...validationRules, handleValidationErrors];
};

// validateRequest 函数
const validateRequest = (schema) => {
  return validate(schema);
};

// 用户验证规则
const userSchemas = {
  register: [
    body('username')
      .isLength({ min: 3, max: 30 })
      .withMessage('用户名长度必须在3-30个字符之间')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('用户名只能包含字母、数字和下划线'),
    
    body('email')
      .isEmail()
      .withMessage('请输入有效的邮箱地址')
      .normalizeEmail(),
    
    body('password')
      .isLength({ min: 6 })
      .withMessage('密码长度至少6个字符')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('密码必须包含至少一个小写字母、一个大写字母和一个数字')
  ],
  
  login: [
    body('email')
      .isEmail()
      .withMessage('请输入有效的邮箱地址')
      .normalizeEmail(),
    
    body('password')
      .notEmpty()
      .withMessage('密码不能为空')
  ],
  
  refreshToken: [
    body('refreshToken')
      .notEmpty()
      .withMessage('刷新令牌不能为空')
  ],
  
  sendVerification: [
    body('email')
      .isEmail()
      .withMessage('请输入有效的邮箱地址')
      .normalizeEmail()
  ],
  
  verifyEmail: [
    body('email')
      .isEmail()
      .withMessage('请输入有效的邮箱地址')
      .normalizeEmail(),
    body('code')
      .isLength({ min: 6, max: 6 })
      .withMessage('验证码必须是6位数字')
      .isNumeric()
      .withMessage('验证码只能包含数字')
  ],
  
  forgotPassword: [
    body('email')
      .isEmail()
      .withMessage('请输入有效的邮箱地址')
      .normalizeEmail()
  ],
  
  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('重置令牌不能为空'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('密码长度至少6个字符')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('密码必须包含至少一个小写字母、一个大写字母和一个数字')
  ],
  
  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('当前密码不能为空'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('新密码长度至少6个字符')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('新密码必须包含至少一个小写字母、一个大写字母和一个数字')
  ],
  
  updateProfile: [
    body('username')
      .optional()
      .isLength({ min: 3, max: 30 })
      .withMessage('用户名长度必须在3-30个字符之间')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('用户名只能包含字母、数字和下划线'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('请输入有效的邮箱地址')
      .normalizeEmail()
  ],
  
  deleteAccount: [
    body('password')
      .notEmpty()
      .withMessage('请输入密码以确认删除账户'),
    body('confirmation')
      .equals('DELETE')
      .withMessage('请输入 DELETE 以确认删除账户')
  ],
  
  updateUserStatus: [
    body('status')
      .isIn(['active', 'inactive', 'suspended'])
      .withMessage('状态必须是 active、inactive 或 suspended'),
    body('reason')
      .optional()
      .isLength({ max: 500 })
      .withMessage('原因不能超过500个字符')
  ]
};

// 任务验证规则
const taskSchemas = {
  create: [
    body('title')
      .isLength({ min: 1, max: 200 })
      .withMessage('任务标题长度必须在1-200个字符之间')
      .trim(),
    
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('任务描述不能超过1000个字符')
      .trim(),
    
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('优先级必须是 low、medium 或 high')
  ],
  
  update: [
    body('title')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('任务标题长度必须在1-200个字符之间')
      .trim(),
    
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('任务描述不能超过1000个字符')
      .trim(),
    
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('优先级必须是 low、medium 或 high')
  ],
  
  bulkUpdate: [
    body('taskIds')
      .isArray({ min: 1 })
      .withMessage('任务ID数组不能为空'),
    
    body('updates')
      .isObject()
      .withMessage('更新数据必须是对象')
  ],
  
  bulkDelete: [
    body('taskIds')
      .isArray({ min: 1 })
      .withMessage('任务ID数组不能为空')
  ],
  
  updatePriority: [
    body('priority')
      .isIn(['low', 'medium', 'high'])
      .withMessage('优先级必须是 low、medium 或 high')
  ],
  
  updateDueDate: [
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('截止日期格式不正确')
  ],
  
  updateCategory: [
    body('categoryId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('分类ID必须是正整数')
  ]
};

// 基础验证规则（空对象，保持兼容性）
const commonRules = {};

// 分类验证模式
const categorySchemas = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('分类名称长度必须在1-50个字符之间'),
    body('color')
      .optional()
      .isHexColor()
      .withMessage('颜色必须是有效的十六进制颜色值'),
    body('icon')
      .optional()
      .isLength({ max: 50 })
      .withMessage('图标名称不能超过50个字符'),
    body('description')
      .optional()
      .isLength({ max: 200 })
      .withMessage('描述不能超过200个字符')
  ],
  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('分类名称长度必须在1-50个字符之间'),
    body('color')
      .optional()
      .isHexColor()
      .withMessage('颜色必须是有效的十六进制颜色值'),
    body('icon')
      .optional()
      .isLength({ max: 50 })
      .withMessage('图标名称不能超过50个字符'),
    body('description')
      .optional()
      .isLength({ max: 200 })
      .withMessage('描述不能超过200个字符')
  ],
  reorder: [
    body('categoryIds')
      .isArray({ min: 1 })
      .withMessage('分类ID数组不能为空'),
    body('categoryIds.*')
      .isInt({ min: 1 })
      .withMessage('分类ID必须是正整数')
  ]
};

const orderSchemas = {
  create: [
    body('subscriptionType')
      .isIn(['basic', 'premium', 'enterprise'])
      .withMessage('订阅类型必须是 basic, premium 或 enterprise'),
    body('duration')
      .isInt({ min: 1, max: 12 })
      .withMessage('订阅时长必须是1-12个月'),
    body('paymentMethod')
      .optional()
      .isIn(['alipay', 'wechat', 'stripe'])
      .withMessage('支付方式必须是 alipay, wechat 或 stripe')
  ],
  updateStatus: [
    body('status')
      .isIn(['pending', 'paid', 'cancelled', 'refunded', 'failed'])
      .withMessage('订单状态必须是 pending, paid, cancelled, refunded 或 failed')
  ]
};
const subscriptionSchemas = {
  updateStatus: [
    body('status')
      .isIn(['active', 'paused', 'cancelled', 'expired'])
      .withMessage('订阅状态必须是 active, paused, cancelled 或 expired')
  ]
};
const fileSchemas = {};
const adminSchemas = {};
const customValidators = {};
const createValidationMiddleware = () => {};

module.exports = {
  commonRules,
  userSchemas,
  taskSchemas,
  categorySchemas,
  orderSchemas,
  subscriptionSchemas,
  fileSchemas,
  adminSchemas,
  validate,
  validateRequest,
  createValidationMiddleware,
  customValidators,
  ValidationError,
  handleValidationErrors,
  validationResult
};