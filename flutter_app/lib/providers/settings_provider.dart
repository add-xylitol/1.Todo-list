import 'package:flutter/material.dart';
import '../services/storage_service.dart';
import '../utils/constants.dart';

class SettingsProvider extends ChangeNotifier {
  final StorageService _storageService = StorageService();
  
  // App settings
  bool _useSystemLocale = true;
  String _appLocale = 'en';
  bool _enableNotifications = true;
  bool _enableSounds = true;
  bool _enableHapticFeedback = true;
  bool _enableAutoSync = true;
  int _syncInterval = 15; // in minutes
  bool _showCompletedTasks = true;
  String _defaultView = 'today';
  String _defaultSortBy = 'dueDate';
  bool _defaultSortAscending = true;
  bool _useCompactMode = false;
  bool _enableAnalytics = true;
  bool _enableCrashReporting = true;
  bool _showTaskProgress = true;
  bool _confirmBeforeDeleting = true;
  bool _useRelativeDates = true;
  bool _use24HourFormat = false;
  String _dateFormat = 'MM/dd/yyyy';
  String _startOfWeek = 'monday';
  bool _isInitialized = false;
  
  // Getters
  bool get useSystemLocale => _useSystemLocale;
  String get appLocale => _appLocale;
  bool get enableNotifications => _enableNotifications;
  bool get enableSounds => _enableSounds;
  bool get enableHapticFeedback => _enableHapticFeedback;
  bool get enableAutoSync => _enableAutoSync;
  int get syncInterval => _syncInterval;
  bool get showCompletedTasks => _showCompletedTasks;
  String get defaultView => _defaultView;
  String get defaultSortBy => _defaultSortBy;
  bool get defaultSortAscending => _defaultSortAscending;
  bool get useCompactMode => _useCompactMode;
  bool get enableAnalytics => _enableAnalytics;
  bool get enableCrashReporting => _enableCrashReporting;
  bool get showTaskProgress => _showTaskProgress;
  bool get confirmBeforeDeleting => _confirmBeforeDeleting;
  bool get useRelativeDates => _useRelativeDates;
  bool get use24HourFormat => _use24HourFormat;
  String get dateFormat => _dateFormat;
  String get startOfWeek => _startOfWeek;
  bool get isInitialized => _isInitialized;
  
  // Initialize settings provider
  Future<void> initialize() async {
    if (_isInitialized) return;
    
    try {
      await _loadSettings();
      _isInitialized = true;
      notifyListeners();
    } catch (e) {
      debugPrint('Error initializing settings provider: $e');
      _isInitialized = true;
      notifyListeners();
    }
  }
  
  // Load settings from storage
  Future<void> _loadSettings() async {
    try {
      // Load app locale settings
      _useSystemLocale = await _storageService.getBool(AppConstants.useSystemLocaleKey) ?? _useSystemLocale;
      _appLocale = await _storageService.getString(AppConstants.appLocaleKey) ?? _appLocale;
      
      // Load notification settings
      _enableNotifications = await _storageService.getBool(AppConstants.enableNotificationsKey) ?? _enableNotifications;
      _enableSounds = await _storageService.getBool(AppConstants.enableSoundsKey) ?? _enableSounds;
      _enableHapticFeedback = await _storageService.getBool(AppConstants.enableHapticFeedbackKey) ?? _enableHapticFeedback;
      
      // Load sync settings
      _enableAutoSync = await _storageService.getBool(AppConstants.enableAutoSyncKey) ?? _enableAutoSync;
      _syncInterval = await _storageService.getInt(AppConstants.syncIntervalKey) ?? _syncInterval;
      
      // Load task display settings
      _showCompletedTasks = await _storageService.getBool(AppConstants.showCompletedTasksKey) ?? _showCompletedTasks;
      _defaultView = await _storageService.getString(AppConstants.defaultViewKey) ?? _defaultView;
      _defaultSortBy = await _storageService.getString(AppConstants.defaultSortByKey) ?? _defaultSortBy;
      _defaultSortAscending = await _storageService.getBool(AppConstants.defaultSortAscendingKey) ?? _defaultSortAscending;
      _useCompactMode = await _storageService.getBool(AppConstants.useCompactModeKey) ?? _useCompactMode;
      _showTaskProgress = await _storageService.getBool(AppConstants.showTaskProgressKey) ?? _showTaskProgress;
      
      // Load app behavior settings
      _confirmBeforeDeleting = await _storageService.getBool(AppConstants.confirmBeforeDeletingKey) ?? _confirmBeforeDeleting;
      
      // Load date and time settings
      _useRelativeDates = await _storageService.getBool(AppConstants.useRelativeDatesKey) ?? _useRelativeDates;
      _use24HourFormat = await _storageService.getBool(AppConstants.use24HourFormatKey) ?? _use24HourFormat;
      _dateFormat = await _storageService.getString(AppConstants.dateFormatKey) ?? _dateFormat;
      _startOfWeek = await _storageService.getString(AppConstants.startOfWeekKey) ?? _startOfWeek;
      
      // Load analytics settings
      _enableAnalytics = await _storageService.getBool(AppConstants.enableAnalyticsKey) ?? _enableAnalytics;
      _enableCrashReporting = await _storageService.getBool(AppConstants.enableCrashReportingKey) ?? _enableCrashReporting;
    } catch (e) {
      debugPrint('Error loading settings: $e');
    }
  }
  
  // Save a single setting to storage
  Future<void> _saveSetting(String key, dynamic value) async {
    try {
      if (value is bool) {
        await _storageService.setBool(key, value);
      } else if (value is int) {
        await _storageService.setInt(key, value);
      } else if (value is double) {
        await _storageService.setDouble(key, value);
      } else if (value is String) {
        await _storageService.setString(key, value);
      } else {
        debugPrint('Unsupported setting type: ${value.runtimeType}');
      }
    } catch (e) {
      debugPrint('Error saving setting $key: $e');
    }
  }
  
  // Update app locale settings
  Future<void> setUseSystemLocale(bool value) async {
    if (_useSystemLocale == value) return;
    _useSystemLocale = value;
    await _saveSetting(AppConstants.useSystemLocaleKey, value);
    notifyListeners();
  }
  
  Future<void> setAppLocale(String value) async {
    if (_appLocale == value) return;
    _appLocale = value;
    await _saveSetting(AppConstants.appLocaleKey, value);
    notifyListeners();
  }
  
  // Update notification settings
  Future<void> setEnableNotifications(bool value) async {
    if (_enableNotifications == value) return;
    _enableNotifications = value;
    await _saveSetting(AppConstants.enableNotificationsKey, value);
    notifyListeners();
  }
  
  Future<void> setEnableSounds(bool value) async {
    if (_enableSounds == value) return;
    _enableSounds = value;
    await _saveSetting(AppConstants.enableSoundsKey, value);
    notifyListeners();
  }
  
  Future<void> setEnableHapticFeedback(bool value) async {
    if (_enableHapticFeedback == value) return;
    _enableHapticFeedback = value;
    await _saveSetting(AppConstants.enableHapticFeedbackKey, value);
    notifyListeners();
  }
  
  // Update sync settings
  Future<void> setEnableAutoSync(bool value) async {
    if (_enableAutoSync == value) return;
    _enableAutoSync = value;
    await _saveSetting(AppConstants.enableAutoSyncKey, value);
    notifyListeners();
  }
  
  Future<void> setSyncInterval(int value) async {
    if (_syncInterval == value) return;
    _syncInterval = value;
    await _saveSetting(AppConstants.syncIntervalKey, value);
    notifyListeners();
  }
  
  // Update task display settings
  Future<void> setShowCompletedTasks(bool value) async {
    if (_showCompletedTasks == value) return;
    _showCompletedTasks = value;
    await _saveSetting(AppConstants.showCompletedTasksKey, value);
    notifyListeners();
  }
  
  Future<void> setDefaultView(String value) async {
    if (_defaultView == value) return;
    _defaultView = value;
    await _saveSetting(AppConstants.defaultViewKey, value);
    notifyListeners();
  }
  
  Future<void> setDefaultSortBy(String value) async {
    if (_defaultSortBy == value) return;
    _defaultSortBy = value;
    await _saveSetting(AppConstants.defaultSortByKey, value);
    notifyListeners();
  }
  
  Future<void> setDefaultSortAscending(bool value) async {
    if (_defaultSortAscending == value) return;
    _defaultSortAscending = value;
    await _saveSetting(AppConstants.defaultSortAscendingKey, value);
    notifyListeners();
  }
  
  Future<void> setUseCompactMode(bool value) async {
    if (_useCompactMode == value) return;
    _useCompactMode = value;
    await _saveSetting(AppConstants.useCompactModeKey, value);
    notifyListeners();
  }
  
  Future<void> setShowTaskProgress(bool value) async {
    if (_showTaskProgress == value) return;
    _showTaskProgress = value;
    await _saveSetting(AppConstants.showTaskProgressKey, value);
    notifyListeners();
  }
  
  // Update app behavior settings
  Future<void> setConfirmBeforeDeleting(bool value) async {
    if (_confirmBeforeDeleting == value) return;
    _confirmBeforeDeleting = value;
    await _saveSetting(AppConstants.confirmBeforeDeletingKey, value);
    notifyListeners();
  }
  
  // Update date and time settings
  Future<void> setUseRelativeDates(bool value) async {
    if (_useRelativeDates == value) return;
    _useRelativeDates = value;
    await _saveSetting(AppConstants.useRelativeDatesKey, value);
    notifyListeners();
  }
  
  Future<void> setUse24HourFormat(bool value) async {
    if (_use24HourFormat == value) return;
    _use24HourFormat = value;
    await _saveSetting(AppConstants.use24HourFormatKey, value);
    notifyListeners();
  }
  
  Future<void> setDateFormat(String value) async {
    if (_dateFormat == value) return;
    _dateFormat = value;
    await _saveSetting(AppConstants.dateFormatKey, value);
    notifyListeners();
  }
  
  Future<void> setStartOfWeek(String value) async {
    if (_startOfWeek == value) return;
    _startOfWeek = value;
    await _saveSetting(AppConstants.startOfWeekKey, value);
    notifyListeners();
  }
  
  // Update analytics settings
  Future<void> setEnableAnalytics(bool value) async {
    if (_enableAnalytics == value) return;
    _enableAnalytics = value;
    await _saveSetting(AppConstants.enableAnalyticsKey, value);
    notifyListeners();
  }
  
  Future<void> setEnableCrashReporting(bool value) async {
    if (_enableCrashReporting == value) return;
    _enableCrashReporting = value;
    await _saveSetting(AppConstants.enableCrashReportingKey, value);
    notifyListeners();
  }
  
  // Reset all settings to default
  Future<void> resetToDefaults() async {
    try {
      // Reset app locale settings
      _useSystemLocale = true;
      _appLocale = 'en';
      
      // Reset notification settings
      _enableNotifications = true;
      _enableSounds = true;
      _enableHapticFeedback = true;
      
      // Reset sync settings
      _enableAutoSync = true;
      _syncInterval = 15;
      
      // Reset task display settings
      _showCompletedTasks = true;
      _defaultView = 'today';
      _defaultSortBy = 'dueDate';
      _defaultSortAscending = true;
      _useCompactMode = false;
      _showTaskProgress = true;
      
      // Reset app behavior settings
      _confirmBeforeDeleting = true;
      
      // Reset date and time settings
      _useRelativeDates = true;
      _use24HourFormat = false;
      _dateFormat = 'MM/dd/yyyy';
      _startOfWeek = 'monday';
      
      // Reset analytics settings
      _enableAnalytics = true;
      _enableCrashReporting = true;
      
      // Save all default settings
      await _saveAllSettings();
      notifyListeners();
    } catch (e) {
      debugPrint('Error resetting settings: $e');
    }
  }
  
  // Save all settings to storage
  Future<void> _saveAllSettings() async {
    try {
      // Save app locale settings
      await _saveSetting(AppConstants.useSystemLocaleKey, _useSystemLocale);
      await _saveSetting(AppConstants.appLocaleKey, _appLocale);
      
      // Save notification settings
      await _saveSetting(AppConstants.enableNotificationsKey, _enableNotifications);
      await _saveSetting(AppConstants.enableSoundsKey, _enableSounds);
      await _saveSetting(AppConstants.enableHapticFeedbackKey, _enableHapticFeedback);
      
      // Save sync settings
      await _saveSetting(AppConstants.enableAutoSyncKey, _enableAutoSync);
      await _saveSetting(AppConstants.syncIntervalKey, _syncInterval);
      
      // Save task display settings
      await _saveSetting(AppConstants.showCompletedTasksKey, _showCompletedTasks);
      await _saveSetting(AppConstants.defaultViewKey, _defaultView);
      await _saveSetting(AppConstants.defaultSortByKey, _defaultSortBy);
      await _saveSetting(AppConstants.defaultSortAscendingKey, _defaultSortAscending);
      await _saveSetting(AppConstants.useCompactModeKey, _useCompactMode);
      await _saveSetting(AppConstants.showTaskProgressKey, _showTaskProgress);
      
      // Save app behavior settings
      await _saveSetting(AppConstants.confirmBeforeDeletingKey, _confirmBeforeDeleting);
      
      // Save date and time settings
      await _saveSetting(AppConstants.useRelativeDatesKey, _useRelativeDates);
      await _saveSetting(AppConstants.use24HourFormatKey, _use24HourFormat);
      await _saveSetting(AppConstants.dateFormatKey, _dateFormat);
      await _saveSetting(AppConstants.startOfWeekKey, _startOfWeek);
      
      // Save analytics settings
      await _saveSetting(AppConstants.enableAnalyticsKey, _enableAnalytics);
      await _saveSetting(AppConstants.enableCrashReportingKey, _enableCrashReporting);
    } catch (e) {
      debugPrint('Error saving all settings: $e');
    }
  }
  
  // Get available options for specific settings
  List<String> get availableLocales {
    return ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko', 'ru'];
  }
  
  List<String> get availableViews {
    return ['today', 'upcoming', 'all', 'completed', 'categories', 'tags'];
  }
  
  List<String> get availableSortOptions {
    return ['dueDate', 'priority', 'title', 'createdAt', 'lastModified'];
  }
  
  List<String> get availableDateFormats {
    return ['MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd', 'yyyy.MM.dd', 'dd.MM.yyyy'];
  }
  
  List<String> get availableStartOfWeekOptions {
    return ['monday', 'sunday', 'saturday'];
  }
  
  List<int> get availableSyncIntervals {
    return [5, 15, 30, 60, 120, 240];
  }
  
  // Get display name for specific settings
  String getLocaleDisplayName(String locale) {
    switch (locale) {
      case 'en':
        return 'English';
      case 'zh':
        return '中文';
      case 'es':
        return 'Español';
      case 'fr':
        return 'Français';
      case 'de':
        return 'Deutsch';
      case 'ja':
        return '日本語';
      case 'ko':
        return '한국어';
      case 'ru':
        return 'Русский';
      default:
        return locale;
    }
  }
  
  String getViewDisplayName(String view) {
    switch (view) {
      case 'today':
        return 'Today';
      case 'upcoming':
        return 'Upcoming';
      case 'all':
        return 'All Tasks';
      case 'completed':
        return 'Completed';
      case 'categories':
        return 'Categories';
      case 'tags':
        return 'Tags';
      default:
        return view;
    }
  }
  
  String getSortOptionDisplayName(String sortOption) {
    switch (sortOption) {
      case 'dueDate':
        return 'Due Date';
      case 'priority':
        return 'Priority';
      case 'title':
        return 'Title';
      case 'createdAt':
        return 'Created Date';
      case 'lastModified':
        return 'Last Modified';
      default:
        return sortOption;
    }
  }
  
  String getStartOfWeekDisplayName(String startOfWeek) {
    switch (startOfWeek) {
      case 'monday':
        return 'Monday';
      case 'sunday':
        return 'Sunday';
      case 'saturday':
        return 'Saturday';
      default:
        return startOfWeek;
    }
  }
  
  String getSyncIntervalDisplayName(int minutes) {
    if (minutes < 60) {
      return '$minutes minutes';
    } else {
      final hours = minutes ~/ 60;
      return hours == 1 ? '1 hour' : '$hours hours';
    }
  }
  
  @override
  void dispose() {
    super.dispose();
  }
}