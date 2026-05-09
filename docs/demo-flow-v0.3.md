# v0.3 演示流程

本文档为 API Asset Studio v0.3.0-benchmark-mvp 提供推荐的演示主线，适用于向接手者或评审者展示核心能力。

## 准备

```bash
# 安装依赖
npm install
cd server && npm install && cd ..

# 初始化数据
cd server
npm run db:reset
npm run db:seed
cd ..
```

---

## 演示流程 A：资产生成主线（≈ 10 分钟）

目标：展示从配置 Provider 到完成图片和视频生成的全流程。

### A1. 启动

```bash
# 终端 1：启动后端
cd server
npm run dev

# 终端 2：启动前端 real mode
VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8787 npm run dev
```

### A2. 添加 Provider

1. 打开浏览器 → http://localhost:5173
2. 侧边栏 → 供应商
3. 添加「万物焕新 gpt-image-2」（填入 API Key）
4. 添加「阿里云百炼 万相文生视频」（填入 API Key）
5. 点击「测试连接」→ 确认显示「已连接」
6. 观察：Key 脱敏显示、能力芯片正常

### A3. 生成图片

1. 侧边栏 → 图片工作台
2. 选择万物焕新 Provider
3. 输入 prompt：`一只在月球上散步的猫，写实风格`
4. 点击「生成图片」
5. 自动跳转 Task Center → 观察任务从 queued → running → completed
6. 点击「查看资产」→ 确认图片可见

### A4. 用图片生成视频 (I2V)

1. 资产库中点击刚生成的图片 → 「用于视频生成」→ 「I2V 首帧」
2. 自动跳转 Video Studio I2V 面板
3. 选择万相图生视频 Provider
4. 输入 prompt：`猫咪缓慢向前走动，保持写实风格`
5. 点击「创建真实任务」
6. Task Center 观察轮询（通常 2-10 分钟）
7. 完成后 → 资产库查看视频 → 播放

### A5. 浏览

1. **Dashboard**：查看总览（任务数、资产数、估算费用、质量概览）
2. **Task Center**：查看所有任务、筛选状态
3. **Asset Library**：查看图片和视频、筛选、收藏
4. **用量统计**：查看按供应商/模式聚合的用量和成本

---

## 演示流程 B：Benchmark 主线（≈ 5 分钟 / dry-run）

目标：展示基准测试集、Run 创建、人工评审流程。

### B1. 查看 Benchmark Set

1. 侧边栏 → 基准测试
2. 点击「测试集」tab
3. 展开「Default Video Model Benchmark v0.1」
4. 查看 9 个用例（T2V×3 + I2V×3 + R2V×3）
5. 点击单个用例 → 查看 prompt、参数、rubric

### B2. 创建 dry-run

1. 选中 Benchmark Set → 点击「创建 Run」
2. 选择供应商（万相 T2V / I2V / R2V）
3. **不勾选** Live Run → 点击「创建 Run」
4. 切换到「运行记录」tab
5. 点击刚创建的 Run → 查看 RunItems（全部 skipped）

> 💡 解释：dry-run 不调用真实供应商，仅验证流程。页面有明确提示。

### B3. 查看已有 live-run 数据（如有）

1. 切换到「运行记录」tab
2. 点击已完成的 live-run
3. 查看 Run Summary（完成/失败/跳过数、平均评分、估算成本）
4. 查看「评审进度」卡片（需评审/已评审/未评审/进度条）
5. 查看筛选标签（全部/未评审/已评审/失败）

### B4. 人工评审演示

1. 点击某条 completed RunItem 的「评价」按钮
2. 评审弹窗打开：
   - **左侧**：视频预览、用例信息、Rubric 维度
   - **右侧**：评分表单（星级、质量状态、失败分类、备注）
   - 顶部：警示提示「请先观看视频后再评分」
3. 观看视频 → 填写评分（例如：4 星、可用、备注"动作流畅"）
4. 点击「保存评价」
5. 观察：RunItem 评审状态变为「已评审」
6. 点击「下一条待评审」→ 自动切换到下一条未评审
7. 全部完成后显示「本 Run 已全部评审」

### B5. 失败任务复盘

1. 点击某条 failed RunItem 的「复盘」按钮
2. 查看错误信息（errorCode / errorReason）
3. 选择失败分类（例如：model_issue）
4. 填写备注 → 保存
5. 评审状态变为「已复盘」

### B6. Provider Benchmark 联动

1. 侧边栏 → 供应商对比
2. 查看供应商维度统计（成功率、平均评分、失败原因）
3. 确认刚才的评价已进入统计
4. 查看智能洞察提示

---

## 演示流程 C：安全与存储主线（≈ 3 分钟）

目标：展示安全基线、存储模式、数据卫生工具。

### C1. Settings 系统诊断

1. 侧边栏 → 设置
2. 查看系统诊断区域
3. 确认版本号：`0.3.0-benchmark-mvp`
4. 确认阶段标识：`BENCHMARK_MVP`

### C2. 存储模式

1. Settings → 存储管理
2. 查看当前存储模式（默认：Local Storage）
3. 解释三种模式：
   - Local Storage：本地目录
   - Object Storage Public：公开访问
   - Object Storage Private-Presigned：临时签名链接，到期自动失效
4. 如已配置 S3/OSS，可展示 Presigned URL 签发

### C3. 数据卫生验证

```bash
cd server

# 验证 DB 持久化安全
npm run verify:db-persistence

# 验证 Presigned URL 不落库
npm run verify:no-presigned-persistence
```

### C4. 安全性说明

1. API Key 仅后端加密保存，前端脱敏显示
2. localStorage 不存核心 provider 数据
3. Presigned URL 不落库、不日志、不导出
4. 项目导出包不含任何凭据
5. db.json / storage files 不会被 git 提交

---

## 快速演示路线（最短路径）

如果只有 3 分钟：

```
Dashboard（总览）
  → Benchmark 页面（查看 Set + Run）
  → 展开一条 Run → 点击 completed item「评价」
  → 评审弹窗（视频预览 + Rubric + 评分）
  → 保存 → 查看 Provider Benchmark
  → Settings 系统诊断（版本号确认）
```
