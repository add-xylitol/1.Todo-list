import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/task.dart';
import '../../providers/task_provider.dart';
import '../../providers/auth_provider.dart';
import '../../utils/constants.dart';
import '../../utils/helpers.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';
import '../../widgets/priority_selector.dart';
import '../../widgets/category_selector.dart';
import '../../widgets/date_time_picker.dart';
import '../../widgets/tag_input.dart';
import '../../widgets/subtask_list.dart';
import '../../widgets/attachment_list.dart';
import '../../widgets/loading_overlay.dart';
import 'add_task_screen.dart';

class TaskDetailScreen extends StatefulWidget {
  final String taskId;
  
  const TaskDetailScreen({
    Key? key,
    required this.taskId,
  }) : super(key: key);

  @override
  State<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends State<TaskDetailScreen> {
  bool _isLoading = false;
  Task? _task;
  
  @override
  void initState() {
    super.initState();
    _loadTask();
  }
  
  Future<void> _loadTask() async {
    setState(() {
      _isLoading = true;
    });
    
    try {
      final taskProvider = Provider.of<TaskProvider>(context, listen: false);
      final task = await taskProvider.getTask(widget.taskId);
      
      if (mounted) {
        setState(() {
          _task = task;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        showErrorSnackBar(context, 'Failed to load task: ${e.toString()}');
      }
    }
  }
  
  Future<void> _toggleComplete() async {
    if (_task == null) return;
    
    try {
      final taskProvider = Provider.of<TaskProvider>(context, listen: false);
      await taskProvider.toggleTaskComplete(_task!.id);
      
      // Refresh task data
      await _loadTask();
      
      if (mounted) {
        showSuccessSnackBar(
          context, 
          _task!.isCompleted ? 'Task completed!' : 'Task marked as incomplete'
        );
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, 'Failed to update task: ${e.toString()}');
      }
    }
  }
  
  Future<void> _deleteTask() async {
    if (_task == null) return;
    
    final confirmed = await showConfirmationDialog(
      context,
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    );
    
    if (confirmed == true) {
      try {
        final taskProvider = Provider.of<TaskProvider>(context, listen: false);
        await taskProvider.deleteTask(_task!.id);
        
        if (mounted) {
          Navigator.of(context).pop();
          showSuccessSnackBar(context, 'Task deleted successfully');
        }
      } catch (e) {
        if (mounted) {
          showErrorSnackBar(context, 'Failed to delete task: ${e.toString()}');
        }
      }
    }
  }
  
  Future<void> _editTask() async {
    if (_task == null) return;
    
    final result = await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => AddTaskScreen(task: _task),
      ),
    );
    
    if (result == true) {
      // Refresh task data
      await _loadTask();
    }
  }
  
  Widget _buildTaskInfo() {
    if (_task == null) return const SizedBox.shrink();
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Title
        Text(
          _task!.title,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            decoration: _task!.isCompleted ? TextDecoration.lineThrough : null,
            color: _task!.isCompleted ? Colors.grey : null,
          ),
        ),
        const SizedBox(height: 16),
        
        // Status and Priority
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: _getStatusColor(_task!.status),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                _task!.status.displayName,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: _getPriorityColor(_task!.priority),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                _task!.priority.displayName,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        
        // Description
        if (_task!.description.isNotEmpty) ..[
          Text(
            'Description',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            _task!.description,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
        ],
        
        // Due Date
        if (_task!.dueDate != null) ..[
          _buildInfoRow(
            icon: Icons.calendar_today,
            label: 'Due Date',
            value: formatDateTime(_task!.dueDate!),
            isOverdue: _task!.isOverdue,
          ),
          const SizedBox(height: 12),
        ],
        
        // Reminder
        if (_task!.reminderTime != null) ..[
          _buildInfoRow(
            icon: Icons.notifications,
            label: 'Reminder',
            value: formatDateTime(_task!.reminderTime!),
          ),
          const SizedBox(height: 12),
        ],
        
        // Category
        if (_task!.category.isNotEmpty) ..[
          _buildInfoRow(
            icon: Icons.category,
            label: 'Category',
            value: _task!.category,
          ),
          const SizedBox(height: 12),
        ],
        
        // Tags
        if (_task!.tags.isNotEmpty) ..[
          Text(
            'Tags',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _task!.tags.map((tag) => Chip(
              label: Text(tag),
              backgroundColor: Theme.of(context).colorScheme.surfaceVariant,
            )).toList(),
          ),
          const SizedBox(height: 16),
        ],
        
        // Progress
        if (_task!.subtasks.isNotEmpty) ..[
          Text(
            'Progress',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: _task!.progress,
            backgroundColor: Colors.grey[300],
            valueColor: AlwaysStoppedAnimation<Color>(
              Theme.of(context).colorScheme.primary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${(_task!.progress * 100).toInt()}% Complete',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 16),
        ],
        
        // Subtasks
        if (_task!.subtasks.isNotEmpty) ..[
          Text(
            'Subtasks',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          ...(_task!.subtasks.map((subtask) => ListTile(
            leading: Checkbox(
              value: subtask.isCompleted,
              onChanged: null, // Read-only in detail view
            ),
            title: Text(
              subtask.title,
              style: TextStyle(
                decoration: subtask.isCompleted ? TextDecoration.lineThrough : null,
                color: subtask.isCompleted ? Colors.grey : null,
              ),
            ),
            contentPadding: EdgeInsets.zero,
          ))),
          const SizedBox(height: 16),
        ],
        
        // Timestamps
        _buildInfoRow(
          icon: Icons.access_time,
          label: 'Created',
          value: formatDateTime(_task!.createdAt),
        ),
        const SizedBox(height: 8),
        _buildInfoRow(
          icon: Icons.update,
          label: 'Updated',
          value: formatDateTime(_task!.updatedAt),
        ),
      ],
    );
  }
  
  Widget _buildInfoRow({
    required IconData icon,
    required String label,
    required String value,
    bool isOverdue = false,
  }) {
    return Row(
      children: [
        Icon(
          icon,
          size: 16,
          color: isOverdue ? Colors.red : Colors.grey[600],
        ),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w500,
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: isOverdue ? Colors.red : null,
            ),
          ),
        ),
      ],
    );
  }
  
  Color _getStatusColor(TaskStatus status) {
    switch (status) {
      case TaskStatus.pending:
        return Colors.orange;
      case TaskStatus.inProgress:
        return Colors.blue;
      case TaskStatus.completed:
        return Colors.green;
      case TaskStatus.cancelled:
        return Colors.red;
    }
  }
  
  Color _getPriorityColor(TaskPriority priority) {
    switch (priority) {
      case TaskPriority.low:
        return Colors.green;
      case TaskPriority.medium:
        return Colors.orange;
      case TaskPriority.high:
        return Colors.red;
      case TaskPriority.urgent:
        return Colors.purple;
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Task Details'),
        actions: [
          if (_task != null) ..[
            IconButton(
              icon: const Icon(Icons.edit),
              onPressed: _editTask,
              tooltip: 'Edit Task',
            ),
            PopupMenuButton<String>(
              onSelected: (value) {
                switch (value) {
                  case 'delete':
                    _deleteTask();
                    break;
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'delete',
                  child: ListTile(
                    leading: Icon(Icons.delete, color: Colors.red),
                    title: Text('Delete Task'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
      body: LoadingOverlay(
        isLoading: _isLoading,
        child: _task == null
            ? const Center(
                child: Text('Task not found'),
              )
            : SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: _buildTaskInfo(),
              ),
      ),
      floatingActionButton: _task != null
          ? FloatingActionButton.extended(
              onPressed: _toggleComplete,
              icon: Icon(
                _task!.isCompleted ? Icons.undo : Icons.check,
              ),
              label: Text(
                _task!.isCompleted ? 'Mark Incomplete' : 'Mark Complete',
              ),
              backgroundColor: _task!.isCompleted
                  ? Colors.orange
                  : Colors.green,
            )
          : null,
    );
  }
}