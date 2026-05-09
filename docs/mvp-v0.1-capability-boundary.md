# API Asset Studio v0.1 MVP 能力边界

本文档用于冻结 v0.1 MVP 的能力范围，避免在演示、交付或后续开发时把 Mock 能力误认为真实能力。

## 当前真实能力

- Node.js + Express 后端代理服务；
- BYOK Provider 管理；
- API Key 后端加密保存与脱敏展示；
- 万物焕新 gpt-image-2 真实文生图；
- 真实图片下载到 `server/storage/assets/`；
- 真实图片资产库展示；
- 真实图片下载；
- 删除真实图片资产时同步删除本地文件；
- 图片按原参数重新生成；
- 任务中心展示图片任务与 Mock 视频任务；
- 项目管理；
- Prompt 模板管理；
- 模板变量替换与一键填入 Image Studio / Video Studio；
- 项目资产迁移；
- 项目归档包导出；
- 项目归档包导入最小闭环；
- mock / real mode 切换；
- 本地 Workspace 配置；
- Health / Diagnostics 诊断接口。

## 当前 Mock 能力

- 视频生成；
- T2V；
- I2V；
- R2V；
- 视频任务真实轮询；
- 视频文件真实下载；
- 视频供应商真实接入；
- 图生图；
- 图片编辑；
- 图片局部重绘；
- 图片扩图；
- 视频编辑；
- 成本估算；
- 用户登录；
- 团队协作；
- 支付与计费。

## 不应对外承诺的能力

- 视频真实生成；
- 多用户权限；
- 商用授权判断；
- 成本精确估算；
- 跨设备同步；
- 云端对象存储；
- 生产级数据库；
- 第三方供应商 SLA；
- 第三方生成内容版权保证；
- 生产环境安全合规承诺。

## 当前适合演示的主流程

1. 启动后端：`cd server && npm run dev`；
2. 启动前端 real mode：`VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8787 npm run dev`；
3. 在 Provider 页面添加万物焕新 gpt-image-2 provider；
4. 测试连接；
5. 创建项目；
6. 在 Templates 页面用模板填入 prompt；
7. 在 Image Studio 生成真实图片；
8. 在 Task Center 查看图片任务；
9. 在 Asset Library 查看真实资产；
10. 下载图片；
11. 按原参数重新生成图片；
12. 将图片发送到 Video Studio；
13. 明确说明视频目前仍为 Mock；
14. 在 Projects 页面导出项目归档包；
15. 再将归档包导入为项目副本。

## v0.1 结论

v0.1 MVP 是一个可本地运行、可真实生成图片、可管理资产、可导入导出项目的单用户本地工作台。它不是生产环境版本，也不是完整的视频生成平台。
