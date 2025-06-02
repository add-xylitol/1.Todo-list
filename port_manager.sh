#!/bin/bash

# TodoList 端口管理工具
# 用于检测、释放和管理前后端服务端口

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认端口配置
BACKEND_PORT=3001
FRONTEND_PORT=8080
MONGODB_PORT=27017

# 显示帮助信息
show_help() {
    echo -e "${GREEN}TodoList 端口管理工具${NC}"
    echo -e "${GREEN}========================${NC}"
    echo "用法: $0 [选项] [端口号]"
    echo ""
    echo "选项:"
    echo "  -h, --help          显示此帮助信息"
    echo "  -c, --check         检查端口占用情况"
    echo "  -k, --kill          释放指定端口"
    echo "  -a, --all           操作所有默认端口 (3001, 8080, 27017)"
    echo "  -l, --list          列出所有被占用的端口"
    echo "  -s, --status        显示服务状态"
    echo ""
    echo "示例:"
    echo "  $0 -c 3001          # 检查端口 3001"
    echo "  $0 -k 3001          # 释放端口 3001"
    echo "  $0 -a -c            # 检查所有默认端口"
    echo "  $0 -a -k            # 释放所有默认端口"
    echo "  $0 -l               # 列出所有被占用端口"
    echo "  $0 -s               # 显示服务状态"
}

# 检查端口占用
check_port() {
    local port=$1
    local service_name=$2
    
    echo -e "${BLUE}检查端口 ${port} (${service_name})...${NC}"
    
    local pids=$(lsof -ti:${port} 2>/dev/null)
    
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}端口 ${port} 被占用${NC}"
        for pid in $pids; do
            if ps -p $pid > /dev/null 2>&1; then
                local cmd=$(ps -p $pid -o comm= 2>/dev/null)
                local args=$(ps -p $pid -o args= 2>/dev/null)
                echo -e "  ${RED}PID: ${pid}, 命令: ${cmd}${NC}"
                echo -e "  ${YELLOW}完整命令: ${args}${NC}"
            fi
        done
        return 1
    else
        echo -e "${GREEN}✅ 端口 ${port} 未被占用${NC}"
        return 0
    fi
}

# 释放端口
kill_port() {
    local port=$1
    local service_name=$2
    
    echo -e "${BLUE}释放端口 ${port} (${service_name})...${NC}"
    
    local pids=$(lsof -ti:${port} 2>/dev/null)
    
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}发现占用端口 ${port} 的进程: ${pids}${NC}"
        
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
            echo -e "${RED}❌ 端口 ${port} 仍被占用${NC}"
            return 1
        else
            echo -e "${GREEN}✅ 端口 ${port} 已释放${NC}"
            return 0
        fi
    else
        echo -e "${GREEN}✅ 端口 ${port} 未被占用${NC}"
        return 0
    fi
}

# 列出所有被占用的端口
list_occupied_ports() {
    echo -e "${BLUE}扫描被占用的端口...${NC}"
    echo -e "${GREEN}端口\t进程ID\t命令${NC}"
    echo -e "${GREEN}----\t------\t----${NC}"
    
    # 扫描常用端口范围
    for port in $(seq 3000 9000); do
        local pids=$(lsof -ti:${port} 2>/dev/null)
        if [ -n "$pids" ]; then
            for pid in $pids; do
                if ps -p $pid > /dev/null 2>&1; then
                    local cmd=$(ps -p $pid -o comm= 2>/dev/null)
                    echo -e "${YELLOW}${port}\t${pid}\t${cmd}${NC}"
                fi
            done
        fi
    done
}

# 显示服务状态
show_status() {
    echo -e "${GREEN}TodoList 服务状态${NC}"
    echo -e "${GREEN}==================${NC}"
    
    # 检查后端服务
    echo -e "${BLUE}后端服务 (端口 ${BACKEND_PORT}):${NC}"
    if curl -s http://localhost:${BACKEND_PORT}/api/health > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ 运行中${NC}"
        echo -e "  ${GREEN}📋 API: http://localhost:${BACKEND_PORT}${NC}"
        echo -e "  ${GREEN}📖 文档: http://localhost:${BACKEND_PORT}/api/docs${NC}"
    else
        check_port $BACKEND_PORT "后端服务"
    fi
    
    echo ""
    
    # 检查前端服务
    echo -e "${BLUE}前端服务 (端口 ${FRONTEND_PORT}):${NC}"
    if curl -s http://localhost:${FRONTEND_PORT} > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ 运行中${NC}"
        echo -e "  ${GREEN}🌐 应用: http://localhost:${FRONTEND_PORT}${NC}"
    else
        check_port $FRONTEND_PORT "前端服务"
    fi
    
    echo ""
    
    # 检查 MongoDB
    echo -e "${BLUE}MongoDB (端口 ${MONGODB_PORT}):${NC}"
    if nc -z localhost $MONGODB_PORT 2>/dev/null; then
        echo -e "  ${GREEN}✅ 运行中${NC}"
    else
        check_port $MONGODB_PORT "MongoDB"
    fi
}

# 主函数
main() {
    local action=""
    local target_port=""
    local all_ports=false
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -c|--check)
                action="check"
                shift
                ;;
            -k|--kill)
                action="kill"
                shift
                ;;
            -a|--all)
                all_ports=true
                shift
                ;;
            -l|--list)
                action="list"
                shift
                ;;
            -s|--status)
                action="status"
                shift
                ;;
            [0-9]*)
                target_port=$1
                shift
                ;;
            *)
                echo -e "${RED}❌ 未知选项: $1${NC}"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 执行操作
    case $action in
        "check")
            if [ "$all_ports" = true ]; then
                check_port $BACKEND_PORT "后端服务"
                check_port $FRONTEND_PORT "前端服务"
                check_port $MONGODB_PORT "MongoDB"
            elif [ -n "$target_port" ]; then
                check_port $target_port "自定义服务"
            else
                echo -e "${RED}❌ 请指定端口号或使用 -a 选项${NC}"
                exit 1
            fi
            ;;
        "kill")
            if [ "$all_ports" = true ]; then
                kill_port $BACKEND_PORT "后端服务"
                kill_port $FRONTEND_PORT "前端服务"
                kill_port $MONGODB_PORT "MongoDB"
            elif [ -n "$target_port" ]; then
                kill_port $target_port "自定义服务"
            else
                echo -e "${RED}❌ 请指定端口号或使用 -a 选项${NC}"
                exit 1
            fi
            ;;
        "list")
            list_occupied_ports
            ;;
        "status")
            show_status
            ;;
        "")
            echo -e "${YELLOW}⚠️  请指定操作选项${NC}"
            show_help
            exit 1
            ;;
        *)
            echo -e "${RED}❌ 未知操作: $action${NC}"
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"