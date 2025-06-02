// server/tests/integration/categories.test.js
const request = require('supertest');
const app = require('../../app'); // Adjust path to your Express app
const { sequelize, User, Category, Task } = require('../../models'); // Adjust path
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper to create user and generate token
const createUserAndLogin = async (userData) => {
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  const user = await User.create({ ...userData, password: hashedPassword, isVerified: true });
  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { user, token };
};

describe('Category API Endpoints', () => {
  let testUser, authToken;

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
      username: 'categoryuser',
      email: 'categoryuser@example.com',
      password: 'Password123!',
    });
    testUser = user;
    authToken = token;
  });

  afterAll(async () => {
    // Close DB connection (handled by setup.js)
  });

  // Test suite for POST /api/categories
  describe('POST /api/categories', () => {
    it('should create a new category successfully', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Work',
          color: '#FF0000',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Work');
      expect(res.body.color).toBe('#FF0000');
      expect(res.body.userId).toBe(testUser.id);
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ color: '#FF0000' });
      expect(res.statusCode).toEqual(400);
    });

    it('should return 401 if user is not authenticated', async () => {
      const res = await request(app)
        .post('/api/categories')
        .send({ name: 'Unauthorized Category' });
      expect(res.statusCode).toEqual(401);
    });

    it('should prevent creating a category with a duplicate name for the same user', async () => {
      // Create first category
      await Category.create({ name: 'Personal', userId: testUser.id });

      // Attempt to create another with the same name
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Personal' });

      expect(res.statusCode).toEqual(409); // Conflict
      expect(res.body).toHaveProperty('message', 'Category with this name already exists.');
    });

    // Add more tests: e.g., category limits, invalid color format
  });

  // Test suite for GET /api/categories
  describe('GET /api/categories', () => {
    beforeEach(async () => {
      // Create some categories for the test user
      await Category.bulkCreate([
        { name: 'Work', userId: testUser.id, color: '#FF0000' },
        { name: 'Personal', userId: testUser.id, color: '#00FF00' },
        { name: 'Shopping', userId: testUser.id, color: '#0000FF', isArchived: true },
      ]);
    });

    it('should retrieve all non-archived categories for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body.categories)).toBe(true);
      expect(res.body.categories.length).toBe(2); // Excludes archived by default
      res.body.categories.forEach(category => {
        expect(category.userId).toBe(testUser.id);
        expect(category.isArchived).toBe(false);
      });
    });

    it('should retrieve categories including archived if specified', async () => {
      const res = await request(app)
        .get('/api/categories?includeArchived=true')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.categories.length).toBe(3);
    });

    it('should include task counts if specified', async () => {
      const workCategory = await Category.findOne({ where: { name: 'Work', userId: testUser.id } });
      await Task.create({ title: 'Work Task 1', userId: testUser.id, categoryId: workCategory.id });
      await Task.create({ title: 'Work Task 2', userId: testUser.id, categoryId: workCategory.id, isCompleted: true });

      const res = await request(app)
        .get('/api/categories?includeTaskCounts=true')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      const foundWorkCategory = res.body.categories.find(cat => cat.id === workCategory.id);
      expect(foundWorkCategory).toHaveProperty('taskCount', 2);
      expect(foundWorkCategory).toHaveProperty('completedTaskCount', 1);
      expect(foundWorkCategory).toHaveProperty('pendingTaskCount', 1);
    });

    it('should return 401 if user is not authenticated', async () => {
      const res = await request(app).get('/api/categories');
      expect(res.statusCode).toEqual(401);
    });
  });

  // Test suite for GET /api/categories/:id
  describe('GET /api/categories/:id', () => {
    let category;
    beforeEach(async () => {
      category = await Category.create({ name: 'Specific Category', userId: testUser.id });
      await Task.create({ title: 'Task A', categoryId: category.id, userId: testUser.id });
      await Task.create({ title: 'Task B', categoryId: category.id, userId: testUser.id, isCompleted: true });
    });

    it('should retrieve a specific category by ID with task statistics', async () => {
      const res = await request(app)
        .get(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toBe(category.id);
      expect(res.body.name).toBe('Specific Category');
      expect(res.body).toHaveProperty('totalTasks', 2);
      expect(res.body).toHaveProperty('completedTasks', 1);
      expect(res.body).toHaveProperty('pendingTasks', 1);
    });

    it('should return 404 if category not found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/categories/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toEqual(404);
    });

    it('should return 403 if category does not belong to the user', async () => {
      const otherUser = await User.create({ username: 'otheruser2', email: 'other2@example.com', password: 'password' });
      const otherCategory = await Category.create({ name: 'Other User Category', userId: otherUser.id });

      const res = await request(app)
        .get(`/api/categories/${otherCategory.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toEqual(403); // Or 404
    });
  });

  // Test suite for PUT /api/categories/:id
  describe('PUT /api/categories/:id', () => {
    let category;
    beforeEach(async () => {
      category = await Category.create({ name: 'Category to Update', userId: testUser.id, color: '#AAAAAA' });
    });

    it('should update a category successfully', async () => {
      const res = await request(app)
        .put(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Category Name', color: '#BBBBBB' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.name).toBe('Updated Category Name');
      expect(res.body.color).toBe('#BBBBBB');
    });

    it('should return 404 if category to update is not found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .put(`/api/categories/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Trying to Update Non-existent' });
      expect(res.statusCode).toEqual(404);
    });

    it('should prevent updating to a duplicate name for the same user', async () => {
      await Category.create({ name: 'Existing Name', userId: testUser.id });
      const res = await request(app)
        .put(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Existing Name' }); // Trying to rename to an already existing category name
      expect(res.statusCode).toEqual(409);
    });

    // Add more tests: partial updates, invalid data, trying to update other user's category
  });

  // Test suite for DELETE /api/categories/:id (Archive)
  describe('DELETE /api/categories/:id (Archive)', () => {
    let categoryToArchive, defaultCategory, taskInArchivedCategory, taskInDefaultCategory;
    beforeEach(async () => {
      categoryToArchive = await Category.create({ name: 'Category to Archive', userId: testUser.id });
      defaultCategory = await Category.create({ name: 'Default', userId: testUser.id, isDefault: true });
      taskInArchivedCategory = await Task.create({ title: 'Task in Archived', userId: testUser.id, categoryId: categoryToArchive.id });
      taskInDefaultCategory = await Task.create({ title: 'Task in Default', userId: testUser.id, categoryId: defaultCategory.id });
    });

    it('should archive a category and move its tasks to default category', async () => {
      const res = await request(app)
        .delete(`/api/categories/${categoryToArchive.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ moveToCategoryId: defaultCategory.id }); // Explicitly moving, or controller handles default

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Category archived successfully. Tasks moved to default category.');

      const archivedCategory = await Category.findByPk(categoryToArchive.id);
      expect(archivedCategory.isArchived).toBe(true);

      const movedTask = await Task.findByPk(taskInArchivedCategory.id);
      expect(movedTask.categoryId).toBe(defaultCategory.id);
    });

    it('should not archive the default category', async () => {
        const res = await request(app)
          .delete(`/api/categories/${defaultCategory.id}`)
          .set('Authorization', `Bearer ${authToken}`);
  
        expect(res.statusCode).toEqual(400); // Or appropriate error code
        expect(res.body).toHaveProperty('message', 'Cannot archive the default category.');
      });

    // Add more tests: category not found, no default category exists, etc.
  });

  // Add tests for reordering, setting default, restoring, permanent deletion, statistics as per your routes
});