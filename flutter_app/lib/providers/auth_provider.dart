import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  
  User? _user;
  bool _isLoading = false;
  bool _isAuthenticated = false;
  String? _error;
  
  // Getters
  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  String? get error => _error;
  bool get isPremium => _user?.isPremium ?? false;
  
  // 初始化认证状态
  Future<void> initAuth() async {
    _setLoading(true);
    
    try {
      final token = await _apiService.getAccessToken();
      if (token != null) {
        // 验证token并获取用户信息
        await getCurrentUser();
      }
    } catch (e) {
      debugPrint('初始化认证失败: $e');
      await logout();
    } finally {
      _setLoading(false);
    }
  }
  
  // 用户注册
  Future<bool> register({
    required String username,
    required String email,
    required String password,
    required String confirmPassword,
  }) async {
    _setLoading(true);
    _clearError();
    
    try {
      final user = await _apiService.register(
        username: username,
        email: email,
        password: password,
        confirmPassword: confirmPassword,
      );
      
      _setUser(user);
      _setAuthenticated(true);
      
      // 保存登录状态
      await _saveLoginState();
      
      return true;
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  // 用户登录
  Future<bool> login({
    required String email,
    required String password,
  }) async {
    _setLoading(true);
    _clearError();
    
    try {
      final user = await _apiService.login(
        email: email,
        password: password,
      );
      
      _setUser(user);
      _setAuthenticated(true);
      
      // 保存登录状态
      await _saveLoginState();
      
      return true;
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  // 用户登出
  Future<void> logout() async {
    _setLoading(true);
    
    try {
      await _apiService.logout();
    } catch (e) {
      debugPrint('登出API调用失败: $e');
    }
    
    // 清除本地状态
    _setUser(null);
    _setAuthenticated(false);
    _clearError();
    
    // 清除本地存储
    await _clearLoginState();
    
    _setLoading(false);
  }
  
  // 获取当前用户信息
  Future<void> getCurrentUser() async {
    try {
      final user = await _apiService.getCurrentUser();
      _setUser(user);
      _setAuthenticated(true);
    } catch (e) {
      debugPrint('获取用户信息失败: $e');
      await logout();
      rethrow;
    }
  }
  
  // 更新用户信息
  Future<bool> updateProfile(Map<String, dynamic> updates) async {
    _setLoading(true);
    _clearError();
    
    try {
      final updatedUser = await _apiService.updateUserProfile(updates);
      _setUser(User.fromJson(updatedUser));
      return true;
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  // 更新用户设置
  Future<bool> updateSettings(Map<String, dynamic> updates) async {
    _setLoading(true);
    _clearError();
    
    try {
      final updatedSettings = await _apiService.updateUserSettings(updates);
      if (_user != null) {
        _setUser(_user!.copyWith(
          settings: UserSettings.fromJson(updatedSettings),
        ));
      }
      return true;
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  // 刷新用户信息
  Future<void> refreshUser() async {
    if (!_isAuthenticated) return;
    
    try {
      await getCurrentUser();
    } catch (e) {
      debugPrint('刷新用户信息失败: $e');
    }
  }
  
  // 检查订阅状态
  Future<void> checkSubscriptionStatus() async {
    if (!_isAuthenticated) return;
    
    try {
      final subscription = await _apiService.getSubscriptionStatus();
      if (_user != null) {
        _setUser(_user!.copyWith(
          subscription: UserSubscription.fromJson(subscription),
        ));
      }
    } catch (e) {
      debugPrint('检查订阅状态失败: $e');
    }
  }
  
  // 删除账户
  Future<bool> deleteAccount({
    required String password,
    required String confirmation,
  }) async {
    _setLoading(true);
    _clearError();
    
    try {
      await _apiService.deleteUserAccount(
        password: password,
        confirmation: confirmation,
      );
      
      await logout();
      return true;
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  // 私有方法
  void _setUser(User? user) {
    _user = user;
    notifyListeners();
  }
  
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }
  
  void _setAuthenticated(bool authenticated) {
    _isAuthenticated = authenticated;
    notifyListeners();
  }
  
  void _setError(String? error) {
    _error = error;
    notifyListeners();
  }
  
  void _clearError() {
    _error = null;
    notifyListeners();
  }
  
  // 保存登录状态到本地存储
  Future<void> _saveLoginState() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('is_authenticated', true);
    if (_user != null) {
      await prefs.setString('user_data', _user!.toJson().toString());
    }
  }
  
  // 清除本地登录状态
  Future<void> _clearLoginState() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('is_authenticated');
    await prefs.remove('user_data');
  }
  
  // 获取错误信息
  String _getErrorMessage(dynamic error) {
    if (error is ApiException) {
      switch (error.statusCode) {
        case 400:
          return '请求参数错误';
        case 401:
          return '用户名或密码错误';
        case 403:
          return '访问被拒绝';
        case 404:
          return '用户不存在';
        case 409:
          return '用户已存在';
        case 429:
          return '请求过于频繁，请稍后再试';
        case 500:
          return '服务器内部错误';
        default:
          return error.message;
      }
    }
    return error.toString();
  }
}