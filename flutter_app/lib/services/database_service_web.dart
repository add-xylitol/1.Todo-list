import '../models/todo.dart';

class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  factory DatabaseService() => _instance;
  DatabaseService._internal();

  Future<void> insertTodo(Todo todo) async {}
  Future<List<Todo>> getAllTodos() async => [];
  Future<List<Todo>> getTodosByStatus(TodoStatus status) async => [];
  Future<List<Todo>> getTodosByCategory(String category) async => [];
  Future<List<Todo>> searchTodos(String query) async => [];
  Future<void> updateTodo(Todo todo) async {}
  Future<void> deleteTodo(String id) async {}
  Future<void> deleteCompletedTodos() async {}
  Future<Map<String, int>> getTodoStats() async => {};
  Future<void> insertCategory(String name, String color) async {}
  Future<List<Map<String, dynamic>>> getAllCategories() async => [];
  Future<void> deleteCategory(String id) async {}
}