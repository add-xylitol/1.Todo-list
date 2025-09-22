const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

if (process.env.NETLIFY) {
  const mockDB = require('../services/mockDatabase');

  const wrapUser = (user) =>
    user
      ? {
          ...user,
          update: async (updates) => {
            await mockDB.updateUser(user.id, updates);
            return mockDB.findUserById(user.id);
          },
        }
      : null;

  const wrapTask = (task) =>
    task
      ? {
          ...task,
          update: async (updates) => mockDB.updateTask(task.id, updates),
          destroy: async () => mockDB.deleteTask(task.id),
        }
      : null;

  const User = {
    create: async (data) => mockDB.createUser(data).then(wrapUser),
    findOne: async ({ where }) => {
      if (where.email) return wrapUser(await mockDB.findUserByEmail(where.email));
      return null;
    },
    findByPk: async (id) => wrapUser(await mockDB.findUserById(id)),
    update: async (updates, { where }) => {
      const user = await mockDB.findUserById(where.id);
      if (!user) return [0];
      await mockDB.updateUser(where.id, updates);
      return [1];
    },
  };

  const Task = {
    findAll: async ({ where, order }) => {
      const tasks = await mockDB.findTasksByUserId(where.userId);
      if (order && order.length > 0) {
        const [field, direction] = order[0];
        tasks.sort((a, b) => {
          const first = a[field];
          const second = b[field];
          if (first < second) return direction.toUpperCase() === 'DESC' ? 1 : -1;
          if (first > second) return direction.toUpperCase() === 'DESC' ? -1 : 1;
          return 0;
        });
      }
      return tasks.map(wrapTask);
    },
    findByPk: async (id) => wrapTask(await mockDB.findTaskById(id)),
    create: async (data) => mockDB.createTask(data).then(wrapTask),
  };

  Task.belongsTo = () => {};
  User.hasMany = () => {};

  module.exports = { User, Task };
} else {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      timestamps: true,
    }
  );

  const Task = sequelize.define(
    'Task',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      timestamps: true,
    }
  );

  Task.belongsTo(User, { foreignKey: 'userId' });
  User.hasMany(Task, { foreignKey: 'userId' });

  module.exports = { User, Task };
}
