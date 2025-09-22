if (process.env.NETLIFY) {
  const mockDB = require('../services/mockDatabase');

  const User = {
    create: async (data) => mockDB.createUser(data),
    findOne: async ({ where }) => {
      if (where.email) return mockDB.findUserByEmail(where.email);
      return null;
    },
    findByPk: async (id) => mockDB.findUserById(id),
    update: async (updates, { where }) => {
      const user = await mockDB.findUserById(where.id);
      if (!user) return [0];
      await mockDB.updateUser(where.id, updates);
      return [1];
    }
  };

  const Task = {
    findAll: async ({ where }) => mockDB.findTasksByUserId(where.userId),
    findByPk: async (id) => mockDB.findTaskById(id),
    create: async (data) => mockDB.createTask(data),
    prototype: {
      update: async function(updates) {
        return mockDB.updateTask(this.id, updates);
      },
      destroy: async function() {
        return mockDB.deleteTask(this.id);
      }
    }
  };
  // Mock associations if needed
  Task.belongsTo = () => {};
  User.hasMany = () => {};

  module.exports = { User, Task };
} else {
  const { DataTypes } = require('sequelize');
  const sequelize = require('../config/database').sequelize;

  console.log('Defining User model');
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    timestamps: true
  });
  console.log('User model defined');

  console.log('Defining Task model');
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    timestamps: true
  });
  console.log('Task model defined');

  Task.belongsTo(User, { foreignKey: 'userId' });
  User.hasMany(Task, { foreignKey: 'userId' });

  console.log('Models defined and associated');

  module.exports = { User, Task };
}