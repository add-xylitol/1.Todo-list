// 模拟数据库服务
// 用于开发环境，无需真实数据库连接

class MockDatabase {
  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.sessions = new Map();
    this.userIdCounter = 1;
    this.taskIdCounter = 1;
    this.sessionIdCounter = 1;
    // this.initTestData(); // Comment out to avoid conflicts in tests
  }
  
  initTestData() {
    // 创建测试用户
    const testUser = {
      id: this.userIdCounter++,
      username: 'testuser',
      email: 'test@example.com',
      password_hash: '$2b$10$rOvHdKzjbQlqzjKzjKzjKOvHdKzjbQlqzjKzjKOvHdKzjbQlqzj', // 'password123'
      is_active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(testUser.id, testUser);
    
    // 创建测试任务
    const testTask = {
      id: this.taskIdCounter++,
      title: '示例任务',
      description: '这是一个示例任务',
      completed: false,
      userId: testUser.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.tasks.set(testTask.id, testTask);
  }
  
  // 用户相关方法
  async createUser(userData) {
    const user = {
      id: this.userIdCounter++,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }
  
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
    return this.users.get(id) || null;
  }
  
  async updateUser(id, updates) {
    const user = this.users.get(id);
    if (!user) return null;
    
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // 会话相关方法
  async createSession(sessionData) {
    const session = {
      id: this.sessionIdCounter++,
      ...sessionData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async cleanupExpiredSessions(userId) {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId && session.expiresAt < now) {
        this.sessions.delete(sessionId);
      }
    }
  }
  
  // 任务相关方法
  async createTask(taskData) {
    const task = {
      id: this.taskIdCounter++,
      ...taskData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.tasks.set(task.id, task);
    return task;
  }
  
  async findTasksByUserId(userId) {
    const userTasks = [];
    for (const task of this.tasks.values()) {
      if (task.userId === userId) {
        userTasks.push(task);
      }
    }
    return userTasks;
  }
  
  async findTaskById(id) {
    return this.tasks.get(id) || null;
  }
  
  async updateTask(id, updates) {
    const task = this.tasks.get(id);
    if (!task) return null;
    
    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: new Date()
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  
  async deleteTask(id) {
    const task = this.tasks.get(id);
    if (!task) return false;
    
    this.tasks.delete(id);
    return true;
  }
  
  // 数据库连接相关方法（模拟）
  async authenticate() {
    console.log('✅ 模拟数据库连接成功');
    return true;
  }
  
  async sync() {
    console.log('✅ 模拟数据库同步完成');
    return true;
  }
  
  async close() {
    console.log('✅ 模拟数据库连接关闭');
    return true;
  }
}

// 创建单例实例
const mockDB = new MockDatabase();

module.exports = mockDB;