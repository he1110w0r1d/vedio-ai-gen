# 最小登录保护设计（v0.3）

本文档记录了 API Asset Studio v0.3.0-benchmark-mvp 的访问控制方案。应用级 Basic Auth 已在 9.3 阶段实现。

## 一、当前状态

- ✅ **应用级 Basic Auth 中间件已实现**
- 默认关闭（`APP_ACCESS_CONTROL=off`），不影响本地开发
- 启用后保护所有前端页面和 `/api/*` 路由
- `/health` 端点始终公开（用于监控）
- 无 session，无用户系统，无权限角色

## 二、方案 A：应用级 Basic Auth（已实现）

适合小型团队试用、内部部署。

### 实现要点

环境变量：

```txt
APP_ACCESS_CONTROL=off | basic
APP_BASIC_AUTH_USERNAME=admin
APP_BASIC_AUTH_PASSWORD_HASH=scrypt:...:...
APP_BASIC_AUTH_HEALTH_PUBLIC=true | false
```

**默认关闭**。只在 `APP_ACCESS_CONTROL=basic` 时启用中间件。

`APP_BASIC_AUTH_HEALTH_PUBLIC` 默认为 `true`：
- `true`（默认）：`/health` 端点公开可访问（监控探针友好）
- `false`：`/health` 也需要 Basic Auth 认证

### 密码 Hash 生成

```bash
cd server
npm run auth:hash-password -- "your-password"
```

输出：

```txt
APP_BASIC_AUTH_PASSWORD_HASH=scrypt:abc123...:xyz789...
```

将这个值写入 `.env.production` 的 `APP_BASIC_AUTH_PASSWORD_HASH`。

> 原始密码不会被保存。Hash 格式为 `scrypt:hashHex:saltBase64`，使用 Node.js `crypto.scrypt`（无需安装额外依赖）。

### 保护范围

- 所有 `/api/*` 路由（providers、tasks、assets、usage、quality、benchmark 等）
- 所有前端页面（生产模式下 `/` 及所有 SPA 路由）
- `/storage/*` 静态文件
- `/health` 端点：默认公开（`APP_BASIC_AUTH_HEALTH_PUBLIC=true`），可配置为需认证（`=false`）

### 认证流程

1. 用户访问任意页面 → 中间件检查 `Authorization` header
2. 无有效凭据 → 返回 401 + `WWW-Authenticate: Basic` header
3. 浏览器弹出原生登录对话框
4. 用户输入用户名密码 → `crypto.scrypt` 验证 hash
5. 验证通过 → 放行请求（不设置 session cookie）

### 限制

- 无 session / cookie（每次请求都需携带 Authorization header）
- 浏览器会缓存凭据（关闭标签页前无需重复输入）
- 单用户，无角色区分
- 无密码重置流程（需手动修改环境变量并重启）
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

推荐采用 **方案 A + B 双层** 或 **方案 B 单层**：

- **仅内网/本机**：方案 A 足够（`APP_ACCESS_CONTROL=basic`）
- **公网演示**：强烈建议方案 A + B 双层（应用层 + 反向代理层）
- **已有 Cloudflare/反向代理体系**：可仅用方案 B，关闭方案 A（`APP_ACCESS_CONTROL=off`）

无论选择哪种，**绝对不要让应用没有任何访问控制暴露在公网上**。
