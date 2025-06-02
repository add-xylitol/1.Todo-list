import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';

enum Priority { low, medium, high }
enum TodoStatus { pending, completed, archived }

class Todo {
  final String id;
  String title;
  String? description;
  Priority priority;
  TodoStatus status;
  String? category;
  DateTime createdAt;
  DateTime? dueDate;
  DateTime? completedAt;
  List<String> tags;
  
  Todo({
    String? id,
    required this.title,
    this.description,
    this.priority = Priority.medium,
    this.status = TodoStatus.pending,
    this.category,
    DateTime? createdAt,
    this.dueDate,
    this.completedAt,
    List<String>? tags,
  }) : id = id ?? const Uuid().v4(),
       createdAt = createdAt ?? DateTime.now(),
       tags = tags ?? [];
  
  // 从Map创建Todo对象
  factory Todo.fromMap(Map<String, dynamic> map) {
    return Todo(
      id: map['id'],
      title: map['title'],
      description: map['description'],
      priority: Priority.values[map['priority'] ?? 1],
      status: TodoStatus.values[map['status'] ?? 0],
      category: map['category'],
      createdAt: DateTime.parse(map['createdAt']),
      dueDate: map['dueDate'] != null ? DateTime.parse(map['dueDate']) : null,
      completedAt: map['completedAt'] != null ? DateTime.parse(map['completedAt']) : null,
      tags: map['tags'] != null ? List<String>.from(map['tags'].split(',')) : [],
    );
  }
  
  // 转换为Map
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'priority': priority.index,
      'status': status.index,
      'category': category,
      'createdAt': createdAt.toIso8601String(),
      'dueDate': dueDate?.toIso8601String(),
      'completedAt': completedAt?.toIso8601String(),
      'tags': tags.join(','),
    };
  }
  
  // 复制对象
  Todo copyWith({
    String? title,
    String? description,
    Priority? priority,
    TodoStatus? status,
    String? category,
    DateTime? dueDate,
    DateTime? completedAt,
    List<String>? tags,
  }) {
    return Todo(
      id: id,
      title: title ?? this.title,
      description: description ?? this.description,
      priority: priority ?? this.priority,
      status: status ?? this.status,
      category: category ?? this.category,
      createdAt: createdAt,
      dueDate: dueDate ?? this.dueDate,
      completedAt: completedAt ?? this.completedAt,
      tags: tags ?? this.tags,
    );
  }
  
  // 获取优先级颜色
  static Color getPriorityColor(Priority priority) {
    switch (priority) {
      case Priority.low:
        return const Color(0xFF10B981); // 绿色
      case Priority.medium:
        return const Color(0xFFF59E0B); // 黄色
      case Priority.high:
        return const Color(0xFFEF4444); // 红色
    }
  }
  
  // 获取优先级文本
  static String getPriorityText(Priority priority) {
    switch (priority) {
      case Priority.low:
        return '低';
      case Priority.medium:
        return '中';
      case Priority.high:
        return '高';
    }
  }
  
  // 是否已过期
  bool get isOverdue {
    if (dueDate == null || status == TodoStatus.completed) return false;
    return DateTime.now().isAfter(dueDate!);
  }
  
  // 是否即将到期（24小时内）
  bool get isDueSoon {
    if (dueDate == null || status == TodoStatus.completed) return false;
    final now = DateTime.now();
    final difference = dueDate!.difference(now);
    return difference.inHours <= 24 && difference.inHours > 0;
  }
}