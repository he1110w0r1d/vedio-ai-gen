# API Asset Studio

API Asset Studio 是一个 BYOK（Bring Your Own Key，自带 API Key）的 AI 图片与视频资产生成工作台。用户配置自己的模型供应商和 API Key，用统一界面生成、管理、复用图片和视频资产。

## 当前版本

**v0.3.0-benchmark-mvp**（阶段标识：`BENCHMARK_MVP`）

v0.3 与 v0.2 的核心差异：
- 新增 **HappyHorse T2V / I2V / R2V** 三模式真实视频生成
- 新增 **Prompt Benchmark Set** 标准化基准测试集
- 新增 **Benchmark Run** 与 **RunItem → Task → Asset 同步闭环**
- 新增 **Benchmark 人工评审工作流**（视频预览 + Rubric + 内嵌评分）
- 数据卫生修复（DB 持久化安全、Presigned URL 不落库、参考素材稳定化）
- 完整的「生成 → 统计 → 评价 → 对比 → 基准测试 → 人工评审」闭环

## 核心能力

| 能力 | 状态 |
|------|------|
| BYOK Provider 配置 | ✅ |
| 万物焕新图片生成 | ✅ |
| 万相 T2V / I2V / R2V | ✅ |
| HappyHorse T2V / I2V / R2V | ✅ |
| Kling T2V | ✅ 第三方兼容网关，dry-run |
| Task Center | ✅ |
| Asset Library | ✅ |
| Usage Ledger | ✅ |
| Quality Feedback | ✅ |
| Provider Benchmark | ✅ |
| Prompt Benchmark Set | ✅ |
| Benchmark Run | ✅ |
| Benchmark 人工评审 | ✅ |
| Local Storage | ✅ |
| Object Storage (Public/Private-Presigned) | ✅ |
| 项目导入导出 | ✅ |

## 当前真实 Provider

| 供应商 | 模式 | 模型 | 接入方式 |
|--------|------|------|----------|
| 万物焕新 | 图片生成 | gpt-image-2 | 官方 API |
| 阿里云百炼 万相 | T2V | wan2.7-t2v | 官方 API |
| 阿里云百炼 万相 | I2V | wan2.6-i2v-flash | 官方 API |
| 阿里云百炼 万相 | R2V | wan2.7-r2v | 官方 API |
| 阿里云百炼 HappyHorse | T2V | happyhorse-1.0-t2v | 官方 API |
| 阿里云百炼 HappyHorse | I2V | happyhorse-1.0-i2v | 官方 API |
| 阿里云百炼 HappyHorse | R2V | happyhorse-1.0-r2v | 官方 API |
| Kling（第三方网关） | T2V | pro-text-to-video | kling3api.com |

## 当前 Mock / 未实现能力

- 图生图、图片编辑、局部重绘、扩图
- 视频编辑
- 多角色 R2V（当前仅单角色 character1）
- Kling I2V / R2V
- 更多视频供应商（MiniMax、Runway 等）
- 自动 AI 质量评分
- 用户登录、多用户、团队协作
- 支付计费体系
- 精确供应商账单
- 生产环境部署自动化

## 技术栈

- 前端：Vite + React 19 + TypeScript + Tailwind CSS 3
- 后端：Node.js + Express 5 + TypeScript
- 存储：本地 JSON `server/data/db.json`（开发）/ SQLite `server/data/app.sqlite`（预发推荐）
- 文件存储：Local Storage + Object Storage（S3/OSS 兼容，Public/Private-Presigned）

## 目录结构

```txt
src/                         前端应用
server/                      本地后端代理
server/data/db.example.json  本地 DB 示例结构
server/data/db.json          本地 DB（已 gitignore）
server/storage/assets/       本地资产文件（已 gitignore）
server/scripts/              正式工具脚本
server/scripts/dev/          开发临时脚本（dev-only）
docs/                        架构与验收文档
```

## 环境变量

前端 `.env.example`：
```txt
VITE_API_MODE=mock
VITE_API_BASE_URL=http://127.0.0.1:8787
VITE_APP_NAME=API Asset Studio
```

后端 `server/.env.example`：
```txt
PORT=8787
NODE_ENV=development
APP_ENCRYPTION_KEY=replace-with-32-byte-secret-value
CORS_ORIGIN=http://127.0.0.1:5173
```

`APP_ENCRYPTION_KEY` 至少 32 字节。不要提交真实 `.env`。

## 启动方式

### 安装

```bash
npm install
cd server && npm install && cd ..
```

### 前端 Mock Mode（默认）

```bash
npm run dev
```

Mock mode 使用前端 mockData 和 localStorage，不调用本地后端。

### 前端 Real Mode

```bash
# 终端 1：启动后端
cd server
npm run dev

# 终端 2：启动前端
VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8787 npm run dev
```

### 启动命令速查

```bash
npm run dev          # 前端 mock mode
npm run build        # 前端构建
cd server
npm run dev          # 后端开发模式
npm run build        # 后端构建
npm run start        # 后端生产模式
```

## Provider 配置

1. 进入侧边栏「供应商」
2. 添加供应商 → 选择 providerType → 填入 API Key
3. API Key 后端加密保存，前端脱敏显示（`****`）
4. 点击「测试连接」验证（不产生费用）
5. 能力芯片显示该 Provider 支持的模式

## Storage 配置

进入「设置 → 存储管理」配置：

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| Local Storage | 本地 `server/storage/assets/` | 开发、单机 |
| Object Public | S3/OSS 公开访问 | 跨设备 |
| Object Private-Presigned | 临时签名链接 | 安全要求高 |

Presigned URL 安全机制：
- 前端预览默认 900s 过期
- 供应商读取默认 3600s 过期
- **不保存到 db.json、日志、导出包**

## Usage Ledger

用量统计与成本估算系统：

- 任何生成任务自动记录 UsageRecord
- 可配置 Cost Rules（按模式/模型自定义单价）
- 按供应商/模式/项目聚合
- 估计成本仅供参考，实际费用以供应商控制台为准

## Quality Feedback

质量评价与失败复盘系统：

- 对资产/任务进行 1-5 星评分
- 质量状态：优秀/可用/需要修复/不可用
- 12 种失败分类
- Asset Library 支持按评价状态筛选
- Dashboard / Usage 展示质量汇总

## Provider Benchmark

供应商对比看板（侧边栏「供应商对比」）：

- 按 provider/model/mode 多维度对比
- 成功率、失败率、平均耗时、估算成本、平均评分
- 失败原因分布与浪费成本
- 质量-成本交叉分析
- 智能洞察自动提示

## Prompt Benchmark Set

标准化基准测试集（侧边栏「基准测试」）：

- 默认测试集：9 个用例（T2V×3 + I2V×3 + R2V×3）
- dry-run（默认）：仅创建记录，不产生供应商费用
- live-run：真实调用，需二次确认，会产生费用
- RunItem 状态自动同步（Task → Asset 闭环）
- 结果汇入 Usage / Quality / Provider Benchmark

## Benchmark 人工评审

Run 结果页内嵌评审工作流：

- **视频预览**：复用 AssetPreview，支持 private-presigned URL
- **Rubric 展示**：评价维度 label/description/weight
- **评审状态**：已评审/未评审/已复盘/待复盘/不适用（基于 qualityFeedback 动态计算）
- **评审进度**：Run Summary 进度条 + 百分比
- **下一条待评审**：一键导航
- **失败复盘**：不要求评分，可填写 failureCategory/note/worthRetry
- **联动**：保存后自动更新 Run Summary、Provider Benchmark、Usage

## 数据管理

```bash
cd server
npm run db:reset                # 重置为干净 DB
npm run db:seed                 # 写入默认数据（项目、模板、seed 图片、Benchmark Set）
npm run verify:db-persistence   # 验证 DB 持久化安全
npm run verify:no-presigned-persistence  # 验证无 presigned URL 残留
npm run db:repair-hygiene       # 修复历史脏数据
```

- `db:reset` 是唯一清空入口
- `db:seed` 不覆盖已有真实数据
- `server/data/db.json` 已 gitignore
- `server/storage/assets/*` 已 gitignore
- 不提交真实视频文件和 db.json

### 存储后端切换（v0.3.9+）

项目支持两种存储后端，通过 `DATA_BACKEND` 环境变量切换：

| 模式 | 环境变量 | 适用场景 |
|------|----------|----------|
| JSON（默认） | `DATA_BACKEND=json` | 本地开发、兼容旧数据 |
| SQLite（推荐预发） | `DATA_BACKEND=sqlite` | 预发部署、更可靠的持久化 |

SQLite 优势：事务支持、WAL 模式并发读取、Docker volume 友好、后续迁 PostgreSQL 更自然。

#### 从 JSON 迁移到 SQLite

```bash
cd server

# 1. 初始化 SQLite schema
npm run db:sqlite:migrate

# 2. 导入现有 db.json 数据
npm run db:sqlite:import-json

# 3. 启动（SQLite 模式）
DATA_BACKEND=sqlite npm run dev
```

#### 从 SQLite 回退到 JSON

```bash
cd server

# 导出 SQLite → JSON
DATA_BACKEND=sqlite npm run db:sqlite:export-json
# 输出: server/data/db.exported.json

# 手动替换（如需要）
cp server/data/db.exported.json server/data/db.json
```

#### SQLite 验证

```bash
cd server
npm run verify:sqlite    # 28 项 SQLite 功能验证
```

> **说明**：第一阶段 SQLite 采用"实体表 + JSON payload"混合策略，暂未做列提升和业务索引。后续版本会逐步规范化字段。

#### npm test 策略

| 命令 | 验证范围 | 存储后端 |
|------|----------|----------|
| `npm test` | 14 个 verify 脚本（adapter、persistence、hygiene） | JSON（默认） |
| `npm run verify:sqlite` | 28 项 SQLite 功能验证 | SQLite |

- `npm test` 默认验证 JSON 主路径，是所有 PR 和发布前的必须检查
- `npm run verify:sqlite` 用于 SQLite 数据后端专项验证，使用临时 SQLite 文件，不污染现有数据
- **release 前必须额外跑 `verify:sqlite`**（已在 pre-release-checklist 中注明）
- 暂时不将 verify:sqlite 并入 npm test（避免增加 CI 负担，且两者独立验证目标不同）

## 测试命令分级

按修改范围选择对应级别，**不要无脑全量测试**：

### 级别 1：快速构建检查

```bash
npm run build               # 前端
cd server && npm run build  # 后端
```

适用于：UI 修改、文案修改、类型调整、小逻辑变更。

### 级别 2：后端核心回归

```bash
cd server && npm test
```

运行所有 dry-run verify 脚本（14 个），覆盖：storage、task、usage、quality、benchmark、provider registry、error mapping、data hygiene。

适用于：修改存储逻辑、修改 task/usage/quality 服务、修改 benchmark 服务、修改 provider registry。

### 级别 3：指定 Provider dry-run

```bash
cd server
npm run verify:wanxiang-t2v
npm run verify:wanxiang-i2v
npm run verify:wanxiang-r2v
npm run verify:happyhorse-t2v
npm run verify:happyhorse-i2v
npm run verify:happyhorse-r2v
npm run verify:kling-t2v
npm run verify:wanwu
```

适用于：修改某个 adapter、修改参数映射、修改错误映射。

### 级别 4：真实 live-run

**仅在必要时手动执行，会产生供应商费用。**

```bash
# 万相 T2V
DASHSCOPE_TEST_API_KEY="your-key" RUN_WANXIANG_T2V_LIVE_TEST=true npm run verify:wanxiang-t2v

# HappyHorse T2V
DASHSCOPE_TEST_API_KEY="your-key" RUN_HAPPYHORSE_T2V_LIVE_TEST=true npm run verify:happyhorse-t2v

# Kling T2V
KLING_TEST_API_KEY="your-key" RUN_KLING_T2V_LIVE_TEST=true npm run verify:kling-t2v
```

⚠️ live-run 需要显式环境变量，不应写入自动测试流程，不应作为日常测试。

### 数据卫生验证

```bash
cd server
npm run verify:db-persistence
npm run verify:no-presigned-persistence
npm run db:repair-hygiene
```

## 安全注意事项

| 约束 | 说明 |
|------|------|
| API Key 加密保存 | 后端 `APP_ENCRYPTION_KEY` 加密，前端脱敏 |
| 不硬编码 API Key | 代码、README、.env、console 均不含真实 Key |
| Presigned URL 不落库 | db.json/logs/导出包 均不含完整签名 URL |
| db.json 不提交 | 已被 .gitignore |
| storage files 不提交 | 已被 .gitignore |
| 项目导出不含凭据 | 归档 zip 不含 API Key、encrypted、signature |
| BYOK 费用自理 | 生成费用由用户供应商账户承担 |
| live-run 需确认 | Benchmark live-run 必须 confirmLiveRun=true |
| 非生产环境 | 无用户认证、无权限、无审计、无 HTTPS |

详细安全基线见：[docs/security-baseline-v0.3.md](docs/security-baseline-v0.3.md)

## 访问控制

应用已内置最小 Basic Auth 保护（默认关闭）。

### 启用应用级 Basic Auth

```bash
# 1. 生成密码 hash
cd server && npm run auth:hash-password -- "your-password"
# 输出: APP_BASIC_AUTH_PASSWORD_HASH=scrypt:...:...

# 2. 设置环境变量
export APP_ACCESS_CONTROL=basic
export APP_BASIC_AUTH_USERNAME=admin
export APP_BASIC_AUTH_PASSWORD_HASH=scrypt:...:...

# 3. （可选）保护 /health 端点
export APP_BASIC_AUTH_HEALTH_PUBLIC=false  # 默认 true（公开）

# 4. 启动后端
cd server && npm run dev
```

启用后所有页面和 API 需要认证，`/health` 默认公开（`APP_BASIC_AUTH_HEALTH_PUBLIC=true`）。

### 推荐方案

| 场景 | 方案 |
|------|------|
| 本地开发 | `APP_ACCESS_CONTROL=off`（默认） |
| 内网单机 | `APP_ACCESS_CONTROL=basic` |
| 公网预发 | 反向代理 Basic Auth（Caddy/Nginx）+ 关闭应用级 |
| Cloudflare 用户 | Cloudflare Access + 关闭应用级 |

详细说明见：[docs/auth-minimum-plan-v0.3.md](docs/auth-minimum-plan-v0.3.md)

## 开发脚本说明

### 正式工具脚本 (`server/scripts/`)

| 脚本 | 用途 |
|------|------|
| `resetDb.ts` | 重置 DB |
| `seedDb.ts` | 写入默认种子数据 |
| `verifyDbPersistence.ts` | 验证 DB 持久化安全 |
| `verifyNoPresignedUrlPersistence.ts` | 验证无 presigned URL |
| `repairDataHygiene.ts` | 修复历史脏数据 |
| `verifyErrors.ts` | 验证错误映射 |
| `verifyProviderAdapter.ts` | 验证 Provider 注册 |
| `verifyWanxiang*Adapter.ts` | 万相系列 dry-run 验证 |
| `verifyHappyHorse*Adapter.ts` | HappyHorse 系列 dry-run 验证 |
| `verifyKlingT2VAdapter.ts` | Kling T2V dry-run 验证 |
| `verifyOpenAIAdapter.ts` | 万物焕新 dry-run 验证 |
| `hashPassword.ts` | 生成 Basic Auth 密码 hash |
| `migrateSqlite.ts` | 初始化 SQLite schema（14 张表） |
| `importJsonToSqlite.ts` | db.json → SQLite 数据迁移 |
| `exportSqliteToJson.ts` | SQLite → db.json 数据回退 |
| `verifySqliteRepository.ts` | SQLite 功能验证（28 项） |

### 开发临时脚本 (`server/scripts/dev/`)

以下脚本为开发阶段一次性使用，不作为正式能力：

- `initProviders834.ts` — 8.3.4 阶段临时 Provider 初始化
- `runI2VLive834.ts` — 8.3.4 阶段 I2V 临时 live-run
- `runR2VLive834.ts` — 8.3.4 阶段 R2V 临时 live-run
- `generateSamples.ts` — 临时样本生成
- `seedR2VSamples.ts` — 临时 R2V 样本数据

这些脚本不在 `package.json` 的 `npm test` 中默认运行。

## 常见问题

- 后端未启动 → real mode 连接失败
- 图片生成失败 → 检查 Key、余额、模型权限和内容审核
- 图片能生成但不显示 → 确认后端仍在运行，`/storage/assets/...` 可访问
- 下载失败 → 确认本地文件未被手动删除
- 删除有资产项目失败 → 先迁移或删除资产
- 导入 zip 失败 → 确认归档包来自本应用
- 视频生成超时 → 百炼视频任务较长（2-10 分钟），可等待后重试
- I2V/R2V 无法生成 → 确保添加了对应 Provider，I2V 选择了首帧图片，R2V 使用了 character1
- Kling 说明 → 当前为 kling3api.com 第三方兼容网关，非 Kling 官方 API
- 数据丢失 → 运行 `npm run db:repair-hygiene` 修复，损坏的 db.json 有 `.corrupted.*` 备份

## 预发部署

> ✅ Docker + SQLite + Basic Auth 组合预发验证已通过（v0.3 Phase 9.4）。
> 镜像构建、compose 启动、健康检查、访问控制、volume 持久化、seed 均正常。
> 如首次构建遇到 SQLite 依赖问题，使用 `docker compose build --no-cache`。

### Docker 单镜像部署

```bash
# 1. 构建镜像
docker build -t video-ai-gen:v0.3 .

# 2. 准备数据目录
mkdir -p data storage

# 3. 首次生成并保存加密密钥（⚠️ 后续必须固定使用同一个值）
openssl rand -hex 32 > .app_encryption_key

# 4. 生成 Basic Auth 密码 hash（如启用访问控制）
cd server
npm run auth:hash-password -- "你的登录密码"
# 输出: APP_BASIC_AUTH_PASSWORD_HASH=scrypt:...:...
cd ..

# 5. 启动容器
#    如果不启用访问控制，删除 APP_ACCESS_CONTROL / APP_BASIC_AUTH_* 三行
#    APP_ENCRYPTION_KEY 每次必须用同一个值，否则已保存的 Provider Key 无法解密
docker run -d \
  --name video-ai-gen \
  -p 8787:8787 \
  -e APP_ENCRYPTION_KEY=$(cat .app_encryption_key) \
  -e CORS_ORIGIN=http://localhost:8787 \
  -e APP_ACCESS_CONTROL=basic \
  -e APP_BASIC_AUTH_USERNAME=admin \
  -e APP_BASIC_AUTH_PASSWORD_HASH="<上一步生成的完整 hash>" \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/storage:/app/storage \
  video-ai-gen:v0.3

# 6. 初始化数据
docker exec video-ai-gen node dist/scripts/seedDb.js

# 7. 检查健康
curl http://localhost:8787/health
```

### docker-compose 部署（推荐：SQLite + Basic Auth）

```bash
# 1. 复制模板
cp docker-compose.example.yml docker-compose.yml

# 2. 创建 .env（docker compose 自动读取）
cp .env.production.example .env

# 3. 生成加密密钥（⚠️ 必须持久保存）
openssl rand -hex 32 > .app_encryption_key

# 4. 生成 Basic Auth 密码 hash
cd server && npm run auth:hash-password -- "你的密码" && cd ..

# 5. 编辑 .env 填入真实值
#    关键变量：APP_ENCRYPTION_KEY、APP_BASIC_AUTH_PASSWORD_HASH、DATA_BACKEND=sqlite
vim .env

# 6. 构建并启动（首次建议 --no-cache 确保依赖完整）
docker compose build --no-cache
docker compose up -d

# 7. 初始化数据
docker compose exec app node dist/scripts/seedDb.js

# 8. 检查
curl http://localhost:8787/health
```

> **注意**：Docker 层缓存可能导致 `better-sqlite3` 未安装。如容器启动后 `/app/data/` 下只有 `db.json` 没有 `app.sqlite`，执行 `docker compose build --no-cache` 重建。
>
> `docker-compose.yml` 默认使用 `DATA_BACKEND=sqlite`，可改为 `json` 切换回 JSON 模式。

### 环境变量

见 [`.env.production.example`](.env.production.example)，关键变量：

- **`APP_ENCRYPTION_KEY`**：至少 32 字节，用于加密 Provider API Key。**必须持久保存**（`.app_encryption_key`），每次更换会导致所有已保存凭据无法解密
- `CORS_ORIGIN`：生产环境设置为实际域名
- `STORAGE_MODE`：`local` / `object-public` / `object-private-presigned`
- `APP_ACCESS_CONTROL`：`off`（默认）/ `basic`
- `APP_BASIC_AUTH_PASSWORD_HASH`：通过 `npm run auth:hash-password` 生成

> Provider API Key 通过应用内「供应商」页面添加，**不写入 .env**。
>
> docker-compose 的 `.env` 与前端/后端的 `.env` 不同，专供 docker compose 变量替换。如果运行时镜像不含 `tsx`，`db:seed` 可在宿主机执行后靠 volume 挂载。

### 生产注意事项

- Provider API Key 通过应用内「供应商」页面添加，**不写入 .env**
- **`APP_ENCRYPTION_KEY` 必须持久保存**（推荐写入 `.app_encryption_key` 并加入 gitignore）。每次更换密钥将导致所有已保存的 Provider Key 无法解密
- `APP_ENCRYPTION_KEY` 必须安全备份，丢失则已保存的 Provider Key 无法解密
- 生产建议配置反向代理 (Caddy/Nginx) + HTTPS
- 生产建议使用对象存储 (Private-Presigned 模式) 替代本地文件存储
- `data/` 和 `storage/` 目录需映射为持久卷
- 公网部署必须启用访问控制（`APP_ACCESS_CONTROL=basic` 或反向代理 Basic Auth）
- 预发推荐 `DATA_BACKEND=sqlite`（已在 docker-compose.example.yml 中设为默认）
- Docker 构建若遇到 SQLite 未安装问题，使用 `docker compose build --no-cache` 重建

### 为何当前仍不是正式生产版本

- 无用户认证与权限系统
- 无审计日志
- 无自动化备份
- 估算成本不保证与供应商账单一致
- SQLite 为单机存储，适合预发/单机部署，不适合多用户/高并发生产（PostgreSQL 仍是未来 SaaS 推荐目标）

详细部署文档：
- [Docker 部署](Dockerfile) / [docker-compose](docker-compose.example.yml)
- [反向代理与 HTTPS](docs/deployment-reverse-proxy-v0.3.md)
- [对象存储生产配置](docs/object-storage-production-v0.3.md)
- [备份与恢复](docs/backup-restore-v0.3.md)
- [SQL 迁移计划](docs/sql-migration-plan-v0.3.md)
- [最小登录保护](docs/auth-minimum-plan-v0.3.md)
- [部署前检查清单](docs/pre-release-checklist-v0.3.md)

## 重要文档

- [v0.3 能力边界](docs/benchmark-mvp-v0.3-capability-boundary.md)
- [v0.3 安全基线](docs/security-baseline-v0.3.md)
- [v0.3 演示流程](docs/demo-flow-v0.3.md)
- [v0.3 验收清单](docs/manual-acceptance-checklist-v0.3-benchmark-mvp.md)
- [v0.2 Video MVP 能力边界](docs/video-mvp-v0.2-capability-boundary.md)
- [v0.2 验收清单](docs/manual-acceptance-checklist-v0.2-video.md)
- [API 接入架构](docs/api-integration-architecture.md)
- [项目归档导入设计](docs/project-archive-import-design.md)

## 下一阶段路线

v0.3.0-benchmark-mvp 已完成 Benchmark MVP 阶段的交付整理。

```bash
git tag v0.3.0-benchmark-mvp
```

下一步方向：
- **9.0**：预发部署准备（用户认证、权限、审计、SQL 迁移、HTTPS）
- **方向 A**：更多视频供应商（MiniMax、Runway）
- **方向 B**：视频编辑、提示词优化
- **方向 C**：自动 AI 质量评估
