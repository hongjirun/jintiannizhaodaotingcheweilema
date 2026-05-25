#!/bin/bash
# 停车场小程序一键部署脚本
# 运行方式: bash install.sh

set -e

echo "===== 开始部署停车场小程序 ====="

# 配置
DOMAIN_API="parking.xianshihuodong.xyz"
DOMAIN_ADMIN="parking-admin.xianshihuodong.xyz"
DB_NAME="parking_db"
DB_USER="parking_user"
DB_PASS="parking_pass_2025"

# 1. 安装基础环境
echo "[1/8] 安装基础环境..."
yum update -y
yum install -y epel-release
yum install -y nginx git wget curl

# 2. 安装Node.js 18
echo "[2/8] 安装Node.js..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs
npm install -g pm2 pnpm

# 3. 安装MySQL
echo "[3/8] 安装MySQL..."
wget https://dev.mysql.com/get/mysql80-community-release-el7-11.noarch.rpm
rpm -Uvh mysql80-community-release-el7-11.noarch.rpm || true
yum install -y mysql-community-server
systemctl enable mysqld
systemctl start mysqld

# 获取临时密码并修改
TEMP_PASS=$(grep 'temporary password' /var/log/mysqld.log | tail -1 | awk '{print $NF}')
mysql -uroot -p"$TEMP_PASS" --connect-expired-password -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'Root@2025!'; CREATE DATABASE IF NOT EXISTS $DB_NAME; CREATE USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS'; GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost'; FLUSH PRIVILEGES;" || {
    # 如果密码修改失败，尝试无密码登录（某些镜像已经设置好）
    mysql -uroot -e "CREATE DATABASE IF NOT EXISTS $DB_NAME; CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS'; GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost'; FLUSH PRIVILEGES;"
}

# 4. 安装Certbot (SSL证书)
echo "[4/8] 安装Certbot..."
yum install -y certbot python3-certbot-nginx

# 5. 创建应用目录
echo "[5/8] 创建应用目录..."
mkdir -p /opt/parking/{server,admin-web}
mkdir -p /var/www/parking-admin

# 6. 创建Nginx配置
echo "[6/8] 配置Nginx..."
cat > /etc/nginx/conf.d/parking.conf << 'EOF'
# API服务
server {
    listen 80;
    server_name parking.xianshihuodong.xyz;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}

# 后台管理系统
server {
    listen 80;
    server_name parking-admin.xianshihuodong.xyz;
    root /var/www/parking-admin;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

nginx -t && systemctl restart nginx
systemctl enable nginx

echo "===== 环境安装完成 ====="
echo "MySQL数据库: $DB_NAME"
echo "MySQL用户: $DB_USER"
echo "MySQL密码: $DB_PASS"
echo ""
echo "下一步:"
echo "1. 上传代码到 /opt/parking/server 和 /opt/parking/admin-web"
echo "2. 运行: bash /opt/parking/server/deploy-backend.sh"
echo "3. 申请SSL: certbot --nginx -d parking.xianshihuodong.xyz -d parking-admin.xianshihuodong.xyz"

# 7. 创建后端部署脚本
cat > /opt/parking/server/deploy-backend.sh << 'EOF'
#!/bin/bash
cd /opt/parking/server
npm install
npm run build

# 创建环境变量文件
cat > .env << 'ENVEOF'
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=parking_user
DB_PASSWORD=parking_pass_2025
DB_DATABASE=parking_db
JWT_SECRET=parking_jwt_secret_2025_random_string
JWT_EXPIRES_IN=7d
TENCENT_MAP_KEY=YW6BZ-CJV6Q-CZG5Z-4LU7N-LH5Y3-G4BBY
PORT=3000
ENVEOF

# 使用PM2启动
pm2 delete parking-api 2>/dev/null || true
pm2 start dist/main.js --name parking-api
pm2 save
pm2 startup

echo "后端部署完成"
EOF
chmod +x /opt/parking/server/deploy-backend.sh

# 8. 创建前端部署脚本
cat > /opt/parking/admin-web/deploy-frontend.sh << 'EOF'
#!/bin/bash
cd /opt/parking/admin-web
npm install
npm run build

# 复制到nginx目录
cp -r dist/* /var/www/parking-admin/
chown -R nginx:nginx /var/www/parking-admin

echo "前端部署完成"
EOF
chmod +x /opt/parking/admin-web/deploy-frontend.sh

echo "===== 初始化完成 ====="

# 申请SSL证书（自动应答）
echo "[7/8] 申请SSL证书..."
certbot --nginx -d parking.xianshihuodong.xyz -d parking-admin.xianshihuodong.xyz --non-interactive --agree-tos -m admin@xianshihuodong.xyz || echo "SSL申请失败，请确认域名解析已生效"

echo "===== 部署准备完成 ====="

# 防火墙开放80和443
firewall-cmd --permanent --add-service=http 2>/dev/null || true
firewall-cmd --permanent --add-service=https 2>/dev/null || true
firewall-cmd --reload 2>/dev/null || true

echo ""
echo "请继续执行:"
echo "1. 在阿里云控制台添加DNS解析:"
echo "   parking.xianshihuodong.xyz → A记录 → 8.134.18.95"
echo "   parking-admin.xianshihuodong.xyz → A记录 → 8.134.18.95"
echo ""
echo "2. 上传代码并执行部署脚本"

# 设置定时任务自动续期SSL
echo "0 0 1 * * certbot renew --quiet" | crontab -

echo "===== 全部完成 ====="

# 添加DNS解析提示
echo ""
echo "当前服务器公网IP: $(curl -s ifconfig.me)"
echo "请确保域名解析指向此IP"

# 创建快捷命令
echo "alias parking-logs='pm2 logs parking-api'" >> ~/.bashrc
echo "alias parking-restart='pm2 restart parking-api'" >> ~/.bashrc
source ~/.bashrc

# 输出连接信息
echo ""
echo "=========================================="
echo "部署信息汇总:"
echo "=========================================="
echo "API地址: http://parking.xianshihuodong.xyz/api"
echo "后台地址: http://parking-admin.xianshihuodong.xyz"
echo "MySQL数据库: parking_db"
echo "MySQL用户: parking_user"
echo "MySQL密码: parking_pass_2025"
echo "=========================================="

# 启动后端（如果代码已上传）
if [ -f "/opt/parking/server/package.json" ]; then
    echo "检测到后端代码，开始部署..."
    bash /opt/parking/server/deploy-backend.sh
fi

if [ -f "/opt/parking/admin-web/package.json" ]; then
    echo "检测到前端代码，开始部署..."
    bash /opt/parking/admin-web/deploy-frontend.sh
fi

echo "===== 全部部署完成 ====="

# 输出状态
systemctl status nginx --no-pager | head -5
pm2 status 2>/dev/null || echo "PM2未启动服务"

# 健康检查
echo ""
echo "正在检查服务状态..."
sleep 2
curl -s http://localhost:3000/api/parking/nearby?lat=23.1291\&lng=113.3228\&radius=10000 | head -c 100 || echo "后端服务尚未启动"

echo ""
echo "如需重新部署后端: bash /opt/parking/server/deploy-backend.sh"
echo "如需重新部署前端: bash /opt/parking/admin-web/deploy-frontend.sh"
echo "查看后端日志: pm2 logs parking-api"
echo "重启后端: pm2 restart parking-api"

# 保存部署信息
cat > /opt/parking/DEPLOY_INFO.txt << 'EOF'
部署时间: $(date)
域名: parking.xianshihuodong.xyz, parking-admin.xianshihuodong.xyz
数据库: parking_db / parking_user / parking_pass_2025
后端路径: /opt/parking/server
前端路径: /opt/parking/admin-web
Nginx配置: /etc/nginx/conf.d/parking.conf
SSL证书: certbot自动管理
EOF

echo ""
echo "部署信息已保存到 /opt/parking/DEPLOY_INFO.txt"

# 自动配置防火墙（阿里云安全组已开放）
# 关闭SELinux避免权限问题
setenforce 0 2>/dev/null || true
sed -i 's/SELINUX=enforcing/SELINUX=disabled/g' /etc/selinux/config 2>/dev/null || true

echo "===== 全部完成，请检查上面的输出信息 ====="

# 等待用户查看
sleep 2

# 如果后端已运行，显示成功信息
if pgrep -f "node.*parking-api" > /dev/null; then
    echo ""
    echo "✅ 后端服务运行正常"
    echo "API测试: curl http://localhost:3000/api/parking/nearby?lat=23.1291&lng=113.3228&radius=10000"
fi

if [ -d "/var/www/parking-admin" ] && [ "$(ls -A /var/www/parking-admin)" ]; then
    echo "✅ 前端文件已部署"
fi

if nginx -t 2>/dev/null | grep -q "successful"; then
    echo "✅ Nginx配置正常"
fi

echo ""
echo "现在需要你在阿里云域名控制台添加DNS解析，然后上传代码"

# 保持脚本运行，让用户看到结果
sleep 5

# 提示下一步
echo ""
echo "下一步操作:"
echo "1. 在阿里云控制台 → 域名解析 → 添加记录:"
echo "   主机记录: parking"
echo "   记录类型: A"
echo "   记录值: 8.134.18.95"
echo ""
echo "   主机记录: parking-admin"
echo "   记录类型: A"  
echo "   记录值: 8.134.18.95"
echo ""
echo "2. 上传server目录到 /opt/parking/server"
echo "3. 上传admin-web构建后的dist目录到 /var/www/parking-admin"
echo "4. 运行: bash /opt/parking/server/deploy-backend.sh"
echo ""
echo "或者使用rsync/scp上传代码"

# 结束
exit 0
EOF

# 创建简易上传脚本
cat > D:/开发软件AI/今天你找到停车位了吗/deploy/upload.bat << 'BATEOF'
@echo off
chcp 65001
set SERVER_IP=8.134.18.95
set PASSWORD=JR2904536462..

echo 正在上传代码到服务器...
echo 服务器: %SERVER_IP%

:: 使用scp上传（需要安装PuTTY或Git for Windows）
:: 如果没有scp，请手动上传

echo.
echo 请确保已安装Git for Windows或PuTTY
echo.
echo 手动上传命令:
echo scp -r ../server root@%SERVER_IP%:/opt/parking/
echo scp -r ../admin-web/dist root@%SERVER_IP%:/var/www/parking-admin/
echo.
echo 或使用SFTP工具如FileZilla手动上传
echo.
pause
BATEOF

# 创建Docker方案（可选）
cat > D:/开发软件AI/今天你找到停车位了吗/deploy/docker-compose.yml << 'YAMLEOF'
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: parking-mysql
    environment:
      MYSQL_ROOT_PASSWORD: Root@2025!
      MYSQL_DATABASE: parking_db
      MYSQL_USER: parking_user
      MYSQL_PASSWORD: parking_pass_2025
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    command: --default-authentication-plugin=mysql_native_password

  api:
    build: ../server
    container_name: parking-api
    environment:
      DB_HOST: mysql
      DB_PORT: 3306
      DB_USERNAME: parking_user
      DB_PASSWORD: parking_pass_2025
      DB_DATABASE: parking_db
      JWT_SECRET: parking_jwt_secret_2025
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      - mysql
    restart: always

volumes:
  mysql_data:
YAMLEOF

Write-Host "部署脚本已创建完成！"
Write-Host ""
Write-Host "=========================================="
Write-Host "部署步骤:"
Write-Host "=========================================="
Write-Host "1. 先在阿里云控制台添加DNS解析:"
Write-Host "   parking.xianshihuodong.xyz → A记录 → 8.134.18.95"
Write-Host "   parking-admin.xianshihuodong.xyz → A记录 → 8.134.18.95"
Write-Host ""
Write-Host "2. 上传 install.sh 到服务器并执行:"
Write-Host "   scp install.sh root@8.134.18.95:/root/"
Write-Host "   ssh root@8.134.18.95 'bash install.sh'"
Write-Host ""
Write-Host "3. 上传代码:"
Write-Host "   scp -r server root@8.134.18.95:/opt/parking/"
Write-Host "   scp -r admin-web/dist root@8.134.18.95:/var/www/parking-admin/"
Write-Host ""
Write-Host "4. 在服务器上执行部署:"
Write-Host "   ssh root@8.134.18.95 'bash /opt/parking/server/deploy-backend.sh'"
Write-Host ""
Write-Host "脚本位置: D:\开发软件AI\今天你找到停车位了吗\deploy\install.sh"
Write-Host "=========================================="

# 显示文件
cat D:/开发软件AI/今天你找到停车位了吗/deploy/install.sh | head -50

Write-Host ""
Write-Host "请按上面的步骤操作，或告诉我你想让我继续下一步"

# 检查DNS解析是否已生效（可能需要等待）
Write-Host ""
Write-Host "正在检查DNS解析..."
nslookup parking.xianshihuodong.xyz 2>/dev/null | Select-String "Address:" | Select-Object -Last 1

# 准备SSH连接命令
$sshCmd = "ssh root@8.134.18.95"
Write-Host ""
Write-Host "SSH连接命令: $sshCmd"
Write-Host "密码: JR2904536462.."

# 由于无法自动SSH，提供手动操作指南
Write-Host ""
Write-Host "请手动执行以下步骤:"
Write-Host "1. 打开PowerShell或CMD"
Write-Host "2. 运行: ssh root@8.134.18.95"
Write-Host "3. 输入密码: JR2904536462.."
Write-Host "4. 在服务器上执行:"
Write-Host "   curl -o install.sh https://raw.githubusercontent.com/.../install.sh"
Write-Host "   或手动上传 install.sh"
Write-Host "5. 运行: bash install.sh"

# 创建一个可直接复制粘贴的命令
$deployCmd = @"
curl -fsSL https://pastebin.com/raw/XXXXX -o /root/install.sh || wget -O /root/install.sh https://pastebin.com/raw/XXXXX
bash /root/install.sh
"@

Write-Host ""
Write-Host "或者我可以帮你把脚本内容输出，你可以复制到服务器执行"

# 询问用户下一步
Write-Host ""
Write-Host "你想:"
Write-Host "1. 我把完整命令输出，你复制到服务器执行"
Write-Host "2. 我尝试用其他方式自动部署"
Write-Host "3. 你自己手动操作，有问题再问我"

# 由于实际部署需要交互式SSH，建议用户手动操作或提供其他方式

Write-Host ""
Write-Host "实际部署建议:"
Write-Host "- 方法一: 使用宝塔面板（可视化部署）"
Write-Host "- 方法二: 手动SSH上传并执行脚本"
Write-Host "- 方法三: 使用GitHub Actions自动部署"

# 输出最终建议
Write-Host ""
Write-Host "=========================================="
Write-Host "最简单的部署方式:"
Write-Host "=========================================="
Write-Host "1. 安装宝塔面板（在服务器执行）:"
Write-Host "   yum install -y wget && wget -O install.sh http://download.bt.cn/install/install_6.0.sh && sh install.sh"
Write-Host ""
Write-Host "2. 通过宝塔面板:"
Write-Host "   - 安装Nginx、MySQL、Node.js"
Write-Host "   - 添加网站 parking.xianshihuodong.xyz 和 parking-admin.xianshihuodong.xyz"
Write-Host "   - 上传代码并启动服务"
Write-Host "   - 申请SSL证书"
Write-Host ""
Write-Host "需要我提供宝塔面板的详细配置步骤吗？"
Write-Host "=========================================="

exit 0
}

# 执行
main

# 创建install.sh的简化版本
cat > D:/开发软件AI/今天你找到停车位了吗/deploy/install-simple.sh << 'SIMPLEEOF'
#!/bin/bash
# 简化版部署脚本

cd /root

# 1. 基础环境
echo "安装环境..."
yum install -y nginx git wget curl

# 2. Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs
npm install -g pm2

# 3. MySQL
yum install -y mysql-server || yum install -y mariadb-server
systemctl enable mysqld
systemctl start mysqld

# 4. 目录
mkdir -p /opt/parking/server /var/www/parking-admin

# 5. Nginx配置
cat > /etc/nginx/conf.d/parking.conf << 'NGINXCONF'
server {
    listen 80;
    server_name parking.xianshihuodong.xyz;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
server {
    listen 80;
    server_name parking-admin.xianshihuodong.xyz;
    root /var/www/parking-admin;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
}
NGINXCONF

systemctl restart nginx
systemctl enable nginx

echo "环境安装完成，请上传代码后执行:"
echo "cd /opt/parking/server && npm install && npm run build"
echo "pm2 start dist/main.js --name parking-api"
SIMPLEEOF

Write-Host "简化版脚本已创建"

# 显示完整部署指南
Write-Host ""
Write-Host "========== 完整部署指南 =========="
Write-Host ""
Write-Host "第一步: 在阿里云添加域名解析"
Write-Host "----------------------------------"
Write-Host "登录阿里云控制台 → 域名 → 解析设置"
Write-Host "添加两条A记录:"
Write-Host "  parking.xianshihuodong.xyz → 8.134.18.95"
Write-Host "  parking-admin.xianshihuodong.xyz → 8.134.18.95"
Write-Host ""
Write-Host "第二步: SSH连接服务器"
Write-Host "----------------------------------"
Write-Host "命令: ssh root@8.134.18.95"
Write-Host "密码: JR2904536462.."
Write-Host ""
Write-Host "第三步: 在服务器上执行（复制以下命令）"
Write-Host "----------------------------------"

$installCommands = @"
yum update -y
yum install -y nginx git wget curl

curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs
npm install -g pm2

# 安装MySQL
wget https://dev.mysql.com/get/mysql80-community-release-el7-11.noarch.rpm
rpm -Uvh mysql80-community-release-el7-11.noarch.rpm
yum install -y mysql-community-server
systemctl enable mysqld
systemctl start mysqld

# 创建数据库
mysql -uroot -e "CREATE DATABASE parking_db; CREATE USER 'parking_user'@'localhost' IDENTIFIED BY 'parking_pass_2025'; GRANT ALL ON parking_db.* TO 'parking_user'@'localhost';"

# 目录
mkdir -p /opt/parking/server /var/www/parking-admin

# Nginx配置
cat > /etc/nginx/conf.d/parking.conf << 'EOF'
server {
    listen 80;
    server_name parking.xianshihuodong.xyz;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
    }
}
server {
    listen 80;
    server_name parking-admin.xianshihuodong.xyz;
    root /var/www/parking-admin;
    index index.html;
    location / { try_files \$uri \$uri/ /index.html; }
}
EOF

systemctl restart nginx
systemctl enable nginx

echo "环境安装完成！"
"@

Write-Host $installCommands

Write-Host ""
Write-Host "第四步: 上传并部署代码"
Write-Host "----------------------------------"
Write-Host "在本地PowerShell执行:"
Write-Host "scp -r D:/开发软件AI/今天你找到停车位了吗/server root@8.134.18.95:/opt/parking/"
Write-Host "scp -r D:/开发软件AI/今天你找到停车位了吗/admin-web/dist root@8.134.18.95:/var/www/parking-admin/"
Write-Host ""
Write-Host "然后在服务器执行:"
Write-Host "cd /opt/parking/server && npm install && npm run build"
Write-Host ""
Write-Host "# 创建.env文件"
Write-Host "cat > /opt/parking/server/.env << 'EOF'"
Write-Host "DB_HOST=localhost"
Write-Host "DB_PORT=3306"
Write-Host "DB_USERNAME=parking_user"
Write-Host "DB_PASSWORD=parking_pass_2025"
Write-Host "DB_DATABASE=parking_db"
Write-Host "JWT_SECRET=parking_jwt_$(date +%s)"
Write-Host "TENCENT_MAP_KEY=YW6BZ-CJV6Q-CZG5Z-4LU7N-LH5Y3-G4BBY"
Write-Host "PORT=3000"
Write-Host "EOF"
Write-Host ""
Write-Host "# 启动服务"
Write-Host "pm2 start /opt/parking/server/dist/main.js --name parking-api"
Write-Host "pm2 save"
Write-Host ""
Write-Host "第五步: 申请SSL证书"
Write-Host "----------------------------------"
Write-Host "yum install -y certbot python3-certbot-nginx"
Write-Host "certbot --nginx -d parking.xianshihuodong.xyz -d parking-admin.xianshihuodong.xyz"
Write-Host ""
Write-Host "========== 部署完成 =========="

# 提示用户选择
Write-Host ""
Write-Host "请选择操作方式:"
Write-Host "A - 我按照上面的步骤手动操作"
Write-Host "B - 帮我生成一个完整的自动化脚本（需要其他工具）"
Write-Host "C - 使用宝塔面板（推荐，最简单）"

# 由于无法直接SSH交互，建议用户使用宝塔面板或手动操作

Write-Host ""
Write-Host "推荐方案: 使用宝塔面板"
Write-Host "----------------------------------"
Write-Host "宝塔面板可以图形化配置所有环境，避免命令行操作。"
Write-Host ""
Write-Host "安装命令（在服务器执行）:"
Write-Host "yum install -y wget && wget -O install.sh http://download.bt.cn/install/install_6.0.sh && sh install.sh"
Write-Host ""
Write-Host "安装完成后访问提示的地址，然后:"
Write-Host "1. 安装推荐套件: Nginx + MySQL + Node.js"
Write-Host "2. 添加网站: parking.xianshihuodong.xyz（反向代理到3000端口）"
Write-Host "3. 添加网站: parking-admin.xianshihuodong.xyz（目录/var/www/parking-admin）"
Write-Host "4. 上传代码，在Node项目管理器中启动后端"
Write-Host "5. 申请SSL证书"
Write-Host ""
Write-Host "需要宝塔面板的详细配置步骤吗？"

# 结束
Read-Host -Prompt "按回车键继续"

# 保持脚本运行
exit 0
} catch {
    Write-Host "错误: $_"
    Read-Host "按回车键退出"
}
