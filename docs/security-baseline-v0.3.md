# v0.3 安全基线

本文档记录了 API Asset Studio v0.3.0-benchmark-mvp 版本的安全约束与基线，作为接手和部署前的安全检查清单。

## 1. API Key 安全

| 约束 | 说明 |
|------|------|
| 后端加密保存 | API Key 使用 `APP_ENCRYPTION_KEY` 加密后存入 db.json |
| 前端不保存明文 Key | 前端仅存储脱敏显示值（`apiKeyMasked`） |
| 接口不返回明文 Key | 所有 Provider 接口响应剥离 encrypted 字段 |
| localStorage 不保存核心 provider 数据 | real mode 下 localStorage 仅存 UI 偏好 |
| 测试连接不产生费用 | 仅验证连通性 |
| 导出包不含凭据 | 项目导入导出不包含 provider credential |

## 2. Presigned URL 安全

| 约束 | 说明 |
|------|------|
| Presigned URL 不落库 | db.json 不保存完整签名 URL |
| asset.url 使用本地 URL | local storage asset 使用本地可访问 URL |
| object asset 不保存完整签名 URL | 只保存 objectKey / storageType / accessMode |
| task/asset parameters 不保存签名 URL | 只保存 sourceHost / sourceContainsSignature 元数据 |
| 不打印到 server logs | Presigned URL 不进入日志输出 |
| 不进入导出包 | 项目归档 zip 不包含 presigned URL |
| 到期自动失效 | 前端预览默认 900s，供应商读取默认 3600s |

## 3. 数据文件安全

| 约束 | 说明 |
|------|------|
| db.json 已 gitignore | `server/data/db.json` 不会被提交 |
| storage assets 已 gitignore | `server/storage/assets/*` 不会被提交 |
| .env 已 gitignore | 环境变量文件不会被提交 |
| db.example.json 保留 | 示例结构作为参考 |
| .gitkeep 保留 | 保留目录结构 |

## 4. 运行时安全

| 约束 | 说明 |
|------|------|
| CORS 配置 | 默认仅允许 localhost:5173 |
| 请求体大小限制 | 10MB |
| objectKey 校验 | 禁止 `../`、绝对路径、空路径、Windows 盘符 |
| DB 原子写入 | 先写 temp 文件，再 rename |
| DB 损坏备份 | 解析失败自动备份 .corrupted.* 文件 |
| Error 响应不泄露 | 不返回 API Key、签名字段、供应商原始响应 |

## 5. 费用与责任边界

| 约束 | 说明 |
|------|------|
| BYOK 费用自理 | 所有生成费用由用户供应商账户承担 |
| live-run 需二次确认 | Benchmark live-run 必须 confirmLiveRun=true |
| 成本估算仅供参考 | Usage Ledger 估算金额不保证与真实账单一致 |
| 不提供精确账单 | 系统不对接供应商计费 API |

## 6. 当前不是生产环境

| 已知缺口 | 风险 |
|----------|------|
| 无用户认证 | 本地单用户，不适合暴露公网 |
| 无权限控制 | 所有操作无权限校验 |
| 无审计日志 | 操作不可追溯 |
| 无备份策略 | 数据仅一份 JSON 文件 |
| JSON 文件存储 | 非数据库，不适合高并发 |
| 无 HTTPS | 本地开发默认 HTTP |

## 7. 生产部署前须补充

如果要将本项目部署到生产环境，至少需要补充：

1. 用户认证（OAuth / JWT / API Key）
2. 权限管理（RBAC / 租户隔离）
3. 操作审计日志
4. 数据库迁移到 SQL（PostgreSQL / MySQL）
5. HTTPS + 反向代理（Nginx / Caddy）
6. 定时备份策略
7. 监控与告警
8. 速率限制
9. 输入校验增强
10. 依赖安全扫描

## 8. 验证命令

```bash
# 验证 DB 持久化安全
cd server && npm run verify:db-persistence

# 验证 Presigned URL 不落库
cd server && npm run verify:no-presigned-persistence

# 修复历史脏数据
cd server && npm run db:repair-hygiene
```
