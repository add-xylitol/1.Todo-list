import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/task_provider.dart';
import '../models/task.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_text_field.dart';
import '../utils/helpers.dart';
import '../utils/constants.dart';

class AddTaskScreen extends StatefulWidget {
  final Task? task;
  
  const AddTaskScreen({Key? key, this.task}) : super(key: key);

  @override
  State<AddTaskScreen> createState() => _AddTaskScreenState();
}

class _AddTaskScreenState extends State<AddTaskScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _notesController = TextEditingController();
  final _locationController = TextEditingController();
  final _urlController = TextEditingController();
  
  TaskPriority _selectedPriority = TaskPriority.medium;
  String _selectedCategory = 'Personal';
  DateTime? _selectedDueDate;
  TimeOfDay? _selectedDueTime;
  DateTime? _selectedReminderTime;
  List<String> _tags = [];
  List<Subtask> _subtasks = [];
  RecurrenceRule? _recurrenceRule;
  int? _estimatedTime;
  
  bool _isLoading = false;
  bool _isEditing = false;
  
  final List<String> _availableCategories = [
    'Personal',
    'Work',
    'Shopping',
    'Health',
    'Education',
    'Finance',
    'Travel',
    'Home',
    'Other',
  ];
  
  final List<String> _availableTags = [
    'urgent',
    'important',
    'quick',
    'meeting',
    'call',
    'email',
    'research',
    'review',
    'planning',
    'creative',
  ];

  @override
  void initState() {
    super.initState();
    _isEditing = widget.task != null;
    if (_isEditing) {
      _populateFields();
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _notesController.dispose();
    _locationController.dispose();
    _urlController.dispose();
    super.dispose();
  }

  void _populateFields() {
    final task = widget.task!;
    _titleController.text = task.title;
    _descriptionController.text = task.description ?? '';
    _notesController.text = task.notes ?? '';
    _locationController.text = task.location ?? '';
    _urlController.text = task.url ?? '';
    _selectedPriority = task.priority;
    _selectedCategory = task.category ?? 'Personal';
    _selectedDueDate = task.dueDate;
    _selectedReminderTime = task.reminderTime;
    _tags = List.from(task.tags);
    _subtasks = List.from(task.subtasks);
    _recurrenceRule = task.recurrence;
    _estimatedTime = task.estimatedTime;
    
    if (task.dueDate != null) {
      _selectedDueTime = TimeOfDay.fromDateTime(task.dueDate!);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Edit Task' : 'Add Task'),
        actions: [
          if (_isEditing)
            IconButton(
              icon: const Icon(Icons.delete),
              onPressed: _deleteTask,
            ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildBasicInfo(),
              const SizedBox(height: 24),
              _buildPriorityAndCategory(),
              const SizedBox(height: 24),
              _buildDateAndTime(),
              const SizedBox(height: 24),
              _buildTagsSection(),
              const SizedBox(height: 24),
              _buildSubtasksSection(),
              const SizedBox(height: 24),
              _buildAdditionalInfo(),
              const SizedBox(height: 32),
              _buildActionButtons(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBasicInfo() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Basic Information',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 16),
        CustomTextField(
          controller: _titleController,
          labelText: 'Title',
          hintText: 'Enter task title',
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Please enter a title';
            }
            return null;
          },
          maxLength: 100,
        ),
        const SizedBox(height: 16),
        MultilineTextField(
          controller: _descriptionController,
          labelText: 'Description',
          hintText: 'Enter task description (optional)',
          maxLines: 3,
          maxLength: 500,
        ),
      ],
    );
  }

  Widget _buildPriorityAndCategory() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Priority & Category',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Priority',
                    style: Theme.of(context).textTheme.labelMedium,
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<TaskPriority>(
                    value: _selectedPriority,
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                    ),
                    items: TaskPriority.values.map((priority) {
                      return DropdownMenuItem(
                        value: priority,
                        child: Row(
                          children: [
                            Icon(
                              _getPriorityIcon(priority),
                              color: _getPriorityColor(priority),
                              size: 16,
                            ),
                            const SizedBox(width: 8),
                            Text(_getPriorityName(priority)),
                          ],
                        ),
                      );
                    }).toList(),
                    onChanged: (value) {
                      if (value != null) {
                        setState(() {
                          _selectedPriority = value;
                        });
                      }
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Category',
                    style: Theme.of(context).textTheme.labelMedium,
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _selectedCategory,
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                    ),
                    items: _availableCategories.map((category) {
                      return DropdownMenuItem(
                        value: category,
                        child: Text(category),
                      );
                    }).toList(),
                    onChanged: (value) {
                      if (value != null) {
                        setState(() {
                          _selectedCategory = value;
                        });
                      }
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildDateAndTime() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Date & Time',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildDateTimeField(
                label: 'Due Date',
                value: _selectedDueDate != null
                    ? DateHelper.formatDate(_selectedDueDate!)
                    : null,
                onTap: _selectDueDate,
                icon: Icons.calendar_today,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildDateTimeField(
                label: 'Due Time',
                value: _selectedDueTime != null
                    ? _selectedDueTime!.format(context)
                    : null,
                onTap: _selectDueTime,
                icon: Icons.access_time,
                enabled: _selectedDueDate != null,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _buildDateTimeField(
          label: 'Reminder',
          value: _selectedReminderTime != null
              ? DateHelper.formatDateTime(_selectedReminderTime!)
              : null,
          onTap: _selectReminderTime,
          icon: Icons.notifications,
        ),
      ],
    );
  }

  Widget _buildDateTimeField({
    required String label,
    required String? value,
    required VoidCallback onTap,
    required IconData icon,
    bool enabled = true,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.labelMedium,
        ),
        const SizedBox(height: 8),
        InkWell(
          onTap: enabled ? onTap : null,
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 16,
            ),
            decoration: BoxDecoration(
              border: Border.all(
                color: enabled
                    ? Theme.of(context).colorScheme.outline
                    : Theme.of(context).colorScheme.outline.withOpacity(0.5),
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(
                  icon,
                  size: 16,
                  color: enabled
                      ? Theme.of(context).colorScheme.onSurface
                      : Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    value ?? 'Select $label',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: value != null
                              ? (enabled
                                  ? Theme.of(context).colorScheme.onSurface
                                  : Theme.of(context)
                                      .colorScheme
                                      .onSurface
                                      .withOpacity(0.5))
                              : Theme.of(context).colorScheme.outline,
                        ),
                  ),
                ),
                if (value != null)
                  InkWell(
                    onTap: enabled
                        ? () {
                            setState(() {
                              if (label == 'Due Date') {
                                _selectedDueDate = null;
                                _selectedDueTime = null;
                              } else if (label == 'Due Time') {
                                _selectedDueTime = null;
                              } else if (label == 'Reminder') {
                                _selectedReminderTime = null;
                              }
                            });
                          }
                        : null,
                    child: Icon(
                      Icons.clear,
                      size: 16,
                      color: enabled
                          ? Theme.of(context).colorScheme.outline
                          : Theme.of(context)
                              .colorScheme
                              .outline
                              .withOpacity(0.5),
                    ),
                  ),
              ],
            ),
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
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            ..._tags.map((tag) => Chip(
                  label: Text(tag),
                  onDeleted: () {
                    setState(() {
                      _tags.remove(tag);
                    });
                  },
                )),
            ActionChip(
              label: const Text('Add Tag'),
              onPressed: _showAddTagDialog,
              avatar: const Icon(Icons.add, size: 16),
            ),
          ],
        ),
        if (_availableTags.isNotEmpty) ..[
          const SizedBox(height: 8),
          Text(
            'Suggested Tags:',
            style: Theme.of(context).textTheme.labelSmall,
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: _availableTags
                .where((tag) => !_tags.contains(tag))
                .map((tag) => ActionChip(
                      label: Text(tag),
                      onPressed: () {
                        setState(() {
                          _tags.add(tag);
                        });
                      },
                      backgroundColor:
                          Theme.of(context).colorScheme.surfaceVariant,
                    ))
                .toList(),
          ),
        ],
      ],
    );
  }

  Widget _buildSubtasksSection() {
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
            TextButton.icon(
              onPressed: _addSubtask,
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Add'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (_subtasks.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border.all(
                color: Theme.of(context).colorScheme.outline.withOpacity(0.5),
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.info_outline,
                  size: 16,
                  color: Theme.of(context).colorScheme.outline,
                ),
                const SizedBox(width: 8),
                Text(
                  'No subtasks added yet',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.outline,
                      ),
                ),
              ],
            ),
          )
        else
          Column(
            children: _subtasks.asMap().entries.map((entry) {
              final index = entry.key;
              final subtask = entry.value;
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: Checkbox(
                    value: subtask.completed,
                    onChanged: (value) {
                      setState(() {
                        _subtasks[index] = subtask.copyWith(
                          completed: value ?? false,
                        );
                      });
                    },
                  ),
                  title: Text(
                    subtask.title,
                    style: subtask.completed
                        ? const TextStyle(decoration: TextDecoration.lineThrough)
                        : null,
                  ),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline),
                    onPressed: () {
                      setState(() {
                        _subtasks.removeAt(index);
                      });
                    },
                  ),
                ),
              );
            }).toList(),
          ),
      ],
    );
  }

  Widget _buildAdditionalInfo() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Additional Information',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: CustomTextField(
                controller: _locationController,
                labelText: 'Location',
                hintText: 'Enter location (optional)',
                prefixIcon: Icons.location_on,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: CustomTextField(
                controller: _urlController,
                labelText: 'URL',
                hintText: 'Enter URL (optional)',
                prefixIcon: Icons.link,
                keyboardType: TextInputType.url,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        MultilineTextField(
          controller: _notesController,
          labelText: 'Notes',
          hintText: 'Enter additional notes (optional)',
          maxLines: 3,
          maxLength: 500,
        ),
      ],
    );
  }

  Widget _buildActionButtons() {
    return Column(
      children: [
        PrimaryButton(
          text: _isEditing ? 'Update Task' : 'Create Task',
          onPressed: _isLoading ? null : _saveTask,
          isLoading: _isLoading,
          fullWidth: true,
        ),
        const SizedBox(height: 12),
        SecondaryButton(
          text: 'Cancel',
          onPressed: _isLoading ? null : () => Navigator.of(context).pop(),
          fullWidth: true,
        ),
      ],
    );
  }

  IconData _getPriorityIcon(TaskPriority priority) {
    switch (priority) {
      case TaskPriority.low:
        return Icons.keyboard_arrow_down;
      case TaskPriority.medium:
        return Icons.remove;
      case TaskPriority.high:
        return Icons.keyboard_arrow_up;
      case TaskPriority.urgent:
        return Icons.priority_high;
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

  String _getPriorityName(TaskPriority priority) {
    switch (priority) {
      case TaskPriority.low:
        return 'Low';
      case TaskPriority.medium:
        return 'Medium';
      case TaskPriority.high:
        return 'High';
      case TaskPriority.urgent:
        return 'Urgent';
    }
  }

  Future<void> _selectDueDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDueDate ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
    );
    
    if (date != null) {
      setState(() {
        _selectedDueDate = date;
        // Reset due time when date changes
        if (_selectedDueTime != null) {
          _selectedDueDate = DateTime(
            date.year,
            date.month,
            date.day,
            _selectedDueTime!.hour,
            _selectedDueTime!.minute,
          );
        }
      });
    }
  }

  Future<void> _selectDueTime() async {
    if (_selectedDueDate == null) {
      SnackBarHelper.showError(
        context,
        'Please select a due date first',
      );
      return;
    }
    
    final time = await showTimePicker(
      context: context,
      initialTime: _selectedDueTime ?? TimeOfDay.now(),
    );
    
    if (time != null) {
      setState(() {
        _selectedDueTime = time;
        _selectedDueDate = DateTime(
          _selectedDueDate!.year,
          _selectedDueDate!.month,
          _selectedDueDate!.day,
          time.hour,
          time.minute,
        );
      });
    }
  }

  Future<void> _selectReminderTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedReminderTime ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: _selectedDueDate ?? DateTime.now().add(const Duration(days: 365)),
    );
    
    if (date != null) {
      final time = await showTimePicker(
        context: context,
        initialTime: _selectedReminderTime != null
            ? TimeOfDay.fromDateTime(_selectedReminderTime!)
            : TimeOfDay.now(),
      );
      
      if (time != null) {
        setState(() {
          _selectedReminderTime = DateTime(
            date.year,
            date.month,
            date.day,
            time.hour,
            time.minute,
          );
        });
      }
    }
  }

  void _showAddTagDialog() {
    final controller = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Tag'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: 'Enter tag name',
            border: OutlineInputBorder(),
          ),
          autofocus: true,
          onSubmitted: (value) {
            if (value.trim().isNotEmpty && !_tags.contains(value.trim())) {
              setState(() {
                _tags.add(value.trim());
              });
            }
            Navigator.of(context).pop();
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              final value = controller.text.trim();
              if (value.isNotEmpty && !_tags.contains(value)) {
                setState(() {
                  _tags.add(value);
                });
              }
              Navigator.of(context).pop();
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _addSubtask() {
    final controller = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Subtask'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: 'Enter subtask title',
            border: OutlineInputBorder(),
          ),
          autofocus: true,
          onSubmitted: (value) {
            if (value.trim().isNotEmpty) {
              setState(() {
                _subtasks.add(Subtask(
                  id: DateTime.now().millisecondsSinceEpoch.toString(),
                  title: value.trim(),
                  completed: false,
                ));
              });
            }
            Navigator.of(context).pop();
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              final value = controller.text.trim();
              if (value.isNotEmpty) {
                setState(() {
                  _subtasks.add(Subtask(
                    id: DateTime.now().millisecondsSinceEpoch.toString(),
                    title: value,
                    completed: false,
                  ));
                });
              }
              Navigator.of(context).pop();
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  Future<void> _saveTask() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    
    setState(() {
      _isLoading = true;
    });
    
    try {
      final taskProvider = Provider.of<TaskProvider>(context, listen: false);
      
      final task = Task(
        id: _isEditing ? widget.task!.id : DateTime.now().millisecondsSinceEpoch.toString(),
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text.trim(),
        completed: _isEditing ? widget.task!.completed : false,
        priority: _selectedPriority,
        category: _selectedCategory,
        dueDate: _selectedDueDate,
        reminderTime: _selectedReminderTime,
        tags: _tags,
        subtasks: _subtasks,
        attachments: _isEditing ? widget.task!.attachments : [],
        recurrence: _recurrenceRule,
        order: _isEditing ? widget.task!.order : 0,
        createdAt: _isEditing ? widget.task!.createdAt : DateTime.now(),
        lastModified: DateTime.now(),
        completedAt: _isEditing ? widget.task!.completedAt : null,
        isDeleted: false,
        deletedAt: null,
        viewCount: _isEditing ? widget.task!.viewCount : 0,
        notes: _notesController.text.trim().isEmpty
            ? null
            : _notesController.text.trim(),
        estimatedTime: _estimatedTime,
        actualTime: _isEditing ? widget.task!.actualTime : null,
        location: _locationController.text.trim().isEmpty
            ? null
            : _locationController.text.trim(),
        url: _urlController.text.trim().isEmpty
            ? null
            : _urlController.text.trim(),
        collaborators: _isEditing ? widget.task!.collaborators : [],
        customFields: _isEditing ? widget.task!.customFields : {},
        parentTaskId: _isEditing ? widget.task!.parentTaskId : null,
        isSubtask: _isEditing ? widget.task!.isSubtask : false,
        projectId: _isEditing ? widget.task!.projectId : null,
        clientId: _isEditing ? widget.task!.clientId : null,
        syncStatus: TaskSyncStatus.pending,
        lastSyncTime: null,
        version: _isEditing ? widget.task!.version + 1 : 1,
        conflictData: null,
      );
      
      if (_isEditing) {
        await taskProvider.updateTask(task);
        if (mounted) {
          SnackBarHelper.showSuccess(
            context,
            'Task updated successfully',
          );
        }
      } else {
        await taskProvider.createTask(task);
        if (mounted) {
          SnackBarHelper.showSuccess(
            context,
            'Task created successfully',
          );
        }
      }
      
      if (mounted) {
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        SnackBarHelper.showError(
          context,
          'Failed to save task: $e',
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _deleteTask() async {
    if (!_isEditing) return;
    
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Task'),
        content: const Text('Are you sure you want to delete this task?'),
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
      setState(() {
        _isLoading = true;
      });
      
      try {
        final taskProvider = Provider.of<TaskProvider>(context, listen: false);
        await taskProvider.deleteTask(widget.task!.id);
        
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
      } finally {
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
        }
      }
    }
  }
}