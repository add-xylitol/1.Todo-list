import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../models/task.dart';
import '../services/api_service.dart';

class TaskProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  
  List<Task> _tasks = [];
  List<Task> _filteredTasks = [];
  bool _isLoading = false;
  bool _isSyncing = false;
  String? _error;
  
  // 过滤和排序参数
  String _searchQuery = '';
  String? _selectedCategory;
  String? _selectedPriority;
  bool? _showCompleted;
  String _sortBy = 'createdAt';
  String _sortOrder = 'desc';
  
  // 分页参数
  int _currentPage = 1;
  int _totalPages = 1;
  bool _hasMore = true;
  
  // 统计信息
  Map<String, dynamic> _stats = {};
  
  // Getters
  List<Task> get tasks => _filteredTasks;
  List<Task> get allTasks => _tasks;
  bool get isLoading => _isLoading;
  bool get isSyncing => _isSyncing;
  String? get error => _error;
  String get searchQuery => _searchQuery;
  String? get selectedCategory => _selectedCategory;
  String? get selectedPriority => _selectedPriority;
  bool? get showCompleted => _showCompleted;
  String get sortBy => _sortBy;
  String get sortOrder => _sortOrder;
  int get currentPage => _currentPage;
  bool get hasMore => _hasMore;
  Map<String, dynamic> get stats => _stats;
  
  // 获取不同状态的任务数量
  int get totalTasks => _tasks.length;
  int get completedTasks => _tasks.where((task) => task.completed).length;
  int get pendingTasks => _tasks.where((task) => !task.completed && !task.isDeleted).length;
  int get overdueTasks => _tasks.where((task) => task.isOverdue).length;
  int get todayTasks => _tasks.where((task) => 
    task.dueDate != null && 
    _isSameDay(task.dueDate!, DateTime.now())
  ).length;
  
  // 获取任务分类列表
  List<String> get categories {
    final categorySet = <String>{};
    for (final task in _tasks) {
      if (task.category != null && task.category!.isNotEmpty) {
        categorySet.add(task.category!);
      }
    }
    return categorySet.toList()..sort();
  }
  
  // 初始化任务数据
  Future<void> initTasks() async {
    await loadTasksFromLocal();
    await fetchTasks(refresh: true);
  }
  
  // 从服务器获取任务
  Future<void> fetchTasks({bool refresh = false}) async {
    if (refresh) {
      _currentPage = 1;
      _hasMore = true;
      _tasks.clear();
    }
    
    if (!_hasMore && !refresh) return;
    
    _setLoading(true);
    _clearError();
    
    try {
      final response = await _apiService.getTasks(
        page: _currentPage,
        limit: 50,
        completed: _showCompleted,
        priority: _selectedPriority,
        category: _selectedCategory,
        search: _searchQuery.isNotEmpty ? _searchQuery : null,
        sortBy: _sortBy,
        sortOrder: _sortOrder,
      );
      
      final newTasks = (response['tasks'] as List)
          .map((taskJson) => Task.fromJson(taskJson))
          .toList();
      
      if (refresh) {
        _tasks = newTasks;
      } else {
        _tasks.addAll(newTasks);
      }
      
      _currentPage = response['pagination']['currentPage'] + 1;
      _totalPages = response['pagination']['totalPages'];
      _hasMore = _currentPage <= _totalPages;
      
      _applyFilters();
      await _saveTasksToLocal();
      
    } catch (e) {
      _setError(_getErrorMessage(e));
    } finally {
      _setLoading(false);
    }
  }
  
  // 创建新任务
  Future<bool> createTask(Task task) async {
    _setLoading(true);
    _clearError();
    
    try {
      final createdTask = await _apiService.createTask(task);
      _tasks.insert(0, createdTask);
      _applyFilters();
      await _saveTasksToLocal();
      return true;
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  // 更新任务
  Future<bool> updateTask(String taskId, Map<String, dynamic> updates) async {
    _clearError();
    
    try {
      final updatedTask = await _apiService.updateTask(taskId, updates);
      final index = _tasks.indexWhere((task) => task.id == taskId);
      if (index != -1) {
        _tasks[index] = updatedTask;
        _applyFilters();
        await _saveTasksToLocal();
      }
      return true;
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    }
  }
  
  // 切换任务完成状态
  Future<bool> toggleTaskComplete(String taskId) async {
    _clearError();
    
    try {
      final updatedTask = await _apiService.toggleTaskComplete(taskId);
      final index = _tasks.indexWhere((task) => task.id == taskId);
      if (index != -1) {
        _tasks[index] = updatedTask;
        _applyFilters();
        await _saveTasksToLocal();
      }
      return true;
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    }
  }
  
  // 删除任务
  Future<bool> deleteTask(String taskId) async {
    _clearError();
    
    try {
      await _apiService.deleteTask(taskId);
      _tasks.removeWhere((task) => task.id == taskId);
      _applyFilters();
      await _saveTasksToLocal();
      return true;
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    }
  }
  
  // 恢复已删除的任务
  Future<bool> restoreTask(String taskId) async {
    _clearError();
    
    try {
      final restoredTask = await _apiService.restoreTask(taskId);
      final index = _tasks.indexWhere((task) => task.id == taskId);
      if (index != -1) {
        _tasks[index] = restoredTask;
      } else {
        _tasks.add(restoredTask);
      }
      _applyFilters();
      await _saveTasksToLocal();
      return true;
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    }
  }
  
  // 批量操作任务
  Future<bool> batchTaskAction({
    required List<String> taskIds,
    required String action,
    Map<String, dynamic>? data,
  }) async {
    _setLoading(true);
    _clearError();
    
    try {
      final result = await _apiService.batchTaskAction(
        taskIds: taskIds,
        action: action,
        data: data,
      );
      
      // 更新本地任务状态
      if (result['updatedTasks'] != null) {
        final updatedTasks = (result['updatedTasks'] as List)
            .map((taskJson) => Task.fromJson(taskJson))
            .toList();
        
        for (final updatedTask in updatedTasks) {
          final index = _tasks.indexWhere((task) => task.id == updatedTask.id);
          if (index != -1) {
            _tasks[index] = updatedTask;
          }
        }
      }
      
      if (action == 'delete') {
        _tasks.removeWhere((task) => taskIds.contains(task.id));
      }
      
      _applyFilters();
      await _saveTasksToLocal();
      return true;
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  // 重新排序任务
  Future<bool> reorderTasks(List<Task> reorderedTasks) async {
    _clearError();
    
    try {
      final taskOrders = reorderedTasks.asMap().entries.map((entry) => {
        'taskId': entry.value.id,
        'order': entry.key,
      }).toList();
      
      await _apiService.reorderTasks(taskOrders);
      
      // 更新本地任务顺序
      for (int i = 0; i < reorderedTasks.length; i++) {
        final taskId = reorderedTasks[i].id;
        final index = _tasks.indexWhere((task) => task.id == taskId);
        if (index != -1) {
          _tasks[index] = _tasks[index].copyWith(order: i);
        }
      }
      
      _applyFilters();
      await _saveTasksToLocal();
      return true;
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    }
  }
  
  // 同步任务
  Future<void> syncTasks() async {
    _setSyncing(true);
    
    try {
      final prefs = await SharedPreferences.getInstance();
      final lastSyncTime = prefs.getString('last_sync_time') ?? 
          DateTime.now().subtract(const Duration(days: 30)).toIso8601String();
      
      // 获取需要同步的本地任务
      final clientTasks = _tasks
          .where((task) => task.needsSync)
          .map((task) => task.toJson())
          .toList();
      
      final syncResult = await _apiService.syncTasks(
        lastSyncTime: lastSyncTime,
        clientTasks: clientTasks,
      );
      
      // 处理同步结果
      if (syncResult['serverTasks'] != null) {
        final serverTasks = (syncResult['serverTasks'] as List)
            .map((taskJson) => Task.fromJson(taskJson))
            .toList();
        
        _mergeTasks(serverTasks);
      }
      
      // 更新最后同步时间
      await prefs.setString('last_sync_time', DateTime.now().toIso8601String());
      
      _applyFilters();
      await _saveTasksToLocal();
      
    } catch (e) {
      debugPrint('同步任务失败: $e');
    } finally {
      _setSyncing(false);
    }
  }
  
  // 获取任务统计
  Future<void> fetchTaskStats() async {
    try {
      _stats = await _apiService.getTaskStats();
      notifyListeners();
    } catch (e) {
      debugPrint('获取任务统计失败: $e');
    }
  }
  
  // 搜索任务
  void searchTasks(String query) {
    _searchQuery = query;
    _applyFilters();
  }
  
  // 按分类过滤
  void filterByCategory(String? category) {
    _selectedCategory = category;
    _applyFilters();
  }
  
  // 按优先级过滤
  void filterByPriority(String? priority) {
    _selectedPriority = priority;
    _applyFilters();
  }
  
  // 显示/隐藏已完成任务
  void toggleShowCompleted(bool? showCompleted) {
    _showCompleted = showCompleted;
    _applyFilters();
  }
  
  // 设置排序方式
  void setSorting(String sortBy, String sortOrder) {
    _sortBy = sortBy;
    _sortOrder = sortOrder;
    _applyFilters();
  }
  
  // 清除所有过滤器
  void clearFilters() {
    _searchQuery = '';
    _selectedCategory = null;
    _selectedPriority = null;
    _showCompleted = null;
    _applyFilters();
  }
  
  // 获取单个任务
  Task? getTaskById(String taskId) {
    try {
      return _tasks.firstWhere((task) => task.id == taskId);
    } catch (e) {
      return null;
    }
  }
  
  // 私有方法
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }
  
  void _setSyncing(bool syncing) {
    _isSyncing = syncing;
    notifyListeners();
  }
  
  void _setError(String? error) {
    _error = error;
    notifyListeners();
  }
  
  void _clearError() {
    _error = null;
  }
  
  // 应用过滤器
  void _applyFilters() {
    List<Task> filtered = List.from(_tasks);
    
    // 搜索过滤
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((task) {
        return task.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
               (task.description?.toLowerCase().contains(_searchQuery.toLowerCase()) ?? false) ||
               task.tags.any((tag) => tag.toLowerCase().contains(_searchQuery.toLowerCase()));
      }).toList();
    }
    
    // 分类过滤
    if (_selectedCategory != null) {
      filtered = filtered.where((task) => task.category == _selectedCategory).toList();
    }
    
    // 优先级过滤
    if (_selectedPriority != null) {
      filtered = filtered.where((task) => task.priority == _selectedPriority).toList();
    }
    
    // 完成状态过滤
    if (_showCompleted != null) {
      filtered = filtered.where((task) => task.completed == _showCompleted).toList();
    }
    
    // 排序
    filtered.sort((a, b) {
      int comparison = 0;
      
      switch (_sortBy) {
        case 'title':
          comparison = a.title.compareTo(b.title);
          break;
        case 'priority':
          comparison = a.priorityWeight.compareTo(b.priorityWeight);
          break;
        case 'dueDate':
          if (a.dueDate == null && b.dueDate == null) {
            comparison = 0;
          } else if (a.dueDate == null) {
            comparison = 1;
          } else if (b.dueDate == null) {
            comparison = -1;
          } else {
            comparison = a.dueDate!.compareTo(b.dueDate!);
          }
          break;
        case 'createdAt':
        default:
          comparison = a.createdAt.compareTo(b.createdAt);
          break;
      }
      
      return _sortOrder == 'desc' ? -comparison : comparison;
    });
    
    _filteredTasks = filtered;
    notifyListeners();
  }
  
  // 合并任务（处理同步冲突）
  void _mergeTasks(List<Task> serverTasks) {
    for (final serverTask in serverTasks) {
      final localIndex = _tasks.indexWhere((task) => task.id == serverTask.id);
      
      if (localIndex == -1) {
        // 新任务，直接添加
        _tasks.add(serverTask);
      } else {
        final localTask = _tasks[localIndex];
        
        // 比较版本号，选择较新的版本
        if (serverTask.version > localTask.version) {
          _tasks[localIndex] = serverTask;
        } else if (serverTask.version == localTask.version) {
          // 版本号相同，比较最后修改时间
          if (serverTask.lastModified.isAfter(localTask.lastModified)) {
            _tasks[localIndex] = serverTask;
          }
        }
        // 如果本地版本更新，保持本地版本
      }
    }
  }
  
  // 保存任务到本地存储
  Future<void> _saveTasksToLocal() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final tasksJson = _tasks.map((task) => task.toJson()).toList();
      await prefs.setString('cached_tasks', json.encode(tasksJson));
    } catch (e) {
      debugPrint('保存任务到本地失败: $e');
    }
  }
  
  // 从本地存储加载任务
  Future<void> loadTasksFromLocal() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final tasksJsonString = prefs.getString('cached_tasks');
      
      if (tasksJsonString != null) {
        final tasksJson = json.decode(tasksJsonString) as List;
        _tasks = tasksJson.map((taskJson) => Task.fromJson(taskJson)).toList();
        _applyFilters();
      }
    } catch (e) {
      debugPrint('从本地加载任务失败: $e');
    }
  }
  
  // 检查是否为同一天
  bool _isSameDay(DateTime date1, DateTime date2) {
    return date1.year == date2.year &&
           date1.month == date2.month &&
           date1.day == date2.day;
  }
  
  // 获取错误信息
  String _getErrorMessage(dynamic error) {
    if (error is ApiException) {
      switch (error.statusCode) {
        case 400:
          return '请求参数错误';
        case 401:
          return '未授权访问';
        case 403:
          return '访问被拒绝';
        case 404:
          return '任务不存在';
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