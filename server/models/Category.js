const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Category = sequelize.define('Category', {
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
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100],
        notEmpty: {
          msg: '分类名称不能为空'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    color: {
      type: DataTypes.STRING(7),
      defaultValue: '#667eea',
      allowNull: false,
      validate: {
        is: {
          args: /^#[0-9A-Fa-f]{6}$/,
          msg: '颜色必须是有效的十六进制颜色代码'
        }
      }
    },
    icon: {
      type: DataTypes.STRING(50),
      defaultValue: 'fas fa-folder',
      allowNull: false
    },
    position: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    is_archived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    task_count: {
      type: DataTypes.VIRTUAL,
      get() {
        // 这个字段会在查询时通过关联计算
        return this.getDataValue('task_count') || 0;
      }
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
    tableName: 'categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['user_id', 'name'],
        unique: true
      },
      {
        fields: ['position']
      },
      {
        fields: ['is_archived']
      }
    ],
    validate: {
      // 确保每个用户只能有一个默认分类
      async uniqueDefaultPerUser() {
        if (this.is_default) {
          const existingDefault = await Category.findOne({
            where: {
              user_id: this.user_id,
              is_default: true,
              id: { [sequelize.Sequelize.Op.ne]: this.id || 0 }
            }
          });
          
          if (existingDefault) {
            throw new Error('每个用户只能有一个默认分类');
          }
        }
      }
    }
  });

  // 实例方法
  Category.prototype.archive = async function() {
    // 归档分类时，将其下的任务移动到默认分类
    const defaultCategory = await Category.findOne({
      where: {
        user_id: this.user_id,
        is_default: true
      }
    });
    
    if (defaultCategory && defaultCategory.id !== this.id) {
      // 更新所有任务到默认分类
      await sequelize.models.Task.update(
        { category_id: defaultCategory.id },
        { where: { category_id: this.id } }
      );
    }
    
    this.is_archived = true;
    await this.save();
  };

  Category.prototype.unarchive = async function() {
    this.is_archived = false;
    await this.save();
  };

  Category.prototype.setAsDefault = async function() {
    // 先取消其他默认分类
    await Category.update(
      { is_default: false },
      { where: { user_id: this.user_id, id: { [sequelize.Sequelize.Op.ne]: this.id } } }
    );
    
    this.is_default = true;
    await this.save();
  };

  Category.prototype.getTaskCount = async function(includeCompleted = true) {
    const where = {
      category_id: this.id,
      archived: false
    };
    
    if (!includeCompleted) {
      where.completed = false;
    }
    
    return await sequelize.models.Task.count({ where });
  };

  Category.prototype.getCompletionRate = async function() {
    const totalTasks = await this.getTaskCount(true);
    if (totalTasks === 0) return 0;
    
    const completedTasks = await sequelize.models.Task.count({
      where: {
        category_id: this.id,
        completed: true,
        archived: false
      }
    });
    
    return Math.round((completedTasks / totalTasks) * 100);
  };

  Category.prototype.moveUp = async function() {
    const upperCategory = await Category.findOne({
      where: {
        user_id: this.user_id,
        position: { [sequelize.Sequelize.Op.lt]: this.position },
        is_archived: false
      },
      order: [['position', 'DESC']]
    });
    
    if (upperCategory) {
      const tempPosition = this.position;
      this.position = upperCategory.position;
      upperCategory.position = tempPosition;
      
      await this.save();
      await upperCategory.save();
    }
  };

  Category.prototype.moveDown = async function() {
    const lowerCategory = await Category.findOne({
      where: {
        user_id: this.user_id,
        position: { [sequelize.Sequelize.Op.gt]: this.position },
        is_archived: false
      },
      order: [['position', 'ASC']]
    });
    
    if (lowerCategory) {
      const tempPosition = this.position;
      this.position = lowerCategory.position;
      lowerCategory.position = tempPosition;
      
      await this.save();
      await lowerCategory.save();
    }
  };

  Category.prototype.toJSON = function() {
    const category = Object.assign({}, this.get());
    
    // 添加任务统计信息
    if (this.tasks) {
      category.task_count = this.tasks.length;
      category.completed_tasks = this.tasks.filter(task => task.completed).length;
      category.pending_tasks = this.tasks.filter(task => !task.completed).length;
    }
    
    return category;
  };

  // 类方法
  Category.findByUser = function(userId, includeArchived = false) {
    const where = { user_id: userId };
    if (!includeArchived) {
      where.is_archived = false;
    }
    
    return this.findAll({
      where,
      order: [['position', 'ASC'], ['created_at', 'ASC']]
    });
  };

  Category.findByUserWithTasks = function(userId, includeArchived = false) {
    const where = { user_id: userId };
    if (!includeArchived) {
      where.is_archived = false;
    }
    
    return this.findAll({
      where,
      include: [{
        model: sequelize.models.Task,
        as: 'tasks',
        where: { archived: false },
        required: false
      }],
      order: [['position', 'ASC'], ['created_at', 'ASC']]
    });
  };

  Category.findDefaultByUser = function(userId) {
    return this.findOne({
      where: {
        user_id: userId,
        is_default: true
      }
    });
  };

  Category.createDefault = async function(userId) {
    return await this.create({
      user_id: userId,
      name: '默认分类',
      description: '系统默认分类',
      color: '#667eea',
      icon: 'fas fa-inbox',
      is_default: true,
      position: 0
    });
  };

  Category.getNextPosition = async function(userId) {
    const maxPosition = await this.max('position', {
      where: {
        user_id: userId,
        is_archived: false
      }
    });
    
    return (maxPosition || 0) + 1;
  };

  Category.reorderPositions = async function(userId) {
    const categories = await this.findAll({
      where: {
        user_id: userId,
        is_archived: false
      },
      order: [['position', 'ASC'], ['created_at', 'ASC']]
    });
    
    for (let i = 0; i < categories.length; i++) {
      categories[i].position = i;
      await categories[i].save();
    }
  };

  Category.getStatsByUser = async function(userId) {
    const categories = await this.findAll({
      where: {
        user_id: userId,
        is_archived: false
      },
      include: [{
        model: sequelize.models.Task,
        as: 'tasks',
        where: { archived: false },
        required: false
      }]
    });
    
    const stats = {
      total_categories: categories.length,
      categories_with_tasks: 0,
      total_tasks: 0,
      completed_tasks: 0,
      categories: []
    };
    
    categories.forEach(category => {
      const taskCount = category.tasks ? category.tasks.length : 0;
      const completedCount = category.tasks ? category.tasks.filter(task => task.completed).length : 0;
      
      if (taskCount > 0) {
        stats.categories_with_tasks++;
      }
      
      stats.total_tasks += taskCount;
      stats.completed_tasks += completedCount;
      
      stats.categories.push({
        id: category.id,
        name: category.name,
        color: category.color,
        task_count: taskCount,
        completed_tasks: completedCount,
        completion_rate: taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0
      });
    });
    
    stats.overall_completion_rate = stats.total_tasks > 0 ? 
      Math.round((stats.completed_tasks / stats.total_tasks) * 100) : 0;
    
    return stats;
  };

  return Category;
};