const fs = require('fs');
const path = require('path');

// 确保日志目录存在
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 日志级别
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// 获取当前日志级别
const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

// 颜色代码
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// 格式化时间戳
function getTimestamp() {
  return new Date().toISOString();
}

// 格式化日志消息
function formatMessage(level, message, meta = {}) {
  const timestamp = getTimestamp();
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

// 写入文件
function writeToFile(message) {
  if (process.env.LOG_FILE) {
    const logFile = path.resolve(process.env.LOG_FILE);
    const logDir = path.dirname(logFile);
    
    // 确保日志目录存在
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.appendFileSync(logFile, message + '\n', 'utf8');
  }
}

// 控制台输出
function writeToConsole(level, message, color) {
  if (process.env.NODE_ENV !== 'test') {
    const coloredMessage = `${color}${message}${colors.reset}`;
    console.log(coloredMessage);
  }
}

// 日志记录函数
function log(level, levelNum, color, message, meta = {}) {
  if (levelNum <= currentLogLevel) {
    const formattedMessage = formatMessage(level, message, meta);
    
    // 输出到控制台
    writeToConsole(level, formattedMessage, color);
    
    // 写入文件
    writeToFile(formattedMessage);
  }
}

// 错误堆栈处理
function formatError(error) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
  }
  return error;
}

// Logger类
class Logger {
  error(message, meta = {}) {
    if (meta instanceof Error) {
      meta = formatError(meta);
    }
    log('ERROR', LOG_LEVELS.ERROR, colors.red, message, meta);
  }
  
  warn(message, meta = {}) {
    log('WARN', LOG_LEVELS.WARN, colors.yellow, message, meta);
  }
  
  info(message, meta = {}) {
    log('INFO', LOG_LEVELS.INFO, colors.blue, message, meta);
  }
  
  debug(message, meta = {}) {
    log('DEBUG', LOG_LEVELS.DEBUG, colors.cyan, message, meta);
  }
  
  success(message, meta = {}) {
    log('INFO', LOG_LEVELS.INFO, colors.green, message, meta);
  }
  
  // HTTP请求日志
  http(req, res, responseTime) {
    const { method, url, ip } = req;
    const { statusCode } = res;
    const message = `${method} ${url} ${statusCode} ${responseTime}ms - ${ip}`;
    
    if (statusCode >= 400) {
      this.error(message);
    } else {
      this.info(message);
    }
  }
  
  // 数据库操作日志
  database(operation, table, duration, error = null) {
    const message = `DB ${operation} ${table} (${duration}ms)`;
    
    if (error) {
      this.error(message, { error: formatError(error) });
    } else {
      this.debug(message);
    }
  }
  
  // 支付操作日志
  payment(operation, amount, method, orderId, error = null) {
    const message = `Payment ${operation} - ${method} ¥${amount} Order: ${orderId}`;
    
    if (error) {
      this.error(message, { error: formatError(error) });
    } else {
      this.info(message);
    }
  }
  
  // 用户操作日志
  user(userId, action, details = {}) {
    const message = `User ${userId} ${action}`;
    this.info(message, details);
  }
  
  // 安全相关日志
  security(event, details = {}) {
    const message = `Security Event: ${event}`;
    this.warn(message, details);
  }
  
  // 性能监控日志
  performance(operation, duration, details = {}) {
    const message = `Performance: ${operation} took ${duration}ms`;
    
    if (duration > 1000) {
      this.warn(message, details);
    } else {
      this.debug(message, details);
    }
  }
}

// 创建logger实例
const logger = new Logger();

// 导出logger
module.exports = logger;

// 也导出Logger类，以便在测试中使用
module.exports.Logger = Logger;
module.exports.LOG_LEVELS = LOG_LEVELS;