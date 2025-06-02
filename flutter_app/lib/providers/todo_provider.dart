import 'package:flutter/material.dart';
import '../models/todo.dart';
import '../services/database_service.dart';

class TodoProvider with ChangeNotifier {
  final DatabaseService _databaseService = DatabaseService();
  
  List<Todo> _todos = [];
  List<Map<String, dynamic>> _categories = [];
  String _searchQuery = '';
  TodoStatus _currentFilter = TodoStatus.pending;
  String? _selectedCategory;
  bool _isLoading = false;
  
  // Getters
  List<Todo> get todos => _getFilteredTodos();
  List<Map<String, dynamic>> get categories => _categories;
  String get searchQuery => _searchQuery;
  TodoStatus get currentFilter => _currentFilter;
  String? get selectedCategory => _selectedCategory;
  bool get isLoading => _isLoading;
  
  // 获取过滤后的待办事项
  List<Todo> _getFilteredTodos() {
    List<Todo> filtered = _todos;
    
    // 按状态过滤
    if (_currentFilter != TodoStatus.pending || _searchQuery.isEmpty) {
      filtered = filtered.where((todo) => todo.status == _currentFilter).toList();
    }
    
    // 按分类过滤
    if (_selectedCategory != null && _selectedCategory!.isNotEmpty) {
      filtered = filtered.where((todo) => todo.category == _selectedCategory).toList();
    }
    
    // 按搜索查询过滤
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((todo) {
        return todo.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
               (todo.description?.toLowerCase().contains(_searchQuery.toLowerCase()) ?? false);
      }).toList();
    }
    
    // 排序：优先级高的在前，然后按创建时间倒序
    filtered.sort((a, b) {
      // 首先按优先级排序（高优先级在前）
      int priorityComparison = b.priority.index.compareTo(a.priority.index);
      if (priorityComparison != 0) return priorityComparison;
      
      // 然后按创建时间排序（新的在前）
      return b.createdAt.compareTo(a.createdAt);
    });
    
    return filtered;
  }
  
  // 初始化数据
  Future<void> loadTodos() async {
    _isLoading = true;
    notifyListeners();
    
    try {
      _todos = await _databaseService.getAllTodos();
      _categories = await _databaseService.getAllCategories();
    } catch (e) {
      debugPrint('加载待办事项失败: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  // 添加待办事项
  Future<void> addTodo(Todo todo) async {
    try {
      await _databaseService.insertTodo(todo);
      _todos.add(todo);
      notifyListeners();
    } catch (e) {
      debugPrint('添加待办事项失败: $e');
      rethrow;
    }
  }
  
  // 更新待办事项
  Future<void> updateTodo(Todo todo) async {
    try {
      await _databaseService.updateTodo(todo);
      final index = _todos.indexWhere((t) => t.id == todo.id);
      if (index != -1) {
        _todos[index] = todo;
        notifyListeners();
      }
    } catch (e) {
      debugPrint('更新待办事项失败: $e');
      rethrow;
    }
  }
  
  // 切换待办事项完成状态
  Future<void> toggleTodoStatus(String id) async {
    try {
      final todoIndex = _todos.indexWhere((todo) => todo.id == id);
      if (todoIndex != -1) {
        final todo = _todos[todoIndex];
        final updatedTodo = todo.copyWith(
          status: todo.status == TodoStatus.completed 
              ? TodoStatus.pending 
              : TodoStatus.completed,
          completedAt: todo.status == TodoStatus.completed 
              ? null 
              : DateTime.now(),
        );
        
        await _databaseService.updateTodo(updatedTodo);
        _todos[todoIndex] = updatedTodo;
        notifyListeners();
      }
    } catch (e) {
      debugPrint('切换待办事项状态失败: $e');
      rethrow;
    }
  }
  
  // 删除待办事项
  Future<void> deleteTodo(String id) async {
    try {
      await _databaseService.deleteTodo(id);
      _todos.removeWhere((todo) => todo.id == id);
      notifyListeners();
    } catch (e) {
      debugPrint('删除待办事项失败: $e');
      rethrow;
    }
  }
  
  // 删除所有已完成的待办事项
  Future<void> deleteCompletedTodos() async {
    try {
      await _databaseService.deleteCompletedTodos();
      _todos.removeWhere((todo) => todo.status == TodoStatus.completed);
      notifyListeners();
    } catch (e) {
      debugPrint('删除已完成待办事项失败: $e');
      rethrow;
    }
  }
  
  // 设置搜索查询
  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }
  
  // 设置过滤器
  void setFilter(TodoStatus status) {
    _currentFilter = status;
    notifyListeners();
  }
  
  // 设置选中的分类
  void setSelectedCategory(String? category) {
    _selectedCategory = category;
    notifyListeners();
  }
  
  // 添加分类
  Future<void> addCategory(String name, String color) async {
    try {
      await _databaseService.insertCategory(name, color);
      _categories = await _databaseService.getAllCategories();
      notifyListeners();
    } catch (e) {
      debugPrint('添加分类失败: $e');
      rethrow;
    }
  }
  
  // 删除分类
  Future<void> deleteCategory(String id) async {
    try {
      await _databaseService.deleteCategory(id);
      _categories.removeWhere((category) => category['id'] == id);
      
      // 如果删除的是当前选中的分类，清除选择
      if (_selectedCategory == _categories.firstWhere(
        (cat) => cat['id'] == id, 
        orElse: () => {'name': ''}
      )['name']) {
        _selectedCategory = null;
      }
      
      notifyListeners();
    } catch (e) {
      debugPrint('删除分类失败: $e');
      rethrow;
    }
  }
  
  // 获取统计数据
  Future<Map<String, int>> getStats() async {
    try {
      return await _databaseService.getTodoStats();
    } catch (e) {
      debugPrint('获取统计数据失败: $e');
      return {
        'total': 0,
        'completed': 0,
        'pending': 0,
        'overdue': 0,
      };
    }
  }
  
  // 获取今日待办事项
  List<Todo> get todayTodos {
    final today = DateTime.now();
    return _todos.where((todo) {
      if (todo.dueDate == null) return false;
      return todo.dueDate!.year == today.year &&
             todo.dueDate!.month == today.month &&
             todo.dueDate!.day == today.day &&
             todo.status == TodoStatus.pending;
    }).toList();
  }
  
  // 获取过期的待办事项
  List<Todo> get overdueTodos {
    return _todos.where((todo) => todo.isOverdue).toList();
  }
  
  // 获取即将到期的待办事项
  List<Todo> get dueSoonTodos {
    return _todos.where((todo) => todo.isDueSoon).toList();
  }
}