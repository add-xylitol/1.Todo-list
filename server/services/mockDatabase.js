const EventEmitter = require('events');

/**
 * 模拟数据库服务 - 用于开发环境当 PostgreSQL 不可用时
 */
class MockDatabase extends EventEmitter {
  constructor() {
    super();
    this.users = new Map();
    this.tasks = new Map();
    this.categories = new Map();
    this.orders = new Map();
    this.subscriptions = new Map();
    this.nextId = 1;
    
    // 初始化默认数据
    this.initializeDefaultData();
  }

  initializeDefaultData() {
    // 创建默认用户
    const defaultUser = {
      id: this.nextId++,
      username: 'demo',
      email: 'demo@example.com',
      password: '$2b$10$rQZ9QmjytWIeJH7.vKSp4eKtbp5J5J5J5J5J5J5J5J5J5J5J5J5J5', // 'password'
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(defaultUser.id, defaultUser);

    // 创建默认分类
    const defaultCategory = {
      id: this.nextId++,
      name: '默认分类',
      description: '系统默认分类',
      color: '#007bff',
      isDefault: true,
      isArchived: false,
      userId: defaultUser.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.categories.set(defaultCategory.id, defaultCategory);

    // 创建示例任务
    const sampleTasks = [
      {
        id: this.nextId++,
        title: '欢迎使用 TodoList Pro',
        description: '这是一个示例任务，您可以编辑或删除它',
        status: 'pending',
        priority: 'medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后
        userId: defaultUser.id,
        categoryId: defaultCategory.id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: this.nextId++,
        title: '配置数据库连接',
        description: '配置 PostgreSQL 数据库以获得完整功能',
        status: 'pending',
        priority: 'high',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3天后
        userId: defaultUser.id,
        categoryId: defaultCategory.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    sampleTasks.forEach(task => {
      this.tasks.set(task.id, task);
    });
  }

  // 用户相关方法
  async findUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async findUserByUsername(username) {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
  }

  async findUserById(id) {
    return this.users.get(parseInt(id)) || null;
  }

  async createUser(userData) {
    const user = {
      id: this.nextId++,
      ...userData,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  // 任务相关方法
  async findTasksByUserId(userId, options = {}) {
    const userTasks = Array.from(this.tasks.values())
      .filter(task => task.userId === parseInt(userId));
    
    let filteredTasks = userTasks;
    
    // 状态过滤
    if (options.status) {
      filteredTasks = filteredTasks.filter(task => task.status === options.status);
    }
    
    // 优先级过滤
    if (options.priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === options.priority);
    }
    
    // 分页
    const limit = options.limit || 10;
    const offset = options.offset || 0;
    
    return {
      tasks: filteredTasks.slice(offset, offset + limit),
      total: filteredTasks.length
    };
  }

  async findTaskById(id, userId) {
    const task = this.tasks.get(parseInt(id));
    if (task && task.userId === parseInt(userId)) {
      return task;
    }
    return null;
  }

  async createTask(taskData) {
    const task = {
      id: this.nextId++,
      ...taskData,
      status: taskData.status || 'pending',
      priority: taskData.priority || 'medium',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async updateTask(id, userId, updateData) {
    const task = await this.findTaskById(id, userId);
    if (task) {
      Object.assign(task, updateData, { updatedAt: new Date() });
      this.tasks.set(task.id, task);
      return task;
    }
    return null;
  }

  async deleteTask(id, userId) {
    const task = await this.findTaskById(id, userId);
    if (task) {
      this.tasks.delete(parseInt(id));
      return true;
    }
    return false;
  }

  // 分类相关方法
  async findCategoriesByUserId(userId) {
    return Array.from(this.categories.values())
      .filter(category => category.userId === parseInt(userId));
  }

  async findCategoryById(id, userId) {
    const category = this.categories.get(parseInt(id));
    if (category && category.userId === parseInt(userId)) {
      return category;
    }
    return null;
  }

  async createCategory(categoryData) {
    const category = {
      id: this.nextId++,
      ...categoryData,
      isDefault: false,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.categories.set(category.id, category);
    return category;
  }

  async updateCategory(id, userId, updateData) {
    const category = await this.findCategoryById(id, userId);
    if (category) {
      Object.assign(category, updateData, { updatedAt: new Date() });
      this.categories.set(category.id, category);
      return category;
    }
    return null;
  }

  // 健康检查
  async isHealthy() {
    return {
      status: 'healthy',
      type: 'mock',
      users: this.users.size,
      tasks: this.tasks.size,
      categories: this.categories.size
    };
  }
}

module.exports = new MockDatabase();