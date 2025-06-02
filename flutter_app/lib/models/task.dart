class Task {
  final String? id;
  final String title;
  final String? description;
  final bool completed;
  final String priority;
  final String? category;
  final DateTime? dueDate;
  final DateTime? reminderTime;
  final List<String> tags;
  final List<Subtask> subtasks;
  final List<Attachment> attachments;
  final RecurrenceRule? recurrence;
  final int order;
  final DateTime createdAt;
  final DateTime lastModified;
  final DateTime? completedAt;
  final bool isDeleted;
  final DateTime? deletedAt;
  final int viewCount;
  final String? notes;
  final double? estimatedTime;
  final double? actualTime;
  final String? location;
  final String? url;
  final List<String> collaborators;
  final Map<String, dynamic> customFields;
  final String? parentTaskId;
  final bool isSubtask;
  final String? projectId;
  final String? clientId;
  final String syncStatus;
  final DateTime? lastSyncTime;
  final int version;
  final Map<String, dynamic> conflictData;

  Task({
    this.id,
    required this.title,
    this.description,
    this.completed = false,
    this.priority = 'medium',
    this.category,
    this.dueDate,
    this.reminderTime,
    this.tags = const [],
    this.subtasks = const [],
    this.attachments = const [],
    this.recurrence,
    this.order = 0,
    DateTime? createdAt,
    DateTime? lastModified,
    this.completedAt,
    this.isDeleted = false,
    this.deletedAt,
    this.viewCount = 0,
    this.notes,
    this.estimatedTime,
    this.actualTime,
    this.location,
    this.url,
    this.collaborators = const [],
    this.customFields = const {},
    this.parentTaskId,
    this.isSubtask = false,
    this.projectId,
    this.clientId,
    this.syncStatus = 'synced',
    this.lastSyncTime,
    this.version = 1,
    this.conflictData = const {},
  }) : createdAt = createdAt ?? DateTime.now(),
       lastModified = lastModified ?? DateTime.now();

  // 从JSON创建Task对象
  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: json['_id'] ?? json['id'],
      title: json['title'] ?? '',
      description: json['description'],
      completed: json['completed'] ?? false,
      priority: json['priority'] ?? 'medium',
      category: json['category'],
      dueDate: json['dueDate'] != null ? DateTime.parse(json['dueDate']) : null,
      reminderTime: json['reminderTime'] != null ? DateTime.parse(json['reminderTime']) : null,
      tags: List<String>.from(json['tags'] ?? []),
      subtasks: (json['subtasks'] as List<dynamic>? ?? [])
          .map((subtask) => Subtask.fromJson(subtask))
          .toList(),
      attachments: (json['attachments'] as List<dynamic>? ?? [])
          .map((attachment) => Attachment.fromJson(attachment))
          .toList(),
      recurrence: json['recurrence'] != null 
          ? RecurrenceRule.fromJson(json['recurrence']) 
          : null,
      order: json['order'] ?? 0,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
      lastModified: json['lastModified'] != null ? DateTime.parse(json['lastModified']) : DateTime.now(),
      completedAt: json['completedAt'] != null ? DateTime.parse(json['completedAt']) : null,
      isDeleted: json['isDeleted'] ?? false,
      deletedAt: json['deletedAt'] != null ? DateTime.parse(json['deletedAt']) : null,
      viewCount: json['viewCount'] ?? 0,
      notes: json['notes'],
      estimatedTime: json['estimatedTime']?.toDouble(),
      actualTime: json['actualTime']?.toDouble(),
      location: json['location'],
      url: json['url'],
      collaborators: List<String>.from(json['collaborators'] ?? []),
      customFields: Map<String, dynamic>.from(json['customFields'] ?? {}),
      parentTaskId: json['parentTaskId'],
      isSubtask: json['isSubtask'] ?? false,
      projectId: json['projectId'],
      clientId: json['clientId'],
      syncStatus: json['syncStatus'] ?? 'synced',
      lastSyncTime: json['lastSyncTime'] != null ? DateTime.parse(json['lastSyncTime']) : null,
      version: json['version'] ?? 1,
      conflictData: Map<String, dynamic>.from(json['conflictData'] ?? {}),
    );
  }

  // 转换为JSON
  Map<String, dynamic> toJson() {
    return {
      if (id != null) '_id': id,
      'title': title,
      if (description != null) 'description': description,
      'completed': completed,
      'priority': priority,
      if (category != null) 'category': category,
      if (dueDate != null) 'dueDate': dueDate!.toIso8601String(),
      if (reminderTime != null) 'reminderTime': reminderTime!.toIso8601String(),
      'tags': tags,
      'subtasks': subtasks.map((subtask) => subtask.toJson()).toList(),
      'attachments': attachments.map((attachment) => attachment.toJson()).toList(),
      if (recurrence != null) 'recurrence': recurrence!.toJson(),
      'order': order,
      'createdAt': createdAt.toIso8601String(),
      'lastModified': lastModified.toIso8601String(),
      if (completedAt != null) 'completedAt': completedAt!.toIso8601String(),
      'isDeleted': isDeleted,
      if (deletedAt != null) 'deletedAt': deletedAt!.toIso8601String(),
      'viewCount': viewCount,
      if (notes != null) 'notes': notes,
      if (estimatedTime != null) 'estimatedTime': estimatedTime,
      if (actualTime != null) 'actualTime': actualTime,
      if (location != null) 'location': location,
      if (url != null) 'url': url,
      'collaborators': collaborators,
      'customFields': customFields,
      if (parentTaskId != null) 'parentTaskId': parentTaskId,
      'isSubtask': isSubtask,
      if (projectId != null) 'projectId': projectId,
      if (clientId != null) 'clientId': clientId,
      'syncStatus': syncStatus,
      if (lastSyncTime != null) 'lastSyncTime': lastSyncTime!.toIso8601String(),
      'version': version,
      'conflictData': conflictData,
    };
  }

  // 复制任务并修改某些字段
  Task copyWith({
    String? id,
    String? title,
    String? description,
    bool? completed,
    String? priority,
    String? category,
    DateTime? dueDate,
    DateTime? reminderTime,
    List<String>? tags,
    List<Subtask>? subtasks,
    List<Attachment>? attachments,
    RecurrenceRule? recurrence,
    int? order,
    DateTime? createdAt,
    DateTime? lastModified,
    DateTime? completedAt,
    bool? isDeleted,
    DateTime? deletedAt,
    int? viewCount,
    String? notes,
    double? estimatedTime,
    double? actualTime,
    String? location,
    String? url,
    List<String>? collaborators,
    Map<String, dynamic>? customFields,
    String? parentTaskId,
    bool? isSubtask,
    String? projectId,
    String? clientId,
    String? syncStatus,
    DateTime? lastSyncTime,
    int? version,
    Map<String, dynamic>? conflictData,
  }) {
    return Task(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      completed: completed ?? this.completed,
      priority: priority ?? this.priority,
      category: category ?? this.category,
      dueDate: dueDate ?? this.dueDate,
      reminderTime: reminderTime ?? this.reminderTime,
      tags: tags ?? this.tags,
      subtasks: subtasks ?? this.subtasks,
      attachments: attachments ?? this.attachments,
      recurrence: recurrence ?? this.recurrence,
      order: order ?? this.order,
      createdAt: createdAt ?? this.createdAt,
      lastModified: lastModified ?? DateTime.now(),
      completedAt: completedAt ?? this.completedAt,
      isDeleted: isDeleted ?? this.isDeleted,
      deletedAt: deletedAt ?? this.deletedAt,
      viewCount: viewCount ?? this.viewCount,
      notes: notes ?? this.notes,
      estimatedTime: estimatedTime ?? this.estimatedTime,
      actualTime: actualTime ?? this.actualTime,
      location: location ?? this.location,
      url: url ?? this.url,
      collaborators: collaborators ?? this.collaborators,
      customFields: customFields ?? this.customFields,
      parentTaskId: parentTaskId ?? this.parentTaskId,
      isSubtask: isSubtask ?? this.isSubtask,
      projectId: projectId ?? this.projectId,
      clientId: clientId ?? this.clientId,
      syncStatus: syncStatus ?? this.syncStatus,
      lastSyncTime: lastSyncTime ?? this.lastSyncTime,
      version: version ?? this.version,
      conflictData: conflictData ?? this.conflictData,
    );
  }

  // 检查任务是否过期
  bool get isOverdue {
    if (dueDate == null || completed) return false;
    return DateTime.now().isAfter(dueDate!);
  }

  // 获取任务进度（基于子任务完成情况）
  double get progress {
    if (subtasks.isEmpty) {
      return completed ? 1.0 : 0.0;
    }
    
    final completedSubtasks = subtasks.where((subtask) => subtask.completed).length;
    return completedSubtasks / subtasks.length;
  }

  // 检查是否需要同步
  bool get needsSync {
    return syncStatus != 'synced';
  }

  // 获取优先级权重（用于排序）
  int get priorityWeight {
    switch (priority) {
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 2;
    }
  }

  @override
  String toString() {
    return 'Task(id: $id, title: $title, completed: $completed, priority: $priority)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Task && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}

// 子任务类
class Subtask {
  final String? id;
  final String title;
  final bool completed;
  final DateTime? dueDate;
  final DateTime createdAt;
  final DateTime? completedAt;

  Subtask({
    this.id,
    required this.title,
    this.completed = false,
    this.dueDate,
    DateTime? createdAt,
    this.completedAt,
  }) : createdAt = createdAt ?? DateTime.now();

  factory Subtask.fromJson(Map<String, dynamic> json) {
    return Subtask(
      id: json['_id'] ?? json['id'],
      title: json['title'] ?? '',
      completed: json['completed'] ?? false,
      dueDate: json['dueDate'] != null ? DateTime.parse(json['dueDate']) : null,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
      completedAt: json['completedAt'] != null ? DateTime.parse(json['completedAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) '_id': id,
      'title': title,
      'completed': completed,
      if (dueDate != null) 'dueDate': dueDate!.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      if (completedAt != null) 'completedAt': completedAt!.toIso8601String(),
    };
  }

  Subtask copyWith({
    String? id,
    String? title,
    bool? completed,
    DateTime? dueDate,
    DateTime? createdAt,
    DateTime? completedAt,
  }) {
    return Subtask(
      id: id ?? this.id,
      title: title ?? this.title,
      completed: completed ?? this.completed,
      dueDate: dueDate ?? this.dueDate,
      createdAt: createdAt ?? this.createdAt,
      completedAt: completedAt ?? this.completedAt,
    );
  }
}

// 附件类
class Attachment {
  final String? id;
  final String filename;
  final String? originalName;
  final String mimeType;
  final int size;
  final String url;
  final DateTime uploadedAt;

  Attachment({
    this.id,
    required this.filename,
    this.originalName,
    required this.mimeType,
    required this.size,
    required this.url,
    DateTime? uploadedAt,
  }) : uploadedAt = uploadedAt ?? DateTime.now();

  factory Attachment.fromJson(Map<String, dynamic> json) {
    return Attachment(
      id: json['_id'] ?? json['id'],
      filename: json['filename'] ?? '',
      originalName: json['originalName'],
      mimeType: json['mimeType'] ?? '',
      size: json['size'] ?? 0,
      url: json['url'] ?? '',
      uploadedAt: json['uploadedAt'] != null ? DateTime.parse(json['uploadedAt']) : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) '_id': id,
      'filename': filename,
      if (originalName != null) 'originalName': originalName,
      'mimeType': mimeType,
      'size': size,
      'url': url,
      'uploadedAt': uploadedAt.toIso8601String(),
    };
  }
}

// 重复规则类
class RecurrenceRule {
  final String type; // 'daily', 'weekly', 'monthly', 'yearly'
  final int interval;
  final List<int>? daysOfWeek; // 0-6 (Sunday-Saturday)
  final int? dayOfMonth;
  final int? weekOfMonth;
  final DateTime? endDate;
  final int? maxOccurrences;

  RecurrenceRule({
    required this.type,
    this.interval = 1,
    this.daysOfWeek,
    this.dayOfMonth,
    this.weekOfMonth,
    this.endDate,
    this.maxOccurrences,
  });

  factory RecurrenceRule.fromJson(Map<String, dynamic> json) {
    return RecurrenceRule(
      type: json['type'] ?? 'daily',
      interval: json['interval'] ?? 1,
      daysOfWeek: json['daysOfWeek'] != null ? List<int>.from(json['daysOfWeek']) : null,
      dayOfMonth: json['dayOfMonth'],
      weekOfMonth: json['weekOfMonth'],
      endDate: json['endDate'] != null ? DateTime.parse(json['endDate']) : null,
      maxOccurrences: json['maxOccurrences'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'interval': interval,
      if (daysOfWeek != null) 'daysOfWeek': daysOfWeek,
      if (dayOfMonth != null) 'dayOfMonth': dayOfMonth,
      if (weekOfMonth != null) 'weekOfMonth': weekOfMonth,
      if (endDate != null) 'endDate': endDate!.toIso8601String(),
      if (maxOccurrences != null) 'maxOccurrences': maxOccurrences,
    };
  }
}