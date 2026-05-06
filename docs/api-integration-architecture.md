# API 接入架构设计

## 1. 当前阶段目标

本阶段只建设真实 API 接入的架构骨架，不直接接入 Google、OpenAI、Runway、Kling、MiniMax、Pika、Luma、Stability AI 或其他真实供应商。现有前端继续使用 Mock 数据和 Mock Adapter，确保图片生成、视频生成、任务中心、资产库等主链路保持可用。

目标是让项目从“前端 Mock 应用”升级为“具备真实 API 接入能力的前端产品骨架”：页面不关心供应商差异，生成调用统一走 API Client，未来切换到后端代理和真实 Provider Adapter 时不需要重写页面。

## 2. 推荐整体架构

推荐架构由以下层组成：

- 前端 React 工作台：负责项目、供应商配置、生成参数、任务状态、资产库和提示词模板 UI。
- 后端 API 代理层：前端只调用自有后端，所有第三方供应商请求都由后端代理完成。
- Provider Adapters：为 Google、OpenAI、Runway、Kling、MiniMax、Pika、Luma、Stability AI、自定义供应商等实现统一适配器接口。
- API Key 加密存储：后端接收用户 Key 后加密保存，只向前端返回脱敏展示值。
- 任务队列 / 任务状态：生成请求进入任务系统，由 worker 或轮询器驱动状态流转。
- 文件存储：生成结果文件存储到对象存储或内部文件服务，资产库保存可访问 URL 与元数据。
- 数据库存储：保存用户、项目、供应商配置、任务、资产、模板、审计日志等结构化数据。
- 统一错误处理：将供应商错误标准化为产品内可理解的错误码。
- Mock Adapter 与真实 Adapter 共存：开发和演示默认走 Mock Adapter，生产环境逐步启用真实 Adapter。

建议请求路径：

前端页面 -> API Client -> 后端 API 代理 -> Provider Registry -> Provider Adapter -> 第三方供应商 -> 任务状态 / 文件存储 / 数据库 -> 前端轮询或刷新。

## 3. 为什么不能前端直连供应商

前端不能直接调用第三方生成接口，主要原因包括：

- API Key 泄露：浏览器环境无法安全保存密钥，打包产物、DevTools、网络请求都可能暴露 Key。
- CORS 问题：很多供应商接口不允许浏览器直接跨域调用。
- 用户 Key 被滥用：一旦 Key 暴露，攻击者可以绕过平台直接消耗用户额度。
- 难以统一错误：不同供应商错误码、HTTP 状态、返回结构差异很大。
- 难以处理异步任务：视频生成常见 queued、running、polling、callback、timeout 等复杂状态。
- 难以保存生成结果：供应商返回的临时 URL 可能过期，需要后端下载并入库。
- 难以做审计和风控：无法可靠记录调用来源、成本、失败原因和异常行为。
- 供应商接口差异大：各家模型、参数、文件格式、任务机制不同，不应污染页面组件。

## 4. 后端需要的核心模块

- Auth / User 模块：预留用户身份、会话、权限和多租户边界。
- Provider Credential 模块：接收、加密、更新、删除、脱敏展示用户 API Key。
- Provider Adapter 模块：封装供应商差异，输出统一能力和调用结果。
- Generation Job 模块：创建图片、T2V、I2V、R2V 生成任务。
- Asset Storage 模块：下载、转存、归档生成结果文件与缩略图。
- Task Polling 模块：定时轮询不支持 callback 的供应商任务。
- Error Normalization 模块：将供应商错误转换成统一 ApiError。
- Usage / Cost Tracking 模块：记录调用次数、模型、预估费用、供应商余额或额度提示。
- Audit Log 模块：记录敏感操作、生成请求、Key 变更、失败原因和管理员排查信息。

## 5. 数据模型设计

### users

- id
- email
- display_name
- avatar_url
- created_at
- updated_at
- status

### projects

- id
- user_id
- name
- description
- favorite
- archived
- default_provider_id
- created_at
- updated_at

### provider_credentials

- id
- user_id
- provider_id
- encrypted_api_key
- api_key_masked
- encryption_key_version
- base_url
- status
- last_tested_at
- created_at
- updated_at

说明：`provider_credentials` 绝不能明文保存 API Key。应保存加密后的密文、脱敏展示值和密钥版本，便于后续轮换加密密钥。

### provider_configs

- id
- provider_id
- name
- default_model
- capabilities
- base_url
- auth_type
- enabled
- metadata
- created_at
- updated_at

### assets

- id
- user_id
- project_id
- task_id
- type
- title
- prompt
- provider_id
- model
- file_url
- thumbnail_url
- duration
- aspect_ratio
- params
- tags
- favorite
- created_at
- updated_at

### generation_tasks

- id
- user_id
- project_id
- asset_id
- provider_id
- provider_task_id
- type
- mode
- status
- progress
- prompt
- model
- params
- error_code
- error_message
- cost_estimate
- started_at
- completed_at
- created_at
- updated_at

### prompt_templates

- id
- user_id
- title
- category
- body
- variables
- favorite
- created_at
- updated_at

### audit_logs

- id
- user_id
- action
- target_type
- target_id
- provider_id
- ip
- user_agent
- metadata
- created_at

## 6. 统一供应商能力模型

建议统一能力字段：

- image
- t2v
- i2v
- r2v
- firstFrame
- lastFrame
- multiReference
- negativePrompt
- seed
- asyncTask
- callback
- polling
- audio
- watermarkControl

前端可用能力决定表单显示和按钮状态；后端用能力决定是否允许调用对应 Adapter 方法。

## 7. 统一生成接口设计

统一错误格式见第 8 节。所有写接口都应记录 audit log。

### POST /api/providers

- 入参：`name`、`providerId`、`apiKey`、`baseUrl`、`defaultModel`、`capabilities`
- 出参：供应商配置、脱敏 Key、连接状态
- 是否异步：否
- 对应页面：Provider & API Keys

### GET /api/providers

- 入参：分页、搜索、状态筛选
- 出参：供应商配置列表，不返回明文 Key
- 是否异步：否
- 对应页面：Provider & API Keys、Image Studio、Video Studio、Settings

### PATCH /api/providers/:id

- 入参：`apiKey`、`baseUrl`、`defaultModel`、`isDefault`、`capabilities`
- 出参：更新后的供应商配置
- 是否异步：否
- 对应页面：Provider & API Keys、Settings

### DELETE /api/providers/:id

- 入参：无
- 出参：删除结果
- 是否异步：否
- 对应页面：Provider & API Keys

### POST /api/providers/:id/test

- 入参：供应商 ID，可选模型
- 出参：连接状态、能力识别结果、错误信息
- 是否异步：可同步，也可创建后台检测任务
- 对应页面：Provider & API Keys

### POST /api/generations/image

- 入参：`projectId`、`providerId`、`model`、`prompt`、`negativePrompt`、`aspectRatio`、`count`、`seed`、`style`
- 出参：图片任务；若供应商同步返回结果，也可返回资产列表
- 是否异步：建议统一视作异步
- 对应页面：Image Studio

### POST /api/generations/video/t2v

- 入参：`projectId`、`providerId`、`model`、`prompt`、`camera`、`duration`、`aspect`、`resolution`、`motion`、`style`
- 出参：视频生成任务
- 是否异步：是
- 对应页面：Video Studio

### POST /api/generations/video/i2v

- 入参：`projectId`、`providerId`、`model`、`firstFrameAssetId`、`lastFrameAssetId`、`prompt`、`duration`、`motion`、`keepComposition`
- 出参：视频生成任务
- 是否异步：是
- 对应页面：Video Studio

### POST /api/generations/video/r2v

- 入参：`projectId`、`providerId`、`model`、`references`、`prompt`、`referenceWeight`、`duration`、`style`
- 出参：视频生成任务
- 是否异步：是
- 对应页面：Video Studio

### GET /api/tasks

- 入参：分页、项目、状态、类型、供应商筛选
- 出参：任务列表
- 是否异步：否
- 对应页面：Task Center、Dashboard

### GET /api/tasks/:id

- 入参：任务 ID
- 出参：任务详情、关联资产
- 是否异步：否
- 对应页面：Task Center、Asset Library

### POST /api/tasks/:id/cancel

- 入参：任务 ID
- 出参：取消后的任务状态
- 是否异步：否，供应商侧取消可能异步
- 对应页面：Task Center

### POST /api/tasks/:id/retry

- 入参：任务 ID
- 出参：新任务或重试后的任务
- 是否异步：是
- 对应页面：Task Center

### GET /api/assets

- 入参：分页、项目、类型、供应商、模型、收藏、搜索、排序
- 出参：资产列表
- 是否异步：否
- 对应页面：Asset Library、Image Studio、Video Studio

### GET /api/assets/:id

- 入参：资产 ID
- 出参：资产详情、关联任务、文件 URL
- 是否异步：否
- 对应页面：Asset Library

### DELETE /api/assets/:id

- 入参：资产 ID
- 出参：删除结果
- 是否异步：否
- 对应页面：Asset Library

### POST /api/assets/:id/favorite

- 入参：`favorite`
- 出参：更新后的资产
- 是否异步：否
- 对应页面：Asset Library、Image Studio、Video Studio

## 8. 统一错误格式

```ts
type ApiError = {
  code: string;
  message: string;
  provider?: string;
  providerCode?: string;
  retryable: boolean;
  detail?: unknown;
};
```

标准错误类型：

- INVALID_API_KEY
- INSUFFICIENT_BALANCE
- RATE_LIMITED
- CONTENT_REJECTED
- PROVIDER_UNAVAILABLE
- MODEL_NOT_SUPPORTED
- TASK_TIMEOUT
- FILE_TOO_LARGE
- UNSUPPORTED_FILE_TYPE
- UNKNOWN_PROVIDER_ERROR

## 9. 任务状态流转

统一任务状态：

- queued
- running
- polling
- completed
- failed
- canceled
- timeout

图片任务通常耗时较短，部分供应商可能同步返回结果，但产品侧建议仍统一创建任务，以便任务中心、审计、成本统计和失败重试保持一致。

视频任务通常是强异步流程：queued -> running -> polling -> completed / failed / timeout。支持 callback 的供应商可由回调更新状态；不支持 callback 的供应商由 Task Polling 模块定时查询。

## 10. 未来真实供应商接入顺序建议

建议接入顺序：

1. 先接一个图片生成供应商，用较低成本和较短任务链路验证 API Key 加密、后端代理、错误标准化、文件入库。
2. 再接一个 T2V 供应商，验证异步任务和视频文件存储。
3. 再接 I2V，补齐图片资产作为输入文件的上传、转存和参数映射。
4. 最后接 R2V，因为参考素材、权重、角色/风格一致性和失败原因更复杂。
5. 自定义供应商放在后面，需要稳定的 Adapter 协议、能力声明和错误映射机制。
