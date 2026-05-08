# API Asset Studio

API Asset Studio 是一个 BYOK（Bring Your Own Key，自带 API Key）的 AI 图片与视频资产生成工作台。用户可以在统一界面中管理项目、供应商配置、生成任务、图片资产、视频资产和提示词模板。

当前项目由 Google Stitch 导出的静态 UI 演进而来，已整理为 Vite + React + TypeScript + Tailwind 前端应用。

## 当前功能

- Dashboard 总览
- Projects 项目管理
- Image Studio 图片生成工作台
- Video Studio 视频生成工作台，支持 T2V / I2V / R2V 三种模式
- Asset Library 资产库，支持筛选、搜索、详情抽屉、批量选择
- Task Center 任务中心
- Provider & API Keys 供应商与 API Key 管理
- Prompt Templates 提示词模板库
- Settings 设置页
- hash 路由同步与刷新保持
- localStorage 本地持久化
- 移动端导航抽屉
- Mock 图片生成、视频任务、任务进度和资产入库

## Mock 状态说明

第一阶段到当前阶段仍然不接真实第三方供应商 API。以下能力均为 Mock：

- API Key 保存、测试连接和删除；
- 图片生成；
- 视频生成；
- 上传、下载、截取首帧 / 尾帧；
- 任务轮询和失败重试；
- 资产文件存储。

第四阶段新增了 API Client 和 Provider Adapter 骨架，默认仍走 `mock` 模式。未来真实接入时，前端应调用自有后端 API，由后端代理第三方供应商。

第五阶段新增了 `server/` 本地后端代理服务骨架。第 5.5 阶段继续补齐了环境变量校验、统一错误验证脚本、Provider Adapter 验证脚本和本地文件存储目录预留。但当前仍不调用任何真实第三方生成 API。

第 5.6 阶段完成了 real mode 数据源统一：`VITE_API_MODE=real` 时，前端启动会从本地后端拉取 providers、tasks、assets；任务进行中时会轮询后端并同步资产库。`VITE_API_MODE=mock` 时，仍保持原有 localStorage Mock 数据链路。

## 如何运行

```bash
npm install
npm run dev
```

默认开发地址由 Vite 输出，通常是：

```txt
http://localhost:5173/
```

## 如何构建

```bash
npm run build
```

前端和后端也可以分开启动：

```bash
npm run dev:web
npm run dev:server
```

分别构建：

```bash
npm run build:web
npm run build:server
```

## 后端代理服务

后端位于 `server/`：

```bash
cd server
npm install
npm run dev
```

默认地址：

```txt
http://127.0.0.1:8787
```

当前已实现的后端接口：

- `GET /api/providers`
- `POST /api/providers`
- `PATCH /api/providers/:id`
- `DELETE /api/providers/:id`
- `POST /api/providers/:id/test`
- `GET /api/workspace`
- `PATCH /api/workspace`
- `POST /api/generations/image`
- `POST /api/generations/video/t2v`
- `POST /api/generations/video/i2v`
- `POST /api/generations/video/r2v`
- `GET /api/tasks`
- `GET /api/tasks/:id`
- `POST /api/tasks/:id/cancel`
- `POST /api/tasks/:id/retry`
- `GET /api/assets`
- `GET /api/assets/:id`
- `GET /api/assets/:id/download`
- `DELETE /api/assets/:id`
- `POST /api/assets/:id/favorite`
- `GET /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`
- `POST /api/projects/:id/archive`
- `POST /api/projects/:id/favorite`
- `POST /api/projects/:id/move-assets`
- `GET /api/projects/:id/export`
- `GET /api/prompt-templates`
- `GET /api/prompt-templates/:id`
- `POST /api/prompt-templates`
- `PATCH /api/prompt-templates/:id`
- `DELETE /api/prompt-templates/:id`
- `POST /api/prompt-templates/:id/duplicate`
- `POST /api/prompt-templates/:id/use`

后端当前使用本地 JSON 文件 `server/data/db.json` 存储开发数据。Provider API Key 会加密保存为 `encryptedApiKey`，接口响应只返回 `maskedApiKey`，不会返回明文 API Key。

后端验证脚本：

```bash
cd server
npm test
```

当前测试覆盖统一错误格式和 Mock Provider Adapter 行为。后续真实 Adapter 接入时，应复用同样的验证思路。

## 后端环境变量

后端示例配置位于 `server/.env.example`：

```txt
PORT=8787
NODE_ENV=development
APP_ENCRYPTION_KEY=replace-with-32-byte-secret-value
CORS_ORIGIN=http://127.0.0.1:5173
```

`APP_ENCRYPTION_KEY` 至少需要 32 字节。服务启动时会校验该配置；如果缺失或长度不足，会给出明确错误并停止启动。不要打印、提交或共享真实加密密钥。

## 本地 JSON 与文件存储

后端当前使用 `server/data/db.json` 作为开发期轻量存储。`server/data/db.example.json` 是干净示例结构，首次运行时如果 `db.json` 不存在，后端会自动创建并补齐缺失字段。

本地 DB 管理脚本：

```bash
cd server
npm run db:reset
npm run db:seed
```

- `db:reset` 会把 `server/data/db.json` 重置为干净结构；
- `db:seed` 会写入默认项目、默认模板和少量 mock 示例资产；
- seed 数据不包含真实 API Key，不包含真实 provider credential；
- 真实联调前请备份需要保留的数据；
- `server/data/db.json` 已加入 `.gitignore`，不要提交包含真实密钥密文、真实任务或真实资产记录的本地 DB。

文件存储目录已预留：

```txt
server/storage/assets/
server/storage/temp/
```

目录内通过 `.gitkeep` 保留结构，真实生成文件会被 `.gitignore` 忽略。文件存储服务骨架位于 `server/src/services/fileStorageService.ts`，已支持将 Buffer 保存为本地文件。

## 万物焕新 gpt-image-2 真实接入

第六阶段当前使用万物焕新 `gpt-image-2` 作为真实图片测试端点。当前只实现图片文生图，不支持图生图、图片编辑，也不接入任何真实视频生成 API。

使用方式：

1. 启动后端：

```bash
cd server
npm run dev
```

2. 以 real mode 启动前端：

```bash
VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8787 npm run dev
```

3. 在 Provider 页面新增供应商，类型选择 `万物焕新 gpt-image-2`，输入用户自己的万物焕新 API Key。

万物焕新图片测试链路当前固定使用 `gpt-image-2`。后端调用 `POST https://api.wanwuhuanxin.cn/v1/chat/completions`，从返回 JSON 的文本内容中提取 `https://...png/jpg/webp` 图片链接，然后下载到本地文件存储。如果账户、模型权限或供应商策略受限，测试连接可能成功，但真实生成仍可能失败。

当前真实文生图已打通的参数：

- `prompt`：作为用户消息主体发送；
- `model`：固定为 `gpt-image-2`；
- `aspectRatio`：会映射为期望画幅和参考尺寸，并写入提示词；
- `count`：后端按数量串行生成，多张图会保存为多个独立 asset；
- `quality`、`outputFormat`、`background`：万物焕新 chat/completions 当前未声明专用字段，后端作为偏好写入提示词并记录到 task / asset parameters；
- `size`：当前不直接发送专用尺寸字段，后端记录 `requestedAspectRatio`、`resolvedWidth`、`resolvedHeight`、`resolvedSizeLabel`，4:3 等无法精确确认的画幅会记录 `fallbackReason`。

安全边界：

- 万物焕新 API Key 只通过 Provider 页面提交给后端；
- 后端会加密保存 API Key，只返回 `maskedApiKey`；
- 前端不会保存明文 API Key；
- 不要把万物焕新 API Key 写入 `.env`，本项目是 BYOK；
- 生成图片会产生用户万物焕新账户费用；
- 图片生成可能较慢，复杂 prompt 可能等待更久；后端图片生成请求当前使用 120 秒超时；
- 生成内容、内容审核、版权归属、商用授权和使用限制以万物焕新服务条款为准；
- 视频生成仍是 Mock。

生成结果：

- 万物焕新返回文本中的图片 URL 会被后端提取，并下载保存到 `server/storage/assets/`；
- 后端资产会记录 `storageType=local`、`localPath`、`mimeType`、`sizeBytes`、`width`、`height`、`parameters` 等字段；
- 多图生成采用“整批成功才完成”的策略；如果中途失败，已下载的临时文件会被清理，不写入半截 asset；
- 前端 real mode 会展示后端返回的本地图片 URL；
- 真实生成文件不会被提交到 Git。

真实图片资产体验：

- Asset Detail 和 Asset Card 的下载按钮在 real mode 下会调用 `GET /api/assets/:id/download` 下载本地文件；
- 删除本地资产时会同步尝试删除 `server/storage/assets/` 下对应文件，文件不存在时仍会删除 asset 记录；
- 下载和删除接口只使用数据库里的 asset 记录，不接受前端传入 `localPath`；
- 后端会校验文件路径必须位于 `server/storage/assets/` 下，避免路径穿越；
- 图片预览失败时会显示兜底卡片，可复制 URL 或重新加载；
- Asset Detail 会显示基础信息、生成参数、存储信息和关联任务；
- 可以从资产详情或任务中心按原参数重新生成，新资产不会覆盖原资产；
- 真实图片发送到 Video Studio 后仍只作为 I2V/R2V 的 Mock 参考输入，Mock 视频任务参数会记录引用的 assetId。

常见错误排查：

- `INVALID_API_KEY`：检查 Provider 页面中的万物焕新 API Key；
- `INSUFFICIENT_BALANCE`：检查供应商账户余额或额度；
- `RATE_LIMITED`：请求过于频繁，稍后重试；
- `CONTENT_REJECTED`：提示词未通过内容审核，调整描述后重试；
- `MODEL_NOT_SUPPORTED`：模型不可用，可能与账户权限或模型支持情况有关；
- `TASK_TIMEOUT`：生成超时，可简化提示词后重试；
- `PROVIDER_UNAVAILABLE`：供应商服务暂时不可用；
- `UNKNOWN_PROVIDER_ERROR`：查看后端日志，确认返回 JSON 中是否包含可解析图片 URL。
- 图片能生成但前端不显示：确认后端服务仍在运行，并检查 `/storage/assets/...` URL 是否可访问；
- 下载失败：确认 asset 仍是 `storageType=local`，且本地文件未被手动删除；
- 删除失败：检查后端是否有 `server/storage/assets/` 文件写入/删除权限；
- provider 被删除后无法重新生成：重新添加 provider 或改用当前可用 provider 重新生成。

万物焕新 Adapter 验证脚本默认只做 dry-run，不会触发真实生成：

```bash
cd server
npm test
npm run verify:wanwu
```

如需手动执行万物焕新 live test，必须显式开启 `RUN_WANWUHUANXIN_LIVE_TEST=true`，并通过临时环境变量传入测试 Key。live test 会调用 testConnection，并生成 1 张低风险测试图片保存到 `server/storage/assets/`，因此会产生用户万物焕新账户费用。脚本不会打印 API Key。

```bash
cd server
WANWUHUANXIN_TEST_API_KEY=你的测试Key RUN_WANWUHUANXIN_LIVE_TEST=true npm run verify:wanwu
```

Live test 输出会包含连接测试结果、生成任务状态、asset id、localPath、sizeBytes 和 public url；失败时只输出统一错误 code 和 message，不输出敏感 detail。

### 万物焕新 Live 联调步骤

1. 启动后端：`cd server && npm run dev`。
2. 启动前端 real mode：`VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8787 npm run dev`。
3. 在 Provider 页面添加 `万物焕新 gpt-image-2`，临时输入用户自己的万物焕新 API Key。
4. 点击测试连接。连接成功只说明 Key 基本可用，具体图片模型权限仍以真实生成为准。
5. 进入 Image Studio，选择万物焕新 provider。
6. 使用简单 prompt，例如 `A small watercolor icon of a blue water droplet on a white background.`。
7. 生成数量先设为 1，确认成功后可尝试 2-4 张多图生成。
8. 检查 `server/storage/assets/` 是否出现真实图片文件。
9. 检查 Asset Library 是否展示该图片。
10. 刷新页面，确认后端 `assets` 数据仍可恢复。
11. 检查浏览器 localStorage 不包含明文 API Key。
12. 检查 `server/data/db.json` 不包含明文 API Key，只应包含加密密文和脱敏展示值。

## 环境变量

复制 `.env.example` 后按需配置本地环境。当前不需要真实后端。

```txt
VITE_API_MODE=mock
VITE_API_BASE_URL=http://127.0.0.1:8787
VITE_APP_NAME=API Asset Studio
```

`VITE_API_MODE` 当前支持：

- `mock`：默认模式，使用前端 Mock service 和 Mock Provider Adapter；
- `real`：请求本地后端代理服务，可使用 Mock Provider Adapter 或万物焕新 gpt-image-2 Adapter。

第五阶段后，`real` 模式可以请求本地后端代理：

```bash
VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8787 npm run dev
```

注意：只有当用户在 Provider 页面添加 `万物焕新 gpt-image-2` 类型供应商并执行图片生成时，后端才会调用万物焕新端点。视频仍是 Mock。

## 数据源策略

Mock mode：

- providers、assets、tasks、projects、templates 来自前端 mockData 和 localStorage；
- 页面刷新后由 `api-asset-studio:app-state` 恢复完整 Mock 状态；
- 适合纯前端演示和 UI 开发。

Real mode：

- providers、assets、tasks、projects、promptTemplates、workspace 来自本地后端；
- 页面刷新后会重新请求 `GET /api/providers`、`GET /api/assets`、`GET /api/tasks`、`GET /api/projects`、`GET /api/prompt-templates`、`GET /api/workspace`；
- localStorage 只保存 `api-asset-studio:ui-state` 这类非敏感 UI 状态；
- `currentProjectId` 仍是前端 UI 状态；如果指向不存在的项目，会回退到后端返回的第一个项目；
- 进行中的视频任务会由前端每 2.5 秒轮询后端，任务完成后刷新资产库。

第 6.4 阶段后：

- 后端 `GET /api/projects` 会保证至少存在一个“默认项目”；
- 项目删除采用安全策略：如果项目下已有资产，后端会阻止删除，避免真实资产变成悬空数据；
- Prompt 模板支持创建、编辑、删除、复制和变量提取；
- 模板变量格式继续使用 `{{character}}`、`{{scene}}`、`{{action}}`、`{{camera}}`、`{{style}}`、`{{emotion}}`；
- 删除模板不影响历史生成资产；
- projects 仍是单用户轻量项目管理，后续可继续做用户、权限和团队化。

第 6.5 阶段后：

- 项目支持资产迁移：`POST /api/projects/:id/move-assets` 可以迁移该项目全部资产，或只迁移指定 `assetIds`；
- 迁移只更新资产的 `projectId`，不会移动或重写本地文件；
- Asset Library 支持批量选择资产并移动到目标项目；
- Prompt 模板“发送到 Image Studio / Video Studio”会真正填入目标工作台的提示词；
- 模板复制最终 prompt、发送到图片生成、发送到视频生成都会增加 `usageCount`；
- 模板变量自动识别支持英文、数字、下划线和中文变量名，例如 `{{character}}`、`{{场景}}`；
- 未填写变量会保留原始 `{{变量名}}`，不会静默删除。

第 6.6 阶段后：

- 新增轻量 Workspace 本地工作区配置；
- Workspace 存在于 `server/data/db.json`，用于标记当前本地数据边界和未来多用户扩展点；
- 当前不是正式账号系统，不包含密码、登录、权限或团队协作；
- Settings 页面可编辑工作区名称、负责人、描述、头像 URL 和默认项目；
- Projects 页面支持导出项目归档包；
- 导入功能当前只完成设计文档，尚未实现。

重置本地开发数据：

```bash
cd server
npm run db:reset
npm run db:seed
```

重置前请先备份真实联调数据。不要提交包含真实密钥密文、真实任务、真实资产记录的 `server/data/db.json`，也不要提交 `server/storage/assets/` 下的真实生成文件。

## 本地工作区 Workspace

Workspace 是一个轻量本地配置：

```ts
type WorkspaceProfile = {
  id: string;
  name: string;
  ownerName?: string;
  description?: string;
  avatarUrl?: string;
  defaultProjectId?: string;
  createdAt: string;
  updatedAt: string;
};
```

接口：

```txt
GET /api/workspace
PATCH /api/workspace
```

`PATCH /api/workspace` 支持更新 `name`、`ownerName`、`description`、`avatarUrl`、`defaultProjectId`。如果 `defaultProjectId` 不存在，后端会返回 `VALIDATION_ERROR`。

说明：

- Workspace 不是正式用户系统；
- 不涉及密码、登录、权限或团队；
- 只作为单用户本地工作台的数据边界；
- 后续可以演进为 user / organization / workspace 模型。

## 项目归档包导出

Projects 页面支持导出项目归档包，后端接口：

```txt
GET /api/projects/:id/export?includeFiles=true&includeTasks=true&includeTemplates=true
```

默认导出：

- 项目信息；
- 项目下资产元数据；
- 项目下任务元数据；
- prompt templates；
- 本地资产文件；
- `manifest.json`；
- 包内 `README.md`。

归档包结构：

```txt
project-export/
  manifest.json
  project.json
  assets.json
  tasks.json
  prompt-templates.json
  files/
    asset_xxx.png
  README.md
```

导出选项：

- `includeFiles=true|false`：是否打包本地图片/视频文件；
- `includeTasks=true|false`：是否包含任务历史；
- `includeTemplates=true|false`：是否包含提示词模板。

导出包不会包含：

- 明文 API Key；
- encryptedApiKey；
- provider credential；
- `server/data/db.json` 原文件；
- 服务器绝对路径；
- `localPath` 本机路径；
- 不适合迁移的敏感凭据。

如果 `includeFiles=true` 且某个本地文件不存在，导出会跳过该文件并写入 `manifest.warnings`。导出不会移动、删除或修改原文件。

导入功能当前尚未实现，设计文档见：

[docs/project-archive-import-design.md](docs/project-archive-import-design.md)

## API 接入架构

真实 API 接入架构请阅读：

[docs/api-integration-architecture.md](docs/api-integration-architecture.md)

核心原则：

- 前端不能直接调用第三方生成接口；
- 用户 API Key 不能明文保存在前端或 localStorage；
- API Key 应由后端加密保存；
- 第三方供应商差异应封装在 Provider Adapter；
- 图片、视频生成应统一进入任务系统；
- 生成结果应由后端转存并写入资产库。

## 安全提醒

不要在代码、`.env`、浏览器 localStorage 或 console 中写入 / 打印真实 API Key。当前项目只允许保存脱敏值或 Mock 数据。真实接入必须经过后端代理、加密存储、审计日志和错误标准化。

不要提交真实 `.env` 文件。`server/.env.example` 中的 `APP_ENCRYPTION_KEY` 只是占位示例，本地开发脚本使用 dev-only 临时密钥，生产环境必须替换为安全密钥。

不要提交包含真实测试数据的 `server/data/db.json`。本地开发请使用 `server/data/db.example.json`、`npm run db:reset` 和 `npm run db:seed` 管理干净数据。

## 下一步

下一阶段建议只接入一个图片生成供应商，先跑通：

`provider credential -> image generation -> task -> asset -> storage`

暂时不要先接视频。视频接口异步状态多、失败率高、成本敏感，应该等图片链路稳定后再进入。
