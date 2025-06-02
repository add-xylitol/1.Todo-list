const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
        isAlphanumeric: {
          msg: '用户名只能包含字母和数字'
        }
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: '请输入有效的邮箱地址'
        }
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [6, 255]
      }
    },
    first_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    last_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    avatar_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: {
          msg: '头像URL格式不正确'
        }
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: {
          args: /^[+]?[1-9]\d{1,14}$/,
          msg: '请输入有效的手机号码'
        }
      }
    },
    membership_type: {
      type: DataTypes.ENUM('free', 'premium_monthly', 'premium_yearly', 'premium_lifetime'),
      defaultValue: 'free',
      allowNull: false
    },
    membership_expires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    task_limit: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    verification_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    reset_password_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    reset_password_expires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    },
    login_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    preferences: {
      type: DataTypes.JSON,
      defaultValue: {
        theme: 'light',
        language: 'zh-CN',
        notifications: {
          email: true,
          push: true,
          reminders: true
        },
        privacy: {
          profile_public: false,
          show_stats: true
        }
      }
    },
    timezone: {
      type: DataTypes.STRING(50),
      defaultValue: 'Asia/Shanghai'
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
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['email']
      },
      {
        unique: true,
        fields: ['username']
      },
      {
        fields: ['membership_type']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['created_at']
      }
    ],
    hooks: {
      beforeCreate: async (user) => {
        if (user.password_hash) {
          const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
          user.password_hash = await bcrypt.hash(user.password_hash, saltRounds);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password_hash')) {
          const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
          user.password_hash = await bcrypt.hash(user.password_hash, saltRounds);
        }
      }
    }
  });

  // 实例方法
  User.prototype.validatePassword = async function(password) {
    return await bcrypt.compare(password, this.password_hash);
  };

  User.prototype.getFullName = function() {
    if (this.first_name && this.last_name) {
      return `${this.first_name} ${this.last_name}`;
    }
    return this.username;
  };

  User.prototype.isPremium = function() {
    if (this.membership_type === 'free') {
      return false;
    }
    
    if (this.membership_type === 'premium_lifetime') {
      return true;
    }
    
    if (this.membership_expires && new Date() < this.membership_expires) {
      return true;
    }
    
    return false;
  };

  User.prototype.getRemainingTasks = async function() {
    const taskCount = await this.countTasks();
    return Math.max(0, this.task_limit - taskCount);
  };

  User.prototype.canCreateTask = async function() {
    if (this.isPremium()) {
      return true;
    }
    
    const remainingTasks = await this.getRemainingTasks();
    return remainingTasks > 0;
  };

  User.prototype.updateLastLogin = async function() {
    this.last_login = new Date();
    this.login_count += 1;
    await this.save();
  };

  User.prototype.toSafeJSON = function() {
    const user = this.toJSON();
    delete user.password_hash;
    delete user.verification_token;
    delete user.reset_password_token;
    delete user.reset_password_expires;
    return user;
  };

  // 类方法
  User.findByEmail = function(email) {
    return this.findOne({ where: { email: email.toLowerCase() } });
  };

  User.findByUsername = function(username) {
    return this.findOne({ where: { username } });
  };

  User.findByVerificationToken = function(token) {
    return this.findOne({ where: { verification_token: token } });
  };

  User.findByResetToken = function(token) {
    return this.findOne({
      where: {
        reset_password_token: token,
        reset_password_expires: {
          [sequelize.Sequelize.Op.gt]: new Date()
        }
      }
    });
  };

  User.getActiveUsers = function() {
    return this.findAll({ where: { is_active: true } });
  };

  User.getPremiumUsers = function() {
    return this.findAll({
      where: {
        membership_type: {
          [sequelize.Sequelize.Op.ne]: 'free'
        }
      }
    });
  };

  User.getExpiredMemberships = function() {
    return this.findAll({
      where: {
        membership_type: {
          [sequelize.Sequelize.Op.in]: ['premium_monthly', 'premium_yearly']
        },
        membership_expires: {
          [sequelize.Sequelize.Op.lt]: new Date()
        }
      }
    });
  };

  return User;
};