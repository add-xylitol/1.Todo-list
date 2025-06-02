class TodoApp {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('todoTasks')) || [];
        this.currentFilter = 'all';
        this.taskIdCounter = this.tasks.length > 0 ? Math.max(...this.tasks.map(t => t.id)) + 1 : 1;
        
        this.initializeElements();
        this.bindEvents();
        this.render();
    }
    
    initializeElements() {
        this.taskInput = document.getElementById('taskInput');
        this.addBtn = document.getElementById('addBtn');
        this.taskList = document.getElementById('taskList');
        this.emptyState = document.getElementById('emptyState');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.clearCompletedBtn = document.getElementById('clearCompleted');
        this.totalTasksSpan = document.getElementById('totalTasks');
        this.completedTasksSpan = document.getElementById('completedTasks');
        this.pendingTasksSpan = document.getElementById('pendingTasks');
    }
    
    bindEvents() {
        // 添加任务事件
        this.addBtn.addEventListener('click', () => this.addTask());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTask();
            }
        });
        
        // 筛选事件
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });
        
        // 清除已完成任务
        this.clearCompletedBtn.addEventListener('click', () => {
            this.clearCompleted();
        });
    }
    
    addTask() {
        const text = this.taskInput.value.trim();
        if (!text) {
            this.taskInput.focus();
            return;
        }
        
        const task = {
            id: this.taskIdCounter++,
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        this.tasks.unshift(task);
        this.taskInput.value = '';
        this.saveToStorage();
        this.render();
        
        // 添加成功动画
        this.taskInput.style.transform = 'scale(1.05)';
        setTimeout(() => {
            this.taskInput.style.transform = 'scale(1)';
        }, 150);
    }
    
    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveToStorage();
            this.render();
        }
    }
    
    deleteTask(id) {
        if (confirm('确定要删除这个任务吗？')) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.saveToStorage();
            this.render();
        }
    }
    
    editTask(id, newText) {
        const task = this.tasks.find(t => t.id === id);
        if (task && newText.trim()) {
            task.text = newText.trim();
            this.saveToStorage();
            this.render();
        }
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        
        // 更新筛选按钮状态
        this.filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        this.render();
    }
    
    clearCompleted() {
        const completedCount = this.tasks.filter(t => t.completed).length;
        if (completedCount === 0) return;
        
        if (confirm(`确定要清除 ${completedCount} 个已完成的任务吗？`)) {
            this.tasks = this.tasks.filter(t => !t.completed);
            this.saveToStorage();
            this.render();
        }
    }
    
    getFilteredTasks() {
        switch (this.currentFilter) {
            case 'completed':
                return this.tasks.filter(t => t.completed);
            case 'pending':
                return this.tasks.filter(t => !t.completed);
            default:
                return this.tasks;
        }
    }
    
    createTaskElement(task) {
        const taskItem = document.createElement('div');
        taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
        taskItem.dataset.taskId = task.id;
        
        taskItem.innerHTML = `
            <div class="task-checkbox ${task.completed ? 'checked' : ''}">
                ${task.completed ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <span class="task-text">${this.escapeHtml(task.text)}</span>
            <input type="text" class="edit-input" value="${this.escapeHtml(task.text)}">
            <div class="task-actions">
                <button class="edit-btn" title="编辑">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="save-btn" title="保存">
                    <i class="fas fa-check"></i>
                </button>
                <button class="delete-btn" title="删除">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // 绑定事件
        const checkbox = taskItem.querySelector('.task-checkbox');
        const editBtn = taskItem.querySelector('.edit-btn');
        const saveBtn = taskItem.querySelector('.save-btn');
        const deleteBtn = taskItem.querySelector('.delete-btn');
        const editInput = taskItem.querySelector('.edit-input');
        
        checkbox.addEventListener('click', () => this.toggleTask(task.id));
        editBtn.addEventListener('click', () => this.startEdit(taskItem));
        saveBtn.addEventListener('click', () => this.saveEdit(taskItem, task.id));
        deleteBtn.addEventListener('click', () => this.deleteTask(task.id));
        
        editInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveEdit(taskItem, task.id);
            } else if (e.key === 'Escape') {
                this.cancelEdit(taskItem);
            }
        });
        
        editInput.addEventListener('blur', () => {
            setTimeout(() => {
                if (taskItem.classList.contains('editing')) {
                    this.cancelEdit(taskItem);
                }
            }, 150);
        });
        
        return taskItem;
    }
    
    startEdit(taskItem) {
        taskItem.classList.add('editing');
        const editInput = taskItem.querySelector('.edit-input');
        editInput.focus();
        editInput.select();
    }
    
    saveEdit(taskItem, taskId) {
        const editInput = taskItem.querySelector('.edit-input');
        const newText = editInput.value.trim();
        
        if (newText) {
            this.editTask(taskId, newText);
        } else {
            this.cancelEdit(taskItem);
        }
    }
    
    cancelEdit(taskItem) {
        taskItem.classList.remove('editing');
        const editInput = taskItem.querySelector('.edit-input');
        const originalText = taskItem.querySelector('.task-text').textContent;
        editInput.value = originalText;
    }
    
    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = total - completed;
        
        this.totalTasksSpan.textContent = `总计: ${total}`;
        this.completedTasksSpan.textContent = `已完成: ${completed}`;
        this.pendingTasksSpan.textContent = `待完成: ${pending}`;
        
        // 更新清除按钮状态
        this.clearCompletedBtn.disabled = completed === 0;
    }
    
    render() {
        const filteredTasks = this.getFilteredTasks();
        
        // 清空任务列表
        this.taskList.innerHTML = '';
        
        if (filteredTasks.length === 0) {
            this.emptyState.classList.add('show');
            this.taskList.style.display = 'none';
        } else {
            this.emptyState.classList.remove('show');
            this.taskList.style.display = 'block';
            
            filteredTasks.forEach(task => {
                const taskElement = this.createTaskElement(task);
                this.taskList.appendChild(taskElement);
            });
        }
        
        this.updateStats();
    }
    
    saveToStorage() {
        localStorage.setItem('todoTasks', JSON.stringify(this.tasks));
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});

// 添加一些实用的键盘快捷键
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + / 聚焦到输入框
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        document.getElementById('taskInput').focus();
    }
});

// 添加页面可见性变化时的处理
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // 页面重新可见时，可以在这里添加刷新逻辑
        console.log('页面重新可见');
    }
});

// 防止页面意外关闭时丢失未保存的编辑
window.addEventListener('beforeunload', (e) => {
    const editingItems = document.querySelectorAll('.task-item.editing');
    if (editingItems.length > 0) {
        e.preventDefault();
        e.returnValue = '您有未保存的编辑，确定要离开吗？';
        return e.returnValue;
    }
});