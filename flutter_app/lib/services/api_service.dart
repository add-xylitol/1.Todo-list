import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/task.dart';
import '../models/user.dart';

class ApiService {
  // API基础URL
  static const String baseUrl = 'http://localhost:3001/api';
  
  // 存储令牌的键
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  
  // HTTP客户端
  final http.Client _client = http.Client();
  
  // 单例模式
  static final ApiService _instance = ApiService._internal();
  
  factory ApiService() {
    return _instance;
  }
  
  ApiService._internal();
  
  // 获取存储的令牌
  Future<String?> getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(accessTokenKey);
  }
  
  // 获取刷新令牌
  Future<String?> getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(refreshTokenKey);
  }
  
  // 保存令牌
  Future<void> saveTokens(String accessToken, String refreshToken) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(accessTokenKey, accessToken);
    await prefs.setString(refreshTokenKey, refreshToken);
  }
  
  // 清除令牌
  Future<void> clearTokens() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(accessTokenKey);
    await prefs.remove(refreshTokenKey);
  }
  
  // 创建带认证的请求头
  Future<Map<String, String>> _getAuthHeaders() async {
    final token = await getAccessToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }
  
  // 处理响应
  dynamic _handleResponse(http.Response response) {
    final data = json.decode(response.body);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data;
    } else {
      throw ApiException(
        statusCode: response.statusCode,
        message: data['error'] ?? 'Unknown error',
        code: data['code'],
      );
    }
  }
  
  // 刷新令牌
  Future<void> _refreshToken() async {
    final refreshToken = await getRefreshToken();
    
    if (refreshToken == null) {
      throw ApiException(
        statusCode: 401,
        message: '刷新令牌不存在',
      );
    }
    
    try {
      final response = await _client.post(
        Uri.parse('$baseUrl/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'refreshToken': refreshToken}),
      );
      
      final data = json.decode(response.body);
      
      if (response.statusCode == 200 && data['success']) {
        await saveTokens(
          data['data']['tokens']['accessToken'],
          data['data']['tokens']['refreshToken'],
        );
      } else {
        await clearTokens();
        throw ApiException(
          statusCode: response.statusCode,
          message: data['error'] ?? '刷新令牌失败',
        );
      }
    } catch (e) {
      await clearTokens();
      rethrow;
    }
  }
  
  // 执行API请求，自动处理令牌刷新
  Future<dynamic> _request({
    required String method,
    required String endpoint,
    Map<String, dynamic>? body,
    Map<String, String>? queryParams,
  }) async {
    Uri uri = Uri.parse('$baseUrl$endpoint');
    
    if (queryParams != null) {
      uri = uri.replace(queryParameters: queryParams);
    }
    
    final headers = await _getAuthHeaders();
    
    http.Response response;
    
    try {
      switch (method) {
        case 'GET':
          response = await _client.get(uri, headers: headers);
          break;
        case 'POST':
          response = await _client.post(
            uri,
            headers: headers,
            body: body != null ? json.encode(body) : null,
          );
          break;
        case 'PUT':
          response = await _client.put(
            uri,
            headers: headers,
            body: body != null ? json.encode(body) : null,
          );
          break;
        case 'PATCH':
          response = await _client.patch(
            uri,
            headers: headers,
            body: body != null ? json.encode(body) : null,
          );
          break;
        case 'DELETE':
          response = await _client.delete(
            uri,
            headers: headers,
            body: body != null ? json.encode(body) : null,
          );
          break;
        default:
          throw ArgumentError('不支持的HTTP方法: $method');
      }
      
      // 处理401错误，尝试刷新令牌
      if (response.statusCode == 401) {
        await _refreshToken();
        return _request(
          method: method,
          endpoint: endpoint,
          body: body,
          queryParams: queryParams,
        );
      }
      
      return _handleResponse(response);
    } catch (e) {
      if (e is ApiException) {
        rethrow;
      }
      throw ApiException(
        statusCode: 0,
        message: e.toString(),
      );
    }
  }
  
  // 用户注册
  Future<User> register({
    required String username,
    required String email,
    required String password,
    required String confirmPassword,
  }) async {
    final response = await _request(
      method: 'POST',
      endpoint: '/auth/register',
      body: {
        'username': username,
        'email': email,
        'password': password,
        'confirmPassword': confirmPassword,
      },
    );
    
    await saveTokens(
      response['data']['tokens']['accessToken'],
      response['data']['tokens']['refreshToken'],
    );
    
    return User.fromJson(response['data']['user']);
  }
  
  // 用户登录
  Future<User> login({
    required String email,
    required String password,
  }) async {
    final response = await _request(
      method: 'POST',
      endpoint: '/auth/login',
      body: {
        'email': email,
        'password': password,
      },
    );
    
    await saveTokens(
      response['data']['tokens']['accessToken'],
      response['data']['tokens']['refreshToken'],
    );
    
    return User.fromJson(response['data']['user']);
  }
  
  // 用户登出
  Future<void> logout() async {
    try {
      await _request(
        method: 'POST',
        endpoint: '/auth/logout',
      );
    } finally {
      await clearTokens();
    }
  }
  
  // 获取当前用户信息
  Future<User> getCurrentUser() async {
    final response = await _request(
      method: 'GET',
      endpoint: '/auth/me',
    );
    
    return User.fromJson(response['data']['user']);
  }
  
  // 获取任务列表
  Future<Map<String, dynamic>> getTasks({
    int page = 1,
    int limit = 50,
    bool? completed,
    String? priority,
    String? category,
    String? search,
    String sortBy = 'createdAt',
    String sortOrder = 'desc',
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'limit': limit.toString(),
      'sortBy': sortBy,
      'sortOrder': sortOrder,
    };
    
    if (completed != null) {
      queryParams['completed'] = completed.toString();
    }
    
    if (priority != null) {
      queryParams['priority'] = priority;
    }
    
    if (category != null) {
      queryParams['category'] = category;
    }
    
    if (search != null && search.isNotEmpty) {
      queryParams['search'] = search;
    }
    
    final response = await _request(
      method: 'GET',
      endpoint: '/tasks',
      queryParams: queryParams,
    );
    
    return response['data'];
  }
  
  // 获取单个任务
  Future<Task> getTask(String taskId) async {
    final response = await _request(
      method: 'GET',
      endpoint: '/tasks/$taskId',
    );
    
    return Task.fromJson(response['data']['task']);
  }
  
  // 创建任务
  Future<Task> createTask(Task task) async {
    final response = await _request(
      method: 'POST',
      endpoint: '/tasks',
      body: task.toJson(),
    );
    
    return Task.fromJson(response['data']['task']);
  }
  
  // 更新任务
  Future<Task> updateTask(String taskId, Map<String, dynamic> updates) async {
    final response = await _request(
      method: 'PUT',
      endpoint: '/tasks/$taskId',
      body: updates,
    );
    
    return Task.fromJson(response['data']['task']);
  }
  
  // 切换任务完成状态
  Future<Task> toggleTaskComplete(String taskId) async {
    final response = await _request(
      method: 'PATCH',
      endpoint: '/tasks/$taskId/toggle',
    );
    
    return Task.fromJson(response['data']['task']);
  }
  
  // 删除任务
  Future<void> deleteTask(String taskId) async {
    await _request(
      method: 'DELETE',
      endpoint: '/tasks/$taskId',
    );
  }
  
  // 恢复已删除的任务
  Future<Task> restoreTask(String taskId) async {
    final response = await _request(
      method: 'PATCH',
      endpoint: '/tasks/$taskId/restore',
    );
    
    return Task.fromJson(response['data']['task']);
  }
  
  // 批量更新任务顺序
  Future<void> reorderTasks(List<Map<String, dynamic>> taskOrders) async {
    await _request(
      method: 'PATCH',
      endpoint: '/tasks/batch/reorder',
      body: {
        'tasks': taskOrders,
      },
    );
  }
  
  // 批量操作任务
  Future<Map<String, dynamic>> batchTaskAction({
    required List<String> taskIds,
    required String action,
    Map<String, dynamic>? data,
  }) async {
    final response = await _request(
      method: 'PATCH',
      endpoint: '/tasks/batch/action',
      body: {
        'taskIds': taskIds,
        'action': action,
        if (data != null) 'data': data,
      },
    );
    
    return response['data'];
  }
  
  // 获取任务统计
  Future<Map<String, dynamic>> getTaskStats() async {
    final response = await _request(
      method: 'GET',
      endpoint: '/tasks/stats/overview',
    );
    
    return response['data'];
  }
  
  // 同步任务
  Future<Map<String, dynamic>> syncTasks({
    required String lastSyncTime,
    required List<Map<String, dynamic>> clientTasks,
  }) async {
    final response = await _request(
      method: 'POST',
      endpoint: '/tasks/sync',
      body: {
        'lastSyncTime': lastSyncTime,
        'clientTasks': clientTasks,
      },
    );
    
    return response['data'];
  }
  
  // 获取订阅计划
  Future<List<dynamic>> getSubscriptionPlans() async {
    final response = await _request(
      method: 'GET',
      endpoint: '/subscriptions/plans',
    );
    
    return response['data']['plans'];
  }
  
  // 获取订阅状态
  Future<Map<String, dynamic>> getSubscriptionStatus() async {
    final response = await _request(
      method: 'GET',
      endpoint: '/subscriptions/status',
    );
    
    return response['data']['subscription'];
  }
  
  // 创建Stripe订阅
  Future<Map<String, dynamic>> createStripeSubscription({
    required String priceId,
    required String paymentMethodId,
  }) async {
    final response = await _request(
      method: 'POST',
      endpoint: '/subscriptions/stripe/create',
      body: {
        'priceId': priceId,
        'paymentMethodId': paymentMethodId,
      },
    );
    
    return response['data'];
  }
  
  // 取消订阅
  Future<void> cancelSubscription() async {
    await _request(
      method: 'POST',
      endpoint: '/subscriptions/cancel',
    );
  }
  
  // 恢复订阅
  Future<void> resumeSubscription() async {
    await _request(
      method: 'POST',
      endpoint: '/subscriptions/resume',
    );
  }
  
  // 验证移动端支付
  Future<Map<String, dynamic>> verifyPayment({
    required String platform,
    required String transactionId,
    String? receipt,
    required String productId,
    required DateTime purchaseTime,
  }) async {
    final response = await _request(
      method: 'POST',
      endpoint: '/subscriptions/verify-payment',
      body: {
        'platform': platform,
        'transactionId': transactionId,
        if (receipt != null) 'receipt': receipt,
        'productId': productId,
        'purchaseTime': purchaseTime.toIso8601String(),
      },
    );
    
    return response['data'];
  }
  
  // 获取支付历史
  Future<List<dynamic>> getPaymentHistory() async {
    final response = await _request(
      method: 'GET',
      endpoint: '/subscriptions/payment-history',
    );
    
    return response['data']['paymentHistory'];
  }
  
  // 获取用户资料
  Future<Map<String, dynamic>> getUserProfile() async {
    final response = await _request(
      method: 'GET',
      endpoint: '/users/profile',
    );
    
    return response['data']['user'];
  }
  
  // 更新用户资料
  Future<Map<String, dynamic>> updateUserProfile(Map<String, dynamic> updates) async {
    final response = await _request(
      method: 'PUT',
      endpoint: '/users/profile',
      body: updates,
    );
    
    return response['data']['user'];
  }
  
  // 获取用户设置
  Future<Map<String, dynamic>> getUserSettings() async {
    final response = await _request(
      method: 'GET',
      endpoint: '/users/settings',
    );
    
    return response['data']['settings'];
  }
  
  // 更新用户设置
  Future<Map<String, dynamic>> updateUserSettings(Map<String, dynamic> updates) async {
    final response = await _request(
      method: 'PUT',
      endpoint: '/users/settings',
      body: updates,
    );
    
    return response['data']['settings'];
  }
  
  // 获取用户统计信息
  Future<Map<String, dynamic>> getUserStats() async {
    final response = await _request(
      method: 'GET',
      endpoint: '/users/stats',
    );
    
    return response['data'];
  }
  
  // 导出用户数据
  Future<String> exportUserData() async {
    final response = await _request(
      method: 'GET',
      endpoint: '/users/export',
    );
    
    return json.encode(response);
  }
  
  // 删除用户账户
  Future<void> deleteUserAccount({
    required String password,
    required String confirmation,
  }) async {
    await _request(
      method: 'DELETE',
      endpoint: '/users/account',
      body: {
        'password': password,
        'confirmation': confirmation,
      },
    );
  }
}

// API异常类
class ApiException implements Exception {
  final int statusCode;
  final String message;
  final String? code;
  
  ApiException({
    required this.statusCode,
    required this.message,
    this.code,
  });
  
  @override
  String toString() {
    return 'ApiException: [$statusCode] $message${code != null ? ' (Code: $code)' : ''}';
  }
}