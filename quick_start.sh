#!/bin/bash

# TodoList 快速启动脚本
# 用于快速部署和测试整个系统

echo "🚀 TodoList 快速启动脚本"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查必要的工具
check_requirements() {
    echo -e "${BLUE}检查系统要求...${NC}"
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js 未安装，请先安装 Node.js${NC}"
        exit 1
    fi
    
    # 检查 npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm 未安装，请先安装 npm${NC}"
        exit 1
    fi
    
    # 检查 Flutter
    if ! command -v flutter &> /dev/null; then
        echo -e "${YELLOW}⚠️  Flutter 未安装，将跳过前端构建${NC}"
        FLUTTER_AVAILABLE=false
    else
        FLUTTER_AVAILABLE=true
    fi
    
    # 检查 MongoDB
    if ! command -v mongod &> /dev/null; then
        echo -e "${YELLOW}⚠️  MongoDB 未安装，请确保 MongoDB 服务正在运行${NC}"
    fi
    
    echo -e "${GREEN}✅ 系统要求检查完成${NC}"
}

# 安装后端依赖
install_backend() {
    echo -e "${BLUE}安装后端依赖...${NC}"
    cd backend
    
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ 未找到 package.json 文件${NC}"
        exit 1
    fi
    
    npm install
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 后端依赖安装完成${NC}"
    else
        echo -e "${RED}❌ 后端依赖安装失败${NC}"
        exit 1
    fi
    
    cd ..
}

# 配置环境变量
setup_env() {
    echo -e "${BLUE}配置环境变量...${NC}"
    
    if [ ! -f "backend/.env" ]; then
        echo -e "${YELLOW}创建 .env 文件...${NC}"
        cp backend/.env.example backend/.env 2>/dev/null || {
            cat > backend/.env << EOF
# 基础配置
PORT=3001
NODE_ENV=development

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/todolist

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# 前端URL
FRONTEND_URL=http://localhost:8080

# Stripe支付配置 (生产环境需要真实密钥)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# 邮件配置 (可选)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# 应用配置
APP_NAME=TodoList
APP_URL=http://localhost:3001

# 订阅价格 (分为单位)
SUBSCRIPTION_PRICE_MONTHLY=100
SUBSCRIPTION_PRICE_YEARLY=1000

# 文件上传限制
MAX_FILE_SIZE=10485760

# Redis配置 (可选，用于缓存)
REDIS_URL=redis://localhost:6379

# 日志级别
LOG_LEVEL=info

# Swagger API文档
ENABLE_SWAGGER=true
EOF
        }
        echo -e "${GREEN}✅ .env 文件创建完成${NC}"
    else
        echo -e "${GREEN}✅ .env 文件已存在${NC}"
    fi
}

# 启动 MongoDB (如果需要)
start_mongodb() {
    echo -e "${BLUE}检查 MongoDB 状态...${NC}"
    
    # 检查 MongoDB 是否正在运行
    if pgrep -x "mongod" > /dev/null; then
        echo -e "${GREEN}✅ MongoDB 已在运行${NC}"
    else
        echo -e "${YELLOW}启动 MongoDB...${NC}"
        
        # 尝试启动 MongoDB
        if command -v brew &> /dev/null; then
            # macOS with Homebrew
            brew services start mongodb-community &> /dev/null
        elif command -v systemctl &> /dev/null; then
            # Linux with systemd
            sudo systemctl start mongod &> /dev/null
        else
            # 手动启动
            mongod --dbpath ./data/db --fork --logpath ./data/mongodb.log &> /dev/null
        fi
        
        sleep 3
        
        if pgrep -x "mongod" > /dev/null; then
            echo -e "${GREEN}✅ MongoDB 启动成功${NC}"
        else
            echo -e "${YELLOW}⚠️  MongoDB 启动失败，请手动启动 MongoDB${NC}"
        fi
    fi
}

# 检查并释放端口
free_port() {
    local port=$1
    local service_name=$2
    
    echo -e "${BLUE}检查端口 ${port} 占用情况...${NC}"
    
    # 获取占用端口的进程ID
    local pids=$(lsof -ti:${port} 2>/dev/null)
    
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}端口 ${port} 被以下进程占用: ${pids}${NC}"
        echo -e "${YELLOW}正在终止 ${service_name} 相关进程...${NC}"
        
        # 尝试优雅关闭
        for pid in $pids; do
            if ps -p $pid > /dev/null 2>&1; then
                echo -e "${BLUE}尝试优雅关闭进程 ${pid}...${NC}"
                kill -TERM $pid 2>/dev/null
            fi
        done
        
        # 等待进程关闭
        sleep 3
        
        # 检查是否还有进程占用端口
        local remaining_pids=$(lsof -ti:${port} 2>/dev/null)
        if [ -n "$remaining_pids" ]; then
            echo -e "${YELLOW}强制终止剩余进程...${NC}"
            for pid in $remaining_pids; do
                if ps -p $pid > /dev/null 2>&1; then
                    echo -e "${RED}强制终止进程 ${pid}${NC}"
                    kill -9 $pid 2>/dev/null
                fi
            done
            sleep 2
        fi
        
        # 最终检查
        if lsof -Pi :${port} -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${RED}❌ 端口 ${port} 仍被占用，请手动处理${NC}"
            return 1
        else
            echo -e "${GREEN}✅ 端口 ${port} 已释放${NC}"
        fi
    else
        echo -e "${GREEN}✅ 端口 ${port} 未被占用${NC}"
    fi
    
    return 0
}

# 启动后端服务
start_backend() {
    echo -e "${BLUE}启动后端服务...${NC}"
    
    cd backend
    
    # 释放后端端口
    free_port 3001 "后端服务"
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 无法释放端口 3001，退出启动${NC}"
        exit 1
    fi
    
    # 启动服务器
    echo -e "${BLUE}启动 Node.js 服务器...${NC}"
    npm start &
    BACKEND_PID=$!
    
    # 等待服务器启动
    sleep 5
    
    # 检查服务器是否启动成功
    if curl -s http://localhost:3001/api/health > /dev/null; then
        echo -e "${GREEN}✅ 后端服务启动成功 (PID: $BACKEND_PID)${NC}"
        echo -e "${GREEN}📋 后端地址: http://localhost:3001${NC}"
        echo -e "${GREEN}📖 API 文档: http://localhost:3001/api/docs${NC}"
        echo -e "${GREEN}❤️  健康检查: http://localhost:3001/api/health${NC}"
    else
        echo -e "${RED}❌ 后端服务启动失败${NC}"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    
    cd ..
}

# 启动前端开发服务器
start_frontend() {
    if [ "$FLUTTER_AVAILABLE" = true ]; then
        echo -e "${BLUE}启动 Flutter 前端开发服务器...${NC}"
        
        # 释放前端端口
        free_port 8080 "前端服务"
        if [ $? -ne 0 ]; then
            echo -e "${YELLOW}⚠️  无法释放端口 8080，跳过前端服务启动${NC}"
            return 1
        fi
        
        cd flutter_app
        
        # 获取依赖
        echo -e "${BLUE}获取 Flutter 依赖...${NC}"
        flutter pub get
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Flutter 依赖获取完成${NC}"
            
            # 启动开发服务器
            echo -e "${BLUE}启动 Flutter Web 开发服务器...${NC}"
            flutter run -d web-server --web-port 8080 --web-hostname 0.0.0.0 &
            FRONTEND_PID=$!
            
            # 等待服务器启动
            sleep 8
            
            # 检查服务器是否启动成功
            if curl -s http://localhost:8080 > /dev/null; then
                echo -e "${GREEN}✅ 前端开发服务器启动成功${NC}"
                echo -e "${GREEN}🌐 前端地址: http://localhost:8080${NC}"
            else
                echo -e "${YELLOW}⚠️  前端开发服务器启动失败${NC}"
                kill $FRONTEND_PID 2>/dev/null
            fi
        else
            echo -e "${YELLOW}⚠️  Flutter 依赖获取失败${NC}"
        fi
        
        cd ..
    else
        echo -e "${YELLOW}⚠️  跳过前端服务启动 (Flutter 不可用)${NC}"
    fi
}

# 构建前端 (如果 Flutter 可用)
build_frontend() {
    if [ "$FLUTTER_AVAILABLE" = true ]; then
        echo -e "${BLUE}构建 Flutter 前端...${NC}"
        
        cd flutter_app
        
        # 获取依赖
        flutter pub get
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Flutter 依赖获取完成${NC}"
            
            # 构建 Web 版本
            echo -e "${BLUE}构建 Web 版本...${NC}"
            flutter build web --release
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Web 版本构建完成${NC}"
                echo -e "${GREEN}📱 Web 应用: build/web/index.html${NC}"
            else
                echo -e "${YELLOW}⚠️  Web 版本构建失败${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  Flutter 依赖获取失败${NC}"
        fi
        
        cd ..
    else
        echo -e "${YELLOW}⚠️  跳过前端构建 (Flutter 不可用)${NC}"
    fi
}

# 运行测试
run_tests() {
    echo -e "${BLUE}运行基础测试...${NC}"
    
    # 测试 API 端点
    echo -e "${BLUE}测试 API 端点...${NC}"
    
    # 健康检查
    if curl -s http://localhost:3001/api/health | grep -q "OK"; then
        echo -e "${GREEN}✅ 健康检查通过${NC}"
    else
        echo -e "${RED}❌ 健康检查失败${NC}"
    fi
    
    # API 文档
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/docs | grep -q "200"; then
        echo -e "${GREEN}✅ API 文档可访问${NC}"
    else
        echo -e "${YELLOW}⚠️  API 文档不可访问${NC}"
    fi
}

# 显示启动信息
show_info() {
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}🎉 TodoList 启动完成！${NC}"
    echo -e "${GREEN}================================${NC}"
    echo -e "${BLUE}后端服务:${NC}"
    echo -e "  • API 地址: http://localhost:3001"
    echo -e "  • API 文档: http://localhost:3001/api/docs"
    echo -e "  • 健康检查: http://localhost:3001/api/health"
    echo ""
    
    if [ "$FLUTTER_AVAILABLE" = true ]; then
        echo -e "${BLUE}前端应用:${NC}"
        echo -e "  • Web 版本: flutter_app/build/web/index.html"
        echo -e "  • 开发服务器: cd flutter_app && flutter run -d web-server --web-port 8080"
        echo ""
    fi
    
    echo -e "${BLUE}下一步:${NC}"
    echo -e "  1. 查看 API 文档了解接口使用方法"
    echo -e "  2. 阅读 DEPLOYMENT_GUIDE.md 了解部署流程"
    echo -e "  3. 配置支付系统 (微信支付/支付宝)"
    echo -e "  4. 准备 App Store 发布材料"
    echo ""
    
    echo -e "${YELLOW}停止服务:${NC}"
    echo -e "  • 按 Ctrl+C 停止后端服务"
    echo -e "  • 或运行: pkill -f 'node server.js'"
    echo ""
}



# 停止所有服务
stop_services() {
    echo -e "${YELLOW}🛑 正在停止所有服务...${NC}"
    
    # 停止后端服务
    if [ -n "$BACKEND_PID" ]; then
        echo -e "${BLUE}停止后端服务 (PID: $BACKEND_PID)...${NC}"
        kill -TERM $BACKEND_PID 2>/dev/null
        sleep 2
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            kill -9 $BACKEND_PID 2>/dev/null
        fi
    fi
    
    # 停止前端服务
    if [ -n "$FRONTEND_PID" ]; then
        echo -e "${BLUE}停止前端服务 (PID: $FRONTEND_PID)...${NC}"
        kill -TERM $FRONTEND_PID 2>/dev/null
        sleep 2
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            kill -9 $FRONTEND_PID 2>/dev/null
        fi
    fi
    
    # 释放端口
    free_port 3001 "后端服务" > /dev/null 2>&1
    free_port 8080 "前端服务" > /dev/null 2>&1
    
    echo -e "${GREEN}✅ 所有服务已停止${NC}"
}

# 信号处理
trap 'stop_services; exit 0' INT TERM

# 显示使用帮助
show_help() {
    echo -e "${GREEN}TodoList 快速启动脚本${NC}"
    echo -e "${GREEN}========================${NC}"
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help          显示此帮助信息"
    echo "  -b, --backend-only  仅启动后端服务"
    echo "  -f, --frontend-only 仅启动前端服务"
    echo "  -d, --dev           启动开发模式 (前后端都启动)"
    echo "  --build             仅构建前端 (不启动服务)"
    echo "  --stop              停止所有服务"
    echo ""
    echo "示例:"
    echo "  $0                  # 完整启动 (默认)"
    echo "  $0 -d               # 开发模式"
    echo "  $0 -b               # 仅后端"
    echo "  $0 -f               # 仅前端"
    echo "  $0 --build          # 仅构建"
    echo "  $0 --stop           # 停止服务"
}

# 主函数
main() {
    local mode="full"
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -b|--backend-only)
                mode="backend"
                shift
                ;;
            -f|--frontend-only)
                mode="frontend"
                shift
                ;;
            -d|--dev)
                mode="dev"
                shift
                ;;
            --build)
                mode="build"
                shift
                ;;
            --stop)
                mode="stop"
                shift
                ;;
            *)
                echo -e "${RED}❌ 未知选项: $1${NC}"
                show_help
                exit 1
                ;;
        esac
    done
    
    echo -e "${GREEN}🚀 TodoList 快速启动脚本${NC}"
    echo -e "${GREEN}================================${NC}"
    
    case $mode in
        "stop")
            stop_services
            exit 0
            ;;
        "build")
            check_requirements
            build_frontend
            exit 0
            ;;
        "backend")
            echo -e "${BLUE}📋 启动模式: 仅后端${NC}"
            check_requirements
             install_backend_deps
             setup_env
             start_mongodb
             start_backend
            ;;
        "frontend")
            echo -e "${BLUE}📱 启动模式: 仅前端${NC}"
            check_requirements
            start_frontend
            ;;
        "dev")
            echo -e "${BLUE}🔧 启动模式: 开发模式${NC}"
            check_requirements
             install_backend_deps
             setup_env
             start_mongodb
             start_backend
             start_frontend
            ;;
        "full")
            echo -e "${BLUE}🎯 启动模式: 完整模式${NC}"
            check_requirements
             install_backend_deps
             setup_env
             start_mongodb
             start_backend
             build_frontend
             run_tests
            ;;
    esac
    
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}🎉 系统启动完成！${NC}"
    
    if [[ "$mode" == "backend" || "$mode" == "dev" || "$mode" == "full" ]]; then
        echo -e "${GREEN}📋 后端 API: http://localhost:3001${NC}"
        echo -e "${GREEN}📖 API 文档: http://localhost:3001/api/docs${NC}"
        echo -e "${GREEN}❤️  健康检查: http://localhost:3001/api/health${NC}"
    fi
    
    if [[ "$mode" == "frontend" || "$mode" == "dev" ]] && [ "$FLUTTER_AVAILABLE" = true ]; then
        echo -e "${GREEN}🌐 前端应用: http://localhost:8080${NC}"
    fi
    
    if [ "$mode" == "full" ] && [ "$FLUTTER_AVAILABLE" = true ]; then
        echo -e "${GREEN}📱 前端构建: flutter_app/build/web/index.html${NC}"
    fi
    
    echo -e "${GREEN}================================${NC}"
    echo -e "${BLUE}💡 提示: 按 Ctrl+C 停止服务${NC}"
    echo -e "${BLUE}💡 帮助: $0 --help${NC}"
    
    # 等待用户中断
    wait
}

# 运行主函数
main "$@"