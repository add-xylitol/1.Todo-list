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
    findAll: async ({ where }) => {
      if (where.shareCode) return mockDB.findTasksByShareCode(where.shareCode);
      return mockDB.findTasksByUserId(where.userId);
    },
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

  // SharedList and ListChange mock adapters
  const SharedList = {
    create: async (data) => mockDB.createSharedList(data),
    findOne: async ({ where }) => mockDB.findSharedList(where),
    update: async (updates, { where }) => mockDB.updateSharedList(where, updates)
  };

  const ListChange = {
    create: async (data) => mockDB.createListChange(data),
    findAll: async ({ where, limit, order }) => mockDB.findListChanges(where, { limit, order })
  };

  module.exports = { User, Task, SharedList, ListChange };
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
    },
    // optional share code for shared lists
    shareCode: {
      type: DataTypes.STRING,
      allowNull: true,
      index: true
    }
  }, {
    timestamps: true
  });
  console.log('Task model defined');

  // Shared list metadata
  const SharedList = sequelize.define('SharedList', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING, allowNull: false, unique: true },
    ownerId: { type: DataTypes.INTEGER, allowNull: false },
    secondUserId: { type: DataTypes.INTEGER, allowNull: true },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    onlyOwnerCanDelete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  }, { timestamps: true });

  // Change history for a shared list
  const ListChange = sequelize.define('ListChange', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    listCode: { type: DataTypes.STRING, allowNull: false },
    action: { type: DataTypes.STRING, allowNull: false },
    taskId: { type: DataTypes.INTEGER, allowNull: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    version: { type: DataTypes.INTEGER, allowNull: false },
    details: { type: DataTypes.TEXT, allowNull: true }
  }, { timestamps: true });

  Task.belongsTo(User, { foreignKey: 'userId' });
  User.hasMany(Task, { foreignKey: 'userId' });

  console.log('Task/User associations set');

  console.log('Models defined and associated');

  module.exports = { User, Task, SharedList, ListChange };
}