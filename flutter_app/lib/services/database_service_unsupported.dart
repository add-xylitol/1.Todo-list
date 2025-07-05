import '../models/todo.dart';

class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  factory DatabaseService() => _instance;
  DatabaseService._internal();

  Future<void> insertTodo(Todo todo) async => throw UnsupportedError('Database not supported on this platform');
  Future<List<Todo>> getAllTodos() async => throw UnsupportedError('Database not supported on this platform');
  Future<List<Todo>> getTodosByStatus(TodoStatus status) async => throw UnsupportedError('Database not supported on this platform');
  Future<List<Todo>> getTodosByCategory(String category) async => throw UnsupportedError('Database not supported on this platform');
  Future<List<Todo>> searchTodos(String query) async => throw UnsupportedError('Database not supported on this platform');
  Future<void> updateTodo(Todo todo) async => throw UnsupportedError('Database not supported on this platform');
  Future<void> deleteTodo(String id) async => throw UnsupportedError('Database not supported on this platform');
  Future<void> deleteCompletedTodos() async => throw UnsupportedError('Database not supported on this platform');
  Future<Map<String, int>> getTodoStats() async => throw UnsupportedError('Database not supported on this platform');
  Future<void> insertCategory(String name, String color) async => throw UnsupportedError('Database not supported on this platform');
  Future<List<Map<String, dynamic>>> getAllCategories() async => throw UnsupportedError('Database not supported on this platform');
  Future<void> deleteCategory(String id) async => throw UnsupportedError('Database not supported on this platform');
}