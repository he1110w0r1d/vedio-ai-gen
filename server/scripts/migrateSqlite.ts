// SQLite 数据库迁移脚本：创建表、索引，幂等执行。
import { getSqliteDb, closeSqliteDb } from '../src/repositories/sqliteRepository.js';

console.log('正在初始化 SQLite 数据库…');

const db = getSqliteDb();

// 触发 initSchema（在 getDb/updateDb 中也会调用，这里显式调用以确保）
db.exec(`
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  );
`);

const tables = [
  'workspace', 'providers', 'projects', 'assets', 'tasks',
  'prompt_templates', 'audit_logs', 'usage_records', 'cost_rules',
  'quality_feedback', 'storage_config',
  'benchmark_sets', 'benchmark_runs', 'benchmark_run_items',
];

for (const table of tables) {
  db.exec(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT, updated_at TEXT);`);
}

// 第一阶段暂不创建索引列（列尚未从 payload 提升到表列）。
// 后续版本在 ALTER TABLE ADD COLUMN 后再启用索引。
console.log('  索引: 0 个（第一阶段暂不创建——列尚未提升到表列）');

// 更新 schema version
db.prepare('DELETE FROM schema_version').run();
db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(1, new Date().toISOString());

console.log('SQLite 数据库迁移完成。');
console.log(`  表: ${tables.length} 张`);
console.log('  索引: 0 个（第一阶段暂不创建）');

closeSqliteDb();
