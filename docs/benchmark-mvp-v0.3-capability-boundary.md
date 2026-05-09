# Benchmark MVP (v0.3) 能力边界

本文档记录了 API Asset Studio 在 v0.3.0-benchmark-mvp 版本中的系统能力边界，用于明确产品当前可达成效果，以及明确暂未实现的范围，防止误导。

## 1. v0.3 已真实具备的能力

### 1.1 BYOK Provider 配置
- 用户自行配置模型供应商和 API Key
- 后端加密保存 Key，前端脱敏显示
- 支持自定义 Provider（baseUrl / defaultModel / capabilities）
- 支持测试连接（不产生费用）

### 1.2 真实图片生成
- **万物焕新 gpt-image-2**：文生图
- 图片自动下载到本地存储
- 结果写入 Task / Asset

### 1.3 真实视频生成

| 供应商 | T2V | I2V | R2V | 接入方式 |
|--------|-----|-----|-----|----------|
| 阿里云百炼万相 | ✅ wan2.7-t2v | ✅ wan2.6-i2v-flash | ✅ wan2.7-r2v | 官方 API |
| 阿里云百炼 HappyHorse | ✅ happyhorse-1.0-t2v | ✅ happyhorse-1.0-i2v | ✅ happyhorse-1.0-r2v | 官方 API |
| Kling（第三方网关） | ✅ dry-run 已验证 | ❌ 未接入 | ❌ 未接入 | kling3api.com 兼容网关 |

### 1.4 任务管理 (Task Center)
- 异步视频任务轮询与状态推进
- 任务状态：queued → running → polling → completed / failed / timeout
- 失败任务显示翻译后的错误原因
- 支持重试和取消

### 1.5 资产管理 (Asset Library)
- 图片和视频资产统一展示
- 支持预览、下载、删除
- 支持收藏和搜索
- 图片可发送到视频生成（I2V 首帧/尾帧、R2V 角色/风格参考）

### 1.6 用量统计 (Usage Ledger)
- 全生成链路任务级用量记录
- 自定义成本估算规则（Cost Rules）
- 按供应商/模式/项目维度聚合
- Dashboard 展示成本卡片

### 1.7 质量评价 (Quality Feedback)
- 对资产和任务进行 1-5 星评分
- 质量状态评估（优秀/可用/需修复/不可用）
- 12 种失败分类（提示词问题、模型能力、角色漂移等）
- Dashboard / Usage 展示质量汇总
- Asset Library 支持按评价状态筛选
- 导出包包含 quality-feedback.json

### 1.8 供应商对比看板 (Provider Benchmark)
- 按 provider / model / mode 多维度对比
- 成功率、失败率、平均耗时、估算成本、平均评分
- 失败原因分布与浪费成本分析
- 质量-成本交叉分析
- 智能洞察提示
- Dashboard 供应商表现卡片

### 1.9 Prompt Benchmark Set
- 默认测试集：9 个标准化用例（T2V×3 + I2V×3 + R2V×3）
- 每个用例包含 prompt、参数、rubric（评价维度）
- 支持 dry-run（不产生费用）和 live-run（需二次确认）
- Benchmark Run 结果自动汇入 Task / Asset / Usage / Quality / Provider Benchmark

### 1.10 Benchmark 人工评审工作流
- Run 结果页内嵌评审面板
- 视频预览（复用 AssetPreview）
- Rubric 展示（评价维度 label/description/weight）
- 评审状态：已评审/未评审/已复盘/待复盘/不适用
- Run Summary 评审进度（百分比+进度条）
- 下一条待评审导航
- 失败任务复盘（failureCategory / note / worthRetry）
- 防误导评分提示
- 筛选：全部/未评审/已评审/失败

### 1.11 存储系统

| 模式 | 说明 |
|------|------|
| Local Storage | 本地目录 server/storage/assets/ |
| Object Storage (Public) | S3/OSS 兼容，公开访问 |
| Object Storage (Private-Presigned) | 私有存储，临时签名 URL 访问 |

- Presigned URL 不落库
- Presigned URL 不进入导出包
- 支持跨设备访问

### 1.12 项目导入导出
- 项目归档包导出（含 manifest/project/assets/tasks/templates/usage/quality）
- 归档包导入为副本
- 不包含 API Key、encrypted 字段、presigned URL

### 1.13 数据卫生与验证
- DB 持久化安全（原子写入、不写回、损坏备份）
- Presigned URL 检测与清理
- 数据修复脚本
- verify 脚本套件

## 2. 仍未实现 / 不应承诺的能力

以下能力在 v0.3 版本中**明确未实现**，不应向用户承诺：

### 2.1 用户与权限
- ❌ 登录 / 注册 / 用户认证
- ❌ 多用户支持
- ❌ 团队协作
- ❌ 权限管理 / RBAC
- ❌ 完整生产权限系统

### 2.2 计费与支付
- ❌ 支付 / 计费体系
- ❌ 精确供应商账单对账
- ❌ 供应商账户余额查询

### 2.3 AI 能力扩展
- ❌ 图生图（Image-to-Image）
- ❌ 图片编辑、局部重绘、扩图
- ❌ 视频编辑（剪辑、倒放、插帧）
- ❌ 自动 AI 质量评分
- ❌ AI 自动评审
- ❌ 多角色 R2V（当前仅单角色 character1）
- ❌ Kling I2V / R2V
- ❌ 更多视频供应商（MiniMax、Runway 等）

### 2.4 运维与部署
- ❌ 大规模并发 Benchmark
- ❌ 私有云部署自动化
- ❌ 生产环境监控与告警
- ❌ 数据库迁移到 SQL（当前仍为 JSON 文件）

## 3. 能力边界速查表

| 能力 | v0.2 | v0.3 | 备注 |
|------|------|------|------|
| 万物焕新图片生成 | ✅ | ✅ | |
| 万相 T2V | ✅ | ✅ | |
| 万相 I2V | ✅ | ✅ | |
| 万相 R2V | ✅ | ✅ | 单角色 |
| HappyHorse T2V | ❌ | ✅ | v8.4 新增 |
| HappyHorse I2V | ❌ | ✅ | v8.4 新增 |
| HappyHorse R2V | ❌ | ✅ | v8.4 新增 |
| Kling T2V | ✅ | ✅ | 第三方网关，dry-run |
| Task Center | ✅ | ✅ | |
| Asset Library | ✅ | ✅ | |
| Usage Ledger | ✅ | ✅ | |
| Quality Feedback | ✅ | ✅ | |
| Provider Benchmark | ✅ | ✅ | |
| Benchmark Set | ✅ | ✅ | |
| Benchmark Run | ✅ | ✅ | |
| Benchmark 人工评审 | ❌ | ✅ | v8.3.6 新增 |
| Object Storage | ✅ | ✅ | |
| Presigned URL | ✅ | ✅ | |
| 项目导入导出 | ✅ | ✅ | |
| 数据卫生验证 | ✅ | ✅ | |
| 多用户 | ❌ | ❌ | |
| 自动评分 | ❌ | ❌ | |
| 视频编辑 | ❌ | ❌ | |
| 图生图 | ❌ | ❌ | |

## 4. 结论

v0.3 版本达成了完整的「生成 → 统计 → 评价 → 对比 → 基准测试 → 人工评审」闭环。可以作为 Benchmark MVP 阶段基线进入下一阶段。
