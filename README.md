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

## 环境变量

复制 `.env.example` 后按需配置本地环境。当前不需要真实后端。

```txt
VITE_API_MODE=mock
VITE_APP_NAME=API Asset Studio
```

`VITE_API_MODE` 当前支持：

- `mock`：默认模式，使用前端 Mock service 和 Mock Provider Adapter；
- `real`：预留真实后端模式，目前会提示真实接口尚未接入。

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
