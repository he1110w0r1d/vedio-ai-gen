# Video MVP (v0.2) 能力边界

本文档记录了 API Asset Studio 在 v0.2.0-video-mvp（第 8.2 阶段：多供应商对比看板）版本中的系统能力边界，用于明确产品当前可达成的效果，以及明确暂未实现的范围，防止误导。

## 1. 核心真实能力

当前版本是一个 **本地单用户 BYOK 客户端**，支持以下真实远程生成能力：

### 1.1 真实图片生成（万物焕新）
- **文生图**：已接通万物焕新 `gpt-image-2` 真实文生图能力。
- **限制**：不支持图生图、图片编辑、局部重绘和扩图（UI 上仅提供 Mock）。

### 1.2 真实视频生成（阿里云百炼万相）
- **T2V（文生视频）**：支持 `wan2.7-t2v` 等模型真实生成，支持画幅、分辨率、时长调节。
- **I2V（图生视频）**：支持 `wan2.6-i2v-flash` 等模型真实生成，支持首帧图片（需 <=20MB），支持运动强度等参数调节。
- **R2V（参考生视频）**：支持 `wan2.7-r2v` 模型真实生成。当前版本 **仅支持单角色参考**，需在提示词中强制引用 `character1`。

## 2. 系统能力

### 2.1 本地存储与资产管理
- 文件存储机制：支持 **Local Storage（本地目录）** 和 **Object Storage（对象存储，支持 S3/OSS/MinIO 等标准 S3 协议 API）**。
- 支持将所有生成的图片、视频自动下载到本地或直传到对象存储。
- 支持对象存储的 **Public Read** 和 **Private-Presigned** 模式，保障素材读取的绝对安全。
- 资产库支持查看、播放、下载、删除和引用（作为 I2V/R2V 的输入素材）。
- 项目导出限制：安全起见，带有 Private 权限的对象存储实体文件不会被完整打包，只导出元数据记录。

### 2.2 任务管理
- 真实的异步视频任务支持轮询推进（由前端活跃页面发起轮询请求）。
- 支持查看任务状态（排队、运行中、成功、失败），失败提供翻译后的报错原因。

### 2.3 安全与配置
- API Key 由用户自己配置（BYOK）。
- API Key 加密保存在本地 `db.json`，不以明文回传到前端。
- 万物焕新和阿里云百炼的通信全程通过本地 Node.js 代理，解决跨域并隐藏真实请求体。

### 2.4 用量统计与成本估算 (Usage Ledger)
- 提供全生成链路的任务级用量记录台账。
- 支持基于自定义的成本估算规则（Cost Rules）进行粗略的价格预测和展示。
- 提供用量统计看板，支持按供应商、生成模式聚合。

### 2.5 质量评价与失败复盘 (Feedback Loop)
- 支持对资产和任务进行 1-5 星级评分、质量状态评估、失败原因归类。
- Dashboard 和 Usage 页面展示质量汇总。
- Asset Library 支持按评价状态筛选。
- 导出包中包含 `quality-feedback.json`。
- 当前为用户主观反馈，后续可接入自动质量评估模型。

### 2.6 多供应商对比看板 (Provider Benchmark)
- 提供专门的供应商对比页面，支持按 provider / providerType / model / mode 多维度汇总任务表现。
- 统计成功率、失败率、平均耗时、估算成本、平均评分等核心指标。
- 失败原因分布展示各失败分类的数量和估算浪费成本。
- 质量-成本交叉分析表展示各供应商的优秀/可用/需修复/不可用分布。
- 基于数据自动生成智能洞察提示（样本量不足、网关提醒、最佳供应商推荐）。
- 数据来源：tasks + usageRecords + qualityFeedback + providers（仅做只读聚合，不保存新数据）。
- Dashboard 展示供应商表现轻量卡片（任务最多/成功率最高/评分最高/失败率最高）。
- Usage 页面可跳转供应商对比。

### 统计口径说明

| 指标 | 计算方式 | 注意事项 |
|------|----------|----------|
| 成功率 | completedTasks / totalTasks | 分母为 0 时返回 0 |
| 失败率 | failedTasks / totalTasks | 同上 |
| 平均耗时 | completedAt - createdAt | 仅统计有完成时间的任务，无 completedAt 忽略 |
| 估算成本 | usageRecords.estimatedCost | confidence=none 不计入金额，前端标注"部分任务未配置估算规则" |
| 浪费成本 | failed 任务 + unusable 评价任务 | 同一 task 不重复计算 |
| 平均评分 | qualityFeedback.rating | task 和 asset 评价合并统计，无评价时为空 |

### Kling 网关说明

Kling 当前通过 kling3api.com 第三方兼容网关接入，非 Kling 官方 API。Provider Benchmark 页面和 Dashboard 均会显示此提醒。

### Live Test 状态

当前万相 T2V/I2V/R2V 和 Kling T2V 均未执行真实 live test（需分别配置 `DASHSCOPE_TEST_API_KEY` 和 `KLING_TEST_API_KEY`）。Provider Benchmark 中所有供应商数据为 dry-run 接入状态。真实生成会产生供应商费用。

## 3. 明确未实现的能力（Mock 边界）

在 v0.2 版本中，以下能力**未真实接入**（可能在界面上有入口，但只会产生 Mock 数据或直接报错）：

1. **图生图 / 图片编辑**：不支持使用外部 API 进行图生图操作。
2. **多角色 R2V**：当前 R2V 设计不支持复杂的 character2 等多角色互动。
3. **视频编辑**：不支持对生成的视频进行剪辑、倒放、插帧等二次处理。
4. **精确云端计费对账**：应用不与供应商费用 API 打通，不能保证估算金额与供应商真实账单完全一致。仅提供参考用的自定义计算公式。
6. **多用户与团队协作**：这是一个单人使用的本地工具，没有用户认证体系和团队数据隔离。
7. **更多视频供应商**：当前支持阿里云百炼万相 T2V/I2V/R2V 和 Kling T2V（第三方网关），Kling I2V/R2V 待评估。

## 4. 第 8.0 阶段收口：Kling T2V 接入

v8.0 阶段完成了第二视频供应商 Kling T2V 的最小闭环接入，验证了多供应商架构的可行性。

### 新增真实能力

- **Kling 文生视频（第三方兼容网关）**：支持 `pro-text-to-video` 和 `std-text-to-video` 两种模型真实生成。
- **接入说明**：通过 `kling3api.com` 第三方网关接入，非 Kling 官方 API。费用以网关后台为准。
- **Kling T2V 参数映射**：支持 duration（3-15s）、aspect ratio（16:9 / 9:16 / 1:1）、negative_prompt 等参数。
- **Kling 任务轮询**：复用现有轮询逻辑，状态转换为统一状态（queued / running / polling / completed / failed / timeout）。

### 架构验证结果

- ✅ 同一 Provider Registry 注册多供应商；
- ✅ 同一 generationService 处理 Kling 和万相任务；
- ✅ 同一 Storage Adapter 保存 Kling 和万相视频；
- ✅ 同一 Usage Ledger 记录 Kling 和万相任务；
- ✅ 同一 Quality Feedback 评价 Kling 和万相资产；
- ✅ 同一 Task Center 展示多供应商任务；
- ✅ 同一 Asset Library 展示多供应商资产。

### 明确未实现的能力

- Kling I2V / R2V / 视频编辑（目前仅接入 Kling T2V，是否扩展 I2V 待 Provider Benchmark 数据支撑决策）；
- Kling 官方 API（当前通过 kling3api.com 第三方兼容网关接入）。

## 6. 第 8.2 阶段收口：多供应商对比看板

v8.2 阶段完成了多供应商对比看板（Provider Benchmark），提供数据驱动的供应商决策能力。

### 新增能力

- 供应商对比页面（侧边栏「供应商对比」入口）
- 按 provider / providerType / model / mode 多维度汇总
- 成功率、失败率、平均耗时、估算成本、平均评分统计
- 失败原因分布与浪费成本分析
- 质量-成本交叉分析
- 智能洞察提示
- Dashboard 供应商表现轻量卡片
- Usage 页面供应商对比入口

### 数据来源

- tasks：任务状态、耗时
- usageRecords：估算成本
- qualityFeedback：评分、质量状态、失败分类
- providers：供应商名称、类型

仅做只读聚合，不保存新数据。不返回 API Key、encrypted 字段或 provider 原始响应。

### 2.7 基准测试集 (Prompt Benchmark Set)

第 8.3 阶段新增了标准化的 Prompt Benchmark Set 系统：

- **核心能力**：提供固定测试集（Benchmark Set）和测试运行（Benchmark Run），用同一 prompt、参考图和参数比较不同模型/供应商表现。
- **dry-run 模式**（默认）：仅创建测试记录，不调用真实供应商，不产生费用。dry-run 不代表模型真实表现。
- **live-run 模式**：真实调用供应商生成视频，需要二次确认（confirmLiveRun=true），会产生供应商费用。
- **默认测试集**：`Default Video Model Benchmark v0.1`，含 T2V×3 + I2V×3 + R2V×3 共 9 个标准化用例。
- **评价 rubric**：每个用例包含评分标准（主体稳定性、动作自然度、prompt 符合度、伪影程度、画面清晰度），作为人工评分参考。
- **结果汇入**：真实 Run 完成后，tasks/assets/usageRecords/qualityFeedback 自动写入，可被 Provider Benchmark 消费。
- **状态同步闭环（第 8.3.1 阶段）**：
  - `refreshRealVideoTasks()` 轮询后自动调用 `syncBenchmarkRunItems()`。
  - task completed → RunItem completed，自动回填 assetId。
  - task failed → RunItem failed，回填 errorCode / errorReason。
  - 所有 RunItem 终态后，Run 状态自动从 running 变更为 completed。
  - Benchmark 结果页每 3s 自动刷新，实时展示任务→资产同步结果。
  - Quality Feedback 填写后，Run Summary 的 averageRating 和 estimatedCost 实时更新。
  - 失败信息的 errorCode / errorReason 永久保留，不因后续同步而丢失。
- **安全约束**：live-run 必须二次确认，不保存 API Key 或 presigned URL 到 Run/Item，Benchmark Set 可提交 seed 但真实 Run 结果不应提交。

## 5. 结论

v0.2 版本达成了以文本和参考素材驱动的**完整"生成 → 统计 → 评价 → 对比"闭环**，可作为核心基础进入下一阶段。是否扩展 Kling I2V 建议在 Provider Benchmark 有足够数据支撑后决策。
