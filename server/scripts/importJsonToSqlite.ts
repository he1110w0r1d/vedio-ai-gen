// 从 db.json 导入数据到 SQLite
import path from 'node:path';
import fs from 'node:fs';
import { getSqliteDb, closeSqliteDb, createSqliteRepository } from '../src/repositories/sqliteRepository.js';
import type { DbShape } from '../src/services/storageServiceCore.js';

const forceFlag = process.argv.includes('--force');

const DB_JSON_PATH = path.resolve(process.cwd(), 'data', 'db.json');

if (!fs.existsSync(DB_JSON_PATH)) {
  console.error('错误: server/data/db.json 不存在。请先运行 npm run db:seed。');
  process.exit(1);
}

const db = getSqliteDb();

// 先触发 schema 初始化（创建表）
const repo = createSqliteRepository();
await repo.getDb();

// 检查是否已有数据
const existingCount = db.prepare('SELECT COUNT(*) as cnt FROM projects').get() as { cnt: number };
if (existingCount.cnt > 0 && !forceFlag) {
  console.error('错误: SQLite 中已有数据。如需覆盖，请使用 --force。');
  console.error(`  当前 projects 数量: ${existingCount.cnt}`);
  process.exit(1);
}

// 读取 JSON
const raw = fs.readFileSync(DB_JSON_PATH, 'utf8');
const data = JSON.parse(raw) as Partial<DbShape>;

// 导入各表
const tables: Array<{ name: string; records: Record<string, unknown>[] }> = [
  { name: 'workspace', records: data.workspace ? [data.workspace as Record<string, unknown>] : [] },
  { name: 'providers', records: (data.providers || []) as Record<string, unknown>[] },
  { name: 'projects', records: (data.projects || []) as Record<string, unknown>[] },
  { name: 'assets', records: (data.assets || []) as Record<string, unknown>[] },
  { name: 'tasks', records: (data.tasks || []) as Record<string, unknown>[] },
  { name: 'prompt_templates', records: (data.promptTemplates || []) as Record<string, unknown>[] },
  { name: 'audit_logs', records: (data.auditLogs || []) as Record<string, unknown>[] },
  { name: 'usage_records', records: (data.usageRecords || []) as Record<string, unknown>[] },
  { name: 'cost_rules', records: (data.costRules || []) as Record<string, unknown>[] },
  { name: 'quality_feedback', records: (data.qualityFeedback || []) as Record<string, unknown>[] },
  { name: 'storage_config', records: data.storageConfig ? [data.storageConfig as Record<string, unknown>] : [] },
  { name: 'benchmark_sets', records: (data.benchmarkSets || []) as Record<string, unknown>[] },
  { name: 'benchmark_runs', records: (data.benchmarkRuns || []) as Record<string, unknown>[] },
  { name: 'benchmark_run_items', records: (data.benchmarkRunItems || []) as Record<string, unknown>[] },
];

const txn = db.transaction(() => {
  for (const table of tables) {
    db.prepare(`DELETE FROM ${table.name}`).run();
    const ins = db.prepare(`INSERT OR REPLACE INTO ${table.name} (id, payload, created_at, updated_at) VALUES (?, ?, ?, ?)`);
    for (const r of table.records) {
      // 第一阶段：完整 JSON payload 存储，不删除字段
      ins.run(
        r.id as string,
        JSON.stringify(r),
        (r.createdAt as string) || new Date().toISOString(),
        (r.updatedAt as string) || new Date().toISOString(),
      );
    }
  }
});

txn();

// 统计
const counts: Record<string, number> = {};
for (const table of tables) {
  const row = db.prepare(`SELECT COUNT(*) as cnt FROM ${table.name}`).get() as { cnt: number };
  counts[table.name] = row.cnt;
}

console.log('db.json → SQLite 导入完成。');
console.log('导入统计：');
for (const [table, count] of Object.entries(counts)) {
  if (count > 0) console.log(`  ${table}: ${count} 条`);
}

closeSqliteDb();
