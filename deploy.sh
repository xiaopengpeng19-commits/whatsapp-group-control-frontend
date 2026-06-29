# frontend/deploy.sh
#!/bin/bash

# 前端独立部署脚本
# 放在 frontend/ 目录下

set -e

APP_NAME="whatsapp-frontend"
DEPLOY_DIR="/opt/$APP_NAME"
PORT=3000

echo "=========================================="
echo "🚀 部署前端服务"
echo "=========================================="

# 1. 检查 Node.js
echo ""
echo "🔍 检查 Node.js..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js 未安装"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm 未安装"; exit 1; }

# 显示版本
echo "Node.js 版本: $(node --version)"
echo "npm 版本: $(npm --version)"

# 2. 检查并创建 .env.production
echo ""
echo "📝 检查环境配置..."
if [ ! -f ".env.production" ]; then
    echo "⚠️  .env.production 不存在，创建默认配置..."
    cat > .env.production <<EOF
VITE_API_BASE_URL=http://$(hostname -I | awk '{print $1}'):8090/api
EOF
    echo "✅ 已创建 .env.production"
    cat .env.production
fi

# 3. 安装依赖
echo ""
echo "📦 安装依赖..."
npm install --registry=https://registry.npmmirror.com

# 4. 构建
echo ""
echo "🔨 构建前端..."
npm run build

if [ ! -d "dist" ]; then
    echo "❌ 构建失败"
    exit 1
fi

echo "✅ 构建完成"
echo "构建文件大小:"
du -sh dist/

# 5. 创建部署目录
echo ""
echo "📁 创建部署目录..."
sudo mkdir -p $DEPLOY_DIR

# 6. 复制文件
echo ""
echo "📋 复制文件..."
sudo rm -rf $DEPLOY_DIR/*
sudo cp -r dist/* $DEPLOY_DIR/

# 7. 检查 Nginx
echo ""
echo "🔍 检查 Nginx..."
if command -v nginx >/dev/null 2>&1; then
    echo "✅ Nginx 已安装"
    USE_NGINX=true
else
    echo "⚠️  Nginx 未安装，将使用 PM2 部署"
    USE_NGINX=false
fi

# 8. 部署方式选择
if [ "$USE_NGINX" = true ]; then
    # Nginx 部署
    echo ""
    echo "📝 配置 Nginx..."
    
    sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null <<EOF
server {
    listen $PORT;
    server_name _;
    
    root $DEPLOY_DIR;
    index index.html;
    
    # 前端路由支持
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF
    
    # 启用站点
    sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    
    # 测试 Nginx 配置
    echo ""
    echo "🔍 测试 Nginx 配置..."
    sudo nginx -t
    
    # 重启 Nginx
    echo ""
    echo "🔄 重启 Nginx..."
    sudo systemctl restart nginx
    
    echo "✅ Nginx 配置完成"
    
else
    # PM2 部署
    echo ""
    echo "📦 安装 PM2..."
    if ! command -v pm2 >/dev/null 2>&1; then
        sudo npm install -g pm2 --registry=https://registry.npmmirror.com
    fi
    
    echo ""
    echo "📝 配置 PM2..."
    
    # 安装 serve
    sudo npm install -g serve --registry=https://registry.npmmirror.com
    
    # 停止旧服务
    pm2 delete $APP_NAME 2>/dev/null || true
    
    # 启动新服务
    pm2 serve $DEPLOY_DIR $PORT --name $APP_NAME --spa
    
    # 保存 PM2 配置
    pm2 save
    
    # 设置开机自启
    echo ""
    echo "📝 设置 PM2 开机自启..."
    pm2 startup | grep "sudo" | bash || true
    
    echo "✅ PM2 部署完成"
fi

# 9. 创建管理脚本
echo ""
echo "📝 创建管理脚本..."

if [ "$USE_NGINX" = true ]; then
    cat > $DEPLOY_DIR/restart.sh <<EOF
#!/bin/bash
sudo systemctl restart nginx
echo "✅ Nginx 已重启"
EOF
else
    cat > $DEPLOY_DIR/restart.sh <<EOF
#!/bin/bash
pm2 restart $APP_NAME
echo "✅ PM2 已重启 $APP_NAME"
EOF
fi

cat > $DEPLOY_DIR/status.sh <<EOF
#!/bin/bash
if [ "$USE_NGINX" = true ]; then
    sudo systemctl status nginx
else
    pm2 status $APP_NAME
fi
EOF

cat > $DEPLOY_DIR/logs.sh <<EOF
#!/bin/bash
if [ "$USE_NGINX" = true ]; then
    sudo tail -f /var/log/nginx/access.log
else
    pm2 logs $APP_NAME
fi
EOF

sudo chmod +x $DEPLOY_DIR/*.sh

# 10. 检查端口
echo ""
echo "🔍 检查端口 $PORT..."
if sudo lsof -i :$PORT > /dev/null 2>&1; then
    echo "⚠️  端口 $PORT 已被占用，可能服务已启动"
    sudo lsof -i :$PORT
else
    echo "✅ 端口 $PORT 可用"
fi

# 11. 显示结果
echo ""
echo "=========================================="
echo "✅ 前端部署完成！"
echo "=========================================="
echo ""
echo "📋 部署信息："
echo "  部署目录: $DEPLOY_DIR"
echo "  访问地址: http://$(hostname -I | awk '{print $1}'):$PORT"
echo "  部署方式: $( [ "$USE_NGINX" = true ] && echo "Nginx" || echo "PM2" )"
echo ""
echo "📝 管理命令："
if [ "$USE_NGINX" = true ]; then
    echo "  重启 Nginx: sudo systemctl restart nginx"
    echo "  查看日志: sudo tail -f /var/log/nginx/access.log"
else
    echo "  重启: pm2 restart $APP_NAME"
    echo "  停止: pm2 stop $APP_NAME"
    echo "  查看日志: pm2 logs $APP_NAME"
    echo "  查看状态: pm2 status"
fi
echo ""
echo "📝 快捷脚本："
echo "  $DEPLOY_DIR/restart.sh   # 重启"
echo "  $DEPLOY_DIR/status.sh    # 状态"
echo "  $DEPLOY_DIR/logs.sh      # 查看日志"
echo ""
echo "=========================================="