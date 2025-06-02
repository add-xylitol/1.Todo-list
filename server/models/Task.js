const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: [1, 200],
        notEmpty: {
          msg: '任务标题不能为空'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium',
      allowNull: false
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: {
          msg: '请输入有效的日期'
        },
        isAfterToday(value) {
          if (value && new Date(value) < new Date()) {
            throw new Error('截止日期不能早于今天');
          }
        }
      }
    },
    reminder_date: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: {
          msg: '请输入有效的提醒日期'
        }
      }
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: false,
      validate: {
        isArray(value) {
          if (!Array.isArray(value)) {
            throw new Error('标签必须是数组格式');
          }
        }
      }
    },
    attachments: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: false,
      validate: {
        isArray(value) {
          if (!Array.isArray(value)) {
            throw new Error('附件必须是数组格式');
          }
        }
      }
    },
    estimated_time: {
      type: DataTypes.INTEGER, // 预估时间（分钟）
      allowNull: true,
      validate: {
        min: {
          args: 1,
          msg: '预估时间必须大于0分钟'
        },
        max: {
          args: 10080, // 一周的分钟数
          msg: '预估时间不能超过一周'
        }
      }
    },
    actual_time: {
      type: DataTypes.INTEGER, // 实际花费时间（分钟）
      allowNull: true,
      validate: {
        min: {
          args: 0,
          msg: '实际时间不能为负数'
        }
      }
    },
    position: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    is_recurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    recurring_pattern: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      validate: {
        isValidPattern(value) {
          if (this.is_recurring && !value) {
            throw new Error('重复任务必须设置重复模式');
          }
          if (value && typeof value !== 'object') {
            throw new Error('重复模式必须是对象格式');
          }
        }
      }
    },
    parent_task_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'tasks',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    archived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    archived_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'tasks',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['category_id']
      },
      {
        fields: ['completed']
      },
      {
        fields: ['priority']
      },
      {
        fields: ['due_date']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['user_id', 'completed']
      },
      {
        fields: ['user_id', 'archived']
      },
      {
        fields: ['parent_task_id']
      }
    ],
    hooks: {
      beforeUpdate: (task) => {
        if (task.changed('completed') && task.completed) {
          task.completed_at = new Date();
        } else if (task.changed('completed') && !task.completed) {
          task.completed_at = null;
        }
        
        if (task.changed('archived') && task.archived) {
          task.archived_at = new Date();
        } else if (task.changed('archived') && !task.archived) {
          task.archived_at = null;
        }
      }
    }
  });

  // 自关联：父任务和子任务
  Task.hasMany(Task, {
    as: 'subtasks',
    foreignKey: 'parent_task_id',
    onDelete: 'CASCADE'
  });
  
  Task.belongsTo(Task, {
    as: 'parentTask',
    foreignKey: 'parent_task_id'
  });

  // 实例方法
  Task.prototype.markCompleted = async function() {
    this.completed = true;
    this.completed_at = new Date();
    await this.save();
    
    // 如果有子任务，也标记为完成
    const subtasks = await this.getSubtasks();
    for (const subtask of subtasks) {
      if (!subtask.completed) {
        await subtask.markCompleted();
      }
    }
  };

  Task.prototype.markIncomplete = async function() {
    this.completed = false;
    this.completed_at = null;
    await this.save();
  };

  Task.prototype.archive = async function() {
    this.archived = true;
    this.archived_at = new Date();
    await this.save();
  };

  Task.prototype.unarchive = async function() {
    this.archived = false;
    this.archived_at = null;
    await this.save();
  };

  Task.prototype.isOverdue = function() {
    return this.due_date && new Date() > this.due_date && !this.completed;
  };

  Task.prototype.isDueToday = function() {
    if (!this.due_date) return false;
    
    const today = new Date();
    const dueDate = new Date(this.due_date);
    
    return today.toDateString() === dueDate.toDateString();
  };

  Task.prototype.isDueSoon = function(days = 3) {
    if (!this.due_date) return false;
    
    const now = new Date();
    const dueDate = new Date(this.due_date);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= days && diffDays >= 0;
  };

  Task.prototype.addTag = async function(tag) {
    if (!this.tags.includes(tag)) {
      this.tags = [...this.tags, tag];
      await this.save();
    }
  };

  Task.prototype.removeTag = async function(tag) {
    this.tags = this.tags.filter(t => t !== tag);
    await this.save();
  };

  Task.prototype.addAttachment = async function(attachment) {
    this.attachments = [...this.attachments, attachment];
    await this.save();
  };

  Task.prototype.removeAttachment = async function(attachmentId) {
    this.attachments = this.attachments.filter(a => a.id !== attachmentId);
    await this.save();
  };

  // 类方法
  Task.findByUser = function(userId, options = {}) {
    return this.findAll({
      where: { 
        user_id: userId,
        archived: false,
        ...options.where 
      },
      ...options
    });
  };

  Task.findCompletedByUser = function(userId) {
    return this.findAll({
      where: { 
        user_id: userId, 
        completed: true,
        archived: false
      },
      order: [['completed_at', 'DESC']]
    });
  };

  Task.findPendingByUser = function(userId) {
    return this.findAll({
      where: { 
        user_id: userId, 
        completed: false,
        archived: false
      },
      order: [['priority', 'DESC'], ['due_date', 'ASC'], ['created_at', 'ASC']]
    });
  };

  Task.findOverdueByUser = function(userId) {
    return this.findAll({
      where: {
        user_id: userId,
        completed: false,
        archived: false,
        due_date: {
          [sequelize.Sequelize.Op.lt]: new Date()
        }
      },
      order: [['due_date', 'ASC']]
    });
  };

  Task.findDueTodayByUser = function(userId) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    return this.findAll({
      where: {
        user_id: userId,
        completed: false,
        archived: false,
        due_date: {
          [sequelize.Sequelize.Op.gte]: startOfDay,
          [sequelize.Sequelize.Op.lt]: endOfDay
        }
      },
      order: [['due_date', 'ASC']]
    });
  };

  Task.findByCategory = function(userId, categoryId) {
    return this.findAll({
      where: { 
        user_id: userId, 
        category_id: categoryId,
        archived: false
      },
      order: [['position', 'ASC'], ['created_at', 'ASC']]
    });
  };

  Task.findByTag = function(userId, tag) {
    return this.findAll({
      where: {
        user_id: userId,
        archived: false,
        tags: {
          [sequelize.Sequelize.Op.contains]: [tag]
        }
      }
    });
  };

  Task.getStatsByUser = async function(userId) {
    const total = await this.count({ where: { user_id: userId, archived: false } });
    const completed = await this.count({ where: { user_id: userId, completed: true, archived: false } });
    const pending = await this.count({ where: { user_id: userId, completed: false, archived: false } });
    const overdue = await this.count({
      where: {
        user_id: userId,
        completed: false,
        archived: false,
        due_date: {
          [sequelize.Sequelize.Op.lt]: new Date()
        }
      }
    });
    
    return {
      total,
      completed,
      pending,
      overdue,
      completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  };

  return Task;
};