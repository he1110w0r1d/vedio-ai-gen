# API Asset Studio v0.1 手动验收清单

## 1. 环境准备

- 确认 Node.js 版本支持 Vite 7 与 TypeScript 5；
- 根目录执行 `npm install`；
- `server/` 目录执行 `npm install`；
- 前端使用 `.env.example` 作为环境变量参考；
- 后端使用 `server/.env.example` 作为环境变量参考；
- `APP_ENCRYPTION_KEY` 至少 32 字节；
- 不提交真实 `.env`；
- 不提交真实 `server/data/db.json`；
- 不提交 `server/storage/assets/` 中的真实生成文件。

## 2. Mock Mode 验收

1. 启动前端：`npm run dev`；
2. 确认 9 个主页面可访问；
3. 在 Image Studio 执行图片 Mock 生成；
4. 将图片发送到 Video Studio；
5. 执行视频 Mock 生成；
6. 在 Task Center 查看任务；
7. 在 Asset Library 查看图片和视频资产；
8. 在 Projects 页面创建、编辑、收藏、归档项目；
9. 在 Templates 页面创建模板、变量替换、一键填入；
10. 导入区域应提示 Mock 模式不支持真实归档导入；
11. 导出项目可提示切换 real mode 后使用真实下载。

## 3. Real Mode 验收

1. 启动后端：`cd server && npm run dev`；
2. 启动前端：`VITE_API_MODE=real VITE_API_BASE_URL=http://127.0.0.1:8787 npm run dev`；
3. Provider 页面创建万物焕新 gpt-image-2 provider；
4. 确认 API Key 脱敏显示；
5. 点击测试连接；
6. Image Studio 生成 1 张真实图片；
7. Image Studio 生成多张真实图片；
8. Asset Library 展示真实图片；
9. 下载真实图片并确认文件可打开；
10. 删除真实图片并确认资产消失；
11. 使用重新生成；
12. Projects 页面按项目筛选真实资产；
13. Templates 页面一键填入 Image Studio / Video Studio；
14. Projects 页面导出项目 zip；
15. Projects 页面校验导出的 zip；
16. 将 zip 导入为新项目；
17. Asset Library 能按新项目筛选导入资产；
18. Task Center 能看到导入任务；
19. Templates 能看到导入模板；
20. Settings 显示版本和系统诊断。

## 4. 安全检查

- 浏览器 localStorage 不含明文 API Key；
- `server/data/db.json` 不含明文 API Key；
- 导出包不含明文 API Key；
- 导出包不含 encryptedApiKey；
- 导出包不含本机绝对路径；
- `git status` 不包含真实图片；
- `git status` 不包含真实 `.env`；
- `git status` 不包含真实联调 `db.json`；
- 后端错误响应不返回 stack；
- 控制台不打印用户 API Key。

## 5. 失败场景检查

- 错误 Key：Provider 测试或生成应返回友好错误；
- 不存在模型：生成应返回模型不可用提示；
- 后端未启动：前端 real mode 显示连接失败；
- 图片文件缺失：Asset Preview 显示兜底；
- 删除本地文件后前端预览不崩溃；
- 导入非法 zip：validate 返回错误；
- 导入缺文件 zip：允许 metadata-only 导入并写 warning；
- 删除有资产项目：后端阻止删除并提示先迁移或删除资产。

## 6. 命令验收

```bash
npm run build
npm run dev

cd server
npm run build
npm test
npm run verify:wanwu
npm run db:reset
npm run db:seed
npm run dev
```
