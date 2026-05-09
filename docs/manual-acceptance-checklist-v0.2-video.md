# v0.2 Video MVP 验收清单

本清单用于验收 v0.2.0-video-mvp（第 8.2 阶段：多供应商对比看板）阶段的所有真实能力与功能约束。请按照步骤依次执行，确认所有勾选项均正常。

## 7.6.1 Presigned URL 安全验收补充检查项

除以下完整清单外，还应确认以下安全约束：

- [ ] `GET /api/assets/:id/access-url` 只返回临时 URL，不写 DB；
- [ ] `POST /api/storage/presign` 校验 objectKey（禁止 `../`、绝对路径、空路径）；
- [ ] presigned URL 不进入 `db.json`、`task.parameters`、`asset.parameters`、`usageRecords`、`qualityFeedback`；
- [ ] presigned URL 不打印到 server logs；
- [ ] presigned URL 不写入项目导出 zip 包；
- [ ] AccessKey / SecretKey 不返回前端；
- [ ] `encrypted` 字段不返回前端；
- [ ] 错误 detail 不包含签名 URL 或密钥。

## 一、 环境与启动

- [ ] Node.js 版本 >= 18。
- [ ] 确保不含未加密的 `.env` 或 `server/data/db.json` 被 git 跟踪。
- [ ] 后端可正常启动：`cd server && npm run dev`。
- [ ] `/health` 接口正常返回：`version` 为 `0.2.0-video-mvp`。
- [ ] 前端 Real 模式可正常启动：`VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8787 npm run dev`。

## 二、 供应商配置 (Providers)

- [ ] 进入 Provider 页面，添加【万物焕新 gpt-image-2】。
- [ ] 添加【阿里云百炼 万相文生视频】（配置真实 API Key）。
- [ ] 添加【阿里云百炼 万相图生视频】（配置真实 API Key）。
- [ ] 添加【阿里云百炼 万相参考生视频】（配置真实 API Key）。
- [ ] 验证：在 UI 上，上述三者有独立的文字说明（避免参数混淆），且输入框中 Key 均脱敏。
- [ ] 验证：这四者“测试连接”均提示连通成功。

## 三、 图片工作台 (Image Studio)

- [ ] 切换到 Image Studio，选择万物焕新真实 Provider。
- [ ] 输入一段简单的提示词（例如：`测试图片`）。
- [ ] 验证：点击“生成图片”后，能够真实出图。
- [ ] 验证：在 Asset Library 中可见该图。

## 四、 视频工作台 (Video Studio)

### 4.1 T2V 文生视频
- [ ] 切换到 Video Studio，模式选择 T2V。
- [ ] 选择【万相文生视频】Provider，输入提示词，点击生成。
- [ ] 验证：跳转至 Task Center，状态为“轮询中”或“运行中”。
- [ ] 验证：几分钟后任务完成，点击“查看资产”可播放生成的视频。

### 4.2 I2V 图生视频
- [ ] 切换模式到 I2V。
- [ ] 从资产库中选取刚才生成的图片作为“首帧”。
- [ ] 选择【万相图生视频】Provider，输入运动提示词。
- [ ] 验证：生成过程中，Task Center 显示首帧图片 ID。
- [ ] 验证：视频成功生成，Asset Detail 中正确标出源图片。

### 4.3 R2V 参考生视频
- [ ] 切换模式到 R2V。
- [ ] 选取一张人物图片作为“角色”参考素材。
- [ ] 输入包含 `character1` 的提示词（如：`character1 正在走路`）。
- [ ] 选择【万相参考生视频】Provider。
- [ ] 验证：任务成功生成并最终出视频。
- [ ] 验证：在 Asset Detail 中正确标出该参考素材的角色（character1）。

## 五、 用量统计与成本估算 (Usage Ledger)

- [ ] 进入左侧栏的“用量统计”页面。
- [ ] 验证：页面顶部存在免责警示（实际费用以供应商控制台为准）。
- [ ] 验证：汇总卡片中，记录了上述（一~四）阶段中生成任务的调用次数和产出资产数。
- [ ] 验证：点击“成本估算规则”区域，勾选启用“万物焕新 gpt-image-2”与“阿里云百炼万相”相关的预设规则。
- [ ] 返回用量统计顶部，验证：能自动计算出“估算总费用”，且表格中的“估算费用”列展示出了对应的预估金额。
- [ ] 返回 Dashboard，验证：“总估算费用”卡片有了数字显示。
- [ ] 返回 Task Center，验证：最近生成的任务卡片上展示出了“估算成本”的小标签。

## 六、 对象存储与 Presigned URL (Object Storage)

- [ ] 进入“设置”页面，在“存储管理”中开启对象存储（选择 S3 或 OSS，填入相关凭证）。
- [ ] 验证：在 Access Mode 选择框中，切换 `Public Read` 和 `Private-Presigned`，检查下方 UI 提示是否正常切换。
- [ ] 选定 `Private-Presigned` 模式并保存。
- [ ] 到项目（Projects）或资产库，迁移某个已有的图片资产至云端。
- [ ] 验证：迁移完成后，图片在前端可正常显示预览（临时签名链接）。
- [ ] 验证：打开开发者工具或在 Asset Detail Drawer 中查看，该图片的 URL 是签发好的临时短链，且会在指定时间后失效。
- [ ] 测试下载：在 Asset Detail Drawer 点击下载，正常跳出下载或在新窗口打开链接。
- [ ] 使用刚才迁移到 Private Bucket 的图片发起一次 I2V 真实任务。
- [ ] 验证：生成的任务 `parameters` 里面没有明文写出签名的 URL，而是打上了 `inputAssetPresignedUrlUsed: true`。任务成功生成。

## 5.1、质量评价与失败复盘 (Feedback Loop)

- [ ] 进入资产库，点击某个资产查看详情。
- [ ] 在资产详情抽屉底部，找到“质量评价”区域。
- [ ] 尝试：设定星级评分、选择质量状态、选择失败分类、填写备注、点击保存评价。
- [ ] 验证：刷新页面后，评价仍保留。
- [ ] 尝试：点击“清除评价”，确认评价被移除。
- [ ] 进入任务中心，找到一个已完成任务，点击“评价任务”按钮。
- [ ] 验证：任务卡片展开评价表单，可以保存评价。
- [ ] 对一个失败任务进行评价，选择失败原因。
- [ ] 在资产库使用“评价状态”筛选器过滤，验证：能正确筛选出对应状态的资产。
- [ ] 查看 Dashboard，验证：出现质量概览卡片（平均评分、优秀/可用数、不可用数、值得重试数）。
- [ ] 查看 Usage 页面，验证：出现质量概览区域。

## 八、 数据卫生与降级测试

- [ ] **断网降级**：拔除网络，尝试刷新页面和发送请求，前端应能捕获连接失败错误且不崩溃。
- [ ] **参数异常**：在 R2V 模式下，不写 `character1`，立刻生成，后端应直接拦截抛出 `MISSING_CHARACTER_REFERENCE` 错误。
- [ ] **项目导出**：点击设置 -> 导出项目（包含文件与任务）。
- [ ] **隐私确认**：解压导出的 zip 包，确认其中含有 `usage-records.json`，且不包含任何 `cost-rules` 的计费配置信息，不包含任何明文 Key 或 credential。同时验证：位于 Private 对象存储的资产，其 `url` 或 `publicUrl` 字段没有暴露签名 URL（该字段应为空或不存在）。
- [ ] **删除测试**：在 Asset Library 删除刚刚作为首帧的源图片。然后再查看基于它生成的 I2V 视频的详情页，验证：页面不崩溃，详情页提示"源图片已不存在"。

## 九、 Kling T2V 多供应商验收（v8.0 阶段）

本节验证第二视频供应商 Kling T2V 接入后，多供应商架构是否正常工作。

**重要说明**：Kling T2V 通过 `kling3api.com` 第三方兼容网关接入，非 Kling 官方 API。费用以网关后台为准。

- [ ] **Provider 配置**：进入 Provider 页面，添加【Kling 文生视频】供应商。
- [ ] **验证**：在 UI 上，Kling provider 的 providerType 为 `kling-t2v`，能力芯片显示 T2V / 异步任务。
- [ ] **验证**：确认 Provider 页面提示"第三方兼容网关，非 Kling 官方 API"。
- [ ] **测试连接**：点击"测试连接"，应提示连接成功（不产生视频费用）。
- [ ] **Video Studio T2V**：进入 Video Studio，选择 T2V 模式，选择 Kling provider。
- [ ] **验证**：选择 Kling 后，确认面板显示 Kling 当前只支持 T2V 的说明。
- [ ] **生成任务**：输入提示词，选择 pro-text-to-video 模型，点击"创建真实任务"。
- [ ] **验证**：自动跳转 Task Center，确认任务显示 providerName=Kling，mode=T2V。
- [ ] **轮询等待**：等待任务完成（ Kling 通常 1-5 分钟），确认状态变为"已完成"。
- [ ] **资产验证**：点击"查看资产"，Asset Library 显示 Kling video asset。
- [ ] **视频播放**：点击视频资产，确认可用 video 标签播放。
- [ ] **下载删除**：确认可以下载、可以删除 Kling 视频资产。
- [ ] **多供应商对比**：在 Task Center 查看，同时存在万相和 Kling 任务时，能正确区分。
- [ ] **Usage 记录**：进入 Usage 页面，确认 Kling T2V 任务被记录，可以按 provider 过滤。
- [ ] **Quality Feedback**：对 Kling 视频资产进行质量评价，确认评价能保存和显示。
- [ ] **Kling I2V 限制**：尝试在 I2V 模式选择 Kling provider，确认显示"暂未接入"提示。
- [ ] **Kling R2V 限制**：尝试在 R2V 模式选择 Kling provider，确认显示"暂未接入"提示。

### Kling dry-run 验证

```bash
cd server
npm run verify:kling-t2v
```

预期：所有 dry-run 测试通过，不产生任何费用。

## 十、 供应商对比看板 (Provider Benchmark) 验收（v8.2 阶段）

本节验证多供应商对比看板的完整功能。

### Mock Mode 验收

- [ ] 前端 Mock 模式启动：`npm run dev`。
- [ ] 侧边栏显示「供应商对比」入口（analytics 图标）。
- [ ] 点击进入 Provider Benchmark 页面，正常渲染。
- [ ] 无数据时显示友好空状态（"暂无统计数据" + "去生成图片"按钮）。
- [ ] Mock 模式下 Dashboard 页面仍正常（不崩溃）。
- [ ] Mock 模式下 Usage 页面仍正常（不崩溃）。

### Real Mode 验收

- [ ] 后端启动：`cd server && npm run dev`。
- [ ] 前端 Real 模式启动。
- [ ] Provider Benchmark 页面可访问，能看到 provider 维度统计。
- [ ] 页面顶部显示 Kling 兼容网关说明和成本免责声明。
- [ ] 筛选器正常工作（项目、供应商、类型、模式、日期范围）。
- [ ] 总览卡片显示总任务数、成功率、失败率、平均耗时、平均评分、估算成本、浪费成本。
- [ ] 供应商对比表可排序（点击列头切换升降序）。
- [ ] 模型对比表可正常查看和排序。
- [ ] 模式统计表正常展示。
- [ ] 失败原因分布表格正常展示。
- [ ] 质量成本交叉分析表正常展示（优秀/可用/需修复/不可用/值得重试）。
- [ ] 智能洞察提示卡片正常显示。
- [ ] Usage / Quality 数据能进入统计。

### Dashboard 联动验收

- [ ] Dashboard 显示「供应商表现」卡片。
- [ ] 卡片显示任务最多 Provider、成功率最高 Provider、评分最高 Provider、失败率最高 Provider。
- [ ] 点击「进入供应商对比」跳转到 Provider Benchmark 页面。
- [ ] 无数据时显示"暂无足够数据"提示。

### Usage 联动验收

- [ ] Usage 页面「按供应商统计」区域显示「查看供应商对比」按钮。
- [ ] 点击供应商名称可跳转 Provider Benchmark 页面。

### 安全与数据验收

- [ ] localStorage 不含明文 API Key。
- [ ] db.json 不含明文 API Key。
- [ ] Provider Benchmark 接口不返回 API Key 或 encrypted 字段。
- [ ] Provider Benchmark 不修改 db.json 数据。

### 构建验收

- [ ] 前端 `npm run build` 通过。
- [ ] 后端 `cd server && npm run build` 通过。
- [ ] 后端 `cd server && npm test` 通过。
- [ ] 后端 verify 脚本均通过：
  ```bash
  npm run verify:wanwu
  npm run verify:wanxiang-t2v
  npm run verify:wanxiang-i2v
  npm run verify:wanxiang-r2v
  npm run verify:kling-t2v
  ```

## 附录：基准测试集 (Benchmark Set) 验收（v8.3 阶段）

本节验证 Prompt Benchmark Set 的完整功能。

### Mock Mode 验收

- [ ] 前端 Mock 模式启动：`npm run dev`。
- [ ] 侧边栏显示「基准测试」入口（science 图标）。
- [ ] 点击进入 Benchmark 页面，默认 Benchmark Set 可见。
- [ ] 默认测试集包含 9 个用例（T2V×3 + I2V×3 + R2V×3）。
- [ ] 展开用例可查看 prompt、parameters、rubric。
- [ ] 可创建 dry-run，不产生真实调用。
- [ ] Run 列表正常显示，Run 结果可见。
- [ ] Mock 模式下现有页面不受影响。

### Real Mode dry-run 验收

- [ ] 后端启动：`cd server && npm run dev`。
- [ ] 前端 Real 模式启动。
- [ ] Benchmark Set 可访问。
- [ ] 创建 Run 时可选供应商（T2V/I2V/R2V capable providers）。
- [ ] liveRun=false 时不调用真实供应商。
- [ ] RunItems 正常创建（status=pending/skipped）。
- [ ] Run 结果页可见，不产生真实费用。
- [ ] Provider Benchmark 页面显示「查看基准测试」按钮，可跳转。

### Real Mode live-run 验收（手动可选）

- [ ] 创建 Run 时勾选 liveRun。
- [ ] 必须 confirmLiveRun=true 才能执行。
- [ ] 费用提示明确。
- [ ] 创建真实 tasks，assets/usageRecords 正常写入。
- [ ] task completed 后 RunItem 自动变 completed，回填 assetId。
- [ ] task failed 后 RunItem 自动变 failed，回填 errorCode / errorReason。
- [ ] 所有 RunItem 终态后，Run 状态自动从 running 变为 completed。
- [ ] Run 结果页展示：用例、模式、供应商、模型、状态、任务/资产链接、错误信息。
- [ ] 点击「任务」按钮可跳转 Task Center。
- [ ] 点击「资产」按钮可跳转 Asset Library。
- [ ] Run Summary 显示 averageRating（评价后）和 estimatedCost（生成后）。
- [ ] 后续可人工填写 quality。
- [ ] Quality Feedback 填写后 Run Summary 的 averageRating 更新。
- [ ] Provider Benchmark 可统计结果。
- [ ] Usage 页面可见 Benchmark 产生任务的成本。
- [ ] db:reset + db:seed 正常，默认 Benchmark Set 可见。
