# TodoList Pro 桌面版

一个现代化、功能丰富的待办事项桌面应用，基于 Electron 构建。

## 功能特性

### 核心功能
- ✅ 添加、编辑、删除任务
- ✅ 标记任务完成/未完成
- ✅ 任务优先级设置（高、中、低）
- ✅ 任务截止日期设置
- ✅ 任务标签管理
- ✅ 任务搜索和筛选
- ✅ 批量清除已完成任务

### 高级功能
- 🎨 现代化 Material Design 界面
- 🌙 深色/浅色主题切换
- 💾 本地数据持久化存储
- 📊 任务统计和进度跟踪
- 🔔 桌面通知提醒
- 📤 数据导入/导出功能
- ⚙️ 个性化设置选项
- 🖥️ 原生桌面体验

### 桌面特性
- 🪟 原生窗口管理
- 📋 系统菜单集成
- 🔗 系统托盘支持
- ⌨️ 键盘快捷键
- 📱 跨平台支持（macOS、Windows、Linux）

## 技术栈

- **框架**: Electron 22+
- **前端**: HTML5 + CSS3 + JavaScript (ES6+)
- **存储**: electron-store (本地JSON存储)
- **构建**: electron-builder
- **UI**: Material Design 3
- **字体**: Inter (Google Fonts)
- **图标**: Font Awesome 6

## 安装和运行

### 环境要求

- Node.js 16+ 
- npm 8+ 或 yarn 1.22+

### 开发环境安装

1. **克隆项目**
   ```bash
   cd /Users/liuyinghao/Desktop/Trae/Vibe/1.Todolist/electron_app
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发模式**
   ```bash
   npm start
   ```

### 构建生产版本

1. **构建所有平台**
   ```bash
   npm run build
   ```

2. **构建特定平台**
   ```bash
   # macOS
   npm run build:mac
   
   # Windows
   npm run build:win
   
   # Linux
   npm run build:linux
   ```

3. **仅打包（不创建安装程序）**
   ```bash
   npm run pack
   ```

### 构建输出

构建完成后，安装包将生成在 `dist/` 目录中：

- **macOS**: `.dmg` 文件
- **Windows**: `.exe` 安装程序
- **Linux**: `.AppImage` 或 `.deb` 包

## 项目结构

```
electron_app/
├── main.js                 # Electron 主进程
├── package.json           # 项目配置和依赖
├── README.md             # 项目说明文档
├── renderer/             # 渲染进程文件
│   ├── index.html        # 主界面HTML
│   ├── style.css         # 样式文件
│   └── renderer.js       # 渲染进程逻辑
└── dist/                 # 构建输出目录
```

## 使用说明

### 基本操作

1. **添加任务**
   - 在输入框中输入任务标题
   - 选择优先级和截止日期（可选）
   - 点击「添加任务」按钮或按 Enter 键

2. **管理任务**
   - 点击复选框标记任务完成
   - 点击编辑按钮修改任务详情
   - 点击删除按钮移除任务

3. **筛选和搜索**
   - 使用顶部筛选按钮查看不同状态的任务
   - 在搜索框中输入关键词快速查找任务

### 高级功能

1. **数据管理**
   - 使用「导出数据」保存任务到 JSON 文件
   - 使用「导入数据」从文件恢复任务
   - 使用「清除已完成」批量删除完成的任务

2. **个性化设置**
   - 点击设置按钮打开设置面板
   - 切换深色/浅色主题
   - 开启/关闭桌面通知
   - 管理应用偏好设置

### 键盘快捷键

- `Cmd/Ctrl + N`: 新建任务
- `Cmd/Ctrl + F`: 搜索任务
- `Cmd/Ctrl + ,`: 打开设置
- `Cmd/Ctrl + I`: 导入数据
- `Cmd/Ctrl + E`: 导出数据
- `Cmd/Ctrl + Q`: 退出应用

## 数据存储

应用使用 `electron-store` 进行本地数据存储，数据文件位置：

- **macOS**: `~/Library/Application Support/TodoList/config.json`
- **Windows**: `%APPDATA%\TodoList\config.json`
- **Linux**: `~/.config/TodoList/config.json`

## 故障排除

### 常见问题

1. **应用无法启动**
   - 确保 Node.js 版本 >= 16
   - 删除 `node_modules` 文件夹并重新安装依赖
   - 检查是否有端口冲突

2. **构建失败**
   - 确保有足够的磁盘空间
   - 检查网络连接（需要下载构建工具）
   - 尝试清除缓存：`npm run clean`

3. **数据丢失**
   - 检查配置文件是否存在
   - 尝试从备份文件恢复数据
   - 使用导入功能恢复之前导出的数据

### 开发调试

1. **开启开发者工具**
   - 在开发模式下按 `F12` 或 `Cmd/Ctrl + Shift + I`

2. **查看日志**
   - 主进程日志在终端中显示
   - 渲染进程日志在开发者工具的 Console 中显示

## 更新日志

### v1.0.0 (2024-01-XX)
- 🎉 初始版本发布
- ✅ 完整的任务管理功能
- 🎨 现代化界面设计
- 💾 本地数据存储
- 🔔 桌面通知支持
- 📤 数据导入导出
- 🌙 主题切换功能

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个项目！

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License - 详见 LICENSE 文件

## 联系方式

如有问题或建议，请通过以下方式联系：

- 📧 Email: your-email@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/todolist-electron/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-username/todolist-electron/discussions)

---

**享受高效的任务管理体验！** 🚀