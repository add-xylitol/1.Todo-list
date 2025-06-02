import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/todo_provider.dart';
import '../models/todo.dart';

class FilterChips extends StatelessWidget {
  const FilterChips({super.key});
  
  @override
  Widget build(BuildContext context) {
    return Consumer<TodoProvider>(
      builder: (context, todoProvider, child) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 状态过滤器
            Text(
              '状态',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.8),
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: TodoStatus.values.map((status) {
                final isSelected = todoProvider.currentFilter == status;
                return FilterChip(
                  label: Text(_getStatusText(status)),
                  selected: isSelected,
                  onSelected: (selected) {
                    if (selected) {
                      todoProvider.setFilter(status);
                    }
                  },
                  backgroundColor: Theme.of(context).colorScheme.surface,
                  selectedColor: Theme.of(context).colorScheme.primary.withOpacity(0.2),
                  checkmarkColor: Theme.of(context).colorScheme.primary,
                  labelStyle: TextStyle(
                    color: isSelected 
                        ? Theme.of(context).colorScheme.primary
                        : Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                  ),
                );
              }).toList(),
            ),
            
            const SizedBox(height: 16),
            
            // 分类过滤器
            if (todoProvider.categories.isNotEmpty) ..[
              Text(
                '分类',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.8),
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  // 全部分类选项
                  FilterChip(
                    label: const Text('全部'),
                    selected: todoProvider.selectedCategory == null,
                    onSelected: (selected) {
                      if (selected) {
                        todoProvider.setSelectedCategory(null);
                      }
                    },
                    backgroundColor: Theme.of(context).colorScheme.surface,
                    selectedColor: Theme.of(context).colorScheme.primary.withOpacity(0.2),
                    checkmarkColor: Theme.of(context).colorScheme.primary,
                    labelStyle: TextStyle(
                      color: todoProvider.selectedCategory == null
                          ? Theme.of(context).colorScheme.primary
                          : Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
                      fontWeight: todoProvider.selectedCategory == null 
                          ? FontWeight.w600 
                          : FontWeight.normal,
                    ),
                  ),
                  
                  // 各个分类选项
                  ...todoProvider.categories.map((category) {
                    final isSelected = todoProvider.selectedCategory == category['name'];
                    return FilterChip(
                      label: Text(category['name']),
                      selected: isSelected,
                      onSelected: (selected) {
                        if (selected) {
                          todoProvider.setSelectedCategory(category['name']);
                        } else {
                          todoProvider.setSelectedCategory(null);
                        }
                      },
                      backgroundColor: Theme.of(context).colorScheme.surface,
                      selectedColor: Color(int.parse(category['color'])).withOpacity(0.2),
                      checkmarkColor: Color(int.parse(category['color'])),
                      labelStyle: TextStyle(
                        color: isSelected 
                            ? Color(int.parse(category['color']))
                            : Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                      ),
                      avatar: Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: Color(int.parse(category['color'])),
                          shape: BoxShape.circle,
                        ),
                      ),
                    );
                  }).toList(),
                ],
              ),
              const SizedBox(height: 8),
            ],
          ],
        );
      },
    );
  }
  
  String _getStatusText(TodoStatus status) {
    switch (status) {
      case TodoStatus.pending:
        return '待完成';
      case TodoStatus.completed:
        return '已完成';
      case TodoStatus.archived:
        return '已归档';
    }
  }
}