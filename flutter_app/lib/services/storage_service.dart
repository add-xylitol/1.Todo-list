import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';

class StorageService {
  static StorageService? _instance;
  static SharedPreferences? _preferences;
  
  StorageService._internal();
  
  factory StorageService() {
    _instance ??= StorageService._internal();
    return _instance!;
  }
  
  // Initialize storage service
  static Future<void> init() async {
    _preferences = await SharedPreferences.getInstance();
  }
  
  // Get SharedPreferences instance
  Future<SharedPreferences> get _prefs async {
    _preferences ??= await SharedPreferences.getInstance();
    return _preferences!;
  }
  
  // String operations
  Future<void> setString(String key, String value) async {
    final prefs = await _prefs;
    await prefs.setString(key, value);
  }
  
  Future<String?> getString(String key) async {
    final prefs = await _prefs;
    return prefs.getString(key);
  }
  
  // Integer operations
  Future<void> setInt(String key, int value) async {
    final prefs = await _prefs;
    await prefs.setInt(key, value);
  }
  
  Future<int?> getInt(String key) async {
    final prefs = await _prefs;
    return prefs.getInt(key);
  }
  
  // Boolean operations
  Future<void> setBool(String key, bool value) async {
    final prefs = await _prefs;
    await prefs.setBool(key, value);
  }
  
  Future<bool?> getBool(String key) async {
    final prefs = await _prefs;
    return prefs.getBool(key);
  }
  
  // Double operations
  Future<void> setDouble(String key, double value) async {
    final prefs = await _prefs;
    await prefs.setDouble(key, value);
  }
  
  Future<double?> getDouble(String key) async {
    final prefs = await _prefs;
    return prefs.getDouble(key);
  }
  
  // List operations
  Future<void> setStringList(String key, List<String> value) async {
    final prefs = await _prefs;
    await prefs.setStringList(key, value);
  }
  
  Future<List<String>?> getStringList(String key) async {
    final prefs = await _prefs;
    return prefs.getStringList(key);
  }
  
  // JSON operations
  Future<void> setJson(String key, Map<String, dynamic> value) async {
    final prefs = await _prefs;
    await prefs.setString(key, json.encode(value));
  }
  
  Future<Map<String, dynamic>?> getJson(String key) async {
    final prefs = await _prefs;
    final jsonString = prefs.getString(key);
    if (jsonString != null) {
      try {
        return json.decode(jsonString) as Map<String, dynamic>;
      } catch (e) {
        print('Error decoding JSON for key $key: $e');
        return null;
      }
    }
    return null;
  }
  
  // List of JSON operations
  Future<void> setJsonList(String key, List<Map<String, dynamic>> value) async {
    final prefs = await _prefs;
    final jsonString = json.encode(value);
    await prefs.setString(key, jsonString);
  }
  
  Future<List<Map<String, dynamic>>?> getJsonList(String key) async {
    final prefs = await _prefs;
    final jsonString = prefs.getString(key);
    if (jsonString != null) {
      try {
        final List<dynamic> decoded = json.decode(jsonString);
        return decoded.cast<Map<String, dynamic>>();
      } catch (e) {
        print('Error decoding JSON list for key $key: $e');
        return null;
      }
    }
    return null;
  }
  
  // Remove operations
  Future<void> remove(String key) async {
    final prefs = await _prefs;
    await prefs.remove(key);
  }
  
  Future<void> removeAll(List<String> keys) async {
    final prefs = await _prefs;
    for (String key in keys) {
      await prefs.remove(key);
    }
  }
  
  // Clear all data
  Future<void> clear() async {
    final prefs = await _prefs;
    await prefs.clear();
  }
  
  // Check if key exists
  Future<bool> containsKey(String key) async {
    final prefs = await _prefs;
    return prefs.containsKey(key);
  }
  
  // Get all keys
  Future<Set<String>> getAllKeys() async {
    final prefs = await _prefs;
    return prefs.getKeys();
  }
  
  // File operations for larger data
  Future<String> get _localPath async {
    final directory = await getApplicationDocumentsDirectory();
    return directory.path;
  }
  
  Future<File> _localFile(String filename) async {
    final path = await _localPath;
    return File('$path/$filename');
  }
  
  // Write file
  Future<void> writeFile(String filename, String content) async {
    try {
      final file = await _localFile(filename);
      await file.writeAsString(content);
    } catch (e) {
      print('Error writing file $filename: $e');
      throw e;
    }
  }
  
  // Read file
  Future<String?> readFile(String filename) async {
    try {
      final file = await _localFile(filename);
      if (await file.exists()) {
        return await file.readAsString();
      }
      return null;
    } catch (e) {
      print('Error reading file $filename: $e');
      return null;
    }
  }
  
  // Write JSON file
  Future<void> writeJsonFile(String filename, Map<String, dynamic> data) async {
    try {
      final jsonString = json.encode(data);
      await writeFile(filename, jsonString);
    } catch (e) {
      print('Error writing JSON file $filename: $e');
      throw e;
    }
  }
  
  // Read JSON file
  Future<Map<String, dynamic>?> readJsonFile(String filename) async {
    try {
      final content = await readFile(filename);
      if (content != null) {
        return json.decode(content) as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      print('Error reading JSON file $filename: $e');
      return null;
    }
  }
  
  // Write JSON list file
  Future<void> writeJsonListFile(String filename, List<Map<String, dynamic>> data) async {
    try {
      final jsonString = json.encode(data);
      await writeFile(filename, jsonString);
    } catch (e) {
      print('Error writing JSON list file $filename: $e');
      throw e;
    }
  }
  
  // Read JSON list file
  Future<List<Map<String, dynamic>>?> readJsonListFile(String filename) async {
    try {
      final content = await readFile(filename);
      if (content != null) {
        final List<dynamic> decoded = json.decode(content);
        return decoded.cast<Map<String, dynamic>>();
      }
      return null;
    } catch (e) {
      print('Error reading JSON list file $filename: $e');
      return null;
    }
  }
  
  // Delete file
  Future<void> deleteFile(String filename) async {
    try {
      final file = await _localFile(filename);
      if (await file.exists()) {
        await file.delete();
      }
    } catch (e) {
      print('Error deleting file $filename: $e');
    }
  }
  
  // Check if file exists
  Future<bool> fileExists(String filename) async {
    try {
      final file = await _localFile(filename);
      return await file.exists();
    } catch (e) {
      print('Error checking file existence $filename: $e');
      return false;
    }
  }
  
  // Get file size
  Future<int?> getFileSize(String filename) async {
    try {
      final file = await _localFile(filename);
      if (await file.exists()) {
        return await file.length();
      }
      return null;
    } catch (e) {
      print('Error getting file size $filename: $e');
      return null;
    }
  }
  
  // Cache management
  Future<void> clearCache() async {
    try {
      final directory = await getTemporaryDirectory();
      if (directory.existsSync()) {
        directory.deleteSync(recursive: true);
      }
    } catch (e) {
      print('Error clearing cache: $e');
    }
  }
  
  // Get cache size
  Future<int> getCacheSize() async {
    try {
      final directory = await getTemporaryDirectory();
      if (directory.existsSync()) {
        int size = 0;
        await for (FileSystemEntity entity in directory.list(recursive: true)) {
          if (entity is File) {
            size += await entity.length();
          }
        }
        return size;
      }
      return 0;
    } catch (e) {
      print('Error getting cache size: $e');
      return 0;
    }
  }
  
  // Backup and restore
  Future<void> backupData(String backupFilename) async {
    try {
      final prefs = await _prefs;
      final allKeys = prefs.getKeys();
      final Map<String, dynamic> backup = {};
      
      for (String key in allKeys) {
        final value = prefs.get(key);
        backup[key] = value;
      }
      
      await writeJsonFile(backupFilename, backup);
    } catch (e) {
      print('Error backing up data: $e');
      throw e;
    }
  }
  
  Future<void> restoreData(String backupFilename) async {
    try {
      final backup = await readJsonFile(backupFilename);
      if (backup != null) {
        final prefs = await _prefs;
        
        for (String key in backup.keys) {
          final value = backup[key];
          if (value is String) {
            await prefs.setString(key, value);
          } else if (value is int) {
            await prefs.setInt(key, value);
          } else if (value is double) {
            await prefs.setDouble(key, value);
          } else if (value is bool) {
            await prefs.setBool(key, value);
          } else if (value is List<String>) {
            await prefs.setStringList(key, value);
          }
        }
      }
    } catch (e) {
      print('Error restoring data: $e');
      throw e;
    }
  }
  
  // Utility methods
  String formatBytes(int bytes) {
    if (bytes <= 0) return '0 B';
    const suffixes = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = (bytes.bitLength - 1) ~/ 10;
    return '${(bytes / (1 << (i * 10))).toStringAsFixed(1)} ${suffixes[i]}';
  }
}