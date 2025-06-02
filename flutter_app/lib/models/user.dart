class User {
  final String? id;
  final String username;
  final String email;
  final UserProfile profile;
  final UserSubscription subscription;
  final UserUsage usage;
  final UserSettings settings;
  final String status;
  final DateTime createdAt;
  final DateTime lastModified;
  final DateTime? lastLoginAt;
  final String? lastLoginIP;
  final int loginCount;
  final List<String> apiKeys;
  final List<PaymentRecord> paymentHistory;

  User({
    this.id,
    required this.username,
    required this.email,
    UserProfile? profile,
    UserSubscription? subscription,
    UserUsage? usage,
    UserSettings? settings,
    this.status = 'active',
    DateTime? createdAt,
    DateTime? lastModified,
    this.lastLoginAt,
    this.lastLoginIP,
    this.loginCount = 0,
    this.apiKeys = const [],
    this.paymentHistory = const [],
  }) : profile = profile ?? UserProfile(),
       subscription = subscription ?? UserSubscription(),
       usage = usage ?? UserUsage(),
       settings = settings ?? UserSettings(),
       createdAt = createdAt ?? DateTime.now(),
       lastModified = lastModified ?? DateTime.now();

  // 从JSON创建User对象
  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['_id'] ?? json['id'],
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      profile: json['profile'] != null 
          ? UserProfile.fromJson(json['profile']) 
          : UserProfile(),
      subscription: json['subscription'] != null 
          ? UserSubscription.fromJson(json['subscription']) 
          : UserSubscription(),
      usage: json['usage'] != null 
          ? UserUsage.fromJson(json['usage']) 
          : UserUsage(),
      settings: json['settings'] != null 
          ? UserSettings.fromJson(json['settings']) 
          : UserSettings(),
      status: json['status'] ?? 'active',
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt']) 
          : DateTime.now(),
      lastModified: json['lastModified'] != null 
          ? DateTime.parse(json['lastModified']) 
          : DateTime.now(),
      lastLoginAt: json['lastLoginAt'] != null 
          ? DateTime.parse(json['lastLoginAt']) 
          : null,
      lastLoginIP: json['lastLoginIP'],
      loginCount: json['loginCount'] ?? 0,
      apiKeys: List<String>.from(json['apiKeys'] ?? []),
      paymentHistory: (json['paymentHistory'] as List<dynamic>? ?? [])
          .map((payment) => PaymentRecord.fromJson(payment))
          .toList(),
    );
  }

  // 转换为JSON
  Map<String, dynamic> toJson() {
    return {
      if (id != null) '_id': id,
      'username': username,
      'email': email,
      'profile': profile.toJson(),
      'subscription': subscription.toJson(),
      'usage': usage.toJson(),
      'settings': settings.toJson(),
      'status': status,
      'createdAt': createdAt.toIso8601String(),
      'lastModified': lastModified.toIso8601String(),
      if (lastLoginAt != null) 'lastLoginAt': lastLoginAt!.toIso8601String(),
      if (lastLoginIP != null) 'lastLoginIP': lastLoginIP,
      'loginCount': loginCount,
      'apiKeys': apiKeys,
      'paymentHistory': paymentHistory.map((payment) => payment.toJson()).toList(),
    };
  }

  // 复制用户并修改某些字段
  User copyWith({
    String? id,
    String? username,
    String? email,
    UserProfile? profile,
    UserSubscription? subscription,
    UserUsage? usage,
    UserSettings? settings,
    String? status,
    DateTime? createdAt,
    DateTime? lastModified,
    DateTime? lastLoginAt,
    String? lastLoginIP,
    int? loginCount,
    List<String>? apiKeys,
    List<PaymentRecord>? paymentHistory,
  }) {
    return User(
      id: id ?? this.id,
      username: username ?? this.username,
      email: email ?? this.email,
      profile: profile ?? this.profile,
      subscription: subscription ?? this.subscription,
      usage: usage ?? this.usage,
      settings: settings ?? this.settings,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      lastModified: lastModified ?? DateTime.now(),
      lastLoginAt: lastLoginAt ?? this.lastLoginAt,
      lastLoginIP: lastLoginIP ?? this.lastLoginIP,
      loginCount: loginCount ?? this.loginCount,
      apiKeys: apiKeys ?? this.apiKeys,
      paymentHistory: paymentHistory ?? this.paymentHistory,
    );
  }

  // 检查是否为高级用户
  bool get isPremium {
    return subscription.isPremium;
  }

  // 获取剩余订阅天数
  int get subscriptionDaysLeft {
    return subscription.daysLeft;
  }

  // 检查账户是否活跃
  bool get isActive {
    return status == 'active';
  }

  // 检查是否接近使用限制
  bool get isNearUsageLimit {
    return usage.isNearLimit;
  }

  @override
  String toString() {
    return 'User(id: $id, username: $username, email: $email, isPremium: $isPremium)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is User && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}

// 用户资料类
class UserProfile {
  final String? firstName;
  final String? lastName;
  final String? avatar;
  final String? bio;
  final String? phone;
  final DateTime? dateOfBirth;
  final String? gender;
  final String? country;
  final String? city;
  final String? timezone;
  final String? language;

  UserProfile({
    this.firstName,
    this.lastName,
    this.avatar,
    this.bio,
    this.phone,
    this.dateOfBirth,
    this.gender,
    this.country,
    this.city,
    this.timezone,
    this.language,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      firstName: json['firstName'],
      lastName: json['lastName'],
      avatar: json['avatar'],
      bio: json['bio'],
      phone: json['phone'],
      dateOfBirth: json['dateOfBirth'] != null 
          ? DateTime.parse(json['dateOfBirth']) 
          : null,
      gender: json['gender'],
      country: json['country'],
      city: json['city'],
      timezone: json['timezone'],
      language: json['language'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (firstName != null) 'firstName': firstName,
      if (lastName != null) 'lastName': lastName,
      if (avatar != null) 'avatar': avatar,
      if (bio != null) 'bio': bio,
      if (phone != null) 'phone': phone,
      if (dateOfBirth != null) 'dateOfBirth': dateOfBirth!.toIso8601String(),
      if (gender != null) 'gender': gender,
      if (country != null) 'country': country,
      if (city != null) 'city': city,
      if (timezone != null) 'timezone': timezone,
      if (language != null) 'language': language,
    };
  }

  UserProfile copyWith({
    String? firstName,
    String? lastName,
    String? avatar,
    String? bio,
    String? phone,
    DateTime? dateOfBirth,
    String? gender,
    String? country,
    String? city,
    String? timezone,
    String? language,
  }) {
    return UserProfile(
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      avatar: avatar ?? this.avatar,
      bio: bio ?? this.bio,
      phone: phone ?? this.phone,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      gender: gender ?? this.gender,
      country: country ?? this.country,
      city: city ?? this.city,
      timezone: timezone ?? this.timezone,
      language: language ?? this.language,
    );
  }

  String get fullName {
    if (firstName != null && lastName != null) {
      return '$firstName $lastName';
    } else if (firstName != null) {
      return firstName!;
    } else if (lastName != null) {
      return lastName!;
    }
    return '';
  }
}

// 用户订阅类
class UserSubscription {
  final String type;
  final String status;
  final DateTime? startDate;
  final DateTime? endDate;
  final bool autoRenew;
  final String? stripeCustomerId;
  final String? stripeSubscriptionId;
  final String? currentPeriodStart;
  final String? currentPeriodEnd;
  final String? cancelAtPeriodEnd;

  UserSubscription({
    this.type = 'free',
    this.status = 'active',
    this.startDate,
    this.endDate,
    this.autoRenew = false,
    this.stripeCustomerId,
    this.stripeSubscriptionId,
    this.currentPeriodStart,
    this.currentPeriodEnd,
    this.cancelAtPeriodEnd,
  });

  factory UserSubscription.fromJson(Map<String, dynamic> json) {
    return UserSubscription(
      type: json['type'] ?? 'free',
      status: json['status'] ?? 'active',
      startDate: json['startDate'] != null 
          ? DateTime.parse(json['startDate']) 
          : null,
      endDate: json['endDate'] != null 
          ? DateTime.parse(json['endDate']) 
          : null,
      autoRenew: json['autoRenew'] ?? false,
      stripeCustomerId: json['stripeCustomerId'],
      stripeSubscriptionId: json['stripeSubscriptionId'],
      currentPeriodStart: json['currentPeriodStart'],
      currentPeriodEnd: json['currentPeriodEnd'],
      cancelAtPeriodEnd: json['cancelAtPeriodEnd'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'status': status,
      if (startDate != null) 'startDate': startDate!.toIso8601String(),
      if (endDate != null) 'endDate': endDate!.toIso8601String(),
      'autoRenew': autoRenew,
      if (stripeCustomerId != null) 'stripeCustomerId': stripeCustomerId,
      if (stripeSubscriptionId != null) 'stripeSubscriptionId': stripeSubscriptionId,
      if (currentPeriodStart != null) 'currentPeriodStart': currentPeriodStart,
      if (currentPeriodEnd != null) 'currentPeriodEnd': currentPeriodEnd,
      if (cancelAtPeriodEnd != null) 'cancelAtPeriodEnd': cancelAtPeriodEnd,
    };
  }

  UserSubscription copyWith({
    String? type,
    String? status,
    DateTime? startDate,
    DateTime? endDate,
    bool? autoRenew,
    String? stripeCustomerId,
    String? stripeSubscriptionId,
    String? currentPeriodStart,
    String? currentPeriodEnd,
    String? cancelAtPeriodEnd,
  }) {
    return UserSubscription(
      type: type ?? this.type,
      status: status ?? this.status,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      autoRenew: autoRenew ?? this.autoRenew,
      stripeCustomerId: stripeCustomerId ?? this.stripeCustomerId,
      stripeSubscriptionId: stripeSubscriptionId ?? this.stripeSubscriptionId,
      currentPeriodStart: currentPeriodStart ?? this.currentPeriodStart,
      currentPeriodEnd: currentPeriodEnd ?? this.currentPeriodEnd,
      cancelAtPeriodEnd: cancelAtPeriodEnd ?? this.cancelAtPeriodEnd,
    );
  }

  bool get isPremium {
    return type != 'free' && status == 'active' && 
           (endDate == null || DateTime.now().isBefore(endDate!));
  }

  int get daysLeft {
    if (endDate == null) return 0;
    final now = DateTime.now();
    if (now.isAfter(endDate!)) return 0;
    return endDate!.difference(now).inDays;
  }

  bool get isExpiringSoon {
    return daysLeft > 0 && daysLeft <= 7;
  }
}

// 用户使用情况类
class UserUsage {
  final int tasksCreated;
  final int tasksCompleted;
  final int apiCallsToday;
  final int apiCallsThisMonth;
  final int storageUsed; // in bytes
  final DateTime lastResetDate;
  final Map<String, int> dailyStats;
  final Map<String, int> monthlyStats;

  UserUsage({
    this.tasksCreated = 0,
    this.tasksCompleted = 0,
    this.apiCallsToday = 0,
    this.apiCallsThisMonth = 0,
    this.storageUsed = 0,
    DateTime? lastResetDate,
    this.dailyStats = const {},
    this.monthlyStats = const {},
  }) : lastResetDate = lastResetDate ?? DateTime.now();

  factory UserUsage.fromJson(Map<String, dynamic> json) {
    return UserUsage(
      tasksCreated: json['tasksCreated'] ?? 0,
      tasksCompleted: json['tasksCompleted'] ?? 0,
      apiCallsToday: json['apiCallsToday'] ?? 0,
      apiCallsThisMonth: json['apiCallsThisMonth'] ?? 0,
      storageUsed: json['storageUsed'] ?? 0,
      lastResetDate: json['lastResetDate'] != null 
          ? DateTime.parse(json['lastResetDate']) 
          : DateTime.now(),
      dailyStats: Map<String, int>.from(json['dailyStats'] ?? {}),
      monthlyStats: Map<String, int>.from(json['monthlyStats'] ?? {}),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'tasksCreated': tasksCreated,
      'tasksCompleted': tasksCompleted,
      'apiCallsToday': apiCallsToday,
      'apiCallsThisMonth': apiCallsThisMonth,
      'storageUsed': storageUsed,
      'lastResetDate': lastResetDate.toIso8601String(),
      'dailyStats': dailyStats,
      'monthlyStats': monthlyStats,
    };
  }

  UserUsage copyWith({
    int? tasksCreated,
    int? tasksCompleted,
    int? apiCallsToday,
    int? apiCallsThisMonth,
    int? storageUsed,
    DateTime? lastResetDate,
    Map<String, int>? dailyStats,
    Map<String, int>? monthlyStats,
  }) {
    return UserUsage(
      tasksCreated: tasksCreated ?? this.tasksCreated,
      tasksCompleted: tasksCompleted ?? this.tasksCompleted,
      apiCallsToday: apiCallsToday ?? this.apiCallsToday,
      apiCallsThisMonth: apiCallsThisMonth ?? this.apiCallsThisMonth,
      storageUsed: storageUsed ?? this.storageUsed,
      lastResetDate: lastResetDate ?? this.lastResetDate,
      dailyStats: dailyStats ?? this.dailyStats,
      monthlyStats: monthlyStats ?? this.monthlyStats,
    );
  }

  bool get isNearLimit {
    // 免费用户限制：每天50个任务，每月1000次API调用
    return apiCallsToday >= 45 || apiCallsThisMonth >= 900;
  }

  double get completionRate {
    if (tasksCreated == 0) return 0.0;
    return tasksCompleted / tasksCreated;
  }
}

// 用户设置类
class UserSettings {
  final String theme;
  final String language;
  final String timezone;
  final bool notifications;
  final bool emailNotifications;
  final bool pushNotifications;
  final bool soundEnabled;
  final bool vibrationEnabled;
  final String dateFormat;
  final String timeFormat;
  final String defaultPriority;
  final bool autoSync;
  final int syncInterval; // in minutes
  final bool offlineMode;
  final Map<String, dynamic> customSettings;

  UserSettings({
    this.theme = 'system',
    this.language = 'zh-CN',
    this.timezone = 'Asia/Shanghai',
    this.notifications = true,
    this.emailNotifications = true,
    this.pushNotifications = true,
    this.soundEnabled = true,
    this.vibrationEnabled = true,
    this.dateFormat = 'yyyy-MM-dd',
    this.timeFormat = 'HH:mm',
    this.defaultPriority = 'medium',
    this.autoSync = true,
    this.syncInterval = 15,
    this.offlineMode = false,
    this.customSettings = const {},
  });

  factory UserSettings.fromJson(Map<String, dynamic> json) {
    return UserSettings(
      theme: json['theme'] ?? 'system',
      language: json['language'] ?? 'zh-CN',
      timezone: json['timezone'] ?? 'Asia/Shanghai',
      notifications: json['notifications'] ?? true,
      emailNotifications: json['emailNotifications'] ?? true,
      pushNotifications: json['pushNotifications'] ?? true,
      soundEnabled: json['soundEnabled'] ?? true,
      vibrationEnabled: json['vibrationEnabled'] ?? true,
      dateFormat: json['dateFormat'] ?? 'yyyy-MM-dd',
      timeFormat: json['timeFormat'] ?? 'HH:mm',
      defaultPriority: json['defaultPriority'] ?? 'medium',
      autoSync: json['autoSync'] ?? true,
      syncInterval: json['syncInterval'] ?? 15,
      offlineMode: json['offlineMode'] ?? false,
      customSettings: Map<String, dynamic>.from(json['customSettings'] ?? {}),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'theme': theme,
      'language': language,
      'timezone': timezone,
      'notifications': notifications,
      'emailNotifications': emailNotifications,
      'pushNotifications': pushNotifications,
      'soundEnabled': soundEnabled,
      'vibrationEnabled': vibrationEnabled,
      'dateFormat': dateFormat,
      'timeFormat': timeFormat,
      'defaultPriority': defaultPriority,
      'autoSync': autoSync,
      'syncInterval': syncInterval,
      'offlineMode': offlineMode,
      'customSettings': customSettings,
    };
  }

  UserSettings copyWith({
    String? theme,
    String? language,
    String? timezone,
    bool? notifications,
    bool? emailNotifications,
    bool? pushNotifications,
    bool? soundEnabled,
    bool? vibrationEnabled,
    String? dateFormat,
    String? timeFormat,
    String? defaultPriority,
    bool? autoSync,
    int? syncInterval,
    bool? offlineMode,
    Map<String, dynamic>? customSettings,
  }) {
    return UserSettings(
      theme: theme ?? this.theme,
      language: language ?? this.language,
      timezone: timezone ?? this.timezone,
      notifications: notifications ?? this.notifications,
      emailNotifications: emailNotifications ?? this.emailNotifications,
      pushNotifications: pushNotifications ?? this.pushNotifications,
      soundEnabled: soundEnabled ?? this.soundEnabled,
      vibrationEnabled: vibrationEnabled ?? this.vibrationEnabled,
      dateFormat: dateFormat ?? this.dateFormat,
      timeFormat: timeFormat ?? this.timeFormat,
      defaultPriority: defaultPriority ?? this.defaultPriority,
      autoSync: autoSync ?? this.autoSync,
      syncInterval: syncInterval ?? this.syncInterval,
      offlineMode: offlineMode ?? this.offlineMode,
      customSettings: customSettings ?? this.customSettings,
    );
  }
}

// 支付记录类
class PaymentRecord {
  final String? id;
  final String transactionId;
  final double amount;
  final String currency;
  final String status;
  final String method;
  final String? description;
  final DateTime createdAt;
  final DateTime? processedAt;
  final Map<String, dynamic> metadata;

  PaymentRecord({
    this.id,
    required this.transactionId,
    required this.amount,
    this.currency = 'USD',
    required this.status,
    required this.method,
    this.description,
    DateTime? createdAt,
    this.processedAt,
    this.metadata = const {},
  }) : createdAt = createdAt ?? DateTime.now();

  factory PaymentRecord.fromJson(Map<String, dynamic> json) {
    return PaymentRecord(
      id: json['_id'] ?? json['id'],
      transactionId: json['transactionId'] ?? '',
      amount: (json['amount'] ?? 0).toDouble(),
      currency: json['currency'] ?? 'USD',
      status: json['status'] ?? '',
      method: json['method'] ?? '',
      description: json['description'],
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt']) 
          : DateTime.now(),
      processedAt: json['processedAt'] != null 
          ? DateTime.parse(json['processedAt']) 
          : null,
      metadata: Map<String, dynamic>.from(json['metadata'] ?? {}),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) '_id': id,
      'transactionId': transactionId,
      'amount': amount,
      'currency': currency,
      'status': status,
      'method': method,
      if (description != null) 'description': description,
      'createdAt': createdAt.toIso8601String(),
      if (processedAt != null) 'processedAt': processedAt!.toIso8601String(),
      'metadata': metadata,
    };
  }

  bool get isSuccessful {
    return status == 'completed' || status == 'succeeded';
  }

  bool get isPending {
    return status == 'pending' || status == 'processing';
  }

  bool get isFailed {
    return status == 'failed' || status == 'cancelled';
  }
}