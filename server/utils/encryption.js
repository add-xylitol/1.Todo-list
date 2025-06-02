const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');

// 加密配置
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const HASH_ROUNDS = 12;
const TOKEN_EXPIRY = {
  access: '15m',
  refresh: '7d',
  reset: '1h',
  verification: '24h'
};

// 密码相关
class PasswordManager {
  /**
   * 哈希密码
   * @param {string} password - 原始密码
   * @returns {Promise<string>} 哈希后的密码
   */
  static async hash(password) {
    if (!password || typeof password !== 'string') {
      throw new Error('密码必须是非空字符串');
    }
    
    return await bcrypt.hash(password, HASH_ROUNDS);
  }

  /**
   * 验证密码
   * @param {string} password - 原始密码
   * @param {string} hashedPassword - 哈希后的密码
   * @returns {Promise<boolean>} 验证结果
   */
  static async verify(password, hashedPassword) {
    if (!password || !hashedPassword) {
      return false;
    }
    
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * 生成随机密码
   * @param {number} length - 密码长度
   * @returns {string} 随机密码
   */
  static generateRandom(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // 确保包含至少一个大写字母、小写字母、数字和特殊字符
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
    
    // 填充剩余长度
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // 打乱字符顺序
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * 检查密码强度
   * @param {string} password - 密码
   * @returns {object} 强度评估结果
   */
  static checkStrength(password) {
    const result = {
      score: 0,
      level: 'weak',
      suggestions: []
    };

    if (!password) {
      result.suggestions.push('密码不能为空');
      return result;
    }

    // 长度检查
    if (password.length >= 8) result.score += 1;
    else result.suggestions.push('密码长度至少8位');

    if (password.length >= 12) result.score += 1;

    // 字符类型检查
    if (/[a-z]/.test(password)) result.score += 1;
    else result.suggestions.push('包含小写字母');

    if (/[A-Z]/.test(password)) result.score += 1;
    else result.suggestions.push('包含大写字母');

    if (/\d/.test(password)) result.score += 1;
    else result.suggestions.push('包含数字');

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) result.score += 1;
    else result.suggestions.push('包含特殊字符');

    // 复杂性检查
    if (!/(..).*\1/.test(password)) result.score += 1; // 无重复子串
    if (!/012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) {
      result.score += 1; // 无连续字符
    }

    // 评级
    if (result.score >= 7) result.level = 'strong';
    else if (result.score >= 5) result.level = 'medium';
    else result.level = 'weak';

    return result;
  }
}

// JWT令牌管理
class TokenManager {
  /**
   * 生成访问令牌
   * @param {object} payload - 载荷数据
   * @param {string} expiresIn - 过期时间
   * @returns {string} JWT令牌
   */
  static generateAccessToken(payload, expiresIn = TOKEN_EXPIRY.access) {
    return jwt.sign(
      {
        ...payload,
        type: 'access',
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET,
      { expiresIn }
    );
  }

  /**
   * 生成刷新令牌
   * @param {object} payload - 载荷数据
   * @param {string} expiresIn - 过期时间
   * @returns {string} JWT令牌
   */
  static generateRefreshToken(payload, expiresIn = TOKEN_EXPIRY.refresh) {
    return jwt.sign(
      {
        ...payload,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn }
    );
  }

  /**
   * 生成重置密码令牌
   * @param {object} payload - 载荷数据
   * @returns {string} JWT令牌
   */
  static generateResetToken(payload) {
    return jwt.sign(
      {
        ...payload,
        type: 'reset',
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY.reset }
    );
  }

  /**
   * 生成邮箱验证令牌
   * @param {object} payload - 载荷数据
   * @returns {string} JWT令牌
   */
  static generateVerificationToken(payload) {
    return jwt.sign(
      {
        ...payload,
        type: 'verification',
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY.verification }
    );
  }

  /**
   * 验证令牌
   * @param {string} token - JWT令牌
   * @param {string} type - 令牌类型
   * @returns {object} 解码后的载荷
   */
  static verifyToken(token, type = 'access') {
    const secret = type === 'refresh' ? process.env.JWT_REFRESH_SECRET : process.env.JWT_SECRET;
    
    try {
      const decoded = jwt.verify(token, secret);
      
      if (decoded.type !== type) {
        throw new Error('令牌类型不匹配');
      }
      
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('令牌已过期');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('无效的令牌');
      }
      throw error;
    }
  }

  /**
   * 解码令牌（不验证）
   * @param {string} token - JWT令牌
   * @returns {object} 解码后的载荷
   */
  static decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * 检查令牌是否即将过期
   * @param {string} token - JWT令牌
   * @param {number} threshold - 阈值（秒）
   * @returns {boolean} 是否即将过期
   */
  static isTokenExpiringSoon(token, threshold = 300) { // 5分钟
    try {
      const decoded = this.decodeToken(token);
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp - now < threshold;
    } catch {
      return true;
    }
  }
}

// 数据加密
class DataEncryption {
  /**
   * 加密数据
   * @param {string} text - 要加密的文本
   * @param {string} key - 加密密钥
   * @returns {object} 加密结果
   */
  static encrypt(text, key = process.env.ENCRYPTION_KEY) {
    if (!text || !key) {
      throw new Error('文本和密钥不能为空');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, key);
    cipher.setAAD(Buffer.from('todolist-app'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * 解密数据
   * @param {object} encryptedData - 加密数据对象
   * @param {string} key - 解密密钥
   * @returns {string} 解密后的文本
   */
  static decrypt(encryptedData, key = process.env.ENCRYPTION_KEY) {
    if (!encryptedData || !key) {
      throw new Error('加密数据和密钥不能为空');
    }

    const { encrypted, iv, authTag } = encryptedData;
    
    const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, key);
    decipher.setAAD(Buffer.from('todolist-app'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * 生成随机密钥
   * @param {number} length - 密钥长度
   * @returns {string} 随机密钥
   */
  static generateKey(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 生成哈希
   * @param {string} data - 要哈希的数据
   * @param {string} algorithm - 哈希算法
   * @returns {string} 哈希值
   */
  static hash(data, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * 生成HMAC
   * @param {string} data - 要签名的数据
   * @param {string} key - 签名密钥
   * @param {string} algorithm - HMAC算法
   * @returns {string} HMAC值
   */
  static hmac(data, key, algorithm = 'sha256') {
    return crypto.createHmac(algorithm, key).update(data).digest('hex');
  }
}

// 随机数生成
class RandomGenerator {
  /**
   * 生成随机字符串
   * @param {number} length - 长度
   * @param {string} charset - 字符集
   * @returns {string} 随机字符串
   */
  static string(length = 16, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset[Math.floor(Math.random() * charset.length)];
    }
    return result;
  }

  /**
   * 生成随机数字
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @returns {number} 随机数字
   */
  static number(min = 0, max = 100) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 生成UUID
   * @returns {string} UUID
   */
  static uuid() {
    return crypto.randomUUID();
  }

  /**
   * 生成随机十六进制字符串
   * @param {number} bytes - 字节数
   * @returns {string} 十六进制字符串
   */
  static hex(bytes = 16) {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * 生成随机Base64字符串
   * @param {number} bytes - 字节数
   * @returns {string} Base64字符串
   */
  static base64(bytes = 16) {
    return crypto.randomBytes(bytes).toString('base64');
  }

  /**
   * 生成随机验证码
   * @param {number} length - 长度
   * @param {boolean} numbersOnly - 是否只包含数字
   * @returns {string} 验证码
   */
  static verificationCode(length = 6, numbersOnly = true) {
    const charset = numbersOnly ? '0123456789' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return this.string(length, charset);
  }
}

// 签名验证
class SignatureManager {
  /**
   * 生成签名
   * @param {object} data - 要签名的数据
   * @param {string} secret - 签名密钥
   * @returns {string} 签名
   */
  static generate(data, secret) {
    const sortedData = this.sortObject(data);
    const queryString = this.objectToQueryString(sortedData);
    return DataEncryption.hmac(queryString, secret);
  }

  /**
   * 验证签名
   * @param {object} data - 数据
   * @param {string} signature - 签名
   * @param {string} secret - 签名密钥
   * @returns {boolean} 验证结果
   */
  static verify(data, signature, secret) {
    const expectedSignature = this.generate(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * 对象排序
   * @param {object} obj - 对象
   * @returns {object} 排序后的对象
   */
  static sortObject(obj) {
    const sorted = {};
    Object.keys(obj).sort().forEach(key => {
      if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
        sorted[key] = obj[key];
      }
    });
    return sorted;
  }

  /**
   * 对象转查询字符串
   * @param {object} obj - 对象
   * @returns {string} 查询字符串
   */
  static objectToQueryString(obj) {
    return Object.keys(obj)
      .map(key => `${key}=${obj[key]}`)
      .join('&');
  }
}

// 安全工具
class SecurityUtils {
  /**
   * 生成CSRF令牌
   * @returns {string} CSRF令牌
   */
  static generateCSRFToken() {
    return RandomGenerator.hex(32);
  }

  /**
   * 验证CSRF令牌
   * @param {string} token - 令牌
   * @param {string} sessionToken - 会话令牌
   * @returns {boolean} 验证结果
   */
  static verifyCSRFToken(token, sessionToken) {
    return token && sessionToken && token === sessionToken;
  }

  /**
   * 生成API密钥
   * @param {string} prefix - 前缀
   * @returns {string} API密钥
   */
  static generateAPIKey(prefix = 'tl') {
    const timestamp = Date.now().toString(36);
    const random = RandomGenerator.hex(16);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * 掩码敏感信息
   * @param {string} text - 文本
   * @param {number} visibleStart - 开始可见字符数
   * @param {number} visibleEnd - 结束可见字符数
   * @param {string} maskChar - 掩码字符
   * @returns {string} 掩码后的文本
   */
  static maskSensitiveData(text, visibleStart = 3, visibleEnd = 3, maskChar = '*') {
    if (!text || text.length <= visibleStart + visibleEnd) {
      return text;
    }
    
    const start = text.substring(0, visibleStart);
    const end = text.substring(text.length - visibleEnd);
    const maskLength = text.length - visibleStart - visibleEnd;
    
    return start + maskChar.repeat(maskLength) + end;
  }

  /**
   * 安全比较字符串
   * @param {string} a - 字符串A
   * @param {string} b - 字符串B
   * @returns {boolean} 比较结果
   */
  static safeCompare(a, b) {
    if (!a || !b || a.length !== b.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}

module.exports = {
  PasswordManager,
  TokenManager,
  DataEncryption,
  RandomGenerator,
  SignatureManager,
  SecurityUtils,
  TOKEN_EXPIRY
};