# 停车位查询系统 - 部署文档

## 目录结构

```
项目根目录/
├── server/          # NestJS 后端
├── admin-web/       # Vue3 后台管理前端
├── miniapp/         # uni-app 微信小程序
├── deploy/          # 部署配置
│   ├── nginx.conf
│   └── README.md (本文件)
```

---

## 一、服务器环境准备

```bash
# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# 全局安装 PM2
npm install -g pm2

# 创建上传目录
mkdir -p /var/www/parking-server/uploads
```

---

## 二、数据库初始化

```bash
mysql -u root -p < server/sql/init.sql
```

---

## 三、后端部署

```bash
cd server
cp .env.example .env
# 编辑 .env，填写真实数据库密码、JWT密钥、腾讯地图Key

npm install
npm run build

# 使用 PM2 启动
pm2 start dist/main.js --name parking-server
pm2 save
pm2 startup
```

**.env 必填项：**

| 变量 | 说明 |
|---|---|
| `DB_HOST` | MySQL地址，默认 localhost |
| `DB_PASSWORD` | MySQL密码 |
| `JWT_SECRET` | JWT密钥，建议32位随机字符串 |
| `TENCENT_MAP_KEY` | 腾讯位置服务Key：YW6BZ-CJV6Q-CZG5Z-4LU7N-LH5Y3-G4BBY |
| `PORT` | 服务端口，默认3000 |

---

## 四、后台管理前端部署

```bash
cd admin-web
npm install
npm run build

# 将 dist 目录内容复制到服务器
scp -r dist/ root@服务器IP:/var/www/parking-admin/dist
```

---

## 五、Nginx 配置

```bash
# 上传 nginx.conf，修改域名和SSL证书路径
cp deploy/nginx.conf /etc/nginx/sites-available/parking.conf
ln -s /etc/nginx/sites-available/parking.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## 六、微信小程序发布

1. 安装 HBuilderX
2. 打开 `miniapp/` 目录
3. 修改 `utils/request.js` 中的 `BASE_URL` 为你的正式域名
4. 在微信公众平台配置 **request合法域名**：`https://你的域名.com`
5. HBuilderX → 发行 → 小程序-微信 → 上传代码
6. 微信公众平台审核发布

---

## 七、初始化管理员账号

部署完成后调用一次：

```bash
curl -X POST https://你的域名.com/api/admin/init
```

默认账号：`admin` / 密码：`Admin@123456`

**⚠️ 首次登录后请立即修改密码！**

---

## 八、常用运维命令

```bash
pm2 status                    # 查看服务状态
pm2 logs parking-server       # 查看日志
pm2 restart parking-server    # 重启服务

# 查看接口文档
https://你的域名.com/api-docs
```
