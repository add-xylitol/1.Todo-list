import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class AppHelpers {
  // 日期格式化
  static String formatDate(DateTime date, {String? format}) {
    format ??= 'yyyy-MM-dd';
    return DateFormat(format).format(date);
  }
  
  static String formatDateTime(DateTime dateTime, {String? format}) {
    format ??= 'yyyy-MM-dd HH:mm';
    return DateFormat(format).format(dateTime);
  }
  
  static String formatTime(DateTime time, {String? format}) {
    format ??= 'HH:mm';
    return DateFormat(format).format(time);
  }
  
  // 相对时间格式化
  static String formatRelativeTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);
    
    if (difference.inDays > 7) {
      return formatDate(dateTime);
    } else if (difference.inDays > 0) {
      return '${difference.inDays}天前';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}小时前';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}分钟前';
    } else {
      return '刚刚';
    }
  }
  
  // 获取友好的日期显示
  static String getFriendlyDate(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final tomorrow = today.add(const Duration(days: 1));
    final targetDate = DateTime(date.year, date.month, date.day);
    
    if (targetDate == today) {
      return '今天';
    } else if (targetDate == yesterday) {
      return '昨天';
    } else if (targetDate == tomorrow) {
      return '明天';
    } else if (targetDate.isAfter(today) && targetDate.isBefore(today.add(const Duration(days: 7)))) {
      return DateFormat('EEEE', 'zh_CN').format(date);
    } else {
      return formatDate(date, format: 'MM月dd日');
    }
  }
  
  // 验证邮箱
  static bool isValidEmail(String email) {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email);
  }
  
  // 验证密码强度
  static bool isStrongPassword(String password) {
    // 至少8位，包含大小写字母、数字
    return RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$').hasMatch(password);
  }
  
  // 验证手机号
  static bool isValidPhoneNumber(String phone) {
    return RegExp(r'^1[3-9]\d{9}$').hasMatch(phone);
  }
  
  // 生成随机ID
  static String generateId() {
    return DateTime.now().millisecondsSinceEpoch.toString() + 
           (DateTime.now().microsecond % 1000).toString().padLeft(3, '0');
  }
  
  // 颜色工具
  static Color hexToColor(String hex) {
    hex = hex.replaceAll('#', '');
    if (hex.length == 6) {
      hex = 'FF$hex';
    }
    return Color(int.parse(hex, radix: 16));
  }
  
  static String colorToHex(Color color) {
    return '#${color.value.toRadixString(16).substring(2).toUpperCase()}';
  }
  
  // 文件大小格式化
  static String formatFileSize(int bytes) {
    if (bytes < 1024) {
      return '$bytes B';
    } else if (bytes < 1024 * 1024) {
      return '${(bytes / 1024).toStringAsFixed(1)} KB';
    } else if (bytes < 1024 * 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    } else {
      return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
    }
  }
  
  // 显示SnackBar
  static void showSnackBar(BuildContext context, String message, {Color? backgroundColor, Duration? duration}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: backgroundColor,
        duration: duration ?? const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }
  
  // 显示成功消息
  static void showSuccessMessage(BuildContext context, String message) {
    showSnackBar(context, message, backgroundColor: Colors.green);
  }
  
  // 显示错误消息
  static void showErrorMessage(BuildContext context, String message) {
    showSnackBar(context, message, backgroundColor: Colors.red);
  }
  
  // 显示警告消息
  static void showWarningMessage(BuildContext context, String message) {
    showSnackBar(context, message, backgroundColor: Colors.orange);
  }
  
  // 显示确认对话框
  static Future<bool?> showConfirmDialog(
    BuildContext context, {
    required String title,
    required String content,
    String confirmText = '确认',
    String cancelText = '取消',
    Color? confirmColor,
  }) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(content),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(cancelText),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: confirmColor != null
                ? TextButton.styleFrom(foregroundColor: confirmColor)
                : null,
            child: Text(confirmText),
          ),
        ],
      ),
    );
  }
  
  // 显示加载对话框
  static void showLoadingDialog(BuildContext context, {String? message}) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        content: Row(
          children: [
            const CircularProgressIndicator(),
            const SizedBox(width: 16),
            Text(message ?? '加载中...'),
          ],
        ),
      ),
    );
  }
  
  // 隐藏加载对话框
  static void hideLoadingDialog(BuildContext context) {
    Navigator.of(context).pop();
  }
  
  // 防抖函数
  static Timer? _debounceTimer;
  static void debounce(VoidCallback callback, {Duration delay = const Duration(milliseconds: 500)}) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(delay, callback);
  }
  
  // 节流函数
  static DateTime? _lastThrottleTime;
  static void throttle(VoidCallback callback, {Duration delay = const Duration(milliseconds: 500)}) {
    final now = DateTime.now();
    if (_lastThrottleTime == null || now.difference(_lastThrottleTime!) >= delay) {
      _lastThrottleTime = now;
      callback();
    }
  }
  
  // 复制到剪贴板
  static Future<void> copyToClipboard(String text) async {
    await Clipboard.setData(ClipboardData(text: text));
  }
  
  // 从剪贴板获取文本
  static Future<String?> getClipboardText() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    return data?.text;
  }
  
  // URL验证
  static bool isValidUrl(String url) {
    try {
      final uri = Uri.parse(url);
      return uri.hasScheme && (uri.scheme == 'http' || uri.scheme == 'https');
    } catch (e) {
      return false;
    }
  }
  
  // 获取设备信息
  static bool isTablet(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    return mediaQuery.size.shortestSide >= 600;
  }
  
  static bool isLandscape(BuildContext context) {
    return MediaQuery.of(context).orientation == Orientation.landscape;
  }
  
  // 计算文本宽度
  static double getTextWidth(String text, TextStyle style) {
    final textPainter = TextPainter(
      text: TextSpan(text: text, style: style),
      textDirection: TextDirection.ltr,
    );
    textPainter.layout();
    return textPainter.width;
  }
  
  // 截断文本
  static String truncateText(String text, int maxLength, {String suffix = '...'}) {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - suffix.length) + suffix;
  }
  
  // 高亮搜索文本
  static List<TextSpan> highlightSearchText(
    String text,
    String searchTerm, {
    TextStyle? normalStyle,
    TextStyle? highlightStyle,
  }) {
    if (searchTerm.isEmpty) {
      return [TextSpan(text: text, style: normalStyle)];
    }
    
    final spans = <TextSpan>[];
    final lowerText = text.toLowerCase();
    final lowerSearchTerm = searchTerm.toLowerCase();
    
    int start = 0;
    int index = lowerText.indexOf(lowerSearchTerm);
    
    while (index != -1) {
      // 添加高亮前的文本
      if (index > start) {
        spans.add(TextSpan(
          text: text.substring(start, index),
          style: normalStyle,
        ));
      }
      
      // 添加高亮文本
      spans.add(TextSpan(
        text: text.substring(index, index + searchTerm.length),
        style: highlightStyle ?? const TextStyle(
          backgroundColor: Colors.yellow,
          fontWeight: FontWeight.bold,
        ),
      ));
      
      start = index + searchTerm.length;
      index = lowerText.indexOf(lowerSearchTerm, start);
    }
    
    // 添加剩余文本
    if (start < text.length) {
      spans.add(TextSpan(
        text: text.substring(start),
        style: normalStyle,
      ));
    }
    
    return spans;
  }
}

// 扩展方法
extension StringExtension on String {
  String capitalize() {
    if (isEmpty) return this;
    return this[0].toUpperCase() + substring(1);
  }
  
  String toTitleCase() {
    return split(' ').map((word) => word.capitalize()).join(' ');
  }
  
  bool get isEmail => AppHelpers.isValidEmail(this);
  bool get isUrl => AppHelpers.isValidUrl(this);
  bool get isPhoneNumber => AppHelpers.isValidPhoneNumber(this);
}

extension DateTimeExtension on DateTime {
  String get friendlyDate => AppHelpers.getFriendlyDate(this);
  String get relativeTime => AppHelpers.formatRelativeTime(this);
  
  bool get isToday {
    final now = DateTime.now();
    return year == now.year && month == now.month && day == now.day;
  }
  
  bool get isYesterday {
    final yesterday = DateTime.now().subtract(const Duration(days: 1));
    return year == yesterday.year && month == yesterday.month && day == yesterday.day;
  }
  
  bool get isTomorrow {
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    return year == tomorrow.year && month == tomorrow.month && day == tomorrow.day;
  }
  
  bool get isThisWeek {
    final now = DateTime.now();
    final startOfWeek = now.subtract(Duration(days: now.weekday - 1));
    final endOfWeek = startOfWeek.add(const Duration(days: 6));
    return isAfter(startOfWeek.subtract(const Duration(days: 1))) && 
           isBefore(endOfWeek.add(const Duration(days: 1)));
  }
}

// 导入必要的包
import 'dart:async';
import 'package:flutter/services.dart';