import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/task.dart';
import '../utils/constants.dart';
import 'storage_service.dart';

class TaskService {
  final StorageService _storageService = StorageService();
  final String _baseUrl = AppConstants.apiBaseUrl;
  
  // Get authorization headers
  Future<Map<String, String>> _getHeaders() async {
    final token = await _storageService.getString('auth_token');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }
  
  // Get all tasks for the current user
  Future<List<Task>> getAllTasks() async {
    try {
      // Try to get cached tasks first
      final cachedTasks = await _getCachedTasks();
      
      // If offline, return cached tasks
      if (!await _isOnline()) {
        return cachedTasks;
      }
      
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$_baseUrl/tasks'),
        headers: headers,
      ).timeout(const Duration(seconds: 30));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List<dynamic> tasksJson = data['tasks'] ?? [];
        final tasks = tasksJson.map((json) => Task.fromJson(json)).toList();
        
        // Cache the tasks
        await _cacheTasks(tasks);
        
        return tasks;
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized. Please login again.');
      } else {
        throw Exception('Failed to load tasks: ${response.statusCode}');
      }
    } catch (e) {
      // If network error, return cached tasks
      if (e.toString().contains('SocketException') || 
          e.toString().contains('TimeoutException')) {
        return await _getCachedTasks();
      }
      rethrow;
    }
  }
  
  // Get a specific task by ID
  Future<Task?> getTask(String taskId) async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$_baseUrl/tasks/$taskId'),
        headers: headers,
      ).timeout(const Duration(seconds: 30));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return Task.fromJson(data['task']);
      } else if (response.statusCode == 404) {
        return null;
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized. Please login again.');
      } else {
        throw Exception('Failed to load task: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }
  
  // Create a new task
  Future<Task?> createTask(Task task) async {
    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$_baseUrl/tasks'),
        headers: headers,
        body: json.encode(task.toJson()),
      ).timeout(const Duration(seconds: 30));
      
      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        final createdTask = Task.fromJson(data['task']);
        
        // Update cache
        await _addTaskToCache(createdTask);
        
        return createdTask;
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized. Please login again.');
      } else {
        final errorData = json.decode(response.body);
        throw Exception(errorData['message'] ?? 'Failed to create task');
      }
    } catch (e) {
      // If offline, store task locally for later sync
      if (e.toString().contains('SocketException') || 
          e.toString().contains('TimeoutException')) {
        final offlineTask = task.copyWith(
          syncStatus: 'pending',
          lastSyncTime: null,
        );
        await _addTaskToCache(offlineTask);
        return offlineTask;
      }
      rethrow;
    }
  }
  
  // Update an existing task
  Future<Task?> updateTask(Task task) async {
    try {
      final headers = await _getHeaders();
      final response = await http.put(
        Uri.parse('$_baseUrl/tasks/${task.id}'),
        headers: headers,
        body: json.encode(task.toJson()),
      ).timeout(const Duration(seconds: 30));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final updatedTask = Task.fromJson(data['task']);
        
        // Update cache
        await _updateTaskInCache(updatedTask);
        
        return updatedTask;
      } else if (response.statusCode == 404) {
        throw Exception('Task not found');
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized. Please login again.');
      } else {
        final errorData = json.decode(response.body);
        throw Exception(errorData['message'] ?? 'Failed to update task');
      }
    } catch (e) {
      // If offline, update task locally for later sync
      if (e.toString().contains('SocketException') || 
          e.toString().contains('TimeoutException')) {
        final offlineTask = task.copyWith(
          syncStatus: 'pending',
          lastSyncTime: null,
        );
        await _updateTaskInCache(offlineTask);
        return offlineTask;
      }
      rethrow;
    }
  }
  
  // Delete a task
  Future<bool> deleteTask(String taskId) async {
    try {
      final headers = await _getHeaders();
      final response = await http.delete(
        Uri.parse('$_baseUrl/tasks/$taskId'),
        headers: headers,
      ).timeout(const Duration(seconds: 30));
      
      if (response.statusCode == 200 || response.statusCode == 204) {
        // Remove from cache
        await _removeTaskFromCache(taskId);
        return true;
      } else if (response.statusCode == 404) {
        // Task already deleted, remove from cache
        await _removeTaskFromCache(taskId);
        return true;
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized. Please login again.');
      } else {
        throw Exception('Failed to delete task: ${response.statusCode}');
      }
    } catch (e) {
      // If offline, mark task as deleted for later sync
      if (e.toString().contains('SocketException') || 
          e.toString().contains('TimeoutException')) {
        await _markTaskAsDeleted(taskId);
        return true;
      }
      rethrow;
    }
  }
  
  // Search tasks
  Future<List<Task>> searchTasks(String query) async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$_baseUrl/tasks/search?q=${Uri.encodeComponent(query)}'),
        headers: headers,
      ).timeout(const Duration(seconds: 30));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List<dynamic> tasksJson = data['tasks'] ?? [];
        return tasksJson.map((json) => Task.fromJson(json)).toList();
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized. Please login again.');
      } else {
        throw Exception('Failed to search tasks: ${response.statusCode}');
      }
    } catch (e) {
      // If offline, search in cached tasks
      if (e.toString().contains('SocketException') || 
          e.toString().contains('TimeoutException')) {
        final cachedTasks = await _getCachedTasks();
        return cachedTasks.where((task) {
          return task.title.toLowerCase().contains(query.toLowerCase()) ||
                 (task.description?.toLowerCase().contains(query.toLowerCase()) ?? false) ||
                 task.tags.any((tag) => tag.toLowerCase().contains(query.toLowerCase()));
        }).toList();
      }
      rethrow;
    }
  }
  
  // Get tasks by category
  Future<List<Task>> getTasksByCategory(String category) async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$_baseUrl/tasks/category/${Uri.encodeComponent(category)}'),
        headers: headers,
      ).timeout(const Duration(seconds: 30));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List<dynamic> tasksJson = data['tasks'] ?? [];
        return tasksJson.map((json) => Task.fromJson(json)).toList();
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized. Please login again.');
      } else {
        throw Exception('Failed to load tasks by category: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }
  
  // Get tasks by tag
  Future<List<Task>> getTasksByTag(String tag) async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$_baseUrl/tasks/tag/${Uri.encodeComponent(tag)}'),
        headers: headers,
      ).timeout(const Duration(seconds: 30));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List<dynamic> tasksJson = data['tasks'] ?? [];
        return tasksJson.map((json) => Task.fromJson(json)).toList();
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized. Please login again.');
      } else {
        throw Exception('Failed to load tasks by tag: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }
  
  // Sync offline tasks
  Future<void> syncOfflineTasks() async {
    if (!await _isOnline()) return;
    
    final cachedTasks = await _getCachedTasks();
    final pendingTasks = cachedTasks.where((task) => task.syncStatus != 'synced').toList();
    
    for (final task in pendingTasks) {
      try {
        if (task.syncStatus == 'pending') {
          if (task.id?.startsWith('temp_') == true) {
            // Create new task
            await createTask(task);
          } else {
            // Update existing task
            await updateTask(task);
          }
        } else if (task.syncStatus == 'deleted') {
          // Delete task
          await deleteTask(task.id!);
        }
      } catch (e) {
        // Log error but continue with other tasks
        print('Failed to sync task ${task.id}: $e');
      }
    }
  }
  
  // Cache management methods
  Future<List<Task>> _getCachedTasks() async {
    try {
      final cachedData = await _storageService.getString('cached_tasks');
      if (cachedData != null) {
        final List<dynamic> tasksJson = json.decode(cachedData);
        return tasksJson.map((json) => Task.fromJson(json)).toList();
      }
    } catch (e) {
      print('Error loading cached tasks: $e');
    }
    return [];
  }
  
  Future<void> _cacheTasks(List<Task> tasks) async {
    try {
      final tasksJson = tasks.map((task) => task.toJson()).toList();
      await _storageService.setString('cached_tasks', json.encode(tasksJson));
    } catch (e) {
      print('Error caching tasks: $e');
    }
  }
  
  Future<void> _addTaskToCache(Task task) async {
    final cachedTasks = await _getCachedTasks();
    cachedTasks.add(task);
    await _cacheTasks(cachedTasks);
  }
  
  Future<void> _updateTaskInCache(Task updatedTask) async {
    final cachedTasks = await _getCachedTasks();
    final index = cachedTasks.indexWhere((task) => task.id == updatedTask.id);
    if (index != -1) {
      cachedTasks[index] = updatedTask;
      await _cacheTasks(cachedTasks);
    }
  }
  
  Future<void> _removeTaskFromCache(String taskId) async {
    final cachedTasks = await _getCachedTasks();
    cachedTasks.removeWhere((task) => task.id == taskId);
    await _cacheTasks(cachedTasks);
  }
  
  Future<void> _markTaskAsDeleted(String taskId) async {
    final cachedTasks = await _getCachedTasks();
    final index = cachedTasks.indexWhere((task) => task.id == taskId);
    if (index != -1) {
      cachedTasks[index] = cachedTasks[index].copyWith(
        syncStatus: 'deleted',
        isDeleted: true,
      );
      await _cacheTasks(cachedTasks);
    }
  }
  
  // Check if device is online
  Future<bool> _isOnline() async {
    try {
      final response = await http.get(
        Uri.parse('https://www.google.com'),
      ).timeout(const Duration(seconds: 5));
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
  
  // Clear cache
  Future<void> clearCache() async {
    await _storageService.remove('cached_tasks');
  }
}