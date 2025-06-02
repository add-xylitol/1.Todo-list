const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  // 关联用户
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '任务必须关联用户'],
    index: true
  },
  
  // 基本信息
  title: {
    type: String,
    required: [true, '任务标题不能为空'],
    trim: true,
    maxlength: [200, '任务标题最多200个字符']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, '任务描述最多1000个字符'],
    default: ''
  },
  
  // 状态
  completed: {
    type: Boolean,
    default: false,
    index: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  
  // 优先级
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  
  // 时间相关
  dueDate: {
    type: Date,
    default: null,
    index: true
  },
  reminderAt: {
    type: Date,
    default: null
  },
  
  // 分类和标签
  category: {
    type: String,
    trim: true,
    maxlength: [50, '分类名称最多50个字符'],
    default: '默认'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, '标签最多30个字符']
  }],
  
  // 子任务
  subtasks: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, '子任务标题最多100个字符']
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date,
      default: null
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  
  // 附件
  attachments: [{
    name: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['image', 'document', 'link', 'other'],
      default: 'other'
    },
    size: {
      type: Number,
      default: 0
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 重复设置
  recurring: {
    enabled: {
      type: Boolean,
      default: false
    },
    pattern: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
      default: 'daily'
    },
    interval: {
      type: Number,
      default: 1,
      min: 1
    },
    endDate: {
      type: Date,
      default: null
    },
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6
    }],
    lastGenerated: {
      type: Date,
      default: null
    }
  },
  
  // 排序
  order: {
    type: Number,
    default: 0,
    index: true
  },
  
  // 同步相关
  clientId: {
    type: String,
    trim: true,
    index: true
  },
  lastModified: {
    type: Date,
    default: Date.now,
    index: true
  },
  syncVersion: {
    type: Number,
    default: 1
  },
  
  // 软删除
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  
  // 协作相关 (高级功能)
  shared: {
    enabled: {
      type: Boolean,
      default: false
    },
    users: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      permission: {
        type: String,
        enum: ['view', 'edit', 'admin'],
        default: 'view'
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }],
    publicLink: {
      enabled: {
        type: Boolean,
        default: false
      },
      token: {
        type: String,
        default: null
      },
      expiresAt: {
        type: Date,
        default: null
      }
    }
  },
  
  // 统计信息
  stats: {
    viewCount: {
      type: Number,
      default: 0
    },
    editCount: {
      type: Number,
      default: 0
    },
    timeSpent: {
      type: Number,
      default: 0 // 秒数
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// 复合索引
taskSchema.index({ userId: 1, completed: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ userId: 1, priority: 1 });
taskSchema.index({ userId: 1, category: 1 });
taskSchema.index({ userId: 1, lastModified: -1 });
taskSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });

// 中间件：更新lastModified
taskSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastModified = new Date();
    this.syncVersion += 1;
  }
  next();
});

// 中间件：完成任务时设置completedAt
taskSchema.pre('save', function(next) {
  if (this.isModified('completed')) {
    if (this.completed && !this.completedAt) {
      this.completedAt = new Date();
    } else if (!this.completed) {
      this.completedAt = null;
    }
  }
  next();
});

// 实例方法：软删除
taskSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// 实例方法：恢复删除
taskSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = null;
  return this.save();
};

// 实例方法：切换完成状态
taskSchema.methods.toggleComplete = function() {
  this.completed = !this.completed;
  this.completedAt = this.completed ? new Date() : null;
  return this.save();
};

// 实例方法：检查是否过期
taskSchema.methods.isOverdue = function() {
  if (!this.dueDate || this.completed) return false;
  return new Date() > this.dueDate;
};

// 实例方法：获取完成进度
taskSchema.methods.getProgress = function() {
  if (this.subtasks.length === 0) {
    return this.completed ? 100 : 0;
  }
  
  const completedSubtasks = this.subtasks.filter(sub => sub.completed).length;
  const progress = (completedSubtasks / this.subtasks.length) * 100;
  return Math.round(progress);
};

// 实例方法：添加子任务
taskSchema.methods.addSubtask = function(title) {
  this.subtasks.push({
    title,
    order: this.subtasks.length
  });
  return this.save();
};

// 静态方法：获取用户的任务统计
taskSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), isDeleted: false } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: ['$completed', 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$dueDate', null] },
                  { $lt: ['$dueDate', new Date()] },
                  { $eq: ['$completed', false] }
                ]
              },
              1,
              0
            ]
          }
        },
        highPriority: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
        urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } }
      }
    }
  ]);
  
  return stats[0] || {
    total: 0,
    completed: 0,
    overdue: 0,
    highPriority: 0,
    urgent: 0
  };
};

// 静态方法：获取需要同步的任务
taskSchema.statics.getTasksForSync = function(userId, lastSyncTime) {
  const query = {
    userId: mongoose.Types.ObjectId(userId),
    lastModified: { $gt: lastSyncTime }
  };
  
  return this.find(query).sort({ lastModified: -1 });
};

// 静态方法：批量更新任务顺序
taskSchema.statics.updateTasksOrder = async function(userId, taskOrders) {
  const bulkOps = taskOrders.map(({ taskId, order }) => ({
    updateOne: {
      filter: { _id: taskId, userId },
      update: { order, lastModified: new Date() }
    }
  }));
  
  return this.bulkWrite(bulkOps);
};

module.exports = mongoose.model('Task', taskSchema);