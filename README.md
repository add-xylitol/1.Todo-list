# TodoList Pro - 全栈任务管理应用

一个功能完整、可商业化的多平台任务管理应用，支持 Web、移动端和桌面端。

## 🎯 项目概述

本项目是一个企业级的 TodoList 应用，具备完整的用户管理、任务管理、订阅付费、多平台支持等功能。项目采用现代化的技术栈，支持快速部署和商业化运营。

### 核心特性

- 🔐 **用户认证系统**：注册、登录、JWT 认证
- 📝 **任务管理**：创建、编辑、删除、分类任务
- 💳 **订阅付费**：支持微信支付、支付宝、Apple Pay、Google Pay
- 🌐 **多平台支持**：Web、iOS、Android、桌面应用
- 📊 **API 文档**：完整的 Swagger 文档
- 🚀 **一键部署**：自动化部署脚本
- 🔧 **开发工具**：端口管理、服务监控

## 📁 项目结构

```
TodoList/
├── backend/                    # Node.js 后端服务
│   ├── server.js              # 服务器入口文件
│   ├── models/                # 数据模型
│   │   ├── User.js           # 用户模型
│   │   └── Task.js           # 任务模型
│   ├── routes/                # API 路由
│   │   ├── auth.js           # 认证路由
│   │   ├── tasks.js          # 任务路由
│   │   ├── users.js          # 用户路由
│   │   └── subscriptions.js  # 订阅路由
│   ├── middleware/            # 中间件
│   │   └── auth.js           # 认证中间件
│   └── package.json          # 后端依赖
├── flutter_app/               # Flutter 移动应用
│   ├── lib/
│   │   ├── main.dart         # 应用入口
│   │   ├── models/           # 数据模型
│   │   ├── screens/          # 界面页面
│   │   ├── services/         # 服务层
│   │   │   └── payment_service.dart  # 支付服务
│   │   ├── providers/        # 状态管理
│   │   ├── widgets/          # 自定义组件
│   │   └── utils/            # 工具函数
│   └── pubspec.yaml          # Flutter 依赖
├── electron_app/              # Electron 桌面应用
│   ├── main.js               # 主进程
│   ├── renderer/             # 渲染进程
│   │   ├── index.html        # 主界面
│   │   ├── renderer.js       # 渲染逻辑
│   │   └── style.css         # 样式文件
│   └── package.json          # 桌面应用依赖
├── server/                    # 扩展后端服务（备用）
├── quick_start.sh             # 一键启动脚本
├── port_manager.sh            # 端口管理工具
├── DEPLOYMENT_GUIDE.md        # 部署指南
├── PORT_MANAGEMENT.md         # 端口管理文档
└── README.md                  # 项目说明（本文件）
```

## 🛠️ 技术栈

### 后端
- **Node.js** + **Express.js** - 服务器框架
- **MongoDB** + **Mongoose** - 数据库
- **JWT** - 身份认证
- **Swagger** - API 文档
- **Helmet** + **CORS** - 安全防护

### 前端
- **Flutter** - 跨平台移动应用
- **Electron** - 桌面应用
- **HTML/CSS/JavaScript** - Web 界面

### 支付集成
- **微信支付** - 中国市场
- **支付宝** - 中国市场
- **Apple Pay** - iOS 应用内购买
- **Google Pay** - Android 应用内购买

## 🚀 快速开始

### 系统要求

- **Node.js** 16.x 或更高版本
- **npm** 或 **yarn**
- **MongoDB** 数据库
- **Flutter** SDK（可选，用于移动端开发）

### 一键启动

```bash
# 克隆项目
git clone <repository-url>
cd TodoList

# 给脚本执行权限
chmod +x quick_start.sh
chmod +x port_manager.sh

# 开发模式启动（推荐）
./quick_start.sh -d

# 查看帮助
./quick_start.sh --help
```

### 手动启动

1. **安装后端依赖**
   ```bash
   cd backend
   npm install
   ```

2. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，配置数据库连接等
   ```

3. **启动 MongoDB**
   ```bash
   # macOS
   brew services start mongodb-community
   
   # 或使用 Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

4. **启动后端服务**
   ```bash
   npm start
   ```

5. **启动桌面应用**
   ```bash
   cd electron_app
   npm install
   npm start
   ```

## 📖 API 文档

启动后端服务后，访问以下地址查看 API 文档：

- **API 文档**: http://localhost:3001/api/docs
- **健康检查**: http://localhost:3001/api/health

### 主要 API 端点

| 功能 | 方法 | 端点 | 说明 |
|------|------|------|------|
| 用户注册 | POST | `/api/auth/register` | 新用户注册 |
| 用户登录 | POST | `/api/auth/login` | 用户登录 |
| 获取任务 | GET | `/api/tasks` | 获取用户任务列表 |
| 创建任务 | POST | `/api/tasks` | 创建新任务 |
| 更新任务 | PUT | `/api/tasks/:id` | 更新指定任务 |
| 删除任务 | DELETE | `/api/tasks/:id` | 删除指定任务 |
| 订阅管理 | GET/POST | `/api/subscriptions` | 订阅相关操作 |

## 🔧 开发工具

### 端口管理工具

```bash
# 查看服务状态
./port_manager.sh -s

# 检查端口占用
./port_manager.sh -c 3001

# 释放端口
./port_manager.sh -k 3001

# 释放所有相关端口
./port_manager.sh -a -k
```

### 启动脚本选项

```bash
./quick_start.sh -h          # 显示帮助
./quick_start.sh -d          # 开发模式（前后端）
./quick_start.sh -b          # 仅后端
./quick_start.sh -f          # 仅前端
./quick_start.sh --build     # 仅构建
./quick_start.sh --stop      # 停止所有服务
```

## 📱 移动端开发

### Flutter 环境配置

1. **安装 Flutter SDK**
   ```bash
   # 参考 flutter_app/INSTALL_FLUTTER.md
   ```

2. **获取依赖**
   ```bash
   cd flutter_app
   flutter pub get
   ```

3. **运行应用**
   ```bash
   # Web 版本
   flutter run -d web-server --web-port 8080
   
   # iOS 模拟器
   flutter run -d ios
   
   # Android 模拟器
   flutter run -d android
   ```

## 🖥️ 桌面应用

### Electron 应用特性

- ✅ 原生桌面体验
- ✅ 系统托盘集成
- ✅ 快捷键支持
- ✅ 自动更新机制
- ✅ 跨平台支持（Windows、macOS、Linux）

### 打包发布

```bash
cd electron_app

# 安装打包工具
npm install -g electron-builder

# 打包当前平台
npm run build

# 打包所有平台
npm run build:all
```

## 💳 支付集成

项目已集成多种支付方式，支持订阅模式：

### 支持的支付方式

- **微信支付**：适用于中国用户
- **支付宝**：适用于中国用户
- **Apple Pay**：iOS 应用内购买
- **Google Pay**：Android 应用内购买

### 支付服务配置

参考 `flutter_app/lib/services/payment_service.dart` 文件进行配置。

## 🚀 部署指南

详细的部署指南请参考 [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)，包含：

- 🌐 **Web 部署**：Vercel、Netlify、传统服务器
- 📱 **移动端发布**：App Store、Google Play
- 🖥️ **桌面应用分发**：官网下载、应用商店
- 💰 **商业化策略**：定价、营销、运营

## 📋 详细开发步骤记录

### 第一阶段：项目初始化

1. **创建项目结构**
   - 初始化 Node.js 后端项目
   - 创建 Flutter 移动应用
   - 设置 Electron 桌面应用

2. **配置开发环境**
   - 安装必要的依赖包
   - 配置 ESLint 和 Prettier
   - 设置 Git 忽略文件

### 第二阶段：后端开发

1. **数据库设计**
   - 用户模型（User.js）
   - 任务模型（Task.js）
   - MongoDB 连接配置

2. **API 开发**
   - 用户认证系统
   - 任务 CRUD 操作
   - 订阅管理功能

3. **安全和中间件**
   - JWT 认证中间件
   - CORS 配置
   - 请求限制和安全头

### 第三阶段：前端开发

1. **Flutter 应用**
   - 页面路由设置
   - 状态管理（Provider）
   - API 服务封装

2. **Electron 应用**
   - 主进程和渲染进程
   - 原生菜单和托盘
   - 窗口管理

### 第四阶段：支付集成

1. **支付服务开发**
   - 微信支付 SDK 集成
   - 支付宝 SDK 集成
   - 应用内购买配置

2. **订阅系统**
   - 订阅计划管理
   - 支付回调处理
   - 订阅状态同步

### 第五阶段：工具和部署

1. **开发工具**
   - 一键启动脚本
   - 端口管理工具
   - 服务监控脚本

2. **部署准备**
   - Docker 配置
   - CI/CD 流水线
   - 环境变量管理

## 🕳️ 开发过程中的坑和解决方案

### 1. 端口冲突问题

**问题**：多次启动服务导致端口被占用

**解决方案**：
- 开发了专门的端口管理工具 `port_manager.sh`
- 在启动脚本中加入自动端口检测和释放功能
- 实现优雅关闭和强制终止的两阶段处理

### 2. MongoDB 连接问题

**问题**：本地 MongoDB 服务未启动或连接配置错误

**解决方案**：
- 在启动脚本中加入 MongoDB 状态检查
- 提供多种 MongoDB 启动方式（本地安装、Docker）
- 详细的错误提示和解决建议

### 3. Flutter Web 构建问题

**问题**：Flutter Web 构建失败或运行缓慢

**解决方案**：
- 优化 Flutter Web 配置
- 提供开发服务器和生产构建两种模式
- 添加构建状态检查和错误处理

### 4. Electron 打包问题

**问题**：不同平台打包配置复杂

**解决方案**：
- 使用 electron-builder 统一打包流程
- 配置自动签名和公证（macOS）
- 提供多平台构建脚本

### 5. API 文档同步问题

**问题**：API 变更后文档未及时更新

**解决方案**：
- 集成 Swagger 自动生成文档
- 在代码中添加详细的 API 注释
- 设置开发环境自动启用文档服务

## 🏗️ 标准软件开发流程

基于本项目的经验，总结出以下标准开发流程：

### 1. 项目规划阶段

- **需求分析**：明确功能需求和技术需求
- **技术选型**：选择合适的技术栈和架构
- **项目结构设计**：设计清晰的目录结构
- **开发计划**：制定详细的开发时间表

### 2. 环境搭建阶段

- **开发环境配置**：统一团队开发环境
- **代码规范设置**：ESLint、Prettier、Git hooks
- **CI/CD 流水线**：自动化测试和部署
- **文档框架**：建立项目文档结构

### 3. 核心开发阶段

- **数据库设计**：设计数据模型和关系
- **API 设计**：RESTful API 设计和文档
- **核心功能开发**：按优先级开发核心功能
- **单元测试**：编写和维护测试用例

### 4. 集成测试阶段

- **接口联调**：前后端接口对接
- **功能测试**：完整功能流程测试
- **性能测试**：负载和压力测试
- **安全测试**：安全漏洞扫描

### 5. 部署上线阶段

- **生产环境配置**：服务器和数据库配置
- **域名和证书**：HTTPS 和域名配置
- **监控告警**：服务监控和日志收集
- **备份策略**：数据备份和恢复方案

### 6. 运营维护阶段

- **用户反馈收集**：建立反馈渠道
- **版本迭代**：定期功能更新
- **性能优化**：持续性能改进
- **安全更新**：及时修复安全问题

## 🚀 架构改进建议

### 当前架构的优点

- ✅ **模块化设计**：清晰的目录结构和职责分离
- ✅ **多平台支持**：一套后端支持多个前端
- ✅ **自动化工具**：完善的开发和部署工具
- ✅ **文档完善**：详细的开发和部署文档

### 可以改进的方面

#### 1. 微服务架构

**当前**：单体后端应用

**改进建议**：
- 拆分为用户服务、任务服务、支付服务
- 使用 API Gateway 统一入口
- 引入服务发现和负载均衡

#### 2. 数据库优化

**当前**：单一 MongoDB 数据库

**改进建议**：
- 读写分离：主从复制配置
- 缓存层：Redis 缓存热点数据
- 分库分表：支持大规模用户

#### 3. 前端架构

**当前**：多个独立前端项目

**改进建议**：
- 组件库：统一 UI 组件库
- 状态管理：全局状态管理方案
- 代码共享：共享业务逻辑代码

#### 4. 监控和日志

**当前**：基础日志记录

**改进建议**：
- APM 监控：应用性能监控
- 链路追踪：分布式链路追踪
- 实时告警：异常实时通知

#### 5. 安全加固

**当前**：基础安全措施

**改进建议**：
- OAuth 2.0：第三方登录集成
- 数据加密：敏感数据加密存储
- 安全审计：操作日志审计

### 推荐的技术栈升级

#### 后端技术栈

- **框架**：Node.js + Express.js → Node.js + NestJS
- **数据库**：MongoDB → MongoDB + Redis + PostgreSQL
- **消息队列**：无 → Redis/RabbitMQ
- **监控**：基础日志 → Prometheus + Grafana

#### 前端技术栈

- **状态管理**：Provider → Redux Toolkit/Zustand
- **UI 框架**：原生组件 → 统一设计系统
- **构建工具**：默认配置 → Webpack/Vite 优化
- **测试框架**：无 → Jest + Cypress

#### DevOps 工具链

- **容器化**：无 → Docker + Kubernetes
- **CI/CD**：无 → GitHub Actions/GitLab CI
- **监控**：基础检查 → ELK Stack
- **部署**：手动部署 → 自动化部署

## 📞 技术支持

如果在开发过程中遇到问题，可以：

1. 查看 [PORT_MANAGEMENT.md](PORT_MANAGEMENT.md) 解决端口问题
2. 查看 [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) 解决部署问题
3. 检查项目 Issues 页面
4. 提交新的 Issue 描述问题

## 📄 许可证

本项目采用 MIT 许可证，详情请查看 LICENSE 文件。

---

**祝您开发愉快！🎉**