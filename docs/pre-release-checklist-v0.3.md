# 部署前检查清单（v0.3）

在将 API Asset Studio 部署到预发或生产环境前，逐项确认。

## 一、构建与测试

- [ ] 前端 `npm run build` 通过
- [ ] 后端 `cd server && npm run build` 通过
- [ ] 后端 `cd server && npm test` 全部 14 个 verify 脚本通过
- [ ] Docker 镜像构建成功：`docker build -t video-ai-gen:v0.3 .`

## 二、数据与存储

- [ ] `db:seed` 可正常执行，生成默认数据
- [ ] `db:reset` 可正常执行，清空数据
- [ ] Local Storage 读写正常
- [ ] 如有对象存储，testConnection 成功
- [ ] 确认 `data/` 和 `storage/` 目录权限正确
- [ ] SQLite 模式（推荐预发）：`DATA_BACKEND=sqlite npm run verify:sqlite` 28 项全通过
- [ ] JSON → SQLite 迁移：`npm run db:sqlite:migrate && npm run db:sqlite:import-json` 成功
- [ ] SQLite → JSON 回退：`npm run db:sqlite:export-json` 可正常导出
- [ ] SQLite 文件已 gitignore：`*.sqlite`, `*.sqlite-shm`, `*.sqlite-wal`

## 三、安全

- [ ] 代码中无硬编码 API Key（`grep -r "sk-" .` / `grep -r "DASHSCOPE" .`）
- [ ] `server/data/db.json` 不在 Git 中（已 gitignore）
- [ ] `server/storage/assets/*` 不在 Git 中（已 gitignore）
- [ ] `.env` / `.env.production` 不在 Git 中
- [ ] `APP_ENCRYPTION_KEY` 长度 ≥ 32 字节（运行 `echo -n "$APP_ENCRYPTION_KEY" | wc -c`）
- [ ] `APP_ENCRYPTION_KEY` 已备份到安全位置
- [ ] 数据库/API 无明显密码（`admin/admin` 等）
- [ ] Presigned URL 不保存到 db.json

## 四、网络与域名

- [ ] `CORS_ORIGIN` 设置为生产域名（非 `*` 非 localhost）
- [ ] HTTPS 已配置（证书有效）
- [ ] 反向代理已配置（Caddy/Nginx）
- [ ] 上传大小限制已设置（建议 ≤ 100MB）
- [ ] `/health` 端点可访问
- [ ] 防火墙/安全组仅开放必要端口（443/80）

## 五、访问控制

- [ ] 已配置最小登录保护（`APP_ACCESS_CONTROL=basic` 或反向代理 Basic Auth）
- [ ] 管理密码不是默认值
- [ ] 密码 hash 已通过 `npm run auth:hash-password` 生成
- [ ] 明文密码未写入 .env / docker-compose.yml / Git
- [ ] `APP_BASIC_AUTH_HEALTH_PUBLIC` 已按需配置（默认 true：/health 公开）
- [ ] `/health` 端点行为符合预期
- [ ] 浏览器访问受保护页面弹出认证对话框

## 六、存储

- [ ] Local Storage 模式下，`storage/` 目录正确挂载（Docker volume 或主机目录）
- [ ] Object Storage 模式下：Bucket 为 Private
- [ ] Object Storage 模式下：Access Key 权限最小化
- [ ] Object Storage 模式下：CORS 配置正确

## 七、备份

- [ ] 备份目录已创建且不在项目目录内
- [ ] db.json 定时备份已配置（crontab 或类似）
- [ ] APP_ENCRYPTION_KEY 已安全备份
- [ ] 对象存储已开启版本控制（如有）

## 八、容器化（Docker）

- [ ] Dockerfile 构建成功
- [ ] docker-compose 配置语法正确（`docker compose config`）
- [ ] 容器启动后 `/health` 返回 `ok`
- [ ] 数据 volume 映射正确（重启不丢数据）
- [ ] 容器以非 root 用户运行（`docker top <container>`）
- [ ] 健康检查正常（`docker ps` 显示 healthy）

## 九、环境变量

- [ ] `.env.production` 文件存在且配置正确
- [ ] `NODE_ENV=production`
- [ ] `PORT` 设置正确
- [ ] `APP_ENCRYPTION_KEY` 已设置且长度 ≥ 32 字节
- [ ] `CORS_ORIGIN` 已设置
- [ ] `APP_ACCESS_CONTROL` 已设置（公网必须为 `basic`）
- [ ] `APP_BASIC_AUTH_PASSWORD_HASH` 已设置（使用 `auth:hash-password` 生成）
- [ ] Provider API Key 通过应用内添加，不写入 .env

## 十、文档

- [ ] README.md 版本号正确
- [ ] 部署文档齐全（反向代理、对象存储、备份、SQL迁移、登录保护）
- [ ] 演示流程文档可执行
- [ ] 已知问题已记录

## 十一、预发验证（smoke test）

- [ ] 打开应用首页 → 页面正常渲染
- [ ] 添加 Provider → testConnection 成功
- [ ] 生成图片 → 图片生成成功
- [ ] 生成视频 → 视频生成成功
- [ ] Asset Library → 资产正常显示
- [ ] Task Center → 任务状态正常
- [ ] Usage Ledger → 用量正常
- [ ] 项目导出 → 导出包正常生成

## 十二、已知不应通过的项目

以下项目在 v0.3 阶段**预期不通过**，属于已知限制：

- [ ] ❌ 多用户登录（未实现）
- [ ] ❌ 权限控制（未实现）
- [ ] ❌ 审计日志（未实现）
- [ ] ❌ PostgreSQL 多用户 SaaS 数据库（SQLite 第一阶段已可用于预发单机；PostgreSQL 第二阶段用于多用户 SaaS）
- [ ] ❌ 精确账单对账（估算值仅供参考）
- [ ] ❌ 自动化大规模 Benchmark（需手动触发）

## 十三、Docker 组合预发验收（Phase 9.4）

以下项目已在 Phase 9.4 中通过 Docker + SQLite + Basic Auth 组合验证：

- [x] ✅ Docker 镜像构建
- [x] ✅ docker compose 启动
- [x] ✅ DATA_BACKEND=sqlite 正常运行
- [x] ✅ APP_ACCESS_CONTROL=basic 访问控制
- [x] ✅ /health + HEALTH_PUBLIC 可配置
- [x] ✅ 前端 SPA 路由与静态文件
- [x] ✅ SQLite volume 持久化（重启数据不丢）
- [x] ✅ Storage volume 持久化（seed 文件保留）
- [x] ✅ 容器日志无敏感信息泄露
- [x] ✅ 非 root 用户运行
- [x] ✅ HEALTHCHECK 正常
- [x] ✅ db:seed 在 SQLite 模式下正常运行

> **注意**：Docker 层缓存可能导致 `better-sqlite3` 在运行时镜像中缺失。
> 症状：data/ 目录只有 `db.json` 无 `app.sqlite`。
> 修复：`docker compose build --no-cache`。
