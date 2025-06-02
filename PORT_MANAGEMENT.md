# 端口管理指南

本项目提供了完善的端口管理功能，可以自动检测和释放被占用的端口，确保前后端服务能够正常启动。

## 🚀 快速启动脚本 (quick_start.sh)

### 基本用法

```bash
# 显示帮助信息
./quick_start.sh --help

# 完整启动 (默认模式)
./quick_start.sh

# 开发模式 (前后端都启动)
./quick_start.sh -d

# 仅启动后端
./quick_start.sh -b

# 仅启动前端
./quick_start.sh -f

# 仅构建前端
./quick_start.sh --build

# 停止所有服务
./quick_start.sh --stop
```

### 自动端口管理功能

快速启动脚本具备以下端口管理功能：

1. **自动检测端口占用**：启动服务前自动检查端口是否被占用
2. **优雅关闭进程**：先尝试使用 SIGTERM 信号优雅关闭进程
3. **强制终止进程**：如果优雅关闭失败，则强制终止进程
4. **端口释放验证**：确认端口已成功释放后再启动新服务
5. **信号处理**：支持 Ctrl+C 优雅停止所有服务

### 支持的端口

- **后端服务**: 3001
- **前端服务**: 8080
- **MongoDB**: 27017

## 🔧 端口管理工具 (port_manager.sh)

专门的端口管理工具，提供更精细的端口控制功能。

### 基本用法

```bash
# 显示帮助信息
./port_manager.sh --help

# 检查指定端口
./port_manager.sh -c 3001

# 释放指定端口
./port_manager.sh -k 3001

# 检查所有默认端口
./port_manager.sh -a -c

# 释放所有默认端口
./port_manager.sh -a -k

# 列出所有被占用的端口
./port_manager.sh -l

# 显示服务状态
./port_manager.sh -s
```

### 功能特性

1. **端口检查** (`-c, --check`)
   - 检查指定端口是否被占用
   - 显示占用进程的详细信息
   - 支持批量检查多个端口

2. **端口释放** (`-k, --kill`)
   - 优雅关闭占用端口的进程
   - 强制终止无响应的进程
   - 验证端口释放状态

3. **批量操作** (`-a, --all`)
   - 对所有默认端口执行操作
   - 适用于快速清理环境

4. **端口扫描** (`-l, --list`)
   - 扫描常用端口范围 (3000-9000)
   - 列出所有被占用的端口
   - 显示占用进程信息

5. **服务状态** (`-s, --status`)
   - 检查 TodoList 相关服务状态
   - 显示服务访问地址
   - 提供服务健康检查

## 📋 使用场景

### 场景1：开发环境启动

```bash
# 启动开发环境
./quick_start.sh -d

# 如果遇到端口占用问题，脚本会自动处理
# 也可以手动检查状态
./port_manager.sh -s
```

### 场景2：端口冲突解决

```bash
# 检查哪些端口被占用
./port_manager.sh -l

# 释放特定端口
./port_manager.sh -k 3001

# 或释放所有相关端口
./port_manager.sh -a -k
```

### 场景3：服务状态监控

```bash
# 查看服务运行状态
./port_manager.sh -s

# 检查特定服务
./port_manager.sh -c 3001
```

### 场景4：环境清理

```bash
# 停止所有服务
./quick_start.sh --stop

# 或使用端口管理工具清理
./port_manager.sh -a -k
```

## ⚠️ 注意事项

1. **权限要求**：某些系统进程可能需要管理员权限才能终止
2. **数据安全**：强制终止进程可能导致数据丢失，建议先尝试优雅关闭
3. **端口范围**：端口扫描功能默认扫描 3000-9000 范围，可根据需要调整
4. **网络检查**：服务状态检查依赖网络连接，确保本地网络正常

## 🔍 故障排除

### 问题1：端口仍被占用

```bash
# 检查详细进程信息
./port_manager.sh -c 3001

# 手动查找进程
lsof -i :3001

# 强制终止
sudo kill -9 <PID>
```

### 问题2：服务启动失败

```bash
# 检查所有端口状态
./port_manager.sh -s

# 清理所有端口
./port_manager.sh -a -k

# 重新启动
./quick_start.sh -d
```

### 问题3：MongoDB 连接问题

```bash
# 检查 MongoDB 状态
./port_manager.sh -c 27017

# 启动 MongoDB (如果未运行)
brew services start mongodb-community
```

## 📚 相关文档

- [部署指南](DEPLOYMENT_GUIDE.md)
- [项目 README](README.md)
- [支付服务文档](flutter_app/lib/services/payment_service.dart)

## 🤝 贡献

如果您发现端口管理功能的问题或有改进建议，欢迎提交 Issue 或 Pull Request。