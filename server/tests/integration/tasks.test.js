// server/tests/integration/tasks.test.js
const request = require('supertest');
const app = require('../../app'); // Adjust path to your Express app
const { sequelize, User, Task, Category } = require('../../models'); // Adjust path
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper to create user and generate token
const createUserAndLogin = async (userData) => {
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  const user = await User.create({ ...userData, password: hashedPassword, isVerified: true });
  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { user, token };
};

describe('Task API Endpoints', () => {
  let testUser, authToken, defaultCategory;

  beforeAll(async () => {
    // Sync database (handled by setup.js)
  });

  beforeEach(async () => {
    // Clear tables before each test
    await Task.destroy({ where: {}, truncate: true, cascade: true });
    await Category.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });

    // Create a test user and get token
    const { user, token } = await createUserAndLogin({
      username: 'taskuser',
      email: 'taskuser@example.com',
      password: 'Password123!',
    });
    testUser = user;
    authToken = token;

    // Create a default category for the user
    defaultCategory = await Category.create({
      name: 'Default Category',
      userId: testUser.id,
      isDefault: true,
    });
  });

  afterAll(async () => {
    // Close DB connection (handled by setup.js)
  });

  // Test suite for POST /api/tasks
  describe('POST /api/tasks', () => {
    it('should create a new task successfully', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'New Test Task',
          description: 'This is a description for the new test task.',
          categoryId: defaultCategory.id,
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('New Test Task');
      expect(res.body.userId).toBe(testUser.id);
      expect(res.body.categoryId).toBe(defaultCategory.id);
    });

    it('should return 400 if title is missing', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Missing title.',
          categoryId: defaultCategory.id,
        });
      expect(res.statusCode).toEqual(400);
    });

    it('should return 401 if user is not authenticated', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Unauthorized Task',
          categoryId: defaultCategory.id,
        });
      expect(res.statusCode).toEqual(401);
    });

    it('should assign to default category if categoryId is not provided', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Task for Default Category',
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body.categoryId).toBe(defaultCategory.id); // Assuming your controller handles this logic
    });

    // Add more tests: e.g., task limits, invalid categoryId, etc.
  });

  // Test suite for GET /api/tasks
  describe('GET /api/tasks', () => {
    beforeEach(async () => {
      // Create some tasks for the test user
      await Task.bulkCreate([
        { title: 'Task 1', userId: testUser.id, categoryId: defaultCategory.id },
        { title: 'Task 2', userId: testUser.id, categoryId: defaultCategory.id, isCompleted: true },
        { title: 'Task 3', userId: testUser.id, categoryId: defaultCategory.id, priority: 'high' },
      ]);
    });

    it('should retrieve all tasks for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body.tasks)).toBe(true);
      expect(res.body.tasks.length).toBe(3);
      res.body.tasks.forEach(task => {
        expect(task.userId).toBe(testUser.id);
      });
    });

    it('should filter tasks by status (e.g., completed)', async () => {
      const res = await request(app)
        .get('/api/tasks?status=completed')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.tasks.length).toBe(1);
      expect(res.body.tasks[0].title).toBe('Task 2');
      expect(res.body.tasks[0].isCompleted).toBe(true);
    });

    it('should filter tasks by priority', async () => {
      const res = await request(app)
        .get('/api/tasks?priority=high')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.tasks.length).toBe(1);
      expect(res.body.tasks[0].title).toBe('Task 3');
    });

    it('should support pagination', async () => {
      // Create more tasks to test pagination
      for (let i = 4; i <= 15; i++) {
        await Task.create({ title: `Task ${i}`, userId: testUser.id, categoryId: defaultCategory.id });
      }

      const res = await request(app)
        .get('/api/tasks?page=2&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.tasks.length).toBe(5);
      expect(res.body.pagination).toHaveProperty('currentPage', 2);
      expect(res.body.pagination).toHaveProperty('totalPages'); // e.g., 3 if 15 tasks total, 5 per page
      expect(res.body.pagination).toHaveProperty('totalTasks'); // e.g., 15
    });

    it('should return 401 if user is not authenticated', async () => {
      const res = await request(app).get('/api/tasks');
      expect(res.statusCode).toEqual(401);
    });
  });

  // Test suite for GET /api/tasks/:id
  describe('GET /api/tasks/:id', () => {
    let task;
    beforeEach(async () => {
      task = await Task.create({ title: 'Specific Task', userId: testUser.id, categoryId: defaultCategory.id });
    });

    it('should retrieve a specific task by ID', async () => {
      const res = await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toBe(task.id);
      expect(res.body.title).toBe('Specific Task');
    });

    it('should return 404 if task not found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'; // UUID example
      const res = await request(app)
        .get(`/api/tasks/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toEqual(404);
    });

    it('should return 403 if task does not belong to the user', async () => {
      // Create another user and their task
      const otherUser = await User.create({ username: 'otheruser', email: 'other@example.com', password: 'password' });
      const otherTask = await Task.create({ title: 'Other User Task', userId: otherUser.id, categoryId: defaultCategory.id });

      const res = await request(app)
        .get(`/api/tasks/${otherTask.id}`)
        .set('Authorization', `Bearer ${authToken}`); // Authenticated as testUser
      expect(res.statusCode).toEqual(403); // Or 404, depending on your controller's logic for privacy
    });
  });

  // Test suite for PUT /api/tasks/:id
  describe('PUT /api/tasks/:id', () => {
    let task;
    beforeEach(async () => {
      task = await Task.create({ title: 'Task to Update', userId: testUser.id, categoryId: defaultCategory.id });
    });

    it('should update a task successfully', async () => {
      const res = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Task Title', isCompleted: true });

      expect(res.statusCode).toEqual(200);
      expect(res.body.title).toBe('Updated Task Title');
      expect(res.body.isCompleted).toBe(true);
    });

    it('should return 404 if task to update is not found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .put(`/api/tasks/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Trying to Update Non-existent' });
      expect(res.statusCode).toEqual(404);
    });

    // Add more tests: partial updates, invalid data, trying to update other user's task
  });

  // Test suite for DELETE /api/tasks/:id
  describe('DELETE /api/tasks/:id', () => {
    let task;
    beforeEach(async () => {
      task = await Task.create({ title: 'Task to Delete', userId: testUser.id, categoryId: defaultCategory.id });
    });

    it('should delete a task successfully', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200); // Or 204 No Content
      expect(res.body).toHaveProperty('message', 'Task deleted successfully');

      // Verify task is actually deleted (or soft-deleted)
      const deletedTask = await Task.findByPk(task.id);
      // If soft delete, check for a 'deletedAt' timestamp or 'isArchived' flag
      // If hard delete, expect null
      expect(deletedTask).toBeNull(); // Assuming hard delete for this test
    });

    it('should return 404 if task to delete is not found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .delete(`/api/tasks/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toEqual(404);
    });

    // Add more tests: trying to delete other user's task
  });

  // Add tests for bulk operations, statistics, etc., as defined in your routes
});