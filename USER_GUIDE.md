# TodoList Pro 用户使用指南

欢迎使用 TodoList Pro！这是一个功能完整的多平台任务管理系统，支持 Web、移动端和桌面端。

## 🎯 系统概览

TodoList Pro 是一个企业级的任务管理解决方案，包含以下组件：

- 🌐 **Web 版本**：基于现代 Web 技术的在线版本
- 📱 **移动应用**：Flutter 构建的跨平台移动应用
- 🖥️ **桌面应用**：Electron 构建的原生桌面体验
- ⚡ **后端 API**：Node.js + MongoDB 的强大后端服务

## 🚀 快速开始

### 选择适合您的版本

#### 🖥️ 桌面版（推荐新手）

**最简单的使用方式**：
1. 进入 `electron_app` 文件夹
2. 双击 `TodoList.command` 文件
3. 等待自动安装和启动
4. 开始使用！

**特点**：
- ✅ 无需额外配置
- ✅ 离线使用
- ✅ 原生桌面体验
- ✅ 数据本地存储

#### 🌐 完整系统（推荐开发者）

**启动完整系统**：
```bash
# 一键启动所有服务
./quick_start.sh -d

# 或者分别启动
./quick_start.sh -b  # 仅后端
./quick_start.sh -f  # 仅前端
```

**访问地址**：
- 后端 API：http://localhost:3001
- API 文档：http://localhost:3001/api/docs
- 前端应用：http://localhost:8080

## 📱 各平台使用指南

### 🖥️ 桌面应用使用

#### 启动应用
```bash
cd electron_app

# 方式一：双击启动（推荐）
# 双击 TodoList.command 文件

# 方式二：命令行启动
npm install  # 首次运行
npm start
```

#### 主要功能
- **添加任务**：在顶部输入框输入内容，按 Enter 或点击 ➕
- **设置优先级**：选择高、中、低优先级
- **设置截止日期**：点击日期选择器
- **完成任务**：点击任务前的复选框
- **编辑任务**：双击任务内容
- **删除任务**：点击任务右侧的删除按钮
- **筛选任务**：使用顶部的筛选按钮
- **搜索任务**：在搜索框输入关键词

#### 快捷键
| 快捷键 | 功能 |
|--------|------|
| `Cmd/Ctrl + N` | 新建任务 |
| `Cmd/Ctrl + F` | 搜索任务 |
| `Enter` | 添加任务 |
| `Escape` | 取消编辑 |

### 🌐 Web 版本使用

#### 启动 Web 版本
```bash
# 启动完整系统
./quick_start.sh -d

# 访问 http://localhost:8080
```

#### 功能特点
- 🔐 用户注册和登录
- 📊 数据同步到云端
- 🌐 跨设备访问
- 📈 数据统计和分析

### 📱 移动应用使用

#### 环境准备
```bash
# 安装 Flutter SDK
# 参考：https://flutter.dev/docs/get-started/install

cd flutter_app
flutter pub get
```

#### 运行应用
```bash
# Web 版本
flutter run -d web-server --web-port 8080

# iOS 模拟器
flutter run -d ios

# Android 模拟器
flutter run -d android
```

## 🔧 系统管理

### 端口管理

使用内置的端口管理工具：

```bash
# 查看服务状态
./port_manager.sh -s

# 检查特定端口
./port_manager.sh -c 3001

# 释放端口
./port_manager.sh -k 3001

# 释放所有相关端口
./port_manager.sh -a -k
```

### 服务控制

```bash
# 启动所有服务
./quick_start.sh -d

# 仅启动后端
./quick_start.sh -b

# 仅启动前端
./quick_start.sh -f

# 停止所有服务
./quick_start.sh --stop

# 查看帮助
./quick_start.sh --help
```

## 💾 数据管理

### 桌面版数据

**数据位置**：
- macOS: `~/Library/Application Support/todolist-desktop/`
- Windows: `%APPDATA%\todolist-desktop\`
- Linux: `~/.config/todolist-desktop/`

**备份数据**：
1. 打开桌面应用
2. 点击设置按钮
3. 选择「导出数据」
4. 保存 JSON 文件

**恢复数据**：
1. 点击设置按钮
2. 选择「导入数据」
3. 选择之前导出的 JSON 文件

### Web 版数据

**数据同步**：
- 数据存储在 MongoDB 数据库
- 支持多设备同步
- 自动备份机制

**导出数据**：
```bash
# 通过 API 导出
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/tasks/export
```

## 🔐 用户账户管理

### 注册新账户

1. **Web 版本**：
   - 访问 http://localhost:8080
   - 点击「注册」按钮
   - 填写用户信息

2. **API 方式**：
   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
        -H "Content-Type: application/json" \
        -d '{"username":"your_username","email":"your_email","password":"your_password"}'
   ```

### 登录系统

1. **Web 界面登录**
2. **API 登录**：
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"your_email","password":"your_password"}'
   ```

## 🛠️ 故障排除

### 常见问题

#### 1. 端口被占用

**问题**：启动时提示端口已被使用

**解决方案**：
```bash
# 检查端口占用
./port_manager.sh -c 3001

# 释放端口
./port_manager.sh -k 3001

# 或者重启服务
./quick_start.sh --stop
./quick_start.sh -d
```

#### 2. MongoDB 连接失败

**问题**：后端无法连接数据库

**解决方案**：
```bash
# 检查 MongoDB 状态
./port_manager.sh -c 27017

# 启动 MongoDB（macOS）
brew services start mongodb-community

# 或使用 Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

#### 3. 桌面应用无法启动

**问题**：双击 TodoList.command 无反应

**解决方案**：
```bash
# 检查 Node.js 安装
node --version

# 重新安装依赖
cd electron_app
rm -rf node_modules
npm install

# 手动启动
npm start
```

#### 4. Flutter 应用构建失败

**问题**：Flutter 应用无法运行

**解决方案**：
```bash
# 检查 Flutter 环境
flutter doctor

# 清理并重新获取依赖
cd flutter_app
flutter clean
flutter pub get

# 重新运行
flutter run -d web-server --web-port 8080
```

### 性能优化

#### 桌面应用优化
1. **清理数据**：定期删除已完成的任务
2. **重启应用**：长时间使用后重启应用
3. **关闭不必要的功能**：在设置中关闭动画效果

#### Web 应用优化
1. **清理浏览器缓存**
2. **使用现代浏览器**：Chrome、Firefox、Safari 最新版本
3. **检查网络连接**：确保与后端服务的连接稳定

## 📊 使用技巧

### 高效任务管理

1. **使用优先级**：
   - 🔴 高优先级：紧急重要的任务
   - 🟡 中优先级：重要但不紧急的任务
   - 🟢 低优先级：可以延后的任务

2. **设置截止日期**：
   - 为重要任务设置明确的截止日期
   - 利用逾期提醒功能

3. **使用筛选功能**：
   - 查看特定状态的任务
   - 按优先级筛选
   - 查看逾期任务

4. **搜索功能**：
   - 使用关键词快速找到任务
   - 支持模糊搜索

### 数据安全

1. **定期备份**：
   - 桌面版：定期导出数据
   - Web 版：数据自动备份到云端

2. **多设备同步**：
   - 使用 Web 版本实现跨设备同步
   - 保持数据一致性

## 🔄 版本更新

### 检查更新

1. **桌面应用**：
   - 应用会自动检查更新
   - 或手动检查：帮助 → 检查更新

2. **Web 应用**：
   - 刷新浏览器获取最新版本
   - 清理缓存确保更新生效

3. **移动应用**：
   - 通过应用商店更新
   - 或重新构建最新版本

### 更新流程

```bash
# 更新项目代码
git pull origin main

# 更新依赖
npm install

# 重新构建
./quick_start.sh --build

# 重启服务
./quick_start.sh --stop
./quick_start.sh -d
```

## 📞 获取帮助

### 文档资源

- 📖 [项目 README](README.md) - 项目概览和技术文档
- 🚀 [部署指南](DEPLOYMENT_GUIDE.md) - 生产环境部署
- 🔧 [端口管理](PORT_MANAGEMENT.md) - 端口管理工具使用
- 🖥️ [桌面应用文档](electron_app/README.md) - 桌面版详细说明

### 技术支持

1. **查看日志**：
   - 桌面应用：开发者工具 → Console
   - Web 应用：浏览器开发者工具
   - 后端服务：终端输出日志

2. **社区支持**：
   - 提交 Issue 到项目仓库
   - 查看已有的问题和解决方案

3. **联系开发团队**：
   - 通过项目仓库联系
   - 提供详细的错误信息和系统环境

---

**祝您使用愉快！如果有任何问题，请随时联系我们。** 🎉