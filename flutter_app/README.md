# TodoList Pro - Flutter版本

一个现代化、功能丰富的待办事项管理应用，使用Flutter构建。

## 功能特性

### 📝 核心功能
- ✅ 添加、编辑、删除待办事项
- ✅ 标记完成/未完成状态
- ✅ 优先级设置（低、中、高）
- ✅ 分类管理
- ✅ 截止日期设置
- ✅ 标签系统
- ✅ 搜索功能

### 🎨 界面特性
- 🌙 深色/浅色主题自动切换
- 📱 响应式设计
- ✨ 流畅的动画效果
- 🎯 直观的用户界面
- 📊 统计数据展示

### 📊 数据管理
- 💾 本地SQLite数据库存储
- 🔄 实时数据同步
- 📈 任务统计分析
- 🗂️ 分类过滤
- 🔍 智能搜索

## 技术栈

- **框架**: Flutter 3.10+
- **状态管理**: Provider
- **数据库**: SQLite (sqflite)
- **UI组件**: Material Design 3
- **字体**: Google Fonts (Inter)
- **动画**: flutter_animate
- **日期处理**: intl

## 快速开始

### 环境要求

- Flutter SDK 3.10.0 或更高版本
- Dart SDK 3.0.0 或更高版本
- Android Studio / VS Code
- iOS模拟器 (macOS) 或 Android模拟器

### 安装步骤

1. **克隆项目**
   ```bash
   cd flutter_app
   ```

2. **安装依赖**
   ```bash
   flutter pub get
   ```

3. **运行应用**
   ```bash
   flutter run
   ```

### 构建发布版本

**Android APK**
```bash
flutter build apk --release
```

**iOS IPA** (需要macOS)
```bash
flutter build ios --release
```

## 项目结构

```
lib/
├── main.dart                 # 应用入口
├── models/
│   └── todo.dart            # 待办事项数据模型
├── providers/
│   └── todo_provider.dart   # 状态管理
├── screens/
│   └── home_screen.dart     # 主屏幕
├── services/
│   └── database_service.dart # 数据库服务
├── utils/
│   └── theme.dart           # 主题配置
└── widgets/
    ├── add_todo_dialog.dart # 添加/编辑对话框
    ├── filter_chips.dart   # 过滤器组件
    ├── stats_card.dart     # 统计卡片
    └── todo_item.dart      # 待办事项卡片
```

## 使用说明

### 添加待办事项
1. 点击右下角的 `+` 按钮
2. 填写标题（必填）
3. 可选择设置描述、优先级、分类、截止日期和标签
4. 点击「添加」保存

### 管理待办事项
- **完成任务**: 点击左侧圆形复选框
- **编辑任务**: 点击任务卡片或右侧菜单的「编辑」
- **删除任务**: 点击右侧菜单的「删除」

### 过滤和搜索
- **状态过滤**: 使用顶部的状态筛选器
- **分类过滤**: 选择特定分类查看
- **搜索**: 点击搜索图标输入关键词

### 分类管理
1. 在添加/编辑对话框中点击「新建」
2. 输入分类名称并选择颜色
3. 点击「添加」创建分类

## 数据存储

应用使用SQLite数据库在本地存储所有数据，包括：
- 待办事项详情
- 分类信息
- 用户设置

数据库文件位置：
- **Android**: `/data/data/com.example.todolist_flutter/databases/todolist.db`
- **iOS**: `Documents/todolist.db`

## 自定义配置

### 修改主题颜色
编辑 `lib/utils/theme.dart` 文件中的颜色定义：

```dart
static const Color primaryColor = Color(0xFF6366F1); // 主色调
static const Color secondaryColor = Color(0xFF8B5CF6); // 次要色调
```

### 添加新功能
1. 在相应的目录下创建新文件
2. 更新数据模型（如需要）
3. 修改Provider状态管理
4. 更新UI组件

## 性能优化

- 使用 `ListView.builder` 实现虚拟滚动
- Provider状态管理避免不必要的重建
- 图片和资源懒加载
- 数据库查询优化

## 故障排除

### 常见问题

**1. 依赖安装失败**
```bash
flutter clean
flutter pub get
```

**2. 数据库错误**
- 卸载应用重新安装
- 或清除应用数据

**3. 构建失败**
```bash
flutter doctor
# 检查环境配置
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

如有问题或建议，请通过以下方式联系：

- 📧 Email: your.email@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/todolist-flutter/issues)

---

**享受高效的任务管理体验！** 🚀