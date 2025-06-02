const { ipcRenderer } = require('electron');
const fs = require('fs');

class TodoApp {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.taskIdCounter = 1;
        this.editingTaskId = null;
        this.settings = {
            theme: 'auto',
            enableNotifications: true,
            enableSounds: true
        };
        
        this.initializeElements();
        this.bindEvents();
        this.loadData();
        this.loadSettings();
        this.render();
        this.setupMenuHandlers();
    }
    
    async initializeElements() {
        // 输入元素
        this.taskInput = document.getElementById('taskInput');
        this.prioritySelect = document.getElementById('prioritySelect');
        this.dueDateInput = document.getElementById('dueDateInput');
        this.addBtn = document.getElementById('addBtn');
        this.searchInput = document.getElementById('searchInput');
        this.clearSearchBtn = document.getElementById('clearSearch');
        
        // 显示元素
        this.taskList = document.getElementById('taskList');
        this.emptyState = document.getElementById('emptyState');
        this.totalTasksSpan = document.getElementById('totalTasks');
        this.completedTasksSpan = document.getElementById('completedTasks');
        this.pendingTasksSpan = document.getElementById('pendingTasks');
        this.overdueTasksSpan = document.getElementById('overdueTasks');
        
        // 按钮元素
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.clearCompletedBtn = document.getElementById('clearCompleted');
        this.exportDataBtn = document.getElementById('exportData');
        this.importDataBtn = document.getElementById('importData');
        this.syncBtn = document.getElementById('syncBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        
        // 模态框元素
        this.taskModal = document.getElementById('taskModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalTaskTitle = document.getElementById('modalTaskTitle');
        this.modalTaskDescription = document.getElementById('modalTaskDescription');
        this.modalTaskPriority = document.getElementById('modalTaskPriority');
        this.modalTaskDueDate = document.getElementById('modalTaskDueDate');
        this.modalTaskTags = document.getElementById('modalTaskTags');
        this.modalClose = document.getElementById('modalClose');
        this.modalCancel = document.getElementById('modalCancel');
        this.modalSave = document.getElementById('modalSave');
        
        // 设置模态框
        this.settingsModal = document.getElementById('settingsModal');
        this.settingsModalClose = document.getElementById('settingsModalClose');
        this.themeSelect = document.getElementById('themeSelect');
        this.enableNotifications = document.getElementById('enableNotifications');
        this.enableSounds = document.getElementById('enableSounds');
        this.clearAllDataBtn = document.getElementById('clearAllData');
        this.settingsCancel = document.getElementById('settingsCancel');
        this.settingsSave = document.getElementById('settingsSave');
    }
    
    bindEvents() {
        // 添加任务事件
        this.addBtn.addEventListener('click', () => this.addTask());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTask();
            }
        });
        
        // 搜索事件
        this.searchInput.addEventListener('input', (e) => {
            this.currentSearch = e.target.value.toLowerCase();
            this.render();
        });
        
        this.clearSearchBtn.addEventListener('click', () => {
            this.searchInput.value = '';
            this.currentSearch = '';
            this.render();
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
        
        // 导入导出
        this.exportDataBtn.addEventListener('click', () => this.exportData());
        this.importDataBtn.addEventListener('click', () => this.importData());
        
        // 同步和设置
        this.syncBtn.addEventListener('click', () => this.syncData());
        this.settingsBtn.addEventListener('click', () => this.showSettings());
        
        // 模态框事件
        this.modalClose.addEventListener('click', () => this.hideTaskModal());
        this.modalCancel.addEventListener('click', () => this.hideTaskModal());
        this.modalSave.addEventListener('click', () => this.saveTask());
        
        // 设置模态框事件
        this.settingsModalClose.addEventListener('click', () => this.hideSettingsModal());
        this.settingsCancel.addEventListener('click', () => this.hideSettingsModal());
        this.settingsSave.addEventListener('click', () => this.saveSettings());
        this.clearAllDataBtn.addEventListener('click', () => this.clearAllData());
        
        // 点击模态框外部关闭
        this.taskModal.addEventListener('click', (e) => {
            if (e.target === this.taskModal) {
                this.hideTaskModal();
            }
        });
        
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.hideSettingsModal();
            }
        });
    }
    
    setupMenuHandlers() {
        // 监听主进程菜单事件
        ipcRenderer.on('menu-new-task', () => {
            this.taskInput.focus();
        });
        
        ipcRenderer.on('menu-import-data', (event, filePath) => {
            this.importDataFromFile(filePath);
        });
        
        ipcRenderer.on('menu-export-data', (event, filePath) => {
            this.exportDataToFile(filePath);
        });
    }
    
    async loadData() {
        try {
            const data = await ipcRenderer.invoke('store-get', 'todoTasks');
            if (data) {
                this.tasks = data;
                this.taskIdCounter = this.tasks.length > 0 ? Math.max(...this.tasks.map(t => t.id)) + 1 : 1;
            }
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }
    
    async saveData() {
        try {
            await ipcRenderer.invoke('store-set', 'todoTasks', this.tasks);
        } catch (error) {
            console.error('保存数据失败:', error);
        }
    }
    
    async loadSettings() {
        try {
            const settings = await ipcRenderer.invoke('store-get', 'settings');
            if (settings) {
                this.settings = { ...this.settings, ...settings };
                this.applySettings();
            }
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }
    
    async saveSettingsData() {
        try {
            await ipcRenderer.invoke('store-set', 'settings', this.settings);
        } catch (error) {
            console.error('保存设置失败:', error);
        }
    }
    
    applySettings() {
        // 应用主题
        if (this.settings.theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else if (this.settings.theme === 'light') {
            document.body.classList.remove('dark-theme');
        }
        // auto主题跟随系统，这里可以添加系统主题检测逻辑
    }
    
    addTask() {
        const text = this.taskInput.value.trim();
        if (!text) {
            this.taskInput.focus();
            return;
        }
        
        const task = {
            id: this.taskIdCounter++,
            title: text,
            description: '',
            completed: false,
            priority: this.prioritySelect.value,
            dueDate: this.dueDateInput.value || null,
            tags: [],
            createdAt: new Date().toISOString(),
            completedAt: null
        };
        
        this.tasks.unshift(task);
        this.taskInput.value = '';
        this.prioritySelect.value = 'medium';
        this.dueDateInput.value = '';
        
        this.saveData();
        this.render();
        
        if (this.settings.enableNotifications) {
            this.showNotification('任务已添加', text);
        }
    }
    
    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            
            this.saveData();
            this.render();
            
            if (this.settings.enableNotifications) {
                const message = task.completed ? '任务已完成' : '任务已重新激活';
                this.showNotification(message, task.title);
            }
        }
    }
    
    editTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            this.editingTaskId = id;
            this.modalTitle.textContent = '编辑任务';
            this.modalTaskTitle.value = task.title;
            this.modalTaskDescription.value = task.description || '';
            this.modalTaskPriority.value = task.priority;
            this.modalTaskDueDate.value = task.dueDate || '';
            this.modalTaskTags.value = task.tags ? task.tags.join(', ') : '';
            this.showTaskModal();
        }
    }
    
    deleteTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task && confirm(`确定要删除任务"${task.title}"吗？`)) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.saveData();
            this.render();
            
            if (this.settings.enableNotifications) {
                this.showNotification('任务已删除', task.title);
            }
        }
    }
    
    saveTask() {
        const title = this.modalTaskTitle.value.trim();
        if (!title) {
            alert('请输入任务标题');
            return;
        }
        
        if (this.editingTaskId) {
            // 编辑现有任务
            const task = this.tasks.find(t => t.id === this.editingTaskId);
            if (task) {
                task.title = title;
                task.description = this.modalTaskDescription.value.trim();
                task.priority = this.modalTaskPriority.value;
                task.dueDate = this.modalTaskDueDate.value || null;
                task.tags = this.modalTaskTags.value.split(',').map(tag => tag.trim()).filter(tag => tag);
            }
        } else {
            // 创建新任务
            const task = {
                id: this.taskIdCounter++,
                title: title,
                description: this.modalTaskDescription.value.trim(),
                completed: false,
                priority: this.modalTaskPriority.value,
                dueDate: this.modalTaskDueDate.value || null,
                tags: this.modalTaskTags.value.split(',').map(tag => tag.trim()).filter(tag => tag),
                createdAt: new Date().toISOString(),
                completedAt: null
            };
            this.tasks.unshift(task);
        }
        
        this.saveData();
        this.render();
        this.hideTaskModal();
    }
    
    showTaskModal() {
        this.taskModal.classList.add('show');
        this.modalTaskTitle.focus();
    }
    
    hideTaskModal() {
        this.taskModal.classList.remove('show');
        this.editingTaskId = null;
        // 清空表单
        this.modalTaskTitle.value = '';
        this.modalTaskDescription.value = '';
        this.modalTaskPriority.value = 'medium';
        this.modalTaskDueDate.value = '';
        this.modalTaskTags.value = '';
    }
    
    showSettings() {
        this.themeSelect.value = this.settings.theme;
        this.enableNotifications.checked = this.settings.enableNotifications;
        this.enableSounds.checked = this.settings.enableSounds;
        this.settingsModal.classList.add('show');
    }
    
    hideSettingsModal() {
        this.settingsModal.classList.remove('show');
    }
    
    saveSettings() {
        this.settings.theme = this.themeSelect.value;
        this.settings.enableNotifications = this.enableNotifications.checked;
        this.settings.enableSounds = this.enableSounds.checked;
        
        this.saveSettingsData();
        this.applySettings();
        this.hideSettingsModal();
        
        this.showNotification('设置已保存', '您的偏好设置已更新');
    }
    
    clearAllData() {
        if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
            this.tasks = [];
            this.taskIdCounter = 1;
            this.saveData();
            this.render();
            this.hideSettingsModal();
            this.showNotification('数据已清除', '所有任务数据已被删除');
        }
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        this.filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.render();
    }
    
    clearCompleted() {
        const completedCount = this.tasks.filter(t => t.completed).length;
        if (completedCount === 0) {
            alert('没有已完成的任务需要清除');
            return;
        }
        
        if (confirm(`确定要清除 ${completedCount} 个已完成的任务吗？`)) {
            this.tasks = this.tasks.filter(t => !t.completed);
            this.saveData();
            this.render();
            this.showNotification('已清除完成任务', `已删除 ${completedCount} 个任务`);
        }
    }
    
    async exportData() {
        try {
            const data = {
                tasks: this.tasks,
                exportDate: new Date().toISOString(),
                version: '1.0.0'
            };
            
            // 触发主进程的文件保存对话框
            const { dialog } = require('electron').remote || require('@electron/remote');
            const result = await dialog.showSaveDialog({
                defaultPath: `todolist-backup-${new Date().toISOString().split('T')[0]}.json`,
                filters: [
                    { name: 'JSON Files', extensions: ['json'] }
                ]
            });
            
            if (!result.canceled) {
                fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
                this.showNotification('导出成功', '数据已保存到文件');
            }
        } catch (error) {
            console.error('导出失败:', error);
            alert('导出失败: ' + error.message);
        }
    }
    
    async importData() {
        try {
            const { dialog } = require('electron').remote || require('@electron/remote');
            const result = await dialog.showOpenDialog({
                properties: ['openFile'],
                filters: [
                    { name: 'JSON Files', extensions: ['json'] }
                ]
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
                this.importDataFromFile(result.filePaths[0]);
            }
        } catch (error) {
            console.error('导入失败:', error);
            alert('导入失败: ' + error.message);
        }
    }
    
    importDataFromFile(filePath) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(fileContent);
            
            if (data.tasks && Array.isArray(data.tasks)) {
                if (confirm(`确定要导入 ${data.tasks.length} 个任务吗？这将替换当前所有数据。`)) {
                    this.tasks = data.tasks;
                    this.taskIdCounter = this.tasks.length > 0 ? Math.max(...this.tasks.map(t => t.id)) + 1 : 1;
                    this.saveData();
                    this.render();
                    this.showNotification('导入成功', `已导入 ${data.tasks.length} 个任务`);
                }
            } else {
                alert('无效的数据格式');
            }
        } catch (error) {
            console.error('导入失败:', error);
            alert('导入失败: ' + error.message);
        }
    }
    
    exportDataToFile(filePath) {
        try {
            const data = {
                tasks: this.tasks,
                exportDate: new Date().toISOString(),
                version: '1.0.0'
            };
            
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            this.showNotification('导出成功', '数据已保存到文件');
        } catch (error) {
            console.error('导出失败:', error);
            alert('导出失败: ' + error.message);
        }
    }
    
    syncData() {
        // 这里可以实现云同步功能
        this.showNotification('同步完成', '数据已与本地存储同步');
    }
    
    showNotification(title, body) {
        if (this.settings.enableNotifications && 'Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification(title, { body, icon: 'assets/icon.png' });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification(title, { body, icon: 'assets/icon.png' });
                    }
                });
            }
        }
    }
    
    getFilteredTasks() {
        let filtered = this.tasks;
        
        // 应用搜索过滤
        if (this.currentSearch) {
            filtered = filtered.filter(task => 
                task.title.toLowerCase().includes(this.currentSearch) ||
                (task.description && task.description.toLowerCase().includes(this.currentSearch)) ||
                (task.tags && task.tags.some(tag => tag.toLowerCase().includes(this.currentSearch)))
            );
        }
        
        // 应用状态过滤
        switch (this.currentFilter) {
            case 'pending':
                filtered = filtered.filter(task => !task.completed);
                break;
            case 'completed':
                filtered = filtered.filter(task => task.completed);
                break;
            case 'high':
                filtered = filtered.filter(task => task.priority === 'high');
                break;
            case 'overdue':
                const today = new Date().toISOString().split('T')[0];
                filtered = filtered.filter(task => 
                    !task.completed && task.dueDate && task.dueDate < today
                );
                break;
        }
        
        return filtered;
    }
    
    isOverdue(task) {
        if (!task.dueDate || task.completed) return false;
        const today = new Date().toISOString().split('T')[0];
        return task.dueDate < today;
    }
    
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN');
    }
    
    render() {
        const filteredTasks = this.getFilteredTasks();
        
        // 更新统计
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => t.completed).length;
        const pendingTasks = totalTasks - completedTasks;
        const overdueTasks = this.tasks.filter(t => this.isOverdue(t)).length;
        
        this.totalTasksSpan.textContent = totalTasks;
        this.completedTasksSpan.textContent = completedTasks;
        this.pendingTasksSpan.textContent = pendingTasks;
        this.overdueTasksSpan.textContent = overdueTasks;
        
        // 渲染任务列表
        if (filteredTasks.length === 0) {
            this.taskList.style.display = 'none';
            this.emptyState.style.display = 'block';
        } else {
            this.taskList.style.display = 'block';
            this.emptyState.style.display = 'none';
            
            this.taskList.innerHTML = filteredTasks.map(task => {
                const isOverdue = this.isOverdue(task);
                return `
                    <div class="task-item ${task.completed ? 'completed' : ''}">
                        <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                             onclick="app.toggleTask(${task.id})">
                            ${task.completed ? '<i class="fas fa-check"></i>' : ''}
                        </div>
                        <div class="task-content">
                            <div class="task-title ${task.completed ? 'completed' : ''}">
                                ${task.title}
                            </div>
                            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                            <div class="task-meta">
                                <span class="task-priority ${task.priority}">${task.priority}</span>
                                ${task.dueDate ? `
                                    <span class="task-due-date ${isOverdue ? 'overdue' : ''}">
                                        <i class="fas fa-calendar"></i> ${this.formatDate(task.dueDate)}
                                    </span>
                                ` : ''}
                                ${task.tags && task.tags.length > 0 ? `
                                    <div class="task-tags">
                                        ${task.tags.map(tag => `<span class="task-tag">${tag}</span>`).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="task-actions">
                            <button class="task-action-btn edit" onclick="app.editTask(${task.id})" title="编辑">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="task-action-btn delete" onclick="app.deleteTask(${task.id})" title="删除">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

// 初始化应用
const app = new TodoApp();

// 请求通知权限
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}