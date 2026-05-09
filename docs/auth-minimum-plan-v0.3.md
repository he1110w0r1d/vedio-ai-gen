# 最小登录保护设计（v0.3 → 预发）

本文档设计从"本地单用户无认证"到"预发最小登录保护"的方案。当前阶段仅做设计，不真正实现。

## 一、当前状态

- 无用户认证
- 任何能访问服务的人都可以执行所有操作
- 适合本地开发（localhost），不适合任何形式的网络暴露

## 二、方案 A：单用户管理密码（9.1 实现）

适合小型团队试用、内部部署。

### 实现要点

```txt
环境变量：
  ADMIN_USERNAME=admin
  ADMIN_PASSWORD_HASH=<bcrypt hash>

登录流程：
  1. 用户访问任意页面 → 检查 session cookie
  2. 无有效 session → 重定向到 /login
  3. 提交 username + password → 后端验证
  4. 验证通过 → 设置 httpOnly secure session cookie
  5. 所有 /api/* 请求验证 session
```

### Session 管理

- 使用 `express-session` + `connect-pg-simple`（如已迁移 SQL）或内存存储（预发阶段）
- Cookie 属性：`httpOnly=true`, `sameSite=strict`, `secure=true`（HTTPS 下）
- Session 过期：24 小时无操作

### CSRF 防护

- SameSite Cookie 已提供基础防护
- 可额外使用 `csurf` 或自定义 CSRF token（非必须，预发阶段可省略）

### 限制

- 单用户，无角色区分
- 无密码重置流程（需手动重置 db/环境变量）
- 不适合多用户场景

## 三、方案 B：反向代理 Basic Auth（推荐预发）

适合预发演示、临时试用。**无需修改应用代码。**

### Nginx Basic Auth

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    auth_basic "API Asset Studio";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

创建密码文件：

```bash
htpasswd -c /etc/nginx/.htpasswd admin
```

### Caddy Basic Auth

```caddyfile
your-domain.com {
    basicauth {
        admin $2a$14$hashed_password
    }
    reverse_proxy 127.0.0.1:8787
}
```

生成 hash：

```bash
caddy hash-password --plaintext "your-password"
```

### Cloudflare Access / Zero Trust

如果域名通过 Cloudflare，可以直接使用 Cloudflare Access 的 OTP/SSO 保护，无需任何应用层改动。

## 四、推荐路线

| 阶段 | 方案 | 适用场景 |
|------|------|----------|
| 预发演示 | **方案 B**（Nginx/Caddy Basic Auth） | 快速、零代码改动 |
| 小团队试用 | **方案 A**（单用户管理密码） | 需要独立用户管理 |
| 生产部署 | 完整认证系统（OAuth/JWT/RBAC） | 多用户、权限管理 |

## 五、当前预发建议

采用 **方案 B（Caddy Basic Auth）**：

- 零代码改动
- Caddy 自动 HTTPS
- 一行配置即可
- 足够保护预发环境
