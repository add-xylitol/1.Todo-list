import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/task_provider.dart';
import '../../utils/helpers.dart';
import '../../utils/constants.dart';
import '../tasks/task_list_screen.dart';
import '../tasks/add_task_screen.dart';
import '../profile/profile_screen.dart';
import '../statistics/statistics_screen.dart';
import '../settings/settings_screen.dart';

class HomeScreen extends StatefulWidget {
  static const String routeName = '/home';
  
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  int _currentIndex = 0;
  late TabController _tabController;
  
  final List<Widget> _screens = [
    const TaskListScreen(),
    const StatisticsScreen(),
    const ProfileScreen(),
    const SettingsScreen(),
  ];
  
  final List<BottomNavigationBarItem> _bottomNavItems = [
    const BottomNavigationBarItem(
      icon: Icon(Icons.task_outlined),
      activeIcon: Icon(Icons.task),
      label: '任务',
    ),
    const BottomNavigationBarItem(
      icon: Icon(Icons.analytics_outlined),
      activeIcon: Icon(Icons.analytics),
      label: '统计',
    ),
    const BottomNavigationBarItem(
      icon: Icon(Icons.person_outline),
      activeIcon: Icon(Icons.person),
      label: '我的',
    ),
    const BottomNavigationBarItem(
      icon: Icon(Icons.settings_outlined),
      activeIcon: Icon(Icons.settings),
      label: '设置',
    ),
  ];
  
  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _screens.length, vsync: this);
    _initializeData();
  }
  
  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
  
  Future<void> _initializeData() async {
    try {
      // 获取用户信息
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      await authProvider.getCurrentUser();
      
      // 获取任务列表
      final taskProvider = Provider.of<TaskProvider>(context, listen: false);
      await taskProvider.fetchTasks();
    } catch (e) {
      if (mounted) {
        AppHelpers.showErrorMessage(context, '数据加载失败: ${e.toString()}');
      }
    }
  }
  
  void _onTabTapped(int index) {
    setState(() {
      _currentIndex = index;
    });
    _tabController.animateTo(index);
  }
  
  void _showAddTaskBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.9,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(20),
          ),
        ),
        child: const AddTaskScreen(),
      ),
    );
  }
  
  Future<void> _handleRefresh() async {
    try {
      final taskProvider = Provider.of<TaskProvider>(context, listen: false);
      await taskProvider.syncTasks();
      
      if (mounted) {
        AppHelpers.showSuccessMessage(context, '同步成功');
      }
    } catch (e) {
      if (mounted) {
        AppHelpers.showErrorMessage(context, '同步失败: ${e.toString()}');
      }
    }
  }
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      body: TabBarView(
        controller: _tabController,
        physics: const NeverScrollableScrollPhysics(),
        children: _screens,
      ),
      
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: _onTabTapped,
        type: BottomNavigationBarType.fixed,
        selectedItemColor: theme.colorScheme.primary,
        unselectedItemColor: theme.colorScheme.onSurface.withOpacity(0.6),
        backgroundColor: theme.colorScheme.surface,
        elevation: 8,
        items: _bottomNavItems,
      ),
      
      floatingActionButton: _currentIndex == 0
          ? FloatingActionButton(
              onPressed: _showAddTaskBottomSheet,
              tooltip: '添加任务',
              child: const Icon(Icons.add),
            )
          : null,
      
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      
      // 添加应用栏（仅在任务页面显示）
      appBar: _currentIndex == 0
          ? AppBar(
              title: const Text('我的任务'),
              automaticallyImplyLeading: false,
              actions: [
                // 搜索按钮
                IconButton(
                  icon: const Icon(Icons.search),
                  onPressed: () {
                    // TODO: 实现搜索功能
                    AppHelpers.showWarningMessage(context, '搜索功能即将推出');
                  },
                ),
                
                // 同步按钮
                Consumer<TaskProvider>(
                  builder: (context, taskProvider, child) {
                    return IconButton(
                      icon: taskProvider.isSyncing
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                              ),
                            )
                          : const Icon(Icons.sync),
                      onPressed: taskProvider.isSyncing ? null : _handleRefresh,
                      tooltip: '同步',
                    );
                  },
                ),
                
                // 更多选项
                PopupMenuButton<String>(
                  onSelected: (value) {
                    switch (value) {
                      case 'filter':
                        // TODO: 实现筛选功能
                        AppHelpers.showWarningMessage(context, '筛选功能即将推出');
                        break;
                      case 'sort':
                        // TODO: 实现排序功能
                        AppHelpers.showWarningMessage(context, '排序功能即将推出');
                        break;
                      case 'export':
                        // TODO: 实现导出功能
                        AppHelpers.showWarningMessage(context, '导出功能即将推出');
                        break;
                    }
                  },
                  itemBuilder: (context) => [
                    const PopupMenuItem(
                      value: 'filter',
                      child: ListTile(
                        leading: Icon(Icons.filter_list),
                        title: Text('筛选'),
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'sort',
                      child: ListTile(
                        leading: Icon(Icons.sort),
                        title: Text('排序'),
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'export',
                      child: ListTile(
                        leading: Icon(Icons.download),
                        title: Text('导出'),
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  ],
                ),
              ],
            )
          : null,
    );
  }
}

// 自定义底部导航栏项目
class CustomBottomNavigationBarItem extends BottomNavigationBarItem {
  const CustomBottomNavigationBarItem({
    required Widget icon,
    required Widget activeIcon,
    required String label,
    Color? backgroundColor,
  }) : super(
          icon: icon,
          activeIcon: activeIcon,
          label: label,
          backgroundColor: backgroundColor,
        );
}

// 快速操作按钮
class QuickActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onPressed;
  final Color? color;
  
  const QuickActionButton({
    Key? key,
    required this.icon,
    required this.label,
    required this.onPressed,
    this.color,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: (color ?? theme.colorScheme.primary).withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: (color ?? theme.colorScheme.primary).withOpacity(0.2),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 32,
              color: color ?? theme.colorScheme.primary,
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: theme.textTheme.bodySmall?.copyWith(
                color: color ?? theme.colorScheme.primary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}