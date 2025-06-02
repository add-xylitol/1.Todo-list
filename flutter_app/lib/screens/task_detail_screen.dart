import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/task_provider.dart';
import '../models/task.dart';
import '../widgets/custom_button.dart';
import '../utils/helpers.dart';
import '../utils/constants.dart';
import 'add_task_screen.dart';

class TaskDetailScreen extends StatefulWidget {
  final String taskId;
  
  const TaskDetailScreen({Key? key, required this.taskId}) : super(key: key);

  @override
  State<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends State<TaskDetailScreen> {
  Task? _task;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadTask();
  }

  Future<void> _loadTask() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    
    try {
      final taskProvider = Provider.of<TaskProvider>(context, listen: false);
      final task = await taskProvider.getTaskById(widget.taskId);
      
      if (mounted) {
        setState(() {
          _task = task;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
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
            ),
            PopupMenuButton<String>(
              onSelected: _handleMenuAction,
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 'toggle_complete',
                  child: ListTile(
                    leading: Icon(
                      _task!.completed ? Icons.undo : Icons.check_circle,
                    ),
                    title: Text(
                      _task!.completed ? 'Mark as Incomplete' : 'Mark as Complete',
                    ),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                const PopupMenuItem(
                  value: 'duplicate',
                  child: ListTile(
                    leading: Icon(Icons.copy),
                    title: Text('Duplicate'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                const PopupMenuItem(
                  value: 'share',
                  child: ListTile(
                    leading: Icon(Icons.share),
                    title: Text('Share'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                const PopupMenuItem(
                  value: 'delete',
                  child: ListTile(
                    leading: Icon(Icons.delete, color: Colors.red),
                    title: Text('Delete', style: TextStyle(color: Colors.red)),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
      body: _buildBody(),
      floatingActionButton: _task != null && !_task!.completed
          ? FloatingActionButton(
              onPressed: _toggleComplete,
              child: const Icon(Icons.check),
              tooltip: 'Mark as Complete',
            )
          : null,
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }
    
    if (_error != null) {
      return _buildErrorWidget();
    }
    
    if (_task == null) {
      return _buildNotFoundWidget();
    }
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildTaskHeader(),
          const SizedBox(height: 24),
          _buildTaskInfo(),
          const SizedBox(height: 24),
          if (_task!.description != null) ..[
            _buildDescriptionSection(),
            const SizedBox(height: 24),
          ],
          if (_task!.subtasks.isNotEmpty) ..[
            _buildSubtasksSection(),
            const SizedBox(height: 24),
          ],
          if (_task!.tags.isNotEmpty) ..[
            _buildTagsSection(),
            const SizedBox(height: 24),
          ],
          if (_task!.attachments.isNotEmpty) ..[
            _buildAttachmentsSection(),
            const SizedBox(height: 24),
          ],
          _buildAdditionalInfo(),
          const SizedBox(height: 24),
          _buildTimestamps(),
          const SizedBox(height: 32),
          _buildActionButtons(),
        ],
      ),
    );
  }

  Widget _buildTaskHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                _task!.title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      decoration: _task!.completed
                          ? TextDecoration.lineThrough
                          : null,
                    ),
              ),
            ),
            const SizedBox(width: 16),
            _buildPriorityChip(),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Icon(
              _task!.completed ? Icons.check_circle : Icons.radio_button_unchecked,
              color: _task!.completed ? Colors.green : Colors.grey,
              size: 20,
            ),
            const SizedBox(width: 8),
            Text(
              _task!.completed ? 'Completed' : 'Pending',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: _task!.completed ? Colors.green : Colors.grey,
                    fontWeight: FontWeight.w500,
                  ),
            ),
            if (_task!.category != null) ..[
              const SizedBox(width: 16),
              Chip(
                label: Text(_task!.category!),
                backgroundColor: Theme.of(context).colorScheme.surfaceVariant,
              ),
            ],
          ],
        ),
      ],
    );
  }

  Widget _buildPriorityChip() {
    final priority = _task!.priority;
    Color color;
    IconData icon;
    
    switch (priority) {
      case TaskPriority.low:
        color = Colors.green;
        icon = Icons.keyboard_arrow_down;
        break;
      case TaskPriority.medium:
        color = Colors.orange;
        icon = Icons.remove;
        break;
      case TaskPriority.high:
        color = Colors.red;
        icon = Icons.keyboard_arrow_up;
        break;
      case TaskPriority.urgent:
        color = Colors.purple;
        icon = Icons.priority_high;
        break;
    }
    
    return Chip(
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 4),
          Text(
            priority.toString().split('.').last.toUpperCase(),
            style: TextStyle(color: color, fontWeight: FontWeight.bold),
          ),
        ],
      ),
      backgroundColor: color.withOpacity(0.1),
      side: BorderSide(color: color),
    );
  }

  Widget _buildTaskInfo() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            if (_task!.dueDate != null)
              _buildInfoRow(
                icon: Icons.calendar_today,
                label: 'Due Date',
                value: DateHelper.formatDateTime(_task!.dueDate!),
                isOverdue: _task!.isOverdue,
              ),
            if (_task!.reminderTime != null) ..[
              const Divider(),
              _buildInfoRow(
                icon: Icons.notifications,
                label: 'Reminder',
                value: DateHelper.formatDateTime(_task!.reminderTime!),
              ),
            ],
            if (_task!.estimatedTime != null) ..[
              const Divider(),
              _buildInfoRow(
                icon: Icons.timer,
                label: 'Estimated Time',
                value: '${_task!.estimatedTime} minutes',
              ),
            ],
            if (_task!.actualTime != null) ..[
              const Divider(),
              _buildInfoRow(
                icon: Icons.timer_outlined,
                label: 'Actual Time',
                value: '${_task!.actualTime} minutes',
              ),
            ],
            if (_task!.location != null) ..[
              const Divider(),
              _buildInfoRow(
                icon: Icons.location_on,
                label: 'Location',
                value: _task!.location!,
              ),
            ],
            if (_task!.url != null) ..[
              const Divider(),
              _buildInfoRow(
                icon: Icons.link,
                label: 'URL',
                value: _task!.url!,
                isLink: true,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String label,
    required String value,
    bool isOverdue = false,
    bool isLink = false,
  }) {
    return Row(
      children: [
        Icon(
          icon,
          size: 20,
          color: isOverdue
              ? Colors.red
              : Theme.of(context).colorScheme.primary,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: Theme.of(context).textTheme.labelMedium,
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: isOverdue ? Colors.red : null,
                      decoration: isLink ? TextDecoration.underline : null,
                    ),
              ),
            ],
          ),
        ),
        if (isLink)
          IconButton(
            icon: const Icon(Icons.open_in_new, size: 16),
            onPressed: () {
              // TODO: Open URL
              SnackBarHelper.showInfo(context, 'Opening URL: $value');
            },
          ),
      ],
    );
  }

  Widget _buildDescriptionSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Description',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 8),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              _task!.description!,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSubtasksSection() {
    final completedCount = _task!.subtasks.where((s) => s.completed).length;
    final totalCount = _task!.subtasks.length;
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Subtasks',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            Text(
              '$completedCount/$totalCount completed',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.outline,
                  ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        LinearProgressIndicator(
          value: totalCount > 0 ? completedCount / totalCount : 0,
          backgroundColor: Theme.of(context).colorScheme.surfaceVariant,
        ),
        const SizedBox(height: 16),
        Card(
          child: Column(
            children: _task!.subtasks.asMap().entries.map((entry) {
              final index = entry.key;
              final subtask = entry.value;
              return ListTile(
                leading: Checkbox(
                  value: subtask.completed,
                  onChanged: (value) => _toggleSubtask(index, value ?? false),
                ),
                title: Text(
                  subtask.title,
                  style: subtask.completed
                      ? const TextStyle(decoration: TextDecoration.lineThrough)
                      : null,
                ),
                trailing: subtask.completed
                    ? Icon(
                        Icons.check_circle,
                        color: Colors.green,
                        size: 20,
                      )
                    : null,
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildTagsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Tags',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
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
      ],
    );
  }

  Widget _buildAttachmentsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Attachments',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 8),
        Card(
          child: Column(
            children: _task!.attachments.map((attachment) {
              return ListTile(
                leading: Icon(_getAttachmentIcon(attachment.type)),
                title: Text(attachment.name),
                subtitle: Text(
                  '${_formatFileSize(attachment.size)} • ${attachment.type}',
                ),
                trailing: IconButton(
                  icon: const Icon(Icons.download),
                  onPressed: () {
                    // TODO: Download attachment
                    SnackBarHelper.showInfo(
                      context,
                      'Downloading ${attachment.name}',
                    );
                  },
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildAdditionalInfo() {
    if (_task!.notes == null && _task!.recurrence == null) {
      return const SizedBox.shrink();
    }
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Additional Information',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 8),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_task!.notes != null) ..[
                  Text(
                    'Notes',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _task!.notes!,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
                if (_task!.recurrence != null) ..[
                  if (_task!.notes != null) const SizedBox(height: 16),
                  Text(
                    'Recurrence',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _getRecurrenceDescription(_task!.recurrence!),
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTimestamps() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Timestamps',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            _buildTimestampRow(
              'Created',
              DateHelper.formatDateTime(_task!.createdAt),
            ),
            _buildTimestampRow(
              'Last Modified',
              DateHelper.formatDateTime(_task!.lastModified),
            ),
            if (_task!.completedAt != null)
              _buildTimestampRow(
                'Completed',
                DateHelper.formatDateTime(_task!.completedAt!),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimestampRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall,
          ),
          Text(
            value,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.outline,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    return Column(
      children: [
        if (!_task!.completed)
          PrimaryButton(
            text: 'Mark as Complete',
            onPressed: _toggleComplete,
            icon: Icons.check_circle,
            fullWidth: true,
          )
        else
          SecondaryButton(
            text: 'Mark as Incomplete',
            onPressed: _toggleComplete,
            icon: Icons.undo,
            fullWidth: true,
          ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: SecondaryButton(
                text: 'Edit',
                onPressed: _editTask,
                icon: Icons.edit,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: DangerButton(
                text: 'Delete',
                onPressed: _deleteTask,
                icon: Icons.delete,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildErrorWidget() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.error_outline,
            size: 64,
            color: Colors.red,
          ),
          const SizedBox(height: 16),
          Text(
            'Error loading task',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            _error!,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.outline,
                ),
          ),
          const SizedBox(height: 24),
          PrimaryButton(
            text: 'Retry',
            onPressed: _loadTask,
            icon: Icons.refresh,
          ),
        ],
      ),
    );
  }

  Widget _buildNotFoundWidget() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.search_off,
            size: 64,
            color: Colors.grey,
          ),
          const SizedBox(height: 16),
          Text(
            'Task not found',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'The task you\'re looking for doesn\'t exist or has been deleted.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.outline,
                ),
          ),
          const SizedBox(height: 24),
          PrimaryButton(
            text: 'Go Back',
            onPressed: () => Navigator.of(context).pop(),
            icon: Icons.arrow_back,
          ),
        ],
      ),
    );
  }

  IconData _getAttachmentIcon(String type) {
    switch (type.toLowerCase()) {
      case 'pdf':
        return Icons.picture_as_pdf;
      case 'doc':
      case 'docx':
        return Icons.description;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return Icons.image;
      case 'mp4':
      case 'avi':
      case 'mov':
        return Icons.video_file;
      case 'mp3':
      case 'wav':
      case 'aac':
        return Icons.audio_file;
      default:
        return Icons.attach_file;
    }
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  String _getRecurrenceDescription(RecurrenceRule rule) {
    switch (rule.type) {
      case RecurrenceType.daily:
        return 'Daily';
      case RecurrenceType.weekly:
        return 'Weekly';
      case RecurrenceType.monthly:
        return 'Monthly';
      case RecurrenceType.yearly:
        return 'Yearly';
      case RecurrenceType.custom:
        return 'Custom: ${rule.interval} ${rule.type.toString().split('.').last}';
    }
  }

  void _handleMenuAction(String action) {
    switch (action) {
      case 'toggle_complete':
        _toggleComplete();
        break;
      case 'duplicate':
        _duplicateTask();
        break;
      case 'share':
        _shareTask();
        break;
      case 'delete':
        _deleteTask();
        break;
    }
  }

  Future<void> _toggleComplete() async {
    try {
      final taskProvider = Provider.of<TaskProvider>(context, listen: false);
      await taskProvider.toggleTaskComplete(_task!.id);
      
      // Reload task to get updated data
      await _loadTask();
      
      if (mounted) {
        SnackBarHelper.showSuccess(
          context,
          _task!.completed ? 'Task completed!' : 'Task marked as incomplete',
        );
      }
    } catch (e) {
      if (mounted) {
        SnackBarHelper.showError(
          context,
          'Failed to update task: $e',
        );
      }
    }
  }

  Future<void> _toggleSubtask(int index, bool completed) async {
    try {
      final updatedSubtasks = List<Subtask>.from(_task!.subtasks);
      updatedSubtasks[index] = updatedSubtasks[index].copyWith(
        completed: completed,
      );
      
      final updatedTask = _task!.copyWith(
        subtasks: updatedSubtasks,
        lastModified: DateTime.now(),
      );
      
      final taskProvider = Provider.of<TaskProvider>(context, listen: false);
      await taskProvider.updateTask(updatedTask);
      
      setState(() {
        _task = updatedTask;
      });
      
      if (mounted) {
        SnackBarHelper.showSuccess(
          context,
          completed ? 'Subtask completed!' : 'Subtask marked as incomplete',
        );
      }
    } catch (e) {
      if (mounted) {
        SnackBarHelper.showError(
          context,
          'Failed to update subtask: $e',
        );
      }
    }
  }

  void _editTask() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => AddTaskScreen(task: _task),
      ),
    ).then((_) {
      // Reload task after editing
      _loadTask();
    });
  }

  void _duplicateTask() {
    final duplicatedTask = _task!.copyWith(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: '${_task!.title} (Copy)',
      completed: false,
      createdAt: DateTime.now(),
      lastModified: DateTime.now(),
      completedAt: null,
      version: 1,
    );
    
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => AddTaskScreen(task: duplicatedTask),
      ),
    );
  }

  void _shareTask() {
    final taskText = '''
Task: ${_task!.title}
${_task!.description != null ? 'Description: ${_task!.description}\n' : ''}${_task!.dueDate != null ? 'Due: ${DateHelper.formatDateTime(_task!.dueDate!)}\n' : ''}Priority: ${_task!.priority.toString().split('.').last.toUpperCase()}
Status: ${_task!.completed ? 'Completed' : 'Pending'}
''';
    
    // TODO: Implement actual sharing
    SnackBarHelper.showInfo(
      context,
      'Sharing: $taskText',
    );
  }

  Future<void> _deleteTask() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Task'),
        content: Text('Are you sure you want to delete "${_task!.title}"?'),
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
        final taskProvider = Provider.of<TaskProvider>(context, listen: false);
        await taskProvider.deleteTask(_task!.id);
        
        if (mounted) {
          SnackBarHelper.showSuccess(
            context,
            'Task deleted successfully',
          );
          Navigator.of(context).pop();
        }
      } catch (e) {
        if (mounted) {
          SnackBarHelper.showError(
            context,
            'Failed to delete task: $e',
          );
        }
      }
    }
  }
}