# 反向代理与 HTTPS 部署指南（v0.3）

本文档说明如何通过反向代理为 API Asset Studio 提供 HTTPS 和域名接入。

## 一、Caddy（推荐，自动 HTTPS）

Caddy 是零配置 HTTPS 反向代理，适合预发和中小规模部署。

### 安装

```bash
# macOS
brew install caddy

# Debian/Ubuntu
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

### Caddyfile 配置

```caddyfile
your-domain.com {
    # Basic Auth（可选）
    basicauth {
        admin $2a$14$REPLACE_WITH_BCRYPT_HASH
    }

    # 上传大小限制
    request_body {
        max_size 100MB
    }

    # 反向代理到 app
    reverse_proxy 127.0.0.1:8787 {
        # 流式传输（视频生成轮询）
        flush_interval -1
    }

    # 日志
    log {
        output file /var/log/caddy/video-ai-gen.log
    }
}
```

### 启动

```bash
# 测试配置
caddy validate --config Caddyfile

# 前台运行
caddy run --config Caddyfile

# 后台运行
caddy start --config Caddyfile
```

## 二、Nginx

适合已有 Nginx 基础设施或需要精细控制的场景。

### Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Basic Auth（可选）
    auth_basic "API Asset Studio";
    auth_basic_user_file /etc/nginx/.htpasswd;

    # 上传大小限制
    client_max_body_size 100M;

    # 反向代理
    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时（视频生成可能较长）
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }

    # 静态文件（可选直接由 Nginx 提供）
    location /storage/ {
        alias /path/to/server/storage/;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
}
```

### SSL 证书

```bash
# Let's Encrypt (Certbot)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 三、CORS 配置

在 `.env.production` 中设置 `CORS_ORIGIN` 为实际域名：

```txt
# 单个域名
CORS_ORIGIN=https://your-domain.com

# 多个域名
CORS_ORIGIN=https://your-domain.com,https://admin.your-domain.com
```

注意：当反向代理和 app 在同一台机器时，CORS 通常不需要特别配置（请求同源）。

## 四、路由说明

| 路径 | 处理方式 | 说明 |
|------|----------|------|
| `/` | 前端 SPA（production） | 由 app 托管 `public/` 目录 |
| `/api/*` | 后端 API | 所有业务接口 |
| `/storage/*` | 静态文件 | 本地资产文件（可由 Nginx 直接提供） |
| `/health` | 健康检查 | 监控和负载均衡 |

## 五、WebSocket

**当前不需要 WebSocket。** 视频任务轮询使用标准 HTTP polling（前端定时 GET `/api/tasks/:id`），不依赖 WebSocket。如未来需要实时推送，可使用 SSE 或 WebSocket，届时更新本配置。
