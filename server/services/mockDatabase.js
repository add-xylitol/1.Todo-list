// 模拟数据库服务
// 用于开发环境，无需真实数据库连接
import { getStore } from '@netlify/blobs';

class MockDatabase {
  constructor() {
    this.usersStore = getStore('users');
    this.tasksStore = getStore('tasks');
    this.sessionsStore = getStore('sessions');
    this.countersStore = getStore('counters');
    // 初始化计数器
    this.initCounters();
    // this.initTestData(); // Comment out to avoid conflicts in tests
  }

  async initCounters() {
    const counters = await this.countersStore.get('counters', { type: 'json' }) || {
      userIdCounter: 1,
      taskIdCounter: 1,
      sessionIdCounter: 1
    };
    this.userIdCounter = counters.userIdCounter;
    this.taskIdCounter = counters.taskIdCounter;
    this.sessionIdCounter = counters.sessionIdCounter;
  }

  async saveCounters() {
    await this.countersStore.setJSON('counters', {
      userIdCounter: this.userIdCounter,
      taskIdCounter: this.taskIdCounter,
      sessionIdCounter: this.sessionIdCounter
    });
  }

  async initTestData() {
    // 创建测试用户
    const testUser = {
      id: this.userIdCounter++,
      username: 'testuser',
      email: 'test@example.com',
      password_hash: '$2b$10$rOvHdKzjbQlqzjKzjKzjKOvHdKzjbQlqzjKzjKOvHdKzjbQlqzj', // 'password123'
      is_active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.usersStore.setJSON(`user:${testUser.id}`, testUser);
    await this.saveCounters();
    
    // 创建测试任务
    const testTask = {
      id: this.taskIdCounter++,
      title: '示例任务',
      description: '这是一个示例任务',
      completed: false,
      userId: testUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.tasksStore.setJSON(`task:${testTask.id}`, testTask);
    await this.saveCounters();
  }
  
  // 用户相关方法
  async createUser(userData) {
    const user = {
      id: this.userIdCounter++,
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.usersStore.setJSON(`user:${user.id}`, user);
    await this.saveCounters();
    return user;
  }
  
  async findUserByEmail(email) {
    const keys = await this.usersStore.list();
    for (const key of keys.keys) {
      const user = await this.usersStore.getJSON(key);
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async findUserByUsername(username) {
    const keys = await this.usersStore.list();
    for (const key of keys.keys) {
      const user = await this.usersStore.getJSON(key);
      if (user.username === username) {
        return user;
      }
    }
    return null;
  }
  
  async findUserById(id) {
    return await this.usersStore.getJSON(`user:${id}`) || null;
  }
  
  async updateUser(id, updates) {
    const user = await this.findUserById(id);
    if (!user) return null;
    
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await this.usersStore.setJSON(`user:${id}`, updatedUser);
    return updatedUser;
  }

  // 会话相关方法
  async createSession(sessionData) {
    const session = {
      id: this.sessionIdCounter++,
      ...sessionData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.sessionsStore.setJSON(`session:${session.id}`, session);
    await this.saveCounters();
    return session;
  }

  async cleanupExpiredSessions(userId) {
    const now = new Date();
    const keys = await this.sessionsStore.list();
    for (const key of keys.keys) {
      const session = await this.sessionsStore.getJSON(key);
      if (session.userId === userId && new Date(session.expiresAt) < now) {
        await this.sessionsStore.delete(key);
      }
    }
  }
  
  // 任务相关方法
  async createTask(taskData) {
    const task = {
      id: this.taskIdCounter++,
      ...taskData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.tasksStore.setJSON(`task:${task.id}`, task);
    await this.saveCounters();
    return task;
  }
  
  async findTasksByUserId(userId) {
    const userTasks = [];
    const keys = await this.tasksStore.list();
    for (const key of keys.keys) {
      const task = await this.tasksStore.getJSON(key);
      if (task.userId === userId) {
        userTasks.push(task);
      }
    }
    return userTasks;
  }
  
  async findTaskById(id) {
    return await this.tasksStore.getJSON(`task:${id}`) || null;
  }
  
  async updateTask(id, updates) {
    const task = await this.findTaskById(id);
    if (!task) return null;
    
    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await this.tasksStore.setJSON(`task:${id}`, updatedTask);
    return updatedTask;
  }
  
  async deleteTask(id) {
    const task = await this.findTaskById(id);
    if (!task) return false;
    
    await this.tasksStore.delete(`task:${id}`);
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