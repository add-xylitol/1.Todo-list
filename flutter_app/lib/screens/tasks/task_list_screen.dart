import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/task_provider.dart';
import '../../models/task.dart';
import '../../utils/helpers.dart';
import '../../utils/constants.dart';
import '../../widgets/task_item.dart';
import '../../widgets/empty_state.dart';
import 'task_detail_screen.dart';
import 'add_task_screen.dart';

class TaskListScreen extends StatefulWidget {
  static const String routeName = '/tasks';
  
  const TaskListScreen({Key? key}) : super(key: key);

  @override
  State<TaskListScreen> createState() => _TaskListScreenState();
}

class _TaskListScreenState extends State<TaskListScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  final ScrollController _scrollController = ScrollController();
  
  String _currentFilter = 'all';
  String _currentSort = 'created_at';
  bool _sortAscending = false;
  
  final List<Tab> _tabs = [
    const Tab(text: '全部'),
    const Tab(text: '今天'),
    const Tab(text: '明天'),
    const Tab(text: '本周'),
    const Tab(text: '已逾期'),
  ];
  
  final List<String> _filterValues = [
    'all',
    'today',
    'tomorrow',
    'this_week',
    'overdue',
  ];
  
  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    _tabController.addListener(_onTabChanged);
    _scrollController.addListener(_onScroll);
  }
  
  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }
  
  void _onTabChanged() {
    if (_tabController.indexIsChanging) {
      setState(() {
        _currentFilter = _filterValues[_tabController.index];
      });
      _applyFilter();
    }
  }
  
  void _onScroll() {
    if (_scrollController.position.pixels ==
        _scrollController.position.maxScrollExtent) {
      // 加载更多任务
      final taskProvider = Provider.of<TaskProvider>(context, listen: false);
      if (!taskProvider.isLoading && taskProvider.hasMore) {
        taskProvider.loadMoreTasks();
      }
    }
  }
  
  void _applyFilter() {
    final taskProvider = Provider.of<TaskProvider>(context, listen: false);
    taskProvider.setFilter(_currentFilter);
  }
  
  void _showSortOptions() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '排序方式',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ...AppConstants.sortOptions.map((option) {
              String displayName;
              switch (option) {
                case 'created_at':
                  displayName = '创建时间';
                  break;
                case 'updated_at':
                  displayName = '更新时间';
                  break;
                case 'due_date':
                  displayName = '截止时间';
                  break;
                case 'priority':
                  displayName = '优先级';
                  break;
                case 'title':
                  displayName = '标题';
                  break;
                case 'status':
                  displayName = '状态';
                  break;
                default:
                  displayName = option;
              }
              
              return ListTile(
                title: Text(displayName),
                trailing: _currentSort == option
                    ? Icon(
                        _sortAscending
                            ? Icons.arrow_upward
                            : Icons.arrow_downward,
                        color: Theme.of(context).colorScheme.primary,
                      )
                    : null,
                onTap: () {
                  setState(() {
                    if (_currentSort == option) {
                      _sortAscending = !_sortAscending;
                    } else {
                      _currentSort = option;
                      _sortAscending = false;
                    }
                  });
                  
                  final taskProvider = Provider.of<TaskProvider>(context, listen: false);
                  taskProvider.setSorting(_currentSort, _sortAscending);
                  
                  Navigator.of(context).pop();
                },
              );
            }).toList(),
          ],
        ),
      ),
    );
  }
  
  void _onTaskTap(Task task) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => TaskDetailScreen(task: task),
      ),
    );
  }
  
  Future<void> _onTaskToggle(Task task) async {
    try {
      final taskProvider = Provider.of<TaskProvider>(context, listen: false);
      await taskProvider.toggleTaskComplete(task.id);
      
      if (mounted) {
        AppHelpers.showSuccessMessage(
          context,
          task.isCompleted ? '任务已完成' : '任务已重新激活',
        );
      }
    } catch (e) {
      if (mounted) {
        AppHelpers.showErrorMessage(context, '操作失败: ${e.toString()}');
      }
    }
  }
  
  Future<void> _onTaskDelete(Task task) async {
    final confirmed = await AppHelpers.showConfirmDialog(
      context,
      title: '删除任务',
      content: '确定要删除任务"${task.title}"吗？',
      confirmText: '删除',
      confirmColor: Colors.red,
    );
    
    if (confirmed == true) {
      try {
        final taskProvider = Provider.of<TaskProvider>(context, listen: false);
        await taskProvider.deleteTask(task.id);
        
        if (mounted) {
          AppHelpers.showSuccessMessage(context, '任务已删除');
        }
      } catch (e) {
        if (mounted) {
          AppHelpers.showErrorMessage(context, '删除失败: ${e.toString()}');
        }
      }
    }
  }
  
  Future<void> _onRefresh() async {
    try {
      final taskProvider = Provider.of<TaskProvider>(context, listen: false);
      await taskProvider.fetchTasks(refresh: true);
    } catch (e) {
      if (mounted) {
        AppHelpers.showErrorMessage(context, '刷新失败: ${e.toString()}');
      }
    }
  }
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Column(
      children: [
        // 标签栏
        Container(
          color: theme.colorScheme.surface,
          child: TabBar(
            controller: _tabController,
            isScrollable: true,
            labelColor: theme.colorScheme.primary,
            unselectedLabelColor: theme.colorScheme.onSurface.withOpacity(0.6),
            indicatorColor: theme.colorScheme.primary,
            tabs: _tabs,
          ),
        ),
        
        // 任务列表
        Expanded(
          child: Consumer<TaskProvider>(
            builder: (context, taskProvider, child) {
              if (taskProvider.isLoading && taskProvider.tasks.isEmpty) {
                return const Center(
                  child: CircularProgressIndicator(),
                );
              }
              
              if (taskProvider.error != null) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.error_outline,
                        size: 64,
                        color: theme.colorScheme.error,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        '加载失败',
                        style: theme.textTheme.titleLarge,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        taskProvider.error!,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurface.withOpacity(0.6),
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _onRefresh,
                        child: const Text('重试'),
                      ),
                    ],
                  ),
                );
              }
              
              final filteredTasks = taskProvider.filteredTasks;
              
              if (filteredTasks.isEmpty) {
                return EmptyState(
                  icon: Icons.task_outlined,
                  title: _getEmptyStateTitle(),
                  subtitle: _getEmptyStateSubtitle(),
                  actionText: '添加任务',
                  onActionPressed: () {
                    showModalBottomSheet(
                      context: context,
                      isScrollControlled: true,
                      backgroundColor: Colors.transparent,
                      builder: (context) => Container(
                        height: MediaQuery.of(context).size.height * 0.9,
                        decoration: BoxDecoration(
                          color: theme.colorScheme.surface,
                          borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(20),
                          ),
                        ),
                        child: const AddTaskScreen(),
                      ),
                    );
                  },
                );
              }
              
              return RefreshIndicator(
                onRefresh: _onRefresh,
                child: ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: filteredTasks.length + (taskProvider.isLoading ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (index >= filteredTasks.length) {
                      return const Center(
                        child: Padding(
                          padding: EdgeInsets.all(16),
                          child: CircularProgressIndicator(),
                        ),
                      );
                    }
                    
                    final task = filteredTasks[index];
                    return TaskItem(
                      task: task,
                      onTap: () => _onTaskTap(task),
                      onToggle: () => _onTaskToggle(task),
                      onDelete: () => _onTaskDelete(task),
                    );
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }
  
  String _getEmptyStateTitle() {
    switch (_currentFilter) {
      case 'today':
        return '今天没有任务';
      case 'tomorrow':
        return '明天没有任务';
      case 'this_week':
        return '本周没有任务';
      case 'overdue':
        return '没有逾期任务';
      default:
        return '还没有任务';
    }
  }
  
  String _getEmptyStateSubtitle() {
    switch (_currentFilter) {
      case 'today':
        return '今天的任务都完成了，真棒！';
      case 'tomorrow':
        return '明天暂时没有安排任务';
      case 'this_week':
        return '本周的任务都处理完了';
      case 'overdue':
        return '所有任务都按时完成了';
      default:
        return '开始添加您的第一个任务吧';
    }
  }
}