# API Asset Studio

API Asset Studio 是一个 BYOK（Bring Your Own Key，自带 API Key）的 AI 图片与视频资产生成工作台。v0.2 Video MVP 已支持通过本地后端代理调用万物焕新 gpt-image-2 做真实文生图，以及阿里云百炼万相做真实 T2V 文生视频、I2V 图生视频和 R2V 参考生视频，并提供项目、任务、资产、模板、导入导出等本地工作台能力。

当前版本：`0.2.0-video-mvp`（第 8.2 阶段：多供应商对比看板）。这是本地单用户 MVP，不是生产环境版本。

## 当前真实能力

- React/Vite 前端与 Node.js/Express 后端；
- mock / real mode 切换；
- BYOK Provider 管理；
- API Key 后端加密保存与脱敏展示；
- 万物焕新 gpt-image-2 真实文生图；
- 真实图片保存到 `server/storage/assets/`；
- 图片资产展示、下载、删除文件、重新生成；
- providers / assets / tasks / projects / promptTemplates 后端化；
- Prompt 模板变量替换与一键填入；
- 项目资产迁移；
- 项目归档包导出；
- 项目归档包导入为副本；
- Workspace 本地工作区；
- `/health` 系统诊断；
- **阿里云百炼 万相文生视频 真实 T2V**（第 7.0 新增）；
- **阿里云百炼 万相图生视频 真实 I2V**（第 7.1 新增）；
- **阿里云百炼 万相参考生视频 真实 R2V**（第 7.2 新增）；
- **真实视频保存到 `server/storage/assets/`**（第 7.0 新增）；
- **视频资产预览、下载、删除**（第 7.0 新增）；
- **异步视频任务轮询与状态推进**（第 7.0 新增）；
- **用量记录与成本感知 Usage Ledger**（第 7.3 新增）；
- **质量评价与失败复盘 Feedback Loop**（第 7.4 新增）；
- **对象存储适配器**（第 7.5 新增，支持 S3/OSS/MinIO 等标准对象存储）；
- **Private Bucket + Presigned URL 安全闭环**（第 7.6 新增，支持私有对象存储的动态签名授权）；
- **第二视频供应商 Kling T2V 接入**（第 8.0 新增，支持 Kling 文生视频）；
- **多供应商对比看板 Provider Benchmark**（第 8.2 新增，支持按供应商/模型/模式多维度对比成功率、失败率、耗时、成本、评分）。

## 尚未实现的功能（Mock）

本项目目前**没有**以下真实能力（UI 上可能仅为 Mock 或暂不开放）：

- 图生图（Image-to-Image）；
- 图片编辑、局部重绘、扩图；
- 多角色参考生视频（R2V 目前仅支持单角色 character1）；
- Kling I2V / R2V / 视频编辑（目前仅接入 Kling T2V，是否扩展 I2V 待 Provider Benchmark 数据支撑决策）；
- 用户登录、团队协作、支付计费体系；
- 其他视频供应商（当前支持阿里云百炼万相 T2V/I2V/R2V 和 Kling T2V）；
- 自动 AI 质量分析（当前质量评价为人工主观反馈）。

## 技术栈

- 前端：Vite + React + TypeScript + Tailwind CSS；
- 后端：Node.js + Express + TypeScript；
- 存储：本地 JSON `server/data/db.json`；
- 文件存储：支持 Local Storage（本地目录 `server/storage/assets/`）和 Object Storage（S3 / OSS 兼容，支持 Public / Private-Presigned）；
- 真实图片供应商：万物焕新 gpt-image-2；
- 真实视频供应商：阿里云百炼 万相文生视频（T2V）、万相图生视频（I2V）、万相参考生视频（R2V）、Kling 文生视频（T2V）。

## 目录结构

```txt
src/                         前端应用
server/                      本地后端代理
server/data/db.example.json  本地 DB 示例结构
server/storage/assets/       本地资产文件
docs/                        架构与验收文档
```

## 快速启动

安装前端：

```bash
npm install
```

安装后端：

```bash
cd server
npm install
```

## 前端 Mock Mode

默认就是 mock mode：

```bash
npm run dev
```

Mock mode 使用前端 mockData 和 localStorage，不调用本地后端，不支持真实归档导入下载。

## 前端 Real Mode

先启动后端：

```bash
cd server
npm run dev
```

再启动前端：

```bash
VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8787 npm run dev
```

Real mode 下，providers、assets、tasks、projects、promptTemplates、workspace 都以后端为主数据源。

## 常用命令

根目录：

```bash
npm run dev
npm run build
npm run dev:web
npm run build:web
npm run dev:server
npm run build:server
```

后端：

```bash
cd server
npm run dev
npm run build
npm test
npm run verify:wanwu
npm run verify:wanxiang-t2v
npm run verify:wanxiang-i2v
npm run verify:wanxiang-r2v
npm run verify:db-persistence
npm run verify:no-presigned-persistence
npm run db:reset
npm run db:seed
npm run db:repair-hygiene
```

## 环境变量

前端参考 `.env.example`：

```txt
VITE_API_MODE=mock
VITE_API_BASE_URL=http://127.0.0.1:8787
VITE_APP_NAME=API Asset Studio
```

后端参考 `server/.env.example`：

```txt
PORT=8787
NODE_ENV=development
APP_ENCRYPTION_KEY=replace-with-32-byte-secret-value
CORS_ORIGIN=http://127.0.0.1:5173
```

`APP_ENCRYPTION_KEY` 至少 32 字节。不要提交真实 `.env`。

## Provider / API Key 安全说明

- 本项目是 BYOK，用户 Key 通过 Provider 页面提交；
- 前端不应保存明文 API Key；
- 后端保存加密后的密文和脱敏展示值；
- 接口响应不返回明文 Key；
- 不要把真实 Key 写入代码、README、`.env` 或 console；
- 导出包和导入包不包含 provider credential。

## 万物焕新 gpt-image-2

当前真实图片链路：

1. Provider 页面添加万物焕新 gpt-image-2；
2. 后端加密保存 Key；
3. Image Studio 发送文生图请求；
4. 后端调用 `https://api.wanwuhuanxin.cn/v1/chat/completions`；
5. 从返回文本中解析图片 URL；
6. 下载图片到 `server/storage/assets/`；
7. 写入 task 和 asset；
8. 前端资产库展示真实图片。

生成图片会产生用户自己的供应商账户费用。内容审核、版权归属、商用授权和使用限制以对应供应商服务条款为准。

## 阿里云百炼 万相视频生成（T2V / I2V / R2V）

v0.2 Video MVP 阶段已完成真实 T2V、I2V 和 R2V 的最小闭环。供应商为阿里云百炼 / 万相。

### 使用流程

1. Provider 页面添加“阿里云百炼”相应的供应商（T2V、I2V 或 R2V）；
2. 填写自己的百炼 API Key（`providerType` 选 `aliyun-wanxiang-t2v`、`aliyun-wanxiang-i2v` 或 `aliyun-wanxiang-r2v`）；
3. 后端加密保存 Key；
4. Video Studio 面板选择对应模式与该供应商（I2V 需要从资产库选择已有图片作为首帧，R2V 需要选择参考图片并在 prompt 中使用 character1）；
5. 输入提示词、参数后点击“创建真实任务”；
6. 后端调用 `https://dashscope.aliyuncs.com` API；
7. 创建异步任务，前端 Task Center 显示 running 状态；
8. 后端在前端轮询时顺便查询供应商任务状态；
9. 供应商完成后下载视频到 `server/storage/assets/`；
10. 写入 video asset，Asset Library 展示真实视频。

### 注意事项

- 视频生成耗时较长（通常 2-10 分钟），请在任务中心查看进度；
- 视频生成会产生用户自己的百炼账户费用；
- R2V 第一版仅支持单角色参考，需要在 prompt 中使用 `character1` 引用角色；
- I2V 首帧图片限制最大 20MB（通过 base64 上传）；
- R2V 参考图片也通过 base64 上传（限制 20MB）；
- R2V 参考视频需要公网 URL，本地视频无法被供应商访问；
- 不要提交真实视频文件和真实 `db.json`。

### 验证脚本

dry-run（不产生费用）：

```bash
cd server
npm run verify:wanxiang-t2v
npm run verify:wanxiang-i2v
npm run verify:wanxiang-r2v
```

live test（会产生费用）：

```bash
DASHSCOPE_TEST_API_KEY="your-key" RUN_WANXIANG_T2V_LIVE_TEST=true npm run verify:wanxiang-t2v
DASHSCOPE_TEST_API_KEY="your-key" RUN_WANXIANG_I2V_LIVE_TEST=true npm run verify:wanxiang-i2v
DASHSCOPE_TEST_API_KEY="your-key" RUN_WANXIANG_R2V_LIVE_TEST=true WANXIANG_R2V_TEST_REFERENCE_IMAGE_URL="https://..." npm run verify:wanxiang-r2v
```

live test 成功时会输出：testConnection 结果、本地 task id、providerTaskId（脱敏）、task status、providerTaskStatus、polling 次数、视频 URL host、localPath、sizeBytes、mimeType、public url、asset id。

失败时只输出：errorCode、message、retryable。不会输出 API Key 或敏感 header。

### 页面级 real mode 验收步骤

1. 启动后端：`cd server && npm run dev`；
2. 启动前端：`VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8787 npm run dev`；
3. Provider 页面添加“阿里云百炼 万相文生视频”供应商，填入百炼 API Key；
4. 确认 Key 脱敏显示，能力芯片显示 T2V / 异步任务；
5. 测试连接 —— 不产生视频费用，应显示“已连接”；
6. Video Studio T2V 面板选择真实 provider，确认显示费用和耗时提示；
7. 输入提示词，点击“创建真实 T2V 任务”；
8. 自动跳转 Task Center，确认任务显示“真实任务”“轮询中”；
9. 等待任务完成（通常 2-10 分钟），确认状态变为“已完成”；
10. 点击“查看资产”，Asset Library 显示真实视频；
11. 点击视频资产，确认可用 video 标签播放；
12. 确认可以下载、可以删除；
13. 刷新页面后仍可看到资产；
14. 确认 I2V / R2V 面板显示 Mock 边界说明。

## Kling 文生视频 (T2V)

v8.0 阶段新增第二个视频供应商 Kling T2V 文生视频最小闭环，通过第三方兼容网关 `kling3api.com` 接入。

### 供应商身份说明

**当前接入的是 `kling3api.com` 第三方兼容网关，非 Kling 官方 API。**

- API Endpoint：`https://kling3api.com/api`
- 认证方式：Bearer API Key（从 kling3api.com 获取）
- 费用：以 kling3api.com 后台为准，非 Kling 官方计费
- 状态：非官方接口，功能和稳定性以网关为准

### 使用流程

1. Provider 页面添加【Kling 文生视频】供应商；
2. 填写自己的 kling3api.com API Key（`providerType` 选 `kling-t2v`）；
3. 后端加密保存 Key；
4. Video Studio T2V 面板选择 Kling provider；
5. 选择模型（pro-text-to-video / std-text-to-video）；
6. 输入提示词、时长、画幅后点击"创建真实任务"；
7. 后端调用 `https://kling3api.com/api/generate`；
8. 创建异步任务，前端 Task Center 显示轮询中；
9. 供应商完成后下载视频到 `server/storage/assets/`；
10. 写入 video asset，Asset Library 展示真实视频。

### 注意事项

- 当前接入的是第三方兼容网关，非 Kling 官方 API；
- Kling 当前仅接入 T2V，I2V / R2V / 视频编辑暂未接入；
- 视频生成耗时较长（通常 3-15 秒视频，需 1-5 分钟处理），请在任务中心查看进度；
- 视频生成会产生用户自己的 kling3api.com 账户积分费用；
- Kling T2V 支持 3-15 秒视频，支持 16:9 / 9:16 / 1:1 画幅；
- 不要提交真实视频文件和真实 `db.json`。

### 验证脚本

dry-run（不产生费用）：

```bash
cd server
npm run verify:kling-t2v
```

live test（会产生费用）：

```bash
KLING_TEST_API_KEY="your-key" RUN_KLING_T2V_LIVE_TEST=true npm run verify:kling-t2v
```

live test 成功时会输出：testConnection 结果、本地 task id、providerTaskId（脱敏）、task status、providerTaskStatus、polling 次数、视频 URL host、localPath、sizeBytes、mimeType、public url、asset id。

失败时只输出：errorCode、message、retryable。不会输出 API Key 或敏感 header。

### Kling 与万相对比

| 维度 | Kling T2V（kling3api.com） | 万相 T2V |
|------|---------------------------|----------|
| 接入方式 | 第三方兼容网关 | 阿里云百炼官方 API |
| 最大时长 | 15 秒 | 15 秒 |
| 画幅 | 16:9 / 9:16 / 1:1 | 16:9 / 9:16 / 1:1 |
| 模型 | pro / std | wan2.7-t2v |
| 价格模型 | kling3api.com 积分制 | 百炼按调用计费 |
| I2V | 未接入 | 已接入 |
| R2V | 未接入 | 已接入 |

## 用量记录与成本感知 (Usage Ledger)

项目内置了基于任务的用量记录系统（第 7.3 阶段新增）：

- 任何图片或视频生成任务（包含真实与 Mock）都会在 `server/data/db.json` 记录 `UsageRecord`。
- 提供了可配置的 **Cost Rules**（成本规则），您可以自由设定某个供应商特定模型的价格估算公式（如：每任务计费、每张图片计费、每秒计费）。
- 系统会在任务列表、总览大盘与单独的“用量统计”页面展示这些估算结果。

> ⚠️ **成本估算边界警告**：平台不直接向用户收取图片/视频生成费用，实际扣费由您所配置的各供应商账户（如阿里云百炼）承担。本平台的 Usage Ledger 估算费用仅供参考，不保证与真实账单百分百一致。建议定期核对供应商真实账单。

## 质量评价与失败复盘 (Feedback Loop)

项目内置了基于资产和任务的质量反馈系统（第 7.4 阶段新增）：

- 您可以对每个资产和任务进行 1-5 星级评分、质量状态评估（优秀/可用/需要修复/不可用）和失败原因归类。
- 支持 12 种失败分类（提示词问题、模型能力、角色漂移、构图问题等），有助于识别系统性的质量短板。
- Asset Library 支持按评价状态筛选； Dashboard 和 Usage 展示质量汇总。
- 导出包中包含 `quality-feedback.json`，确保反馈数据可移植。

> 注意：这是**用户主观反馈**，而非自动评分。后续可以接入自动质量评估模型。

## 数据管理

`server/data/db.example.json` 是干净示例结构。首次运行缺少 `server/data/db.json` 时会自动创建。

```bash
cd server
npm run db:reset
npm run db:seed
```

- `db:reset` 重置为干净结构；
- `db:seed` 写入默认项目、默认模板、seed 图片资产和 Benchmark Set；
- `server/data/db.json` 已加入 `.gitignore`；
- 不要提交真实联调数据；
- 不要提交真实生成图片。

## 数据卫生验证

第 8.3.5 阶段新增了数据卫生验证与修复工具：

```bash
cd server

# 验证 DB 持久化安全（写入/读取/原子写入/不写回）
npm run verify:db-persistence

# 验证 db.json 中无 presigned URL 残留
npm run verify:no-presigned-persistence

# 修复历史脏数据（清理 presigned URL、修复 pending 残留）
npm run db:repair-hygiene
```

### DB 持久化安全说明

- `readDb()` 不再在每次读取时写回 DB（避免并发覆盖）。
- `writeDb()` 使用原子写入（先写 temp 文件，再 rename），防止写入中断导致数据损坏。
- `updateDb()` 始终从磁盘重读最新数据进行更新，避免脏写。
- 解析失败的 `db.json` 会自动备份（`.corrupted.*` 后缀），再回退到示例结构。
- 仅 `db:reset` 允许清空数据；`db:seed` 不会覆盖已有真实数据。

### URL 安全策略

- local storage asset 的 `asset.url` 使用本地可访问 URL（`http://127.0.0.1:{port}/storage/assets/...`），不保存供应商 OSS presigned URL。
- object private-presigned asset 只保存 `objectKey`、`storageType`、`accessMode`，不保存完整 presigned URL。
- `task.parameters` / `asset.parameters` 只保存 `sourceHost` / `sourceContainsSignature` 元数据，不保存完整签名 URL。
- 项目导出包不包含 presigned URL。

### Benchmark 参考素材说明

- 默认 Benchmark Set（`Default Video Model Benchmark v0.1`）不再依赖 `picsum.photos` 外部随机图片服务。
- I2V/R2V 用例引用本地 seed 图片资产（`sourceImageAssetId` / `referenceAssetId`）。
- 运行 `npm run db:seed` 自动在 `server/storage/assets/seed/` 创建 3 个 256×256 seed PNG（水滴/产品瓶/仪表盘）。
- seed 图片在 Asset Library 可见，可作为 I2V/R2V 参考素材。
- dry-run 不会产生供应商费用；live-run 前可在 Benchmark 页面查看素材来源。

## 本地文件存储

真实图片和视频保存到：

```txt
server/storage/assets/
```

- 图片扩展名：`.png`、`.jpg`、`.webp`；
- 视频扩展名：`.mp4`、`.webm`；
- 文件名格式：`{assetId}.{ext}`；
- 该目录真实文件已被 `.gitignore` 忽略，`.gitkeep` 仅用于保留目录结构；
- 删除 asset 时同步删除本地文件。

## 对象存储与 Presigned URL 机制

### Storage Adapter 架构

系统支持两种存储后端：

| 模式 | 配置位置 | 适用场景 |
|------|----------|----------|
| Local Storage | 默认，本地 `server/storage/assets/` | 开发、单机使用 |
| Object Storage | Settings 页面配置 | 生产、跨设备访问 |

Object Storage 支持 S3 兼容协议（AWS S3、阿里云 OSS、MinIO 等）。

### Access Mode

| 模式 | 说明 | 安全性 |
|------|------|--------|
| Public Read | 资产永久公开，任意 URL 即可访问 | 低（链接泄露即可访问） |
| Private + Presigned | 资产私有，按需签发带过期时间的临时链接 | 高（链接仅短期有效） |

### Presigned URL 机制

- **前端预览**：默认 900 秒过期，可在 Settings 调整；
- **供应商读取**：默认 3600 秒过期，确保视频生成任务有足够时间抓取素材；
- **签发时机**：仅在访问时按需签发，不提前生成；
- **不过 DB**：presigned URL 不保存到 `db.json`、`task.parameters`、`asset.parameters`；
- **不在日志**：presigned URL 不打印到 server logs；
- **不在导出**：项目归档包不包含 presigned URL。

### 安全约束

- AccessKey / SecretKey 仅在后端加密保存，从不返回前端；
- `storageConfig` 返回时剔除 `accessKeyIdEncrypted` 和 `accessKeySecretEncrypted`；
- objectKey 校验禁止 `../`、绝对路径、空路径、Windows 盘符路径；
- 删除 object asset 后 bucket 中对象同步删除。

## 项目导入导出

导出接口：

```txt
GET /api/projects/:id/export?includeFiles=true&includeTasks=true&includeTemplates=true
```

导入接口：

```txt
POST /api/project-imports/validate
POST /api/project-imports?importFiles=true&importTasks=true&importTemplates=true
```

归档包包含：

- `manifest.json`
- `project.json`
- `assets.json`
- `tasks.json`
- `prompt-templates.json`
- `usage-records.json`
- `quality-feedback.json`
- `files/`
- `README.md`

导入采用“创建副本”策略，会生成新的 projectId、assetId、taskId、templateId，不覆盖现有项目和文件。

归档包不会包含：

- 明文 API Key；
- 加密密钥字段；
- provider credential；
- `server/data/db.json` 原文件；
- 本机绝对路径。

## Health / Diagnostics

```txt
GET /health
```

返回：

- `status`
- `version`
- `stage`
- `storageReady`
- `dbReady`
- `providerMode`
- `timestamp`

Settings 页面会显示版本与诊断信息。

## 常见问题

- 后端未启动：real mode 会显示连接失败；
- 图片生成失败：检查 Key、余额、模型权限和内容审核；
- 图片能生成但不显示：确认后端仍在运行，`/storage/assets/...` 可访问；
- 下载失败：确认本地文件未被手动删除；
- 删除有资产项目失败：先迁移或删除资产；
- 导入 zip 失败：确认归档包来自本应用，并且路径安全、结构完整；
- 视频生成中状态不更新：确认后端仍在运行，前端需有活跃任务轮询；
- 视频生成超时：百炼视频任务较长，可等待后重试；
- I2V / R2V 无法真实生成：当前 T2V / I2V / R2V 均支持真实生成。
- R2V 不工作：请确保添加了 R2V 供应商，在提示词中使用了 character1，并选择了参考图片。
- Kling T2V 无法真实生成：请确保添加了 Kling provider，使用 kling-t2v providerType，并配置了 API Key。

## 安全注意事项

- 不提交真实 `.env`；
- 不提交真实 `server/data/db.json`；
- 不提交真实生成图片文件；
- 不提交真实生成视频文件；
- 不在 localStorage 保存明文 Key；
- 不在 db.json 保存明文 Key；
- 不在导出包包含凭据；
- v0.1 不适合作为生产环境部署。

## 重要文档

- [v0.1 MVP 能力边界](docs/mvp-v0.1-capability-boundary.md)
- [v0.1 手动验收清单](docs/manual-acceptance-checklist-v0.1.md)
- [v0.2 Video MVP 能力边界](docs/video-mvp-v0.2-capability-boundary.md)
- [v0.2 手动验收清单](docs/manual-acceptance-checklist-v0.2-video.md)
- [API 接入架构](docs/api-integration-architecture.md)
- [项目归档导入设计](docs/project-archive-import-design.md)

## 多供应商对比看板 (Provider Benchmark)

第 8.2 阶段新增了专门的多供应商对比看板，帮助用户在 BYOK 模式下进行数据驱动的供应商决策。

### 功能说明

- **供应商对比表**：按 provider 维度汇总成功率、失败率、平均耗时、估算成本、平均评分、质量分布。
- **模型对比表**：按 provider + model 维度细化对比（如 Kling pro-text-to-video vs Kling std-text-to-video）。
- **模式统计**：按 image / t2v / i2v / r2v 汇总各模式整体表现。
- **失败原因分布**：统计各失败分类的数量和估算浪费成本。
- **质量成本交叉分析**：展示各供应商的优秀/可用/需修复/不可用分布与浪费成本。
- **智能洞察**：基于数据自动生成提示（样本量不足、Kling 网关提醒、最佳供应商推荐等）。

### 统计口径

| 指标 | 计算方式 | 说明 |
|------|----------|------|
| 成功率 | completedTasks / totalTasks | 任务状态为 completed 的比例 |
| 失败率 | failedTasks / totalTasks | 任务状态为 failed 的比例 |
| 平均耗时 | completedAt - createdAt | 仅统计有完成时间的任务 |
| 估算成本 | usageRecords.estimatedCost.amount | confidence=none 不计入，部分任务未配置规则显示为空 |
| 浪费成本 | failed 任务 + unusable 评价任务 | 避免重复计算同一 task |
| 平均评分 | qualityFeedback.rating | task 和 asset 评价合并统计，无评价时为空 |

### 重要提醒

- **成本估算不等于实际账单**：成本统计仅供参考，实际费用以供应商控制台为准。
- **Kling 当前是兼容网关**：Kling 通过 kling3api.com 第三方兼容网关接入，非 Kling 官方 API。
- **需要足够样本量**：样本量不足时统计结果可能不具代表性，建议先完成万相系列和 Kling live test 后评估。当前万相 T2V/I2V/R2V 和 Kling T2V 均未执行 live test（需分别配置 `DASHSCOPE_TEST_API_KEY` 和 `KLING_TEST_API_KEY`），Provider Benchmark 中数据为 dry-run 接入状态。真实生成会产生供应商费用。
- **不保存新数据**：Provider Benchmark 仅做只读统计聚合，不修改任何已有数据。

### 入口

- 侧边栏「供应商对比」（analytics 图标）
- Dashboard「供应商表现」卡片 → 「进入供应商对比」
- Usage 页面「按供应商统计」区域 → 「查看供应商对比」

## 下一阶段路线

第 8.2 阶段多供应商对比看板已完成。v0.2 Video MVP 达成了完整的"生成 → 统计 → 评价 → 对比"闭环。

## 基准测试集 Prompt Benchmark Set

第 8.3 阶段新增了标准化的 Prompt Benchmark Set 系统，将临时测试脚本升级为产品能力：

- **Benchmark Set**：标准测试集，包含固定 prompt、参数、参考素材和评价 rubric 的用例集合
- **Benchmark Run**：一次测试运行，选择测试集和供应商列表，执行 dry-run 或 live-run
- **dry-run**（默认）：不调用真实供应商，仅创建测试记录，不产生费用
- **live-run**：真实调用供应商生成视频，**会产生费用**，需要二次确认

### 默认测试集

`Default Video Model Benchmark v0.1` 包含 9 个标准化用例：

| 模式 | 数量 | 主题 |
|------|------|------|
| T2V | 3 条 | 水滴 Logo 动效、产品展示、仪表盘推送 |
| I2V | 3 条 | 水滴悬浮旋转、产品旋转、仪表盘视差 |
| R2V | 3 条 | 水滴角色前移、产品展示、仪表盘演示 |

每个用例包含：prompt、parameters（时长/分辨率/画幅）、rubric（评价标准，如主体稳定性、动作自然度、prompt 符合度等）、expectedFocus（评价重点）

### 使用流程

1. 进入侧边栏「基准测试」页面
2. 查看默认 Benchmark Set 及其用例
3. 点击「创建 Run」，选择供应商
4. dry-run 不产生费用，live-run 需确认费用
5. 任务轮询自动同步 RunItem 状态（task completed → item completed + assetId 回填）
6. 结果自动进入 Task / Asset / Usage / Quality / Provider Benchmark

### 状态同步闭环

- **RunItem ↔ Task**：`refreshRealVideoTasks()` 轮询后自动调用 `syncBenchmarkRunItems()`
- **task completed → RunItem completed**：自动回填 assetId，关联生成的视频资产
- **task failed → RunItem failed**：回填 errorCode / errorReason，保留错误信息
- **Run 状态自动迁移**：running → completed 在所有 item 终态后自动完成
- **Quality Feedback 联动**：RunItem 关联的 asset/task 可填写评价，评价后 Run Summary 的 averageRating 实时更新，Provider Benchmark 和 Usage 页面同步统计
- **前端轮询**：Benchmark 页面每 3s 自动刷新 Run 详情，实时显示任务→资产同步结果

### 安全约束

- live-run 必须二次确认（confirmLiveRun=true）
- 不保存 API Key 到 Run/Item
- 不保存 presigned URL
- 不保存供应商原始响应
- Benchmark Set 可提交 seed，真实 Run 结果不应提交
- **dry-run 不代表模型真实表现**：dry-run 不调用供应商，仅创建记录用于测试流程
- **live-run 会产生供应商费用**：成本以供应商控制台为准

### 入口

- 侧边栏「基准测试」（science 图标）
- Provider Benchmark 页面「查看基准测试」按钮

下一阶段方向：
- **方向 A**：Kling I2V 接入（建议在 Provider Benchmark 有足够数据支撑后决策）；
- **方向 B**：视频编辑、提示词优化；
- **方向 C**：更多视频供应商（MiniMax、Runway）；
- **第 10.0**：多用户、团队协作、权限管理。
