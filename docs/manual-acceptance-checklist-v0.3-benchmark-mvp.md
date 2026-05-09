# v0.3 Benchmark MVP 验收清单

本清单用于验收 v0.3.0-benchmark-mvp 阶段的所有真实能力与功能约束。

## 一、启动验收

- [ ] Node.js ≥ 18
- [ ] 前端 mock mode：`npm run dev` 正常启动
- [ ] 后端启动：`cd server && npm run dev` 正常
- [ ] `/health` 返回 version=`0.3.0-benchmark-mvp`、stage=`BENCHMARK_MVP`
- [ ] 前端 real mode：`VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8787 npm run dev` 正常

## 二、Provider 配置验收

- [ ] 可添加「万物焕新 gpt-image-2」Provider
- [ ] 可添加「阿里云百炼 万相文生视频」Provider
- [ ] 可添加「阿里云百炼 万相图生视频」Provider
- [ ] 可添加「阿里云百炼 万相参考生视频」Provider
- [ ] 可添加「阿里云百炼 HappyHorse 文生视频」Provider
- [ ] 可添加「阿里云百炼 HappyHorse 图生视频」Provider
- [ ] 可添加「阿里云百炼 HappyHorse 参考生视频」Provider
- [ ] 可添加「Kling 文生视频」Provider（第三方兼容网关说明可见）
- [ ] Key 脱敏显示
- [ ] 测试连接正常（不产生费用）

## 三、图片生成验收

- [ ] Image Studio 可选择万物焕新 Provider
- [ ] 输入 prompt 后点击生成 → Task Center 可见任务
- [ ] 任务完成后 Asset Library 可见图片
- [ ] 图片可预览、下载、删除

## 四、视频生成验收

- [ ] Video Studio T2V 模式可生成视频（万相 / HappyHorse）
- [ ] Video Studio I2V 模式可选择图片作为首帧并生成视频
- [ ] Video Studio R2V 模式可选择参考图片并使用 character1 生成视频
- [ ] 任务轮询正常，完成后自动写入 Asset
- [ ] 视频可播放、下载、删除

## 五、Asset Library 验收

- [ ] 图片和视频统一展示
- [ ] 可按类型筛选
- [ ] 可收藏
- [ ] 图片可发送到视频生成（I2V 首帧/尾帧、R2V 角色/风格）
- [ ] 资产详情抽屉正常
- [ ] 删除资产后文件同步清理

## 六、Task Center 验收

- [ ] 任务列表正常显示
- [ ] 任务状态自动推进（queued → running → completed）
- [ ] 失败任务显示错误原因
- [ ] 支持重试和取消
- [ ] 可筛选状态

## 七、Usage Ledger 验收

- [ ] 用量统计页面正常
- [ ] 存在免责警示（实际费用以供应商控制台为准）
- [ ] 按供应商/模式聚合正常
- [ ] 成本估算规则可配置
- [ ] Dashboard 显示费用卡片

## 八、Quality Feedback 验收

- [ ] 资产可填写评分（1-5 星）
- [ ] 可选择质量状态（优秀/可用/需修复/不可用）
- [ ] 可选择失败分类（12 种）
- [ ] 可填写备注
- [ ] 评价可保存和清除
- [ ] Asset Library 可按评价状态筛选
- [ ] Dashboard 显示质量概览
- [ ] Usage 页面显示质量汇总

## 九、Provider Benchmark 验收

- [ ] 供应商对比页面可访问
- [ ] 显示 Kling 兼容网关说明
- [ ] 筛选器正常工作
- [ ] 总览卡片显示核心指标
- [ ] 供应商/模型/模式对比表正常
- [ ] 失败原因分布正常
- [ ] 质量-成本交叉分析正常
- [ ] 智能洞察提示正常
- [ ] Dashboard 供应商表现卡片正常

## 十、Prompt Benchmark Set 验收

- [ ] Benchmark 页面可访问
- [ ] 默认 Benchmark Set 可见（9 用例）
- [ ] 用例展开显示 prompt、参数、rubric
- [ ] 可创建 Run（选择供应商）
- [ ] dry-run 正常（全部 skipped，不产生费用）
- [ ] dry-run 页面提示明确
- [ ] live-run 需二次确认（confirmLiveRun）

## 十一、Benchmark 人工评审验收

- [ ] Run 结果页正常展示
- [ ] Run Summary 显示评审进度（需评审/已评审/未评审/进度条）
- [ ] 筛选标签正常（全部/未评审/已评审/失败）
- [ ] completed item 可打开评审弹窗
- [ ] 评审弹窗左侧：视频预览 + 用例信息 + Rubric
- [ ] 评审弹窗右侧：评分表单
- [ ] 显示「请先观看视频后再评分」警示
- [ ] 保存评价后 RunItem 评审状态更新
- [ ] 保存后 Run Summary averageRating 更新
- [ ] 「下一条待评审」可跳转
- [ ] 全部评审后显示完成提示
- [ ] failed item 可打开复盘面板
- [ ] 复盘不要求评分
- [ ] 复盘可填写 failureCategory / note / worthRetry

## 十二、Storage 验收

- [ ] Local Storage 正常（默认模式）
- [ ] Object Storage 配置正常（如有 S3/OSS 凭据）
- [ ] Public 模式资产可公开访问
- [ ] Private-Presigned 模式资产仅临时链接可访问
- [ ] asset.url 不保存 presigned URL
- [ ] 项目导出包不包含 presigned URL

## 十三、安全验收

- [ ] localStorage 不含明文 API Key
- [ ] db.json 不含明文 API Key
- [ ] 接口不返回 encrypted 字段
- [ ] Presigned URL 不落库
- [ ] Presigned URL 不进入日志
- [ ] db.json 不被 git 跟踪
- [ ] storage files 不被 git 跟踪
- [ ] .env 不被 git 跟踪
- [ ] 项目导出包不含凭据和签名 URL

## 十四、数据卫生验收

- [ ] `cd server && npm run verify:db-persistence` 全部通过
- [ ] `cd server && npm run verify:no-presigned-persistence` 全部通过
- [ ] `cd server && npm run db:repair-hygiene` 可正常运行
- [ ] `cd server && npm run db:reset && npm run db:seed` 正常

## 十五、构建验收

- [ ] 前端 `npm run build` 通过
- [ ] 后端 `cd server && npm run build` 通过
- [ ] 后端 `cd server && npm test` 全部通过
- [ ] 所有 verify 脚本通过（共 14 个）

## 十六、文档验收

- [ ] README.md 版本号为 v0.3.0-benchmark-mvp
- [ ] docs/benchmark-mvp-v0.3-capability-boundary.md 存在
- [ ] docs/security-baseline-v0.3.md 存在
- [ ] docs/demo-flow-v0.3.md 存在
- [ ] docs/manual-acceptance-checklist-v0.3-benchmark-mvp.md 存在（本文档）
