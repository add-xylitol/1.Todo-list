import 'package:flutter/material.dart';
import '../services/storage_service.dart';
import '../utils/constants.dart';

class ThemeProvider extends ChangeNotifier {
  final StorageService _storageService = StorageService();
  
  ThemeMode _themeMode = ThemeMode.system;
  bool _isInitialized = false;
  
  ThemeMode get themeMode => _themeMode;
  bool get isInitialized => _isInitialized;
  
  // Check if current theme is dark
  bool get isDarkMode {
    switch (_themeMode) {
      case ThemeMode.dark:
        return true;
      case ThemeMode.light:
        return false;
      case ThemeMode.system:
        return WidgetsBinding.instance.platformDispatcher.platformBrightness == Brightness.dark;
    }
  }
  
  // Check if current theme is light
  bool get isLightMode => !isDarkMode;
  
  // Check if using system theme
  bool get isSystemMode => _themeMode == ThemeMode.system;
  
  // Initialize theme provider
  Future<void> initialize() async {
    if (_isInitialized) return;
    
    try {
      await _loadThemeMode();
      _isInitialized = true;
      notifyListeners();
    } catch (e) {
      debugPrint('Error initializing theme provider: $e');
      _isInitialized = true;
      notifyListeners();
    }
  }
  
  // Load theme mode from storage
  Future<void> _loadThemeMode() async {
    try {
      final themeString = await _storageService.getString(AppConstants.themeKey);
      if (themeString != null) {
        _themeMode = _parseThemeMode(themeString);
      }
    } catch (e) {
      debugPrint('Error loading theme mode: $e');
      _themeMode = ThemeMode.system;
    }
  }
  
  // Save theme mode to storage
  Future<void> _saveThemeMode() async {
    try {
      await _storageService.setString(AppConstants.themeKey, _themeMode.toString());
    } catch (e) {
      debugPrint('Error saving theme mode: $e');
    }
  }
  
  // Parse theme mode from string
  ThemeMode _parseThemeMode(String themeString) {
    switch (themeString) {
      case 'ThemeMode.light':
        return ThemeMode.light;
      case 'ThemeMode.dark':
        return ThemeMode.dark;
      case 'ThemeMode.system':
      default:
        return ThemeMode.system;
    }
  }
  
  // Set theme mode
  Future<void> setThemeMode(ThemeMode themeMode) async {
    if (_themeMode == themeMode) return;
    
    _themeMode = themeMode;
    await _saveThemeMode();
    notifyListeners();
  }
  
  // Toggle between light and dark theme
  Future<void> toggleTheme() async {
    final newThemeMode = isDarkMode ? ThemeMode.light : ThemeMode.dark;
    await setThemeMode(newThemeMode);
  }
  
  // Set light theme
  Future<void> setLightTheme() async {
    await setThemeMode(ThemeMode.light);
  }
  
  // Set dark theme
  Future<void> setDarkTheme() async {
    await setThemeMode(ThemeMode.dark);
  }
  
  // Set system theme
  Future<void> setSystemTheme() async {
    await setThemeMode(ThemeMode.system);
  }
  
  // Get theme mode display name
  String getThemeModeDisplayName(ThemeMode themeMode) {
    switch (themeMode) {
      case ThemeMode.light:
        return 'Light';
      case ThemeMode.dark:
        return 'Dark';
      case ThemeMode.system:
        return 'System';
    }
  }
  
  // Get current theme mode display name
  String get currentThemeModeDisplayName {
    return getThemeModeDisplayName(_themeMode);
  }
  
  // Get theme mode icon
  IconData getThemeModeIcon(ThemeMode themeMode) {
    switch (themeMode) {
      case ThemeMode.light:
        return Icons.light_mode;
      case ThemeMode.dark:
        return Icons.dark_mode;
      case ThemeMode.system:
        return Icons.brightness_auto;
    }
  }
  
  // Get current theme mode icon
  IconData get currentThemeModeIcon {
    return getThemeModeIcon(_themeMode);
  }
  
  // Get all available theme modes
  List<ThemeMode> get availableThemeModes {
    return [ThemeMode.system, ThemeMode.light, ThemeMode.dark];
  }
  
  // Reset to default theme
  Future<void> resetToDefault() async {
    await setThemeMode(ThemeMode.system);
  }
  
  // Check if theme mode is supported
  bool isThemeModeSupported(ThemeMode themeMode) {
    return availableThemeModes.contains(themeMode);
  }
  
  @override
  void dispose() {
    super.dispose();
  }
}