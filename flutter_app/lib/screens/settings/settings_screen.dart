import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../utils/constants.dart';
import '../../utils/helpers.dart';
import '../../widgets/loading_overlay.dart';
import '../../widgets/custom_button.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _isLoading = false;
  Map<String, dynamic> _settings = {};
  
  @override
  void initState() {
    super.initState();
    _loadSettings();
  }
  
  Future<void> _loadSettings() async {
    setState(() {
      _isLoading = true;
    });
    
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final settings = await authProvider.getUserSettings();
      
      if (mounted) {
        setState(() {
          _settings = settings;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        AppHelpers.showErrorMessage(context, 'Failed to load settings: ${e.toString()}');
      }
    }
  }
  
  Future<void> _updateSetting(String key, dynamic value) async {
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final updatedSettings = Map<String, dynamic>.from(_settings);
      updatedSettings[key] = value;
      
      await authProvider.updateUserSettings(updatedSettings);
      
      if (mounted) {
        setState(() {
          _settings[key] = value;
        });
        AppHelpers.showSuccessMessage(context, 'Setting updated');
      }
    } catch (e) {
      if (mounted) {
        AppHelpers.showErrorMessage(context, 'Failed to update setting: ${e.toString()}');
      }
    }
  }
  
  Future<void> _exportData() async {
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      await authProvider.exportUserData();
      
      if (mounted) {
        AppHelpers.showSuccessMessage(context, 'Data export initiated. Check your email.');
      }
    } catch (e) {
      if (mounted) {
        AppHelpers.showErrorMessage(context, 'Failed to export data: ${e.toString()}');
      }
    }
  }
  
  Widget _buildSettingsSection({
    required String title,
    required List<Widget> children,
  }) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          ...children,
        ],
      ),
    );
  }
  
  Widget _buildSwitchTile({
    required String title,
    String? subtitle,
    required String settingKey,
    required IconData icon,
  }) {
    final value = _settings[settingKey] as bool? ?? false;
    
    return SwitchListTile(
      title: Text(title),
      subtitle: subtitle != null ? Text(subtitle) : null,
      secondary: Icon(icon),
      value: value,
      onChanged: (newValue) => _updateSetting(settingKey, newValue),
    );
  }
  
  Widget _buildListTile({
    required String title,
    String? subtitle,
    required IconData icon,
    VoidCallback? onTap,
    Widget? trailing,
  }) {
    return ListTile(
      title: Text(title),
      subtitle: subtitle != null ? Text(subtitle) : null,
      leading: Icon(icon),
      trailing: trailing ?? const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
  
  void _showThemeDialog() {
    final currentTheme = _settings['theme'] as String? ?? 'system';
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Choose Theme'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioListTile<String>(
              title: const Text('System Default'),
              value: 'system',
              groupValue: currentTheme,
              onChanged: (value) {
                Navigator.of(context).pop();
                _updateSetting('theme', value);
              },
            ),
            RadioListTile<String>(
              title: const Text('Light'),
              value: 'light',
              groupValue: currentTheme,
              onChanged: (value) {
                Navigator.of(context).pop();
                _updateSetting('theme', value);
              },
            ),
            RadioListTile<String>(
              title: const Text('Dark'),
              value: 'dark',
              groupValue: currentTheme,
              onChanged: (value) {
                Navigator.of(context).pop();
                _updateSetting('theme', value);
              },
            ),
          ],
        ),
      ),
    );
  }
  
  void _showLanguageDialog() {
    final currentLanguage = _settings['language'] as String? ?? 'en';
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Choose Language'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioListTile<String>(
              title: const Text('English'),
              value: 'en',
              groupValue: currentLanguage,
              onChanged: (value) {
                Navigator.of(context).pop();
                _updateSetting('language', value);
              },
            ),
            RadioListTile<String>(
              title: const Text('中文'),
              value: 'zh',
              groupValue: currentLanguage,
              onChanged: (value) {
                Navigator.of(context).pop();
                _updateSetting('language', value);
              },
            ),
            RadioListTile<String>(
              title: const Text('Español'),
              value: 'es',
              groupValue: currentLanguage,
              onChanged: (value) {
                Navigator.of(context).pop();
                _updateSetting('language', value);
              },
            ),
          ],
        ),
      ),
    );
  }
  
  void _showDefaultReminderDialog() {
    final currentReminder = _settings['defaultReminderMinutes'] as int? ?? 15;
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Default Reminder Time'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioListTile<int>(
              title: const Text('5 minutes before'),
              value: 5,
              groupValue: currentReminder,
              onChanged: (value) {
                Navigator.of(context).pop();
                _updateSetting('defaultReminderMinutes', value);
              },
            ),
            RadioListTile<int>(
              title: const Text('15 minutes before'),
              value: 15,
              groupValue: currentReminder,
              onChanged: (value) {
                Navigator.of(context).pop();
                _updateSetting('defaultReminderMinutes', value);
              },
            ),
            RadioListTile<int>(
              title: const Text('30 minutes before'),
              value: 30,
              groupValue: currentReminder,
              onChanged: (value) {
                Navigator.of(context).pop();
                _updateSetting('defaultReminderMinutes', value);
              },
            ),
            RadioListTile<int>(
              title: const Text('1 hour before'),
              value: 60,
              groupValue: currentReminder,
              onChanged: (value) {
                Navigator.of(context).pop();
                _updateSetting('defaultReminderMinutes', value);
              },
            ),
            RadioListTile<int>(
              title: const Text('1 day before'),
              value: 1440,
              groupValue: currentReminder,
              onChanged: (value) {
                Navigator.of(context).pop();
                _updateSetting('defaultReminderMinutes', value);
              },
            ),
          ],
        ),
      ),
    );
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: LoadingOverlay(
        isLoading: _isLoading,
        child: SingleChildScrollView(
          child: Column(
            children: [
              const SizedBox(height: 8),
              
              // Appearance Settings
              _buildSettingsSection(
                title: 'Appearance',
                children: [
                  _buildListTile(
                    title: 'Theme',
                    subtitle: _getThemeDisplayName(_settings['theme'] as String? ?? 'system'),
                    icon: Icons.palette,
                    onTap: _showThemeDialog,
                  ),
                  const Divider(height: 1),
                  _buildListTile(
                    title: 'Language',
                    subtitle: _getLanguageDisplayName(_settings['language'] as String? ?? 'en'),
                    icon: Icons.language,
                    onTap: _showLanguageDialog,
                  ),
                ],
              ),
              
              // Notification Settings
              _buildSettingsSection(
                title: 'Notifications',
                children: [
                  _buildSwitchTile(
                    title: 'Push Notifications',
                    subtitle: 'Receive notifications for reminders and updates',
                    settingKey: 'pushNotifications',
                    icon: Icons.notifications,
                  ),
                  const Divider(height: 1),
                  _buildSwitchTile(
                    title: 'Email Notifications',
                    subtitle: 'Receive email notifications for important updates',
                    settingKey: 'emailNotifications',
                    icon: Icons.email,
                  ),
                  const Divider(height: 1),
                  _buildListTile(
                    title: 'Default Reminder Time',
                    subtitle: _getReminderDisplayName(_settings['defaultReminderMinutes'] as int? ?? 15),
                    icon: Icons.access_time,
                    onTap: _showDefaultReminderDialog,
                  ),
                ],
              ),
              
              // Task Settings
              _buildSettingsSection(
                title: 'Tasks',
                children: [
                  _buildSwitchTile(
                    title: 'Auto-sync',
                    subtitle: 'Automatically sync tasks across devices',
                    settingKey: 'autoSync',
                    icon: Icons.sync,
                  ),
                  const Divider(height: 1),
                  _buildSwitchTile(
                    title: 'Show Completed Tasks',
                    subtitle: 'Display completed tasks in the main list',
                    settingKey: 'showCompletedTasks',
                    icon: Icons.check_circle,
                  ),
                  const Divider(height: 1),
                  _buildSwitchTile(
                    title: 'Confirm Before Delete',
                    subtitle: 'Ask for confirmation before deleting tasks',
                    settingKey: 'confirmBeforeDelete',
                    icon: Icons.delete,
                  ),
                ],
              ),
              
              // Privacy & Security
              _buildSettingsSection(
                title: 'Privacy & Security',
                children: [
                  _buildSwitchTile(
                    title: 'Biometric Authentication',
                    subtitle: 'Use fingerprint or face recognition to unlock',
                    settingKey: 'biometricAuth',
                    icon: Icons.fingerprint,
                  ),
                  const Divider(height: 1),
                  _buildSwitchTile(
                    title: 'Analytics',
                    subtitle: 'Help improve the app by sharing usage data',
                    settingKey: 'analytics',
                    icon: Icons.analytics,
                  ),
                ],
              ),
              
              // Data & Storage
              _buildSettingsSection(
                title: 'Data & Storage',
                children: [
                  _buildListTile(
                    title: 'Export Data',
                    subtitle: 'Download all your data',
                    icon: Icons.download,
                    onTap: _exportData,
                  ),
                  const Divider(height: 1),
                  _buildListTile(
                    title: 'Clear Cache',
                    subtitle: 'Free up storage space',
                    icon: Icons.cleaning_services,
                    onTap: () {
                      AppHelpers.showSnackBar(context, 'Cache cleared successfully');
                    },
                  ),
                ],
              ),
              
              // About
              _buildSettingsSection(
                title: 'About',
                children: [
                  _buildListTile(
                    title: 'Version',
                    subtitle: '1.0.0',
                    icon: Icons.info,
                    onTap: () {
                      AppHelpers.showSnackBar(context, 'TodoList App v1.0.0');
                    },
                  ),
                  const Divider(height: 1),
                  _buildListTile(
                    title: 'Rate App',
                    subtitle: 'Help us improve by rating the app',
                    icon: Icons.star,
                    onTap: () {
                      AppHelpers.showSnackBar(context, 'Thank you for your feedback!');
                    },
                  ),
                  const Divider(height: 1),
                  _buildListTile(
                    title: 'Contact Support',
                    subtitle: 'Get help or report issues',
                    icon: Icons.support,
                    onTap: () {
                      AppHelpers.showSnackBar(context, 'Support contact coming soon!');
                    },
                  ),
                ],
              ),
              
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
  
  String _getThemeDisplayName(String theme) {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
      default:
        return 'System Default';
    }
  }
  
  String _getLanguageDisplayName(String language) {
    switch (language) {
      case 'zh':
        return '中文';
      case 'es':
        return 'Español';
      case 'en':
      default:
        return 'English';
    }
  }
  
  String _getReminderDisplayName(int minutes) {
    if (minutes < 60) {
      return '$minutes minutes before';
    } else if (minutes < 1440) {
      final hours = minutes ~/ 60;
      return '$hours hour${hours > 1 ? 's' : ''} before';
    } else {
      final days = minutes ~/ 1440;
      return '$days day${days > 1 ? 's' : ''} before';
    }
  }
}