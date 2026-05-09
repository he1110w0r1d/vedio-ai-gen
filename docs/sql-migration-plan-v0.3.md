# SQL 迁移计划（v0.3 → 生产）

本文档设计从本地 JSON 文件存储（`server/data/db.json`）迁移到关系数据库（PostgreSQL）的完整方案。当前阶段仅做设计，不真正实现 SQL。

## 一、当前存储现状

- 存储引擎：单文件 JSON (`server/data/db.json`)
- 读写方式：全量读写，`readDb()` → 修改 → `writeDb()`
- 优点：零依赖，开发快速
- 问题：不适合并发（无事务/无锁），大规模数据性能差，无审计日志，单文件故障风险

## 二、推荐目标数据库

**PostgreSQL 16+** + **Drizzle ORM**（TypeScript-first，轻量）。原因：JSONB 类型可平滑过渡现有 JSON 字段，成熟的事务/索引/备份生态，与 Node.js 生态匹配。

## 三、核心表结构

### providers

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | |
| name | TEXT NOT NULL | |
| provider_type | TEXT NOT NULL | wanwuhuanxin_images / aliyun_wanxiang_t2v 等 |
| api_key_encrypted | TEXT NOT NULL | ⚠️ AES-256-GCM 加密存储 |
| capabilities | JSONB | [{mode, models[]}] |
| is_enabled | BOOLEAN | |
| created_at / updated_at | TIMESTAMPTZ | |

索引：`provider_type`, `is_enabled`

### tasks

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | |
| project_id | TEXT FK→projects | |
| provider_id | TEXT FK→providers | |
| mode | TEXT NOT NULL | t2v/i2v/r2v/image_generation |
| status | TEXT | queued/running/polling/completed/failed/timeout |
| parameters | JSONB | 请求参数（不含签名 URL） |
| result | JSONB | 生成结果 |
| error_code / error_reason | TEXT | |
| created_at | TIMESTAMPTZ | |

索引：`project_id`, `status`, `provider_id`, `mode`, `created_at DESC`

### assets

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | |
| project_id | TEXT FK→projects | |
| task_id | TEXT FK→tasks | |
| type | TEXT | image/video |
| url | TEXT | 本地/公开 URL（不含 presigned） |
| object_key | TEXT | 对象存储 key |
| storage_type | TEXT | local/object |
| access_mode | TEXT | public/private-presigned |
| metadata | JSONB | 扩展元数据 |

索引：`project_id`, `type`, `task_id`, `storage_type`

### usage_records

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | |
| task_id | TEXT FK→tasks | |
| project_id | TEXT FK→projects | |
| provider_id | TEXT FK→providers | |
| mode | TEXT | |
| estimated_cost | REAL | |
| cost_currency | TEXT | CNY |
| duration_ms | INTEGER | |

索引：`project_id`, `provider_id`, `mode`, `created_at DESC`

### quality_feedback

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | |
| target_id | TEXT NOT NULL | assetId 或 taskId |
| target_type | TEXT | asset/task |
| rating | INTEGER | 1-5, CHECK |
| quality_status | TEXT | excellent/usable/needs_fix/unusable |
| failure_category | TEXT | 12 种之一 |
| note | TEXT | |

索引：`target_id`, `rating`, `provider_id`

### projects / prompt_templates / benchmark_sets / benchmark_runs / benchmark_run_items / workspace / storage_config / cost_rules

详细建表语句与上方类似，完整 DDL 见实现阶段。

## 四、迁移策略

### 不能存明文的字段

| 字段 | 处理 |
|------|------|
| providers.api_key_encrypted | 保持 AES-256-GCM 加密，直接迁移密文 |
| storage_config.*_encrypted | 保持加密 |
| asset.url (含 presigned) | **不迁移到 SQL** — 只保留 object_key |

### JSON 字段保留策略

以下字段保持 JSONB：`task.parameters`（请求参数）、`task.result`（生成结果）、`providers.capabilities`（能力声明）、`benchmark_sets.cases`（测试用例数组）、`workspace.value`（灵活键值）。

### 迁移步骤

1. 设计 Drizzle schema，生成 migration
2. 编写 `json-to-sql.ts` 迁移脚本，逐条读取 db.json 写入 PostgreSQL
3. 验证迁移完整性（记录数、关键字段一致性）
4. 替换 `storageService.ts` 中的 `readDb()/writeDb()` 为数据库操作
5. 保留 JSON 模式作为回退（`STORAGE_BACKEND=json`/`STORAGE_BACKEND=sql` 环境变量切换）
6. 灰度切换

## 五、迁移注意事项

- APP_ENCRYPTION_KEY 必须保持一致，否则已保存的 provider credential 无法解密
- 视频资产文件本身不进入数据库，只存 object_key/url
- 迁移期间暂停写入操作
- 建议先在开发/预发环境完整验证
