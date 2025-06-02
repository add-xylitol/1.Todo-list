// server/tests/integration/auth.test.js
const request = require('supertest');
const app = require('../../app'); // Adjust path to your Express app
const { sequelize, User } = require('../../models'); // Adjust path to your models
const bcrypt = require('bcryptjs');

// Helper function to create a user directly in the database
const createUserInDb = async (userData) => {
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  return User.create({ ...userData, password: hashedPassword });
};

describe('Auth API Endpoints', () => {
  // Clean up the database before and after tests
  beforeAll(async () => {
    // The setup.js should handle initial sync
    // If not, or for specific test suite setup:
    // await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    // Clear all users before each test to ensure isolation
    await User.destroy({ where: {}, truncate: true, cascade: true });
  });

  afterAll(async () => {
    // await sequelize.close(); // This is handled in setup.js
  });

  // Test suite for POST /api/auth/register
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'testuser@example.com',
          password: 'Password123!',
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'User registered successfully. Please check your email to verify your account.');
      // Optionally, check if the user was actually created in the DB
      const userInDb = await User.findOne({ where: { email: 'testuser@example.com' } });
      expect(userInDb).not.toBeNull();
      expect(userInDb.username).toBe('testuser');
    });

    it('should return 400 if username is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testuser@example.com',
          password: 'Password123!',
        });
      expect(res.statusCode).toEqual(400);
      // expect(res.body.errors[0].msg).toEqual('Username is required'); // Example for express-validator
    });

    it('should return 400 if email is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'Password123!',
        });
      expect(res.statusCode).toEqual(400);
      // expect(res.body.errors[0].msg).toEqual('Invalid email format');
    });

    it('should return 400 if password is too short', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'testuser@example.com',
          password: 'short',
        });
      expect(res.statusCode).toEqual(400);
      // expect(res.body.errors[0].msg).toEqual('Password must be at least 8 characters long');
    });

    it('should return 409 if email already exists', async () => {
      // First, create a user
      await createUserInDb({
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'Password123!',
      });

      // Then, try to register with the same email
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'anotheruser',
          email: 'existing@example.com',
          password: 'Password456!',
        });
      expect(res.statusCode).toEqual(409);
      expect(res.body).toHaveProperty('message', 'Email already in use.');
    });
  });

  // Test suite for POST /api/auth/login
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a user to login with
      await createUserInDb({
        username: 'loginuser',
        email: 'login@example.com',
        password: 'Password123!',
        isVerified: true, // Assume user is verified for login tests
      });
    });

    it('should login an existing user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password123!',
        });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user).toHaveProperty('email', 'login@example.com');
    });

    it('should return 401 for invalid credentials (wrong password)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword123!',
        });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Invalid email or password.');
    });

    it('should return 401 for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Invalid email or password.');
    });

    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'Password123!',
        });
      expect(res.statusCode).toEqual(400);
    });

    it('should return 400 if password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
        });
      expect(res.statusCode).toEqual(400);
    });

    // Add test for unverified user if your system requires verification before login
    it('should return 403 if user is not verified (if applicable)', async () => {
      await User.destroy({ where: {}, truncate: true, cascade: true }); // Clear previous user
      await createUserInDb({
        username: 'unverifieduser',
        email: 'unverified@example.com',
        password: 'Password123!',
        isVerified: false, // Explicitly set as not verified
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unverified@example.com',
          password: 'Password123!',
        });
      // This status code depends on your implementation for unverified users
      // It could be 401, 403, or a specific error message
      expect(res.statusCode).toEqual(403); // Assuming 403 Forbidden for unverified
      expect(res.body).toHaveProperty('message', 'Please verify your email before logging in.');
    });
  });

  // Test suite for POST /api/auth/refresh-token
  describe('POST /api/auth/refresh-token', () => {
    let refreshToken;

    beforeEach(async () => {
      await User.destroy({ where: {}, truncate: true, cascade: true });
      await createUserInDb({
        username: 'refreshuser',
        email: 'refresh@example.com',
        password: 'Password123!',
        isVerified: true,
      });

      // Login to get a refresh token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'refresh@example.com',
          password: 'Password123!',
        });
      refreshToken = loginRes.body.refreshToken;
    });

    it('should refresh token successfully with a valid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('refreshToken'); // Some implementations might return a new refresh token
      expect(res.body.token).not.toBeNull();
    });

    it('should return 401 if refresh token is invalid or expired', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-refresh-token' });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Invalid or expired refresh token.');
    });

    it('should return 400 if refresh token is missing', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({});

      expect(res.statusCode).toEqual(400);
      // expect(res.body.errors[0].msg).toEqual('Refresh token is required');
    });
  });

  // Add more tests for other auth endpoints like /logout, /verify-email, /forgot-password, /reset-password
  // Example for /api/auth/logout (if it's a POST request that invalidates a token/session)
  describe('POST /api/auth/logout', () => {
    it('should logout user successfully (if server-side session/token invalidation)', async () => {
      // Login to get a token
      await createUserInDb({ username: 'logoutuser', email: 'logout@example.com', password: 'Password123!', isVerified: true });
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'logout@example.com', password: 'Password123!' });
      const token = loginRes.body.token;

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`); // Assuming Bearer token auth
        // .send({ refreshToken: loginRes.body.refreshToken }); // If logout requires refresh token

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Logged out successfully.');

      // Optionally, try to access a protected route with the old token to ensure it's invalidated
      // This depends heavily on your logout implementation (e.g., token blacklisting)
    });
  });

});