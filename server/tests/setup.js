// server/tests/setup.js

// Load environment variables from .env.test or .env for tests
// Make sure .env.test is prioritized if it exists
require('dotenv').config({ path: '.env.test' }); // if you have a specific .env.test
// Or load the default .env if .env.test is not present and you want to use it as a fallback
// if (!process.env.NODE_ENV) { // Check if NODE_ENV is already set (e.g., by cross-env in package.json)
//   require('dotenv').config();
// }

// Set a default test environment if not already set by scripts
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Example: Mock global objects or functions if needed
// global.someMockFunction = jest.fn();

// Example: Setup for in-memory database for tests (if using one like mongodb-memory-server or sqlite in-memory)
/*
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Before all tests, start an in-memory MongoDB server
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// After all tests, stop the in-memory MongoDB server and disconnect mongoose
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clear all data from collections before each test (optional, depends on your testing strategy)
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});
*/

// If using Sequelize with an in-memory SQLite database for tests:
const { sequelize, connectDB } = require('../config/database'); // Adjust path as necessary

// Before all tests, connect to the test database and sync models
beforeAll(async () => {
  try {
    // Ensure we are in the test environment
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Test setup should only run in NODE_ENV=test');
    }
    await connectDB(); // This should connect to the in-memory SQLite defined in database.js for 'test' env
    // Force sync the database (drops and recreates tables) for a clean state before tests
    await sequelize.sync({ force: true });
    console.log('Test database synchronized successfully.');
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    process.exit(1); // Exit if database setup fails
  }
});

// After all tests, close the database connection
afterAll(async () => {
  try {
    await sequelize.close();
    console.log('Test database connection closed.');
  } catch (error) {
    console.error('Failed to close test database connection:', error);
  }
});

// Optional: Clear all tables before each test to ensure test isolation
// This can be slow if you have many tests or large tables.
// Consider if per-test cleanup is necessary or if `force: true` in `beforeAll` is sufficient.
/*
beforeEach(async () => {
  const models = sequelize.models;
  for (const modelName in models) {
    await models[modelName].destroy({ where: {}, truncate: true, cascade: true });
  }
});
*/

// You can also set up global mocks here, e.g., for external services
// jest.mock('../services/emailService', () => ({
//   sendWelcomeEmail: jest.fn(),
//   sendPasswordResetEmail: jest.fn(),
// }));

console.log('Jest test setup initialized.');