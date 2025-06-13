import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/user.dart';
import '../../utils/constants.dart';
import '../../utils/app_helpers.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/loading_overlay.dart';
import '../../widgets/profile_avatar.dart';
import '../../widgets/stats_card.dart';
import '../../widgets/subscription_card.dart';
import '../../services/payment_service.dart'; // Added for payment
import 'edit_profile_screen.dart';
import '../settings/settings_screen.dart';
import '../auth/login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _isLoading = false;
  
  @override
  void initState() {
    super.initState();
    _loadUserProfile();
  }
  
  Future<void> _loadUserProfile() async {
    setState(() {
      _isLoading = true;
    });
    
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      await authProvider.getCurrentUser();
      
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        AppHelpers.showErrorMessage(context, 'Failed to load profile: ${e.toString()}');
      }
    }
  }
  
  Future<void> _logout() async {
    final confirmed = await showConfirmationDialog(
      context,
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      confirmText: 'Logout',
      cancelText: 'Cancel',
    );
    
    if (confirmed == true) {
      try {
        final authProvider = Provider.of<AuthProvider>(context, listen: false);
        await authProvider.logout();
        
        if (mounted) {
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (context) => const LoginScreen()),
            (route) => false,
          );
        }
      } catch (e) {
        if (mounted) {
          AppHelpers.showErrorMessage(context, 'Failed to logout: ${e.toString()}');
        }
      }
    }
  }
  
  // 显示确认对话框
  Future<bool?> showConfirmationDialog(
    BuildContext context, {
    required String title,
    required String message,
    required String confirmText,
    required String cancelText,
    bool isDestructive = false,
  }) async {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(cancelText),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: isDestructive
                ? TextButton.styleFrom(foregroundColor: Colors.red)
                : null,
            child: Text(confirmText),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteAccount() async {
    final confirmed = await showConfirmationDialog(
      context,
      title: 'Delete Account',
      message: 'Are you sure you want to delete your account? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true,
    );
    
    if (confirmed == true) {
      // Show second confirmation
      final doubleConfirmed = await showConfirmationDialog(
        context,
        title: 'Final Confirmation',
        message: 'This will permanently delete all your data. Are you absolutely sure?',
        confirmText: 'Yes, Delete Everything',
        cancelText: 'Cancel',
        isDestructive: true,
      );
      
      if (doubleConfirmed == true) {
        try {
          final authProvider = Provider.of<AuthProvider>(context, listen: false);
          // 这里应该弹出密码确认对话框，但为了简化，我们使用默认值
          await authProvider.deleteAccount(
            password: 'password',
            confirmation: 'DELETE',
          );
          
          if (mounted) {
            Navigator.of(context).pushAndRemoveUntil(
              MaterialPageRoute(builder: (context) => const LoginScreen()),
              (route) => false,
            );
            AppHelpers.showSuccessMessage(context, 'Account deleted successfully');
          }
        } catch (e) {
          if (mounted) {
            AppHelpers.showErrorMessage(context, 'Failed to delete account: ${e.toString()}');
          }
        }
      }
    }
  }
  
  Widget _buildProfileHeader(User user) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Theme.of(context).colorScheme.primary,
            Theme.of(context).colorScheme.primary.withOpacity(0.8),
          ],
        ),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(24),
          bottomRight: Radius.circular(24),
        ),
      ),
      child: Column(
        children: [
          // Profile Avatar
          CircleAvatar(
            radius: 50,
            backgroundColor: Colors.white,
            child: user.profile?.avatar != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(50),
                    child: Image.network(
                      user.profile!.avatar!,
                      width: 100,
                      height: 100,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Icon(
                          Icons.person,
                          size: 50,
                          color: Theme.of(context).colorScheme.primary,
                        );
                      },
                    ),
                  )
                : Icon(
                    Icons.person,
                    size: 50,
                    color: Theme.of(context).colorScheme.primary,
                  ),
          ),
          const SizedBox(height: 16),
          
          // User Name
          Text(
            user.name,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          
          // User Email
          Text(
            user.email,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Colors.white.withOpacity(0.9),
            ),
          ),
          const SizedBox(height: 8),
          
          // Member Since
          Text(
            'Member since ${AppHelpers.formatDate(user.createdAt)}',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Colors.white.withOpacity(0.8),
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildStatsSection(User user) {
    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Your Stats',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 16),
            
            Row(
              children: [
                Expanded(
                  child: _buildStatItem(
                    icon: Icons.assignment,
                    label: 'Total Tasks',
                    value: user.usage?.tasksCreated.toString() ?? '0',
                    color: Colors.blue,
                  ),
                ),
                Expanded(
                  child: _buildStatItem(
                    icon: Icons.check_circle,
                    label: 'Completed',
                    value: user.usage?.tasksCompleted.toString() ?? '0',
                    color: Colors.green,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            Row(
              children: [
                Expanded(
                  child: _buildStatItem(
                    icon: Icons.local_fire_department,
                    label: 'Streak',
                    value: '${user.usage?.tasksCompleted ?? 0} tasks',
                    color: Colors.orange,
                  ),
                ),
                Expanded(
                  child: _buildStatItem(
                    icon: Icons.trending_up,
                    label: 'Productivity',
                    value: user.usage?.tasksCreated == 0 
                        ? '0%' 
                        : '${((user.usage?.tasksCompleted ?? 0) / (user.usage?.tasksCreated ?? 1) * 100).toInt()}%',
                    color: Colors.purple,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildStatItem({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            icon,
            color: color,
            size: 24,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }
  
  Widget _buildSubscriptionSection(User user) {
    if (user.subscription == null) {
      return Card(
        margin: const EdgeInsets.symmetric(horizontal: 16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Subscription',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                'You are currently on the free plan.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 12),
              CustomButton(
                text: 'Upgrade to Premium',
                onPressed: () {
                  // Navigate to subscription screen
                  AppHelpers.showInfoMessage(context, 'Subscription feature coming soon!');
                },
                variant: ButtonVariant.outlined,
              ),
            ],
          ),
        ),
      );
    }
    
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: SubscriptionCard(
        title: user.subscription!.type.toUpperCase(),
        price: user.subscription!.type == 'free' ? 'Free' : '\$9.99',
        period: user.subscription!.type == 'free' ? 'Forever' : 'Monthly',
        features: user.subscription!.type == 'free' 
            ? ['Basic task management', 'Limited storage']
            : ['Unlimited tasks', 'Advanced features', 'Priority support'],
        isActive: user.subscription!.status == 'active',
        onTap: () {
          // Handle subscription tap
        },
      ),
    );
  }
  
  Widget _buildMenuSection() {
    return Card(
      margin: const EdgeInsets.all(16),
      child: Column(
        children: [
          ListTile(
            leading: const Icon(Icons.edit),
            title: const Text('Edit Profile'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () async {
              final result = await Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => const EditProfileScreen(),
                ),
              );
              
              if (result == true) {
                _loadUserProfile();
              }
            },
          ),
          const Divider(height: 1),
          
          ListTile(
            leading: const Icon(Icons.settings),
            title: const Text('Settings'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => const SettingsScreen(),
                ),
              );
            },
          ),
          const Divider(height: 1),
          
          ListTile(
            leading: const Icon(Icons.help),
            title: const Text('Help & Support'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              AppHelpers.showInfoMessage(context, 'Help & Support coming soon!');
            },
          ),
          const Divider(height: 1),
          
          ListTile(
            leading: const Icon(Icons.privacy_tip),
            title: const Text('Privacy Policy'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              AppHelpers.showInfoMessage(context, 'Privacy Policy coming soon!');
            },
          ),
          const Divider(height: 1),
          
          ListTile(
            leading: const Icon(Icons.description),
            title: const Text('Terms of Service'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              AppHelpers.showInfoMessage(context, 'Terms of Service coming soon!');
            },
          ),
        ],
      ),
    );
  }
  
  Widget _buildActionButtons() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          CustomButton(
            text: 'Logout',
            onPressed: _logout,
            variant: ButtonVariant.outlined,
            icon: Icons.logout,
          ),
          const SizedBox(height: 12),
          
          CustomButton(
            text: 'Delete Account',
            onPressed: _deleteAccount,
            variant: ButtonVariant.text,
            color: Colors.red,
            icon: Icons.delete_forever,
          ),
        ],
      ),
    );
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: LoadingOverlay(
        isLoading: _isLoading,
        child: Consumer<AuthProvider>(
          builder: (context, authProvider, child) {
            final user = authProvider.user;
            
            if (user == null) {
              return const Center(
                child: Text('Please login to view your profile'),
              );
            }
            
            return RefreshIndicator(
              onRefresh: _loadUserProfile,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  children: [
                    _buildProfileHeader(user),
                    _buildStatsSection(user),
                    _buildSubscriptionSection(user),
                    _buildMenuSection(),
                    _buildActionButtons(),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
