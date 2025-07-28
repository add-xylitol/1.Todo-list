require('dotenv').config();
const http = require('http');
const request = require('supertest');
const app = require('../server/app');
const { sequelize } = require('../server/config/database');
require('../server/models/index');

let server;

beforeAll(async () => {
  console.log('Registered models:', Object.keys(sequelize.models));
  await sequelize.sync({ force: true });
  server = app.listen(0);
});

afterAll((done) => {
  server.close(done);
});

// Disable console logs for cleaner test output
console.log = jest.fn();

describe('TodoList API Tests', () => {
  let userToken;
  let userId;
  let taskId;
  // Add variables for additional tests if needed

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser', email: 'test@example.com', password: 'password123' });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('data.token');
    expect(res.body).toHaveProperty('data.user');
    userToken = res.body.data.token;
    userId = res.body.data.user.id;
  });

  it('should login the user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('data.token');
    userToken = res.body.data.token;
  });

  it('should get user profile', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty('username', 'testuser');
  });

  it('should update user profile', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ username: 'updateduser' });
    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty('username', 'updateduser');
  });

  it('should change password', async () => {
    const res = await request(app)
      .put('/api/users/password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ currentPassword: 'password123', newPassword: 'newpassword123' });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Password updated successfully');
  });

  it('should login with new password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'newpassword123' });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('data.token');
    userToken = res.body.data.token; // Update token after password change
  });

  it('should create a task', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Test Task', description: 'Description' });
    expect(res.statusCode).toEqual(201);
    expect(res.body.data).toHaveProperty('id');
    taskId = res.body.data.id;
  });

  it('should get all tasks', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should get single task', async () => {
    const res = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty('id', taskId);
  });

  it('should update task', async () => {
    const res = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Updated Task' });
    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty('title', 'Updated Task');
  });

  it('should delete task', async () => {
    const res = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
  });

  // Multi-user tests
  let user2Token;
  let user2Id;
  let task2Id;

  it('should register second user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'user2', email: 'user2@example.com', password: 'password123' });
    expect(res.statusCode).toEqual(201);
    user2Token = res.body.data.token;
    user2Id = res.body.data.user.id;
  });

  it('should create task for user2', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ title: 'User2 Task' });
    expect(res.statusCode).toEqual(201);
    task2Id = res.body.data.id;
  });

  it('user1 should not see user2 tasks', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.some(task => task.id === task2Id)).toBe(false);
  });

  it('user1 should not access user2 task', async () => {
    const res = await request(app)
      .get(`/api/tasks/${task2Id}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(404);
  });

  // Add test for invalid token
  it('should not allow access with invalid token', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', 'Bearer invalidtoken');
    expect(res.statusCode).toEqual(401);
  });
});


describe('Deployment Issues Tests', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should use MySQL in production environment', () => {
    process.env.NODE_ENV = 'production';
    const { sequelize } = require('../server/config/database');
    expect(sequelize.options.dialect).toBe('mysql');
  });

  it('should have sqlite3 dependency for development', () => {
    const packageJson = require('../package.json');
    expect(packageJson.dependencies).toHaveProperty('sqlite3');
  });

  it('should handle database path for Netlify', () => {
    process.env.NODE_ENV = 'development';
    const { sequelize } = require('../server/config/database');
    expect(sequelize.options.storage).toBe('/tmp/database.sqlite');
  });
});