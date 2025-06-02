class AppConstants {
  // API相关常量
  static const String baseUrl = 'http://localhost:3001/api';
  static const String apiVersion = 'v1';
  static const Duration apiTimeout = Duration(seconds: 30);
  
  // 存储键名
  static const String tokenKey = 'auth_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userKey = 'user_data';
  static const String settingsKey = 'app_settings';
  static const String themeKey = 'theme_mode';
  static const String languageKey = 'language_code';
  static const String lastSyncKey = 'last_sync_time';
  static const String offlineTasksKey = 'offline_tasks';
  static const String draftsKey = 'task_drafts';
  
  // 任务相关常量
  static const List<String> taskPriorities = ['low', 'medium', 'high'];
  static const List<String> taskStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
  static const List<String> taskCategories = [
    'work',
    'personal',
    'shopping',
    'health',
    'education',
    'finance',
    'travel',
    'other'
  ];
  
  // 重复规则
  static const List<String> recurrenceTypes = [
    'daily',
    'weekly',
    'monthly',
    'yearly',
    'custom'
  ];
  
  // 提醒时间选项（分钟）
  static const List<int> reminderOptions = [
    0,    // 准时
    5,    // 5分钟前
    10,   // 10分钟前
    15,   // 15分钟前
    30,   // 30分钟前
    60,   // 1小时前
    120,  // 2小时前
    1440, // 1天前
  ];
  
  // 排序选项
  static const List<String> sortOptions = [
    'created_at',
    'updated_at',
    'due_date',
    'priority',
    'title',
    'status'
  ];
  
  // 过滤选项
  static const List<String> filterOptions = [
    'all',
    'today',
    'tomorrow',
    'this_week',
    'overdue',
    'completed',
    'pending'
  ];
  
  // 订阅计划
  static const List<String> subscriptionPlans = [
    'free',
    'premium',
    'pro'
  ];
  
  // 支付方式
  static const List<String> paymentMethods = [
    'stripe',
    'apple_pay',
    'google_pay',
    'wechat_pay',
    'alipay'
  ];
  
  // 文件类型
  static const List<String> supportedImageTypes = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp'
  ];
  
  static const List<String> supportedDocumentTypes = [
    'pdf',
    'doc',
    'docx',
    'txt',
    'rtf'
  ];
  
  // 限制常量
  static const int maxTaskTitleLength = 200;
  static const int maxTaskDescriptionLength = 2000;
  static const int maxSubtaskCount = 50;
  static const int maxAttachmentCount = 10;
  static const int maxAttachmentSize = 10 * 1024 * 1024; // 10MB
  static const int maxTagCount = 10;
  static const int maxTagLength = 30;
  
  // 免费用户限制
  static const int freeUserMaxTasks = 100;
  static const int freeUserMaxProjects = 5;
  static const int freeUserMaxAttachments = 50;
  
  // 高级用户限制
  static const int premiumUserMaxTasks = 1000;
  static const int premiumUserMaxProjects = 50;
  static const int premiumUserMaxAttachments = 500;
  
  // 专业用户限制（无限制用-1表示）
  static const int proUserMaxTasks = -1;
  static const int proUserMaxProjects = -1;
  static const int proUserMaxAttachments = -1;
  
  // 同步相关
  static const Duration syncInterval = Duration(minutes: 15);
  static const Duration offlineRetryInterval = Duration(minutes: 5);
  static const int maxRetryAttempts = 3;
  
  // 动画持续时间
  static const Duration shortAnimationDuration = Duration(milliseconds: 200);
  static const Duration mediumAnimationDuration = Duration(milliseconds: 300);
  static const Duration longAnimationDuration = Duration(milliseconds: 500);
  
  // 页面大小
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;
  
  // 搜索相关
  static const int minSearchLength = 2;
  static const Duration searchDebounceDelay = Duration(milliseconds: 500);
  
  // 缓存相关
  static const Duration cacheExpiration = Duration(hours: 24);
  static const int maxCacheSize = 100 * 1024 * 1024; // 100MB
  
  // 通知相关
  static const String notificationChannelId = 'task_reminders';
  static const String notificationChannelName = 'Task Reminders';
  static const String notificationChannelDescription = 'Notifications for task reminders';
  
  // 深度链接
  static const String deepLinkScheme = 'todoapp';
  static const String deepLinkHost = 'task';
  
  // 错误消息
  static const String networkErrorMessage = '网络连接失败，请检查网络设置';
  static const String serverErrorMessage = '服务器错误，请稍后重试';
  static const String authErrorMessage = '认证失败，请重新登录';
  static const String validationErrorMessage = '输入数据格式错误';
  static const String unknownErrorMessage = '未知错误，请稍后重试';
  
  // 成功消息
  static const String taskCreatedMessage = '任务创建成功';
  static const String taskUpdatedMessage = '任务更新成功';
  static const String taskDeletedMessage = '任务删除成功';
  static const String taskCompletedMessage = '任务完成';
  static const String syncSuccessMessage = '同步成功';
  
  // 正则表达式
  static const String emailRegex = r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$';
  static const String phoneRegex = r'^1[3-9]\d{9}$';
  static const String passwordRegex = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$';
  static const String urlRegex = r'^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$';
  
  // 日期格式
  static const String dateFormat = 'yyyy-MM-dd';
  static const String timeFormat = 'HH:mm';
  static const String dateTimeFormat = 'yyyy-MM-dd HH:mm';
  static const String displayDateFormat = 'MM月dd日';
  static const String displayDateTimeFormat = 'MM月dd日 HH:mm';
  
  // 语言代码
  static const List<String> supportedLanguages = ['zh', 'en'];
  static const String defaultLanguage = 'zh';
  
  // 主题模式
  static const List<String> themeModes = ['system', 'light', 'dark'];
  static const String defaultThemeMode = 'system';
  
  // 导出格式
  static const List<String> exportFormats = ['json', 'csv', 'pdf'];
  
  // 备份相关
  static const Duration autoBackupInterval = Duration(days: 7);
  static const int maxBackupCount = 10;
  
  // 统计相关
  static const List<String> statisticsPeriods = [
    'today',
    'this_week',
    'this_month',
    'this_year',
    'all_time'
  ];
  
  // 快捷操作
  static const List<String> quickActions = [
    'add_task',
    'search',
    'sync',
    'settings'
  ];
  
  // 手势相关
  static const double swipeThreshold = 100.0;
  static const Duration swipeAnimationDuration = Duration(milliseconds: 200);
  
  // 键盘快捷键
  static const Map<String, String> keyboardShortcuts = {
    'new_task': 'Ctrl+N',
    'search': 'Ctrl+F',
    'sync': 'Ctrl+S',
    'settings': 'Ctrl+,',
    'delete': 'Delete',
    'complete': 'Space',
  };
  
  // 应用信息
  static const String appName = 'Todo List';
  static const String appVersion = '1.0.0';
  static const String appDescription = '一个功能强大的待办事项管理应用';
  static const String developerName = 'Your Name';
  static const String supportEmail = 'support@example.com';
  static const String privacyPolicyUrl = 'https://example.com/privacy';
  static const String termsOfServiceUrl = 'https://example.com/terms';
  
  // 社交媒体链接
  static const Map<String, String> socialLinks = {
    'website': 'https://example.com',
    'twitter': 'https://twitter.com/example',
    'github': 'https://github.com/example',
    'email': 'mailto:support@example.com',
  };
  
  // 功能开关
  static const bool enableAnalytics = true;
  static const bool enableCrashReporting = true;
  static const bool enablePushNotifications = true;
  static const bool enableBiometricAuth = true;
  static const bool enableOfflineMode = true;
  static const bool enableCloudSync = true;
  static const bool enableDataExport = true;
  static const bool enableDarkMode = true;
  
  // 调试相关
  static const bool isDebugMode = true;
  static const bool enableLogging = true;
  static const bool enablePerformanceMonitoring = true;
}

// 枚举定义
enum TaskPriority { low, medium, high }
enum TaskStatus { pending, inProgress, completed, cancelled }
enum SortOrder { ascending, descending }
enum ViewMode { list, grid, calendar }
enum ThemeMode { system, light, dark }
enum SyncStatus { idle, syncing, success, error }
enum ConnectionStatus { online, offline }
enum NotificationType { reminder, deadline, completion }
enum ExportFormat { json, csv, pdf }
enum BackupStatus { none, inProgress, completed, failed }

// 扩展方法
extension TaskPriorityExtension on TaskPriority {
  String get displayName {
    switch (this) {
      case TaskPriority.low:
        return '低';
      case TaskPriority.medium:
        return '中';
      case TaskPriority.high:
        return '高';
    }
  }
  
  int get value {
    switch (this) {
      case TaskPriority.low:
        return 1;
      case TaskPriority.medium:
        return 2;
      case TaskPriority.high:
        return 3;
    }
  }
}

extension TaskStatusExtension on TaskStatus {
  String get displayName {
    switch (this) {
      case TaskStatus.pending:
        return '待处理';
      case TaskStatus.inProgress:
        return '进行中';
      case TaskStatus.completed:
        return '已完成';
      case TaskStatus.cancelled:
        return '已取消';
    }
  }
  
  bool get isCompleted => this == TaskStatus.completed;
  bool get isActive => this == TaskStatus.pending || this == TaskStatus.inProgress;
}