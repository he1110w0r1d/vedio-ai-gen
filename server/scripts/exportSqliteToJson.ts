// 从 SQLite 导出数据到 db.json
import path from 'node:path';
import fs from 'node:fs';
import { getSqliteDb, closeSqliteDb } from '../src/repositories/sqliteRepository.js';
import { normalizeDb } from '../src/services/storageServiceCore.js';
import type { DbShape } from '../src/services/storageServiceCore.js';

const overwriteFlag = process.argv.includes('--overwrite');
const defaultOutput = path.resolve(process.cwd(), 'data', 'db.exported.json');
const outputPath = process.argv.find(a => a.endsWith('.json')) || defaultOutput;

const db = getSqliteDb();

const tables = [
  'workspace', 'providers', 'projects', 'assets', 'tasks',
  'prompt_templates', 'audit_logs', 'usage_records', 'cost_rules',
  'quality_feedback', 'storage_config',
  'benchmark_sets', 'benchmark_runs', 'benchmark_run_items',
];

const raw: Record<string, unknown> = {};

for (const table of tables) {
  const rows = db.prepare(`SELECT payload FROM ${table} ORDER BY id`).all() as Array<{ payload: string }>;
  raw[table] = rows.map(r => JSON.parse(r.payload));
}

// 组装 DbShape
const data = normalizeDb({
  workspace: (raw.workspace as Record<string, unknown>[])?.[0] as DbShape['workspace'],
  providers: raw.providers as DbShape['providers'],
  projects: raw.projects as DbShape['projects'],
  assets: raw.assets as DbShape['assets'],
  tasks: raw.tasks as DbShape['tasks'],
  promptTemplates: raw.prompt_templates as DbShape['promptTemplates'],
  auditLogs: raw.audit_logs as DbShape['auditLogs'],
  usageRecords: raw.usage_records as DbShape['usageRecords'],
  costRules: raw.cost_rules as DbShape['costRules'],
  qualityFeedback: raw.quality_feedback as DbShape['qualityFeedback'],
  storageConfig: (raw.storage_config as Record<string, unknown>[])?.[0] as DbShape['storageConfig'],
  benchmarkSets: raw.benchmark_sets as DbShape['benchmarkSets'],
  benchmarkRuns: raw.benchmark_runs as DbShape['benchmarkRuns'],
  benchmarkRunItems: raw.benchmark_run_items as DbShape['benchmarkRunItems'],
});

// 检查是否覆盖 db.json
const dbJsonPath = path.resolve(process.cwd(), 'data', 'db.json');
if (outputPath === dbJsonPath && !overwriteFlag) {
  console.error('错误: 请使用 --overwrite 确认覆盖现有 db.json，或指定其他输出路径。');
  console.error(`  示例: node dist/scripts/exportSqliteToJson.js db.backup.json`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

console.log(`SQLite → JSON 导出完成。`);
console.log(`  输出: ${outputPath}`);
console.log(`  providers: ${data.providers.length}`);
console.log(`  projects: ${data.projects.length}`);
console.log(`  assets: ${data.assets.length}`);
console.log(`  tasks: ${data.tasks.length}`);

closeSqliteDb();
