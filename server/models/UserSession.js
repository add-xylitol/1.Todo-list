const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  const UserSession = sequelize.define('UserSession', {
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
    session_token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      defaultValue: () => uuidv4()
    },
    refresh_token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      defaultValue: () => uuidv4()
    },
    device_info: {
      type: DataTypes.JSON,
      defaultValue: {},
      allowNull: false
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    location: {
      type: DataTypes.JSON,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: () => {
        // 会话7天后过期
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }
    },
    last_activity: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
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
    tableName: 'user_sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['session_token']
      },
      {
        unique: true,
        fields: ['refresh_token']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['expires_at']
      },
      {
        fields: ['last_activity']
      }
    ]
  });

  // 实例方法
  UserSession.prototype.isExpired = function() {
    return new Date() > this.expires_at;
  };

  UserSession.prototype.isValid = function() {
    return this.is_active && !this.isExpired();
  };

  UserSession.prototype.updateActivity = async function() {
    this.last_activity = new Date();
    await this.save();
  };

  UserSession.prototype.revoke = async function() {
    this.is_active = false;
    await this.save();
  };

  UserSession.prototype.extend = async function(days = 7) {
    this.expires_at = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await this.save();
  };

  UserSession.prototype.getDeviceType = function() {
    const userAgent = this.user_agent || '';
    
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return 'mobile';
    } else if (/Tablet/.test(userAgent)) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  };

  UserSession.prototype.getBrowser = function() {
    const userAgent = this.user_agent || '';
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    
    return 'Unknown';
  };

  UserSession.prototype.getOS = function() {
    const userAgent = this.user_agent || '';
    
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    
    return 'Unknown';
  };

  UserSession.prototype.toSafeJSON = function() {
    const session = this.toJSON();
    
    // 移除敏感信息
    delete session.session_token;
    delete session.refresh_token;
    
    // 添加设备信息
    session.device_type = this.getDeviceType();
    session.browser = this.getBrowser();
    session.os = this.getOS();
    session.is_current = false; // 这个需要在控制器中设置
    
    return session;
  };

  // 类方法
  UserSession.findByToken = function(token) {
    return this.findOne({
      where: {
        session_token: token,
        is_active: true
      }
    });
  };

  UserSession.findByRefreshToken = function(refreshToken) {
    return this.findOne({
      where: {
        refresh_token: refreshToken,
        is_active: true
      }
    });
  };

  UserSession.findActiveByUser = function(userId) {
    return this.findAll({
      where: {
        user_id: userId,
        is_active: true,
        expires_at: {
          [sequelize.Sequelize.Op.gt]: new Date()
        }
      },
      order: [['last_activity', 'DESC']]
    });
  };

  UserSession.revokeAllByUser = async function(userId, exceptSessionId = null) {
    const where = {
      user_id: userId,
      is_active: true
    };
    
    if (exceptSessionId) {
      where.id = {
        [sequelize.Sequelize.Op.ne]: exceptSessionId
      };
    }
    
    return await this.update(
      { is_active: false },
      { where }
    );
  };

  UserSession.cleanupExpired = async function() {
    const expiredSessions = await this.findAll({
      where: {
        [sequelize.Sequelize.Op.or]: [
          {
            expires_at: {
              [sequelize.Sequelize.Op.lt]: new Date()
            }
          },
          {
            is_active: false
          }
        ]
      }
    });
    
    await this.destroy({
      where: {
        id: {
          [sequelize.Sequelize.Op.in]: expiredSessions.map(s => s.id)
        }
      }
    });
    
    return expiredSessions.length;
  };

  UserSession.getActiveSessionStats = async function() {
    const sessions = await this.findAll({
      where: {
        is_active: true,
        expires_at: {
          [sequelize.Sequelize.Op.gt]: new Date()
        }
      },
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'username', 'membership_type']
      }]
    });
    
    const stats = {
      total_active_sessions: sessions.length,
      unique_users: new Set(sessions.map(s => s.user_id)).size,
      by_device_type: {},
      by_browser: {},
      by_membership: {}
    };
    
    sessions.forEach(session => {
      // 按设备类型统计
      const deviceType = session.getDeviceType();
      stats.by_device_type[deviceType] = (stats.by_device_type[deviceType] || 0) + 1;
      
      // 按浏览器统计
      const browser = session.getBrowser();
      stats.by_browser[browser] = (stats.by_browser[browser] || 0) + 1;
      
      // 按会员类型统计
      if (session.user) {
        const membershipType = session.user.membership_type;
        stats.by_membership[membershipType] = (stats.by_membership[membershipType] || 0) + 1;
      }
    });
    
    return stats;
  };

  return UserSession;
};