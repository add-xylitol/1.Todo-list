import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/todo.dart';

class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  factory DatabaseService() => _instance;
  DatabaseService._internal();
  
  static Database? _database;
  
  Future<Database> get database async {
    _database ??= await _initDatabase();
    return _database!;
  }
  
  Future<Database> _initDatabase() async {
    String path = join(await getDatabasesPath(), 'todolist.db');
    
    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDatabase,
    );
  }
  
  Future<void> _createDatabase(Database db, int version) async {
    await db.execute('''
      CREATE TABLE todos(
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        priority INTEGER NOT NULL DEFAULT 1,
        status INTEGER NOT NULL DEFAULT 0,
        category TEXT,
        createdAt TEXT NOT NULL,
        dueDate TEXT,
        completedAt TEXT,
        tags TEXT
      )
    ''');
    
    await db.execute('''
      CREATE TABLE categories(
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL,
        createdAt TEXT NOT NULL
      )
    ''');
  }
  
  // Todo CRUD操作
  Future<String> insertTodo(Todo todo) async {
    final db = await database;
    await db.insert('todos', todo.toMap());
    return todo.id;
  }
  
  Future<List<Todo>> getAllTodos() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'todos',
      orderBy: 'createdAt DESC',
    );
    
    return List.generate(maps.length, (i) {
      return Todo.fromMap(maps[i]);
    });
  }
  
  Future<List<Todo>> getTodosByStatus(TodoStatus status) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'todos',
      where: 'status = ?',
      whereArgs: [status.index],
      orderBy: 'createdAt DESC',
    );
    
    return List.generate(maps.length, (i) {
      return Todo.fromMap(maps[i]);
    });
  }
  
  Future<List<Todo>> getTodosByCategory(String category) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'todos',
      where: 'category = ?',
      whereArgs: [category],
      orderBy: 'createdAt DESC',
    );
    
    return List.generate(maps.length, (i) {
      return Todo.fromMap(maps[i]);
    });
  }
  
  Future<List<Todo>> searchTodos(String query) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'todos',
      where: 'title LIKE ? OR description LIKE ?',
      whereArgs: ['%$query%', '%$query%'],
      orderBy: 'createdAt DESC',
    );
    
    return List.generate(maps.length, (i) {
      return Todo.fromMap(maps[i]);
    });
  }
  
  Future<void> updateTodo(Todo todo) async {
    final db = await database;
    await db.update(
      'todos',
      todo.toMap(),
      where: 'id = ?',
      whereArgs: [todo.id],
    );
  }
  
  Future<void> deleteTodo(String id) async {
    final db = await database;
    await db.delete(
      'todos',
      where: 'id = ?',
      whereArgs: [id],
    );
  }
  
  Future<void> deleteCompletedTodos() async {
    final db = await database;
    await db.delete(
      'todos',
      where: 'status = ?',
      whereArgs: [TodoStatus.completed.index],
    );
  }
  
  // 统计数据
  Future<Map<String, int>> getTodoStats() async {
    final db = await database;
    
    final totalResult = await db.rawQuery('SELECT COUNT(*) as count FROM todos');
    final completedResult = await db.rawQuery(
      'SELECT COUNT(*) as count FROM todos WHERE status = ?',
      [TodoStatus.completed.index],
    );
    final pendingResult = await db.rawQuery(
      'SELECT COUNT(*) as count FROM todos WHERE status = ?',
      [TodoStatus.pending.index],
    );
    final overdueResult = await db.rawQuery(
      'SELECT COUNT(*) as count FROM todos WHERE status = ? AND dueDate < ?',
      [TodoStatus.pending.index, DateTime.now().toIso8601String()],
    );
    
    return {
      'total': totalResult.first['count'] as int,
      'completed': completedResult.first['count'] as int,
      'pending': pendingResult.first['count'] as int,
      'overdue': overdueResult.first['count'] as int,
    };
  }
  
  // 分类操作
  Future<void> insertCategory(String name, String color) async {
    final db = await database;
    await db.insert('categories', {
      'id': DateTime.now().millisecondsSinceEpoch.toString(),
      'name': name,
      'color': color,
      'createdAt': DateTime.now().toIso8601String(),
    });
  }
  
  Future<List<Map<String, dynamic>>> getAllCategories() async {
    final db = await database;
    return await db.query('categories', orderBy: 'name ASC');
  }
  
  Future<void> deleteCategory(String id) async {
    final db = await database;
    await db.delete(
      'categories',
      where: 'id = ?',
      whereArgs: [id],
    );
  }
}