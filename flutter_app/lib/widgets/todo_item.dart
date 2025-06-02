import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/todo.dart';

class TodoItem extends StatelessWidget {
  final Todo todo;
  final VoidCallback onToggle;
  final VoidCallback onDelete;
  final VoidCallback onEdit;
  
  const TodoItem({
    super.key,
    required this.todo,
    required this.onToggle,
    required this.onDelete,
    required this.onEdit,
  });
  
  @override
  Widget build(BuildContext context) {
    final isCompleted = todo.status == TodoStatus.completed;
    final isOverdue = todo.isOverdue;
    final isDueSoon = todo.isDueSoon;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Card(
        elevation: isCompleted ? 1 : 3,
        child: InkWell(
          onTap: onEdit,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    // 完成状态复选框
                    GestureDetector(
                      onTap: onToggle,
                      child: Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isCompleted 
                                ? Theme.of(context).colorScheme.primary
                                : Colors.grey,
                            width: 2,
                          ),
                          color: isCompleted 
                              ? Theme.of(context).colorScheme.primary
                              : Colors.transparent,
                        ),
                        child: isCompleted
                            ? const Icon(
                                Icons.check,
                                size: 16,
                                color: Colors.white,
                              )
                            : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    
                    // 标题和描述
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            todo.title,
                            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              decoration: isCompleted 
                                  ? TextDecoration.lineThrough
                                  : null,
                              color: isCompleted
                                  ? Theme.of(context).colorScheme.onSurface.withOpacity(0.6)
                                  : null,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (todo.description != null && todo.description!.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                todo.description!,
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  decoration: isCompleted 
                                      ? TextDecoration.lineThrough
                                      : null,
                                  color: isCompleted
                                      ? Theme.of(context).colorScheme.onSurface.withOpacity(0.4)
                                      : Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                        ],
                      ),
                    ),
                    
                    // 优先级指示器
                    Container(
                      width: 4,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Todo.getPriorityColor(todo.priority),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    
                    const SizedBox(width: 8),
                    
                    // 更多操作按钮
                    PopupMenuButton<String>(
                      icon: Icon(
                        Icons.more_vert,
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                      ),
                      onSelected: (value) {
                        switch (value) {
                          case 'edit':
                            onEdit();
                            break;
                          case 'delete':
                            onDelete();
                            break;
                        }
                      },
                      itemBuilder: (context) => [
                        const PopupMenuItem(
                          value: 'edit',
                          child: Row(
                            children: [
                              Icon(Icons.edit, size: 18),
                              SizedBox(width: 8),
                              Text('编辑'),
                            ],
                          ),
                        ),
                        const PopupMenuItem(
                          value: 'delete',
                          child: Row(
                            children: [
                              Icon(Icons.delete, size: 18, color: Colors.red),
                              SizedBox(width: 8),
                              Text('删除', style: TextStyle(color: Colors.red)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                
                // 底部信息栏
                if (_shouldShowBottomInfo())
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Row(
                      children: [
                        // 分类标签
                        if (todo.category != null && todo.category!.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              todo.category!,
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Theme.of(context).colorScheme.primary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        
                        if (todo.category != null && todo.category!.isNotEmpty && todo.dueDate != null)
                          const SizedBox(width: 8),
                        
                        // 截止日期
                        if (todo.dueDate != null)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: _getDueDateColor(context).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.schedule,
                                  size: 12,
                                  color: _getDueDateColor(context),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  _formatDueDate(),
                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: _getDueDateColor(context),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        
                        const Spacer(),
                        
                        // 优先级标签
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Todo.getPriorityColor(todo.priority).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            Todo.getPriorityText(todo.priority),
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Todo.getPriorityColor(todo.priority),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
  
  bool _shouldShowBottomInfo() {
    return todo.category != null && todo.category!.isNotEmpty ||
           todo.dueDate != null;
  }
  
  Color _getDueDateColor(BuildContext context) {
    if (todo.isOverdue) {
      return Colors.red;
    } else if (todo.isDueSoon) {
      return Colors.orange;
    } else {
      return Theme.of(context).colorScheme.primary;
    }
  }
  
  String _formatDueDate() {
    if (todo.dueDate == null) return '';
    
    final now = DateTime.now();
    final dueDate = todo.dueDate!;
    final difference = dueDate.difference(now);
    
    if (difference.inDays == 0) {
      return '今天';
    } else if (difference.inDays == 1) {
      return '明天';
    } else if (difference.inDays == -1) {
      return '昨天';
    } else if (difference.inDays < 0) {
      return '已过期';
    } else if (difference.inDays <= 7) {
      return '${difference.inDays}天后';
    } else {
      return DateFormat('MM/dd').format(dueDate);
    }
  }
}