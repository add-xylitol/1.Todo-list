# TodoList Pro

一个简洁高效的多平台任务管理应用，支持移动端和桌面端。

## 🎯 项目概述

本项目是一个现代化的 TodoList 应用，专注于核心的任务管理功能。项目采用简洁的架构设计，易于部署和维护。

### 核心特性

- 🔐 **用户认证系统**：注册、登录、JWT 认证
- 📝 **任务管理**：创建、编辑、删除任务
- 📱 **移动应用**：Flutter 跨平台移动端
- 🖥️ **桌面应用**：Electron 桌面客户端
- 🔧 **RESTful API**：完整的后端服务

## 📦 版本 1 发布说明（当前）

宗旨：当前版本已可在本地稳定运行，并可一键打包为压缩包进行分发；支持通过临时公网隧道进行联合验证。如需长期公网访问，推荐部署到自有服务器（可投入少量成本）。

### 运行环境
- Node.js >= 16（已在 Node 23 验证）
- npm >= 8
- 操作系统：macOS / Linux / Windows

### 本地快速运行
1) 安装依赖
- 在项目根目录执行：
  - `npm install`

2) 启动开发服务（含热重载）
- `npm run dev`
- 后端默认监听：`http://localhost:8000`
- 前端静态页面由同一进程静态服务于根路径

3) 启动生产服务
- `npm start`
- 同样监听 `http://localhost:8000`

4) 健康检查
- `GET /healthz` 与 `GET /readyz` 返回 200 代表服务健康

### 一键暴露到公网（短期验证）
- 使用内置脚本基于 localhost.run 建立临时隧道：
  - 开发模式：`npm run dev:pub`
  - 生产模式：`npm run start:pub`
- 终端会输出一个形如 `https://xxxxxxxxxxxxxx.lhr.life` 的临时公网地址。
- 注意：这是免费隧道，可能随机器休眠/网络波动中断，断开后需重新运行脚本获取新地址。

### 端到端冒烟测试（可对公网地址）
- 脚本：`tests/smoke.mjs`
- 默认基址可通过环境变量覆盖：`SMOKE_BASE="https://your-subdomain.lhr.life"`
- 示例：
  - `SMOKE_BASE="https://xxxx.lhr.life" node tests/smoke.mjs`
- 覆盖范围：主页、静态资源、Socket 客户端、健康检查、注册、登录、任务创建与验证。

### 打包为压缩包分发（版本 1）
- 推荐打包内容：
  - 保留：项目全部源码、package.json、package-lock.json、public/、server/、tests/ 等
  - 可排除：`node_modules/`、`.git/`、`*.log`、`dist/`（如需精简体积）
- 建议命名：`todolist-pro-v1.zip`
- 解压后执行：
  - `npm install`
  - `npm run dev` 或 `npm start`

### 自有服务器部署（长期稳定访问，推荐）
以下为最低可行方案，约几十元/月即可：

1) 服务器建议
- 1 核 CPU / 1GB 内存 / 20GB 磁盘 的轻量云服务器
- Ubuntu 22.04 LTS

2) 系统准备
- 安装 Node.js（建议通过 nvm 安装 >=16）
- 安装 pm2：`npm i -g pm2`

3) 拉取与安装
- `git clone <你的仓库地址>`
- `cd 1.Todo-list-main && npm install`

4) 使用 pm2 常驻运行
- `pm2 start server/app.js --name todolist-pro`
- `pm2 save && pm2 startup`（开机自启）

5) 通过 Nginx 暴露 80/443 端口（可选但推荐）
- Nginx 反向代理到 `http://127.0.0.1:8000`
- 开启 gzip、缓存静态资源
- 申请并配置 Let’s Encrypt TLS 证书（如使用 certbot）

6) 健康检查与日志
- 健康检查：`/healthz`、`/readyz`
- 日志：`pm2 logs todolist-pro`

7) 数据与持久化
- 当前使用 SQLite 自动建表，数据文件位于项目根（或 server/config 指定目录）
- 生产可迁移至 MySQL/PostgreSQL（Sequelize 已支持），需配置环境变量并执行迁移

### 常见问题
- 8000 端口被占用：终止占用进程或修改 `PORT` 环境变量
- 公网隧道断开：重新执行 `npm run dev:pub` 或 `npm run start:pub`
- 静态资源/Socket 加载失败：确认通过同一域名访问，客户端已通过 `<script src="/socket.io/socket.io.js"></script>` 引入

---

## 📁 项目结构

```
TodoList/
├── server/                    # Node.js 后端服务
│   ├── app.js                # 服务器入口文件 
│   ├── config/               # 配置文件
│   │   └── database.js       # 数据库配置
│   ├── controllers/          # 控制器
│   │   ├── authController.js # 认证控制器
│   │   ├── taskController.js # 任务控制器
│   │   ├── tasksController.js# 任务控制器（备用）
│   │   └── userController.js # 用户控制器
│   ├── middleware/           # 中间件
│   │   ├── auth.js          # 认证中间件
│   │   └── errorHandler.js  # 错误处理
│   ├── models/              # 数据模型
│   │   ├── Task.js          # 任务模型
│   │   ├── User.js          # 用户模型
│   │   └── index.js         # 模型索引
│   ├── routes/              # API 路由
│   │   ├── auth.js          # 认证路由
│   │   ├── tasks.js         # 任务路由
│   │   ├── users.js         # 用户路由
│   │   └── index.js         # 路由索引
│   └── utils/               # 工具函数
│       ├── logger.js        # 日志工具
│       └── validation.js    # 验证工具
├── public/                  # Web 静态资源（本项目主要前端）
│   ├── index.html
│   ├── script.js
│   └── style.css
├── tests/                   # 测试脚本（含 E2E 冒烟）
├── package.json             # 项目依赖与脚本
└── README.md                # 项目说明（本文件）
```

## 🛠️ 技术栈

- 后端：Express + Sequelize + SQLite + JWT + Socket.IO
- 前端：原生 HTML/CSS/JS + Bootstrap（CDN）
- 工具：nodemon、jest、playwright、pm2（部署推荐）

## 🚀 快速开始（补充）

- 安装依赖：`npm install`
- 开发模式：`npm run dev`
- 生产服务：`npm start`
- 公网隧道：`npm run dev:pub` 或 `npm run start:pub`
- E2E 冒烟：`SMOKE_BASE="https://xxxx.lhr.life" node tests/smoke.mjs`

## 📖 API（节选）
- 认证：`POST /api/auth/register`、`POST /api/auth/login`
- 任务：`GET/POST/PUT/DELETE /api/tasks`
- 健康：`GET /healthz`、`GET /readyz`