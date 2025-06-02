#!/bin/bash

# TodoList Pro 桌面应用启动器
# 双击此文件即可启动应用

# 获取脚本所在目录
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 切换到应用目录
cd "$DIR"

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    echo "请先安装 Node.js: https://nodejs.org/"
    echo "按任意键退出..."
    read -n 1
    exit 1
fi

# 检查npm依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行，正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        echo "按任意键退出..."
        read -n 1
        exit 1
    fi
fi

# 生成应用图标（如果需要）
if [ ! -f "assets/icon.png" ]; then
    echo "🎨 生成应用图标..."
    npm run generate-icons 2>/dev/null || echo "⚠️  图标生成跳过（需要 ImageMagick）"
fi

# 启动应用
echo "🚀 启动 TodoList Pro..."
npm start

# 如果应用异常退出，显示错误信息
if [ $? -ne 0 ]; then
    echo "❌ 应用启动失败"
    echo "请检查终端输出的错误信息"
    echo "按任意键退出..."
    read -n 1
fi