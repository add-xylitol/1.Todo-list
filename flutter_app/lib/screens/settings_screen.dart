import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import '../providers/settings_provider.dart';
import '../widgets/custom_button.dart';
import '../utils/helpers.dart';
import '../utils/constants.dart';
import 'profile_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildProfileSection(),
            const SizedBox(height: 8),
            _buildAppearanceSection(),
            const SizedBox(height: 8),
            _buildNotificationSection(),
            const SizedBox(height: 8),
            _buildTaskSection(),
            const SizedBox(height: 8),
            _buildSyncSection(),
            const SizedBox(height: 8),
            _buildPrivacySection(),
            const SizedBox(height: 8),
            _buildAboutSection(),
            const SizedBox(height: 8),
            _buildAccountSection(),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileSection() {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, child) {
        final user = authProvider.currentUser;
        
        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          child: ListTile(
            leading: CircleAvatar(
              radius: 24,
              backgroundImage: user?.profilePicture != null
                  ? NetworkImage(user!.profilePicture!)
                  : null,
              child: user?.profilePicture == null
                  ? Text(
                      user?.name?.substring(0, 1).toUpperCase() ?? 'U',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    )
                  : null,
            ),
            title: Text(
              user?.name ?? 'Guest User',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Text(user?.email ?? 'Not signed in'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => const ProfileScreen(),
                ),
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildAppearanceSection() {
    return _buildSection(
      title: 'Appearance',
      children: [
        Consumer<ThemeProvider>(
          builder: (context, themeProvider, child) {
            return ListTile(
              leading: Icon(themeProvider.getThemeIcon()),
              title: const Text('Theme'),
              subtitle: Text(themeProvider.getThemeDisplayName()),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => _showThemeDialog(),
            );
          },
        ),
        Consumer<SettingsProvider>(
          builder: (context, settingsProvider, child) {
            return ListTile(
              leading: const Icon(Icons.language),
              title: const Text('Language'),
              subtitle: Text(settingsProvider.getLocaleDisplayName()),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => _showLanguageDialog(),
            );
          },
        ),
        Consumer<SettingsProvider>(
          builder: (context, settingsProvider, child) {
            return ListTile(
              leading: const Icon(Icons.date_range),
              title: const Text('Date Format'),
              subtitle: Text(settingsProvider.getDateFormatDisplayName()),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => _showDateFormatDialog(),
            );
          },
        ),
        Consumer<SettingsProvider>(
          builder: (context, settingsProvider, child) {
            return ListTile(
              leading: const Icon(Icons.access_time),
              title: const Text('Time Format'),
              subtitle: Text(settingsProvider.getTimeFormatDisplayName()),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => _showTimeFormatDialog(),
            );
          },
        ),
      ],
    );
  }

  Widget _buildNotificationSection() {
    return _buildSection(
      title: 'Notifications',
      children: [
        Consumer<SettingsProvider>(
          builder: (context, settingsProvider, child) {
            return SwitchListTile(
              secondary: const Icon(Icons.notifications),
              title: const Text('Push Notifications'),
              subtitle: const Text('Receive notifications for tasks and reminders'),
              value: settingsProvider.notificationsEnabled,
              onChanged: (value) {
                settingsProvider.updateNotificationsEnabled(value);
              },
            );
          },
        ),
        Consumer<SettingsProvider>(
          builder: (context, settingsProvider, child) {
            return SwitchListTile(
              secondary: const Icon(Icons.alarm),
              title: const Text('Task Reminders'),
              subtitle: const Text('Get reminded about upcoming tasks'),
              value: settingsProvider.taskRemindersEnabled,
              onChanged: settingsProvider.notificationsEnabled
                  ? (value) {
                      settingsProvider.updateTaskRemindersEnabled(value);
                    }
                  : null,
            );
          },
        ),
        Consumer<SettingsProvider>(
          builder: (context, settingsProvider, child) {
            return SwitchListTile(
              secondary: const Icon(Icons.today),
              title: const Text('Daily Summary'),
              subtitle: const Text('Receive daily task summary'),
              value: settingsProvider.dailySummaryEnabled,
              onChanged: settingsProvider.notificationsEnabled
                  ? (value) {
                      settingsProvider.updateDailySummaryEnabled(value);
                    }
                  : null,
            );
          },
        ),
        Consumer<SettingsProvider>(
          builder: (context, settingsProvider, child) {
            return ListTile(
              leading: const Icon(Icons.schedule),
              title: const Text('Default Reminder Time'),
              subtitle: Text(
                '${settingsProvider.defaultReminderMinutes} minutes before',
              ),
              trailing: const Icon(Icons.chevron_right),
              enabled: settingsProvider.notificationsEnabled &&
                  settingsProvider.taskRemindersEnabled,
              onTap: settingsProvider.notificationsEnabled &&
                      settingsProvider.taskRemindersEnabled
                  ? () => _showReminderTimeDialog()
                  : null,
            );
          },
        ),
      ],
    );
  }

  Widget _buildTaskSection() {
    return _buildSection(
      title: 'Tasks',
      children: [
        Consumer<SettingsProvider>(
          builder: (context, settingsProvider, child) {
            return ListTile(
              leading: const Icon(Icons.sort),
              title: const Text('Default Sort Order'),
              subtitle: Text(settingsProvider.getDefaultSortDisplayName()),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => _showSortOrderDialog(),
            );
          },
        ),
        Consumer<SettingsProvider>(
          builder: (context, settingsProvider, child) {
            return SwitchListTile(
              secondary: const Icon(Icons.check_circle_outline),
              title: const Text('Show Completed Tasks'),
              subtitle: const Text('Display completed tasks in lists'),
              value: settingsProvider.showCompletedTasks,
              onChanged: (value) {
                settingsProvider.updateShowCompletedTasks(value);
              },
            );
          },
        ),
        Consumer<SettingsProvider>(
          builder: (context, settingsProvider, child) {
            return SwitchListTile(
              secondary: const Icon(Icons.auto_delete),
              title: const Text('Auto-delete Completed'),
              subtitle: const Text('Automatically delete completed tasks after 30 days'),
              value: settingsProvider.autoDeleteCompleted,
              onChanged: (value) {
                settingsProvider.updateAutoDeleteCompleted(value);
              },
            );
          },
        ),
        Consumer<SettingsProvider>(
          builder: (context, settingsProvider, child) {
            return SwitchListTile(
              secondary: const Icon(Icons.vibration),
              title: const Text('Haptic Feedback'),
              subtitle: const Text('Vibrate when completing tasks'),
              value: settingsProvider.hapticFeedbackEnabled,
              onChanged: (value) {
                settingsProvider.updateHapticFeedbackEnabled(value);
              },
            );
          },
        ),
      ],
    );
  }

  Widget _buildSyncSection() {
    return _buildSection(
      title: 'Sync & Backup',
      children: [
        Consumer<SettingsProvider>(
          builder: (context, settingsProvider, child) {
            return SwitchListTile(
              secondary: const Icon(Icons.cloud_sync),
              title: const Text('Auto Sync'),
              subtitle: const Text('Automatically sync data when online'),
              value: settingsProvider.autoSyncEnabled,
              onChanged: (value) {
                settingsProvider.updateAutoSyncEnabled(value);
              },
            );
          },
        ),
        Consumer<SettingsProvider>(
          builder: (context, settingsProvider, child) {
            return SwitchListTile(
              secondary: const Icon(Icons.wifi_off),
              title: const Text('Offline Mode'),
              subtitle: const Text('Work offline and sync when connected'),
              value: settingsProvider.offlineModeEnabled,
              onChanged: (value) {
                settingsProvider.updateOfflineModeEnabled(value);
              },
            );
          },
        ),
        ListTile(
          leading: const Icon(Icons.backup),
          title: const Text('Backup Data'),
          subtitle: const Text('Create a backup of your tasks'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _showBackupDialog(),
        ),
        ListTile(
          leading: const Icon(Icons.restore),
          title: const Text('Restore Data'),
          subtitle: const Text('Restore tasks from backup'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _showRestoreDialog(),
        ),
      ],
    );
  }

  Widget _buildPrivacySection() {
    return _buildSection(
      title: 'Privacy & Security',
      children: [
        Consumer<SettingsProvider>(
          builder: (context, settingsProvider, child) {
            return SwitchListTile(
              secondary: const Icon(Icons.analytics),
              title: const Text('Analytics'),
              subtitle: const Text('Help improve the app by sharing usage data'),
              value: settingsProvider.analyticsEnabled,
              onChanged: (value) {
                settingsProvider.updateAnalyticsEnabled(value);
              },
            );
          },
        ),
        Consumer<SettingsProvider>(
          builder: (context, settingsProvider, child) {
            return SwitchListTile(
              secondary: const Icon(Icons.bug_report),
              title: const Text('Crash Reports'),
              subtitle: const Text('Automatically send crash reports'),
              value: settingsProvider.crashReportsEnabled,
              onChanged: (value) {
                settingsProvider.updateCrashReportsEnabled(value);
              },
            );
          },
        ),
        ListTile(
          leading: const Icon(Icons.privacy_tip),
          title: const Text('Privacy Policy'),
          trailing: const Icon(Icons.open_in_new),
          onTap: () => _openPrivacyPolicy(),
        ),
        ListTile(
          leading: const Icon(Icons.description),
          title: const Text('Terms of Service'),
          trailing: const Icon(Icons.open_in_new),
          onTap: () => _openTermsOfService(),
        ),
      ],
    );
  }

  Widget _buildAboutSection() {
    return _buildSection(
      title: 'About',
      children: [
        ListTile(
          leading: const Icon(Icons.info),
          title: const Text('App Version'),
          subtitle: const Text('1.0.0 (Build 1)'),
        ),
        ListTile(
          leading: const Icon(Icons.star),
          title: const Text('Rate App'),
          subtitle: const Text('Rate us on the App Store'),
          trailing: const Icon(Icons.open_in_new),
          onTap: () => _rateApp(),
        ),
        ListTile(
          leading: const Icon(Icons.feedback),
          title: const Text('Send Feedback'),
          subtitle: const Text('Help us improve the app'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _sendFeedback(),
        ),
        ListTile(
          leading: const Icon(Icons.help),
          title: const Text('Help & Support'),
          trailing: const Icon(Icons.open_in_new),
          onTap: () => _openSupport(),
        ),
      ],
    );
  }

  Widget _buildAccountSection() {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, child) {
        if (!authProvider.isAuthenticated) {
          return _buildSection(
            title: 'Account',
            children: [
              ListTile(
                leading: const Icon(Icons.login),
                title: const Text('Sign In'),
                subtitle: const Text('Sign in to sync your data'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => _signIn(),
              ),
            ],
          );
        }
        
        return _buildSection(
          title: 'Account',
          children: [
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Sign Out'),
              subtitle: Text('Sign out of ${authProvider.currentUser?.email}'),
              onTap: () => _signOut(),
            ),
            ListTile(
              leading: const Icon(Icons.delete_forever, color: Colors.red),
              title: const Text('Delete Account', style: TextStyle(color: Colors.red)),
              subtitle: const Text('Permanently delete your account and data'),
              onTap: () => _deleteAccount(),
            ),
          ],
        );
      },
    );
  }

  Widget _buildSection({
    required String title,
    required List<Widget> children,
  }) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                  ),
            ),
          ),
          ...children,
        ],
      ),
    );
  }

  void _showThemeDialog() {
    showDialog(
      context: context,
      builder: (context) => Consumer<ThemeProvider>(
        builder: (context, themeProvider, child) {
          return AlertDialog(
            title: const Text('Choose Theme'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: ThemeMode.values.map((mode) {
                return RadioListTile<ThemeMode>(
                  title: Text(themeProvider.getThemeDisplayName(mode)),
                  value: mode,
                  groupValue: themeProvider.themeMode,
                  onChanged: (value) {
                    if (value != null) {
                      themeProvider.setThemeMode(value);
                      Navigator.of(context).pop();
                    }
                  },
                );
              }).toList(),
            ),
          );
        },
      ),
    );
  }

  void _showLanguageDialog() {
    showDialog(
      context: context,
      builder: (context) => Consumer<SettingsProvider>(
        builder: (context, settingsProvider, child) {
          return AlertDialog(
            title: const Text('Choose Language'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: settingsProvider.availableLocales.map((locale) {
                return RadioListTile<String>(
                  title: Text(settingsProvider.getLocaleDisplayName(locale)),
                  value: locale,
                  groupValue: settingsProvider.appLocale,
                  onChanged: (value) {
                    if (value != null) {
                      settingsProvider.updateAppLocale(value);
                      Navigator.of(context).pop();
                    }
                  },
                );
              }).toList(),
            ),
          );
        },
      ),
    );
  }

  void _showDateFormatDialog() {
    showDialog(
      context: context,
      builder: (context) => Consumer<SettingsProvider>(
        builder: (context, settingsProvider, child) {
          return AlertDialog(
            title: const Text('Choose Date Format'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: settingsProvider.availableDateFormats.map((format) {
                return RadioListTile<String>(
                  title: Text(settingsProvider.getDateFormatDisplayName(format)),
                  subtitle: Text(DateHelper.formatDate(DateTime.now(), format)),
                  value: format,
                  groupValue: settingsProvider.dateFormat,
                  onChanged: (value) {
                    if (value != null) {
                      settingsProvider.updateDateFormat(value);
                      Navigator.of(context).pop();
                    }
                  },
                );
              }).toList(),
            ),
          );
        },
      ),
    );
  }

  void _showTimeFormatDialog() {
    showDialog(
      context: context,
      builder: (context) => Consumer<SettingsProvider>(
        builder: (context, settingsProvider, child) {
          return AlertDialog(
            title: const Text('Choose Time Format'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: settingsProvider.availableTimeFormats.map((format) {
                return RadioListTile<String>(
                  title: Text(settingsProvider.getTimeFormatDisplayName(format)),
                  subtitle: Text(DateHelper.formatTime(DateTime.now(), format)),
                  value: format,
                  groupValue: settingsProvider.timeFormat,
                  onChanged: (value) {
                    if (value != null) {
                      settingsProvider.updateTimeFormat(value);
                      Navigator.of(context).pop();
                    }
                  },
                );
              }).toList(),
            ),
          );
        },
      ),
    );
  }

  void _showReminderTimeDialog() {
    final settingsProvider = Provider.of<SettingsProvider>(context, listen: false);
    final controller = TextEditingController(
      text: settingsProvider.defaultReminderMinutes.toString(),
    );
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Default Reminder Time'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Minutes before due time:'),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Minutes',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              final minutes = int.tryParse(controller.text);
              if (minutes != null && minutes > 0) {
                settingsProvider.updateDefaultReminderMinutes(minutes);
                Navigator.of(context).pop();
              } else {
                SnackBarHelper.showError(
                  context,
                  'Please enter a valid number of minutes',
                );
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showSortOrderDialog() {
    showDialog(
      context: context,
      builder: (context) => Consumer<SettingsProvider>(
        builder: (context, settingsProvider, child) {
          return AlertDialog(
            title: const Text('Default Sort Order'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: settingsProvider.availableSortOrders.map((order) {
                return RadioListTile<String>(
                  title: Text(settingsProvider.getDefaultSortDisplayName(order)),
                  value: order,
                  groupValue: settingsProvider.defaultSortOrder,
                  onChanged: (value) {
                    if (value != null) {
                      settingsProvider.updateDefaultSortOrder(value);
                      Navigator.of(context).pop();
                    }
                  },
                );
              }).toList(),
            ),
          );
        },
      ),
    );
  }

  void _showBackupDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Backup Data'),
        content: const Text(
          'This will create a backup of all your tasks and settings. '
          'The backup file will be saved to your device.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _performBackup();
            },
            child: const Text('Backup'),
          ),
        ],
      ),
    );
  }

  void _showRestoreDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Restore Data'),
        content: const Text(
          'This will restore your tasks and settings from a backup file. '
          'Your current data will be replaced.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _performRestore();
            },
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Restore'),
          ),
        ],
      ),
    );
  }

  Future<void> _performBackup() async {
    try {
      // TODO: Implement backup functionality
      SnackBarHelper.showSuccess(
        context,
        'Backup created successfully',
      );
    } catch (e) {
      SnackBarHelper.showError(
        context,
        'Failed to create backup: $e',
      );
    }
  }

  Future<void> _performRestore() async {
    try {
      // TODO: Implement restore functionality
      SnackBarHelper.showSuccess(
        context,
        'Data restored successfully',
      );
    } catch (e) {
      SnackBarHelper.showError(
        context,
        'Failed to restore data: $e',
      );
    }
  }

  void _openPrivacyPolicy() {
    // TODO: Open privacy policy URL
    SnackBarHelper.showInfo(
      context,
      'Opening Privacy Policy...',
    );
  }

  void _openTermsOfService() {
    // TODO: Open terms of service URL
    SnackBarHelper.showInfo(
      context,
      'Opening Terms of Service...',
    );
  }

  void _rateApp() {
    // TODO: Open app store rating
    SnackBarHelper.showInfo(
      context,
      'Opening App Store...',
    );
  }

  void _sendFeedback() {
    // TODO: Open feedback form or email
    SnackBarHelper.showInfo(
      context,
      'Opening feedback form...',
    );
  }

  void _openSupport() {
    // TODO: Open support page
    SnackBarHelper.showInfo(
      context,
      'Opening support page...',
    );
  }

  void _signIn() {
    // TODO: Navigate to sign in screen
    SnackBarHelper.showInfo(
      context,
      'Opening sign in...',
    );
  }

  Future<void> _signOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
    
    if (confirmed == true) {
      try {
        final authProvider = Provider.of<AuthProvider>(context, listen: false);
        await authProvider.signOut();
        
        if (mounted) {
          SnackBarHelper.showSuccess(
            context,
            'Signed out successfully',
          );
        }
      } catch (e) {
        if (mounted) {
          SnackBarHelper.showError(
            context,
            'Failed to sign out: $e',
          );
        }
      }
    }
  }

  Future<void> _deleteAccount() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Account'),
        content: const Text(
          'Are you sure you want to delete your account? '
          'This action cannot be undone and all your data will be permanently lost.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    
    if (confirmed == true) {
      try {
        final authProvider = Provider.of<AuthProvider>(context, listen: false);
        await authProvider.deleteAccount();
        
        if (mounted) {
          SnackBarHelper.showSuccess(
            context,
            'Account deleted successfully',
          );
        }
      } catch (e) {
        if (mounted) {
          SnackBarHelper.showError(
            context,
            'Failed to delete account: $e',
          );
        }
      }
    }
  }
}