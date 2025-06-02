import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/task_provider.dart';
import '../../models/task.dart';
import '../../utils/helpers.dart';
import '../../utils/constants.dart';

class AddTaskScreen extends StatefulWidget {
  static const String routeName = '/add-task';
  final Task? task; // 如果传入task，则为编辑模式
  
  const AddTaskScreen({Key? key, this.task}) : super(key: key);

  @override
  State<AddTaskScreen> createState() => _AddTaskScreenState();
}

class _AddTaskScreenState extends State<AddTaskScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _scrollController = ScrollController();
  
  String _priority = 'medium';
  String _category = 'personal';
  DateTime? _dueDate;
  TimeOfDay? _dueTime;
  DateTime? _reminderTime;
  List<String> _tags = [];
  List<Subtask> _subtasks = [];
  bool _isLoading = false;
  
  bool get _isEditMode => widget.task != null;
  
  @override
  void initState() {
    super.initState();
    if (_isEditMode) {
      _initializeWithTask(widget.task!);
    }
  }
  
  void _initializeWithTask(Task task) {
    _titleController.text = task.title;
    _descriptionController.text = task.description ?? '';
    _priority = task.priority;
    _category = task.category ?? 'personal';
    _dueDate = task.dueDate;
    _dueTime = task.dueDate != null ? TimeOfDay.fromDateTime(task.dueDate!) : null;
    _reminderTime = task.reminderTime;
    _tags = List.from(task.tags ?? []);
    _subtasks = List.from(task.subtasks ?? []);
  }
  
  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _scrollController.dispose();
    super.dispose();
  }
  
  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    
    setState(() {
      _isLoading = true;
    });
    
    try {
      final taskProvider = Provider.of<TaskProvider>(context, listen: false);
      
      // 构建截止时间
      DateTime? finalDueDate;
      if (_dueDate != null) {
        if (_dueTime != null) {
          finalDueDate = DateTime(
            _dueDate!.year,
            _dueDate!.month,
            _dueDate!.day,
            _dueTime!.hour,
            _dueTime!.minute,
          );
        } else {
          finalDueDate = _dueDate;
        }
      }
      
      if (_isEditMode) {
        // 编辑任务
        final updatedTask = widget.task!.copyWith(
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text.trim(),
          priority: _priority,
          category: _category,
          dueDate: finalDueDate,
          reminderTime: _reminderTime,
          tags: _tags.isEmpty ? null : _tags,
          subtasks: _subtasks.isEmpty ? null : _subtasks,
          updatedAt: DateTime.now(),
        );
        
        await taskProvider.updateTask(updatedTask);
        
        if (mounted) {
          AppHelpers.showSuccessMessage(context, '任务更新成功');
        }
      } else {
        // 创建新任务
        final newTask = Task(
          id: AppHelpers.generateId(),
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text.trim(),
          priority: _priority,
          category: _category,
          dueDate: finalDueDate,
          reminderTime: _reminderTime,
          tags: _tags.isEmpty ? null : _tags,
          subtasks: _subtasks.isEmpty ? null : _subtasks,
          status: 'pending',
          isCompleted: false,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );
        
        await taskProvider.createTask(newTask);
        
        if (mounted) {
          AppHelpers.showSuccessMessage(context, '任务创建成功');
        }
      }
      
      if (mounted) {
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        AppHelpers.showErrorMessage(context, '保存失败: ${e.toString()}');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }
  
  Future<void> _selectDueDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    
    if (date != null) {
      setState(() {
        _dueDate = date;
      });
    }
  }
  
  Future<void> _selectDueTime() async {
    final time = await showTimePicker(
      context: context,
      initialTime: _dueTime ?? TimeOfDay.now(),
    );
    
    if (time != null) {
      setState(() {
        _dueTime = time;
      });
    }
  }
  
  Future<void> _selectReminderTime() async {
    final reminderOptions = [
      {'label': '准时', 'minutes': 0},
      {'label': '5分钟前', 'minutes': 5},
      {'label': '10分钟前', 'minutes': 10},
      {'label': '15分钟前', 'minutes': 15},
      {'label': '30分钟前', 'minutes': 30},
      {'label': '1小时前', 'minutes': 60},
      {'label': '2小时前', 'minutes': 120},
      {'label': '1天前', 'minutes': 1440},
    ];
    
    final selected = await showDialog<int>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('选择提醒时间'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: reminderOptions.map((option) {
            return ListTile(
              title: Text(option['label'] as String),
              onTap: () => Navigator.of(context).pop(option['minutes'] as int),
            );
          }).toList(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () {
              setState(() {
                _reminderTime = null;
              });
              Navigator.of(context).pop();
            },
            child: const Text('清除'),
          ),
        ],
      ),
    );
    
    if (selected != null && _dueDate != null) {
      final dueDateTime = _dueTime != null
          ? DateTime(
              _dueDate!.year,
              _dueDate!.month,
              _dueDate!.day,
              _dueTime!.hour,
              _dueTime!.minute,
            )
          : _dueDate!;
      
      setState(() {
        _reminderTime = dueDateTime.subtract(Duration(minutes: selected));
      });
    }
  }
  
  void _addTag() {
    showDialog(
      context: context,
      builder: (context) {
        final controller = TextEditingController();
        return AlertDialog(
          title: const Text('添加标签'),
          content: TextField(
            controller: controller,
            decoration: const InputDecoration(
              hintText: '输入标签名称',
            ),
            maxLength: AppConstants.maxTagLength,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('取消'),
            ),
            TextButton(
              onPressed: () {
                final tag = controller.text.trim();
                if (tag.isNotEmpty && !_tags.contains(tag) && _tags.length < AppConstants.maxTagCount) {
                  setState(() {
                    _tags.add(tag);
                  });
                }
                Navigator.of(context).pop();
              },
              child: const Text('添加'),
            ),
          ],
        );
      },
    );
  }
  
  void _removeTag(String tag) {
    setState(() {
      _tags.remove(tag);
    });
  }
  
  void _addSubtask() {
    showDialog(
      context: context,
      builder: (context) {
        final controller = TextEditingController();
        return AlertDialog(
          title: const Text('添加子任务'),
          content: TextField(
            controller: controller,
            decoration: const InputDecoration(
              hintText: '输入子任务标题',
            ),
            maxLength: 100,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('取消'),
            ),
            TextButton(
              onPressed: () {
                final title = controller.text.trim();
                if (title.isNotEmpty && _subtasks.length < AppConstants.maxSubtaskCount) {
                  setState(() {
                    _subtasks.add(Subtask(
                      id: AppHelpers.generateId(),
                      title: title,
                      isCompleted: false,
                      createdAt: DateTime.now(),
                    ));
                  });
                }
                Navigator.of(context).pop();
              },
              child: const Text('添加'),
            ),
          ],
        );
      },
    );
  }
  
  void _toggleSubtask(int index) {
    setState(() {
      _subtasks[index] = _subtasks[index].copyWith(
        isCompleted: !_subtasks[index].isCompleted,
      );
    });
  }
  
  void _removeSubtask(int index) {
    setState(() {
      _subtasks.removeAt(index);
    });
  }
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditMode ? '编辑任务' : '添加任务'),
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _handleSave,
            child: _isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('保存'),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          controller: _scrollController,
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 任务标题
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: '任务标题',
                  hintText: '输入任务标题',
                  prefixIcon: Icon(Icons.title),
                ),
                maxLength: AppConstants.maxTaskTitleLength,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return '请输入任务标题';
                  }
                  return null;
                },
              ),
              
              const SizedBox(height: 16),
              
              // 任务描述
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: '任务描述（可选）',
                  hintText: '输入任务描述',
                  prefixIcon: Icon(Icons.description),
                  alignLabelWithHint: true,
                ),
                maxLines: 3,
                maxLength: AppConstants.maxTaskDescriptionLength,
              ),
              
              const SizedBox(height: 24),
              
              // 优先级选择
              Text(
                '优先级',
                style: theme.textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Row(
                children: AppConstants.taskPriorities.map((priority) {
                  String displayName;
                  Color color;
                  switch (priority) {
                    case 'high':
                      displayName = '高';
                      color = Colors.red;
                      break;
                    case 'medium':
                      displayName = '中';
                      color = Colors.orange;
                      break;
                    case 'low':
                      displayName = '低';
                      color = Colors.green;
                      break;
                    default:
                      displayName = priority;
                      color = Colors.grey;
                  }
                  
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: ChoiceChip(
                        label: Text(displayName),
                        selected: _priority == priority,
                        onSelected: (selected) {
                          if (selected) {
                            setState(() {
                              _priority = priority;
                            });
                          }
                        },
                        selectedColor: color.withOpacity(0.2),
                        labelStyle: TextStyle(
                          color: _priority == priority ? color : null,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              
              const SizedBox(height: 24),
              
              // 分类选择
              Text(
                '分类',
                style: theme.textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: _category,
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.category),
                ),
                items: AppConstants.taskCategories.map((category) {
                  String displayName;
                  switch (category) {
                    case 'work':
                      displayName = '工作';
                      break;
                    case 'personal':
                      displayName = '个人';
                      break;
                    case 'shopping':
                      displayName = '购物';
                      break;
                    case 'health':
                      displayName = '健康';
                      break;
                    case 'education':
                      displayName = '学习';
                      break;
                    case 'finance':
                      displayName = '财务';
                      break;
                    case 'travel':
                      displayName = '旅行';
                      break;
                    case 'other':
                      displayName = '其他';
                      break;
                    default:
                      displayName = category;
                  }
                  
                  return DropdownMenuItem(
                    value: category,
                    child: Text(displayName),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() {
                      _category = value;
                    });
                  }
                },
              ),
              
              const SizedBox(height: 24),
              
              // 截止时间
              Text(
                '截止时间',
                style: theme.textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: _selectDueDate,
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          prefixIcon: Icon(Icons.calendar_today),
                          hintText: '选择日期',
                        ),
                        child: Text(
                          _dueDate != null
                              ? AppHelpers.formatDate(_dueDate!)
                              : '选择日期',
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: InkWell(
                      onTap: _dueDate != null ? _selectDueTime : null,
                      child: InputDecorator(
                        decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.access_time),
                          hintText: '选择时间',
                          enabled: _dueDate != null,
                        ),
                        child: Text(
                          _dueTime != null
                              ? _dueTime!.format(context)
                              : '选择时间',
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              
              if (_dueDate != null) ..[
                const SizedBox(height: 16),
                InkWell(
                  onTap: _selectReminderTime,
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      prefixIcon: Icon(Icons.notifications),
                      hintText: '设置提醒',
                    ),
                    child: Text(
                      _reminderTime != null
                          ? '提醒时间: ${AppHelpers.formatDateTime(_reminderTime!)}'
                          : '设置提醒',
                    ),
                  ),
                ),
              ],
              
              const SizedBox(height: 24),
              
              // 标签
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '标签',
                    style: theme.textTheme.titleMedium,
                  ),
                  TextButton.icon(
                    onPressed: _tags.length < AppConstants.maxTagCount ? _addTag : null,
                    icon: const Icon(Icons.add),
                    label: const Text('添加'),
                  ),
                ],
              ),
              if (_tags.isNotEmpty) ..[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _tags.map((tag) {
                    return Chip(
                      label: Text(tag),
                      deleteIcon: const Icon(Icons.close, size: 18),
                      onDeleted: () => _removeTag(tag),
                    );
                  }).toList(),
                ),
              ],
              
              const SizedBox(height: 24),
              
              // 子任务
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '子任务',
                    style: theme.textTheme.titleMedium,
                  ),
                  TextButton.icon(
                    onPressed: _subtasks.length < AppConstants.maxSubtaskCount ? _addSubtask : null,
                    icon: const Icon(Icons.add),
                    label: const Text('添加'),
                  ),
                ],
              ),
              if (_subtasks.isNotEmpty) ..[
                const SizedBox(height: 8),
                ...List.generate(_subtasks.length, (index) {
                  final subtask = _subtasks[index];
                  return Card(
                    child: ListTile(
                      leading: Checkbox(
                        value: subtask.isCompleted,
                        onChanged: (_) => _toggleSubtask(index),
                      ),
                      title: Text(
                        subtask.title,
                        style: TextStyle(
                          decoration: subtask.isCompleted
                              ? TextDecoration.lineThrough
                              : null,
                        ),
                      ),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () => _removeSubtask(index),
                      ),
                    ),
                  );
                }),
              ],
              
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}