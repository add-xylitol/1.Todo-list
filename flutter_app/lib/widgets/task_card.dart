import 'package:flutter/material.dart';
import '../models/task.dart';
import '../utils/constants.dart';
import '../utils/helpers.dart';

class TaskCard extends StatelessWidget {
  final Task task;
  final VoidCallback? onTap;
  final VoidCallback? onToggleComplete;
  final VoidCallback? onDelete;
  final VoidCallback? onEdit;
  final bool showActions;
  final bool compact;
  
  const TaskCard({
    Key? key,
    required this.task,
    this.onTap,
    this.onToggleComplete,
    this.onDelete,
    this.onEdit,
    this.showActions = true,
    this.compact = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    // Determine card colors based on task status and priority
    Color cardColor = colorScheme.surface;
    Color borderColor = colorScheme.outline.withOpacity(0.2);
    
    if (task.isCompleted) {
      cardColor = colorScheme.surfaceVariant.withOpacity(0.5);
    } else if (task.isOverdue) {
      borderColor = colorScheme.error.withOpacity(0.5);
    } else if (task.priority == TaskPriority.high) {
      borderColor = colorScheme.error.withOpacity(0.3);
    } else if (task.priority == TaskPriority.medium) {
      borderColor = Colors.orange.withOpacity(0.3);
    }
    
    return Card(
      margin: compact 
          ? const EdgeInsets.symmetric(horizontal: 8, vertical: 4)
          : const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      elevation: task.isCompleted ? 1 : 2,
      color: cardColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: borderColor,
          width: 1,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: compact 
              ? const EdgeInsets.all(12)
              : const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header row with checkbox and actions
              Row(
                children: [
                  // Completion checkbox
                  GestureDetector(
                    onTap: onToggleComplete,
                    child: Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: task.isCompleted
                              ? colorScheme.primary
                              : colorScheme.outline,
                          width: 2,
                        ),
                        color: task.isCompleted
                            ? colorScheme.primary
                            : Colors.transparent,
                      ),
                      child: task.isCompleted
                          ? Icon(
                              Icons.check,
                              size: 16,
                              color: colorScheme.onPrimary,
                            )
                          : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  
                  // Task title
                  Expanded(
                    child: Text(
                      task.title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        decoration: task.isCompleted
                            ? TextDecoration.lineThrough
                            : null,
                        color: task.isCompleted
                            ? colorScheme.onSurface.withOpacity(0.6)
                            : colorScheme.onSurface,
                      ),
                      maxLines: compact ? 1 : 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  
                  // Priority indicator
                  if (task.priority != TaskPriority.low)
                    Container(
                      width: 8,
                      height: 8,
                      margin: const EdgeInsets.only(left: 8),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _getPriorityColor(task.priority, colorScheme),
                      ),
                    ),
                  
                  // Actions menu
                  if (showActions)
                    PopupMenuButton<String>(
                      icon: Icon(
                        Icons.more_vert,
                        color: colorScheme.onSurfaceVariant,
                        size: 20,
                      ),
                      onSelected: (value) {
                        switch (value) {
                          case 'edit':
                            onEdit?.call();
                            break;
                          case 'delete':
                            onDelete?.call();
                            break;
                        }
                      },
                      itemBuilder: (context) => [
                        PopupMenuItem(
                          value: 'edit',
                          child: Row(
                            children: [
                              Icon(Icons.edit, size: 18, color: colorScheme.onSurface),
                              const SizedBox(width: 8),
                              const Text('Edit'),
                            ],
                          ),
                        ),
                        PopupMenuItem(
                          value: 'delete',
                          child: Row(
                            children: [
                              Icon(Icons.delete, size: 18, color: colorScheme.error),
                              const SizedBox(width: 8),
                              Text('Delete', style: TextStyle(color: colorScheme.error)),
                            ],
                          ),
                        ),
                      ],
                    ),
                ],
              ),
              
              // Task description
              if (task.description.isNotEmpty && !compact) ..[
                const SizedBox(height: 8),
                Text(
                  task.description,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: task.isCompleted
                        ? colorScheme.onSurface.withOpacity(0.5)
                        : colorScheme.onSurfaceVariant,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              
              // Task metadata
              if (!compact) ..[
                const SizedBox(height: 12),
                Row(
                  children: [
                    // Category
                    if (task.category.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: colorScheme.primaryContainer,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          task.category,
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: colorScheme.onPrimaryContainer,
                          ),
                        ),
                      ),
                    
                    const Spacer(),
                    
                    // Due date
                    if (task.dueDate != null)
                      Row(
                        children: [
                          Icon(
                            Icons.schedule,
                            size: 16,
                            color: task.isOverdue
                                ? colorScheme.error
                                : colorScheme.onSurfaceVariant,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            task.dueDate!.friendlyDate(),
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: task.isOverdue
                                  ? colorScheme.error
                                  : colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ],
              
              // Tags (compact view)
              if (compact && task.tags.isNotEmpty) ..[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 4,
                  children: task.tags.take(3).map((tag) => Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: colorScheme.secondaryContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      tag,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colorScheme.onSecondaryContainer,
                      ),
                    ),
                  )).toList(),
                ),
              ],
              
              // Progress indicator for subtasks
              if (task.subtasks.isNotEmpty && !compact) ..[
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(
                      Icons.checklist,
                      size: 16,
                      color: colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${task.completedSubtasks}/${task.subtasks.length}',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: LinearProgressIndicator(
                        value: task.subtasks.isEmpty
                            ? 0
                            : task.completedSubtasks / task.subtasks.length,
                        backgroundColor: colorScheme.surfaceVariant,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          colorScheme.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
  
  Color _getPriorityColor(TaskPriority priority, ColorScheme colorScheme) {
    switch (priority) {
      case TaskPriority.high:
        return colorScheme.error;
      case TaskPriority.medium:
        return Colors.orange;
      case TaskPriority.low:
      default:
        return colorScheme.primary;
    }
  }
}

// Compact task card for list views
class CompactTaskCard extends StatelessWidget {
  final Task task;
  final VoidCallback? onTap;
  final VoidCallback? onToggleComplete;
  
  const CompactTaskCard({
    Key? key,
    required this.task,
    this.onTap,
    this.onToggleComplete,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return TaskCard(
      task: task,
      onTap: onTap,
      onToggleComplete: onToggleComplete,
      showActions: false,
      compact: true,
    );
  }
}

// Task card for today's tasks
class TodayTaskCard extends StatelessWidget {
  final Task task;
  final VoidCallback? onTap;
  final VoidCallback? onToggleComplete;
  final VoidCallback? onSnooze;
  
  const TodayTaskCard({
    Key? key,
    required this.task,
    this.onTap,
    this.onToggleComplete,
    this.onSnooze,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      elevation: 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
      ),
      child: ListTile(
        leading: GestureDetector(
          onTap: onToggleComplete,
          child: Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: task.isCompleted
                    ? colorScheme.primary
                    : colorScheme.outline,
                width: 2,
              ),
              color: task.isCompleted
                  ? colorScheme.primary
                  : Colors.transparent,
            ),
            child: task.isCompleted
                ? Icon(
                    Icons.check,
                    size: 12,
                    color: colorScheme.onPrimary,
                  )
                : null,
          ),
        ),
        title: Text(
          task.title,
          style: theme.textTheme.bodyMedium?.copyWith(
            decoration: task.isCompleted
                ? TextDecoration.lineThrough
                : null,
            color: task.isCompleted
                ? colorScheme.onSurface.withOpacity(0.6)
                : colorScheme.onSurface,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: task.dueDate != null
            ? Text(
                task.dueDate!.relativeTime(),
                style: theme.textTheme.labelSmall?.copyWith(
                  color: task.isOverdue
                      ? colorScheme.error
                      : colorScheme.onSurfaceVariant,
                ),
              )
            : null,
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (task.priority != TaskPriority.low)
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _getPriorityColor(task.priority, colorScheme),
                ),
              ),
            if (onSnooze != null && !task.isCompleted) ..[
              const SizedBox(width: 8),
              IconButton(
                icon: Icon(
                  Icons.snooze,
                  size: 18,
                  color: colorScheme.onSurfaceVariant,
                ),
                onPressed: onSnooze,
                constraints: const BoxConstraints(
                  minWidth: 32,
                  minHeight: 32,
                ),
              ),
            ],
          ],
        ),
        onTap: onTap,
      ),
    );
  }
  
  Color _getPriorityColor(TaskPriority priority, ColorScheme colorScheme) {
    switch (priority) {
      case TaskPriority.high:
        return colorScheme.error;
      case TaskPriority.medium:
        return Colors.orange;
      case TaskPriority.low:
      default:
        return colorScheme.primary;
    }
  }
}