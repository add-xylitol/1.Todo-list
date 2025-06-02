import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../providers/todo_provider.dart';
import '../models/todo.dart';
import '../widgets/todo_item.dart';
import '../widgets/add_todo_dialog.dart';
import '../widgets/stats_card.dart';
import '../widgets/filter_chips.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  final TextEditingController _searchController = TextEditingController();
  late AnimationController _fabAnimationController;
  
  @override
  void initState() {
    super.initState();
    _fabAnimationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    
    // 初始化数据
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TodoProvider>().loadTodos();
    });
  }
  
  @override
  void dispose() {
    _searchController.dispose();
    _fabAnimationController.dispose();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.background,
      body: CustomScrollView(
        slivers: [
          _buildAppBar(),
          _buildStatsSection(),
          _buildFilterSection(),
          _buildTodoList(),
        ],
      ),
      floatingActionButton: _buildFloatingActionButton(),
    );
  }
  
  Widget _buildAppBar() {
    return SliverAppBar(
      expandedHeight: 120,
      floating: false,
      pinned: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      flexibleSpace: FlexibleSpaceBar(
        title: Text(
          'TodoList Pro',
          style: Theme.of(context).textTheme.displayMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: false,
        titlePadding: const EdgeInsets.only(left: 20, bottom: 16),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.search),
          onPressed: _showSearchDialog,
        ),
        PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert),
          onSelected: _handleMenuAction,
          itemBuilder: (context) => [
            const PopupMenuItem(
              value: 'clear_completed',
              child: Row(
                children: [
                  Icon(Icons.clear_all),
                  SizedBox(width: 8),
                  Text('清除已完成'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'settings',
              child: Row(
                children: [
                  Icon(Icons.settings),
                  SizedBox(width: 8),
                  Text('设置'),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
  
  Widget _buildStatsSection() {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: FutureBuilder<Map<String, int>>(
          future: context.read<TodoProvider>().getStats(),
          builder: (context, snapshot) {
            if (!snapshot.hasData) {
              return const SizedBox.shrink();
            }
            
            final stats = snapshot.data!;
            return Row(
              children: [
                Expanded(
                  child: StatsCard(
                    title: '总计',
                    value: stats['total']!,
                    color: Theme.of(context).colorScheme.primary,
                    icon: Icons.list_alt,
                  ).animate().fadeIn(delay: 100.ms).slideX(),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: StatsCard(
                    title: '待完成',
                    value: stats['pending']!,
                    color: Colors.orange,
                    icon: Icons.pending_actions,
                  ).animate().fadeIn(delay: 200.ms).slideX(),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: StatsCard(
                    title: '已完成',
                    value: stats['completed']!,
                    color: Colors.green,
                    icon: Icons.check_circle,
                  ).animate().fadeIn(delay: 300.ms).slideX(),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
  
  Widget _buildFilterSection() {
    return const SliverToBoxAdapter(
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: 16),
        child: FilterChips(),
      ),
    );
  }
  
  Widget _buildTodoList() {
    return Consumer<TodoProvider>(
      builder: (context, todoProvider, child) {
        if (todoProvider.isLoading) {
          return const SliverFillRemaining(
            child: Center(
              child: CircularProgressIndicator(),
            ),
          );
        }
        
        final todos = todoProvider.todos;
        
        if (todos.isEmpty) {
          return SliverFillRemaining(
            child: _buildEmptyState(),
          );
        }
        
        return SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                final todo = todos[index];
                return TodoItem(
                  todo: todo,
                  onToggle: () => todoProvider.toggleTodoStatus(todo.id),
                  onDelete: () => _deleteTodo(todo.id),
                  onEdit: () => _editTodo(todo),
                ).animate().fadeIn(delay: (index * 50).ms).slideY();
              },
              childCount: todos.length,
            ),
          ),
        );
      },
    );
  }
  
  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.task_alt,
            size: 80,
            color: Theme.of(context).colorScheme.primary.withOpacity(0.5),
          ).animate().scale(delay: 200.ms),
          const SizedBox(height: 16),
          Text(
            '暂无待办事项',
            style: Theme.of(context).textTheme.displayMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
            ),
          ).animate().fadeIn(delay: 400.ms),
          const SizedBox(height: 8),
          Text(
            '点击右下角的 + 按钮添加新的待办事项',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
            ),
            textAlign: TextAlign.center,
          ).animate().fadeIn(delay: 600.ms),
        ],
      ),
    );
  }
  
  Widget _buildFloatingActionButton() {
    return FloatingActionButton(
      onPressed: _addTodo,
      child: const Icon(Icons.add),
    ).animate().scale(delay: 800.ms);
  }
  
  void _showSearchDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('搜索待办事项'),
        content: TextField(
          controller: _searchController,
          decoration: const InputDecoration(
            hintText: '输入关键词...',
            prefixIcon: Icon(Icons.search),
          ),
          onChanged: (value) {
            context.read<TodoProvider>().setSearchQuery(value);
          },
        ),
        actions: [
          TextButton(
            onPressed: () {
              _searchController.clear();
              context.read<TodoProvider>().setSearchQuery('');
              Navigator.pop(context);
            },
            child: const Text('清除'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('确定'),
          ),
        ],
      ),
    );
  }
  
  void _handleMenuAction(String action) {
    switch (action) {
      case 'clear_completed':
        _clearCompletedTodos();
        break;
      case 'settings':
        // TODO: 实现设置页面
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('设置功能即将推出')),
        );
        break;
    }
  }
  
  void _clearCompletedTodos() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('确认删除'),
        content: const Text('确定要删除所有已完成的待办事项吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () {
              context.read<TodoProvider>().deleteCompletedTodos();
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('已删除所有已完成的待办事项')),
              );
            },
            child: const Text('确定'),
          ),
        ],
      ),
    );
  }
  
  void _addTodo() {
    showDialog(
      context: context,
      builder: (context) => const AddTodoDialog(),
    );
  }
  
  void _editTodo(Todo todo) {
    showDialog(
      context: context,
      builder: (context) => AddTodoDialog(todo: todo),
    );
  }
  
  void _deleteTodo(String id) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('确认删除'),
        content: const Text('确定要删除这个待办事项吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () {
              context.read<TodoProvider>().deleteTodo(id);
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('待办事项已删除')),
              );
            },
            child: const Text('确定'),
          ),
        ],
      ),
    );
  }
}