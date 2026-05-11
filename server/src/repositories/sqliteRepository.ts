// SQLite Repository：使用 better-sqlite3 实现持久化。
// 采用"实体表 + JSON payload"混合策略，最小化改造风险。
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import type { AppRepository } from './types.js';
import type { DbShape } from '../services/storageService.js';
import {
  defaultWorkspace,
  defaultProject,
  defaultPromptTemplates,
  defaultCostRules,
  defaultStorageConfig,
  defaultBenchmarkSet,
  normalizeDb,
} from '../services/storageServiceCore.js';

type AnyRecord = Record<string, unknown>;

const ENTITY_TABLES = [
  'workspace',
  'providers',
  'projects',
  'assets',
  'tasks',
  'prompt_templates',
  'audit_logs',
  'usage_records',
  'cost_rules',
  'quality_feedback',
  'storage_config',
  'benchmark_sets',
  'benchmark_runs',
  'benchmark_run_items',
] as const;

const INDEXES: Array<{ table: string; column: string }> = [
  { table: 'tasks', column: 'project_id' },
  { table: 'tasks', column: 'provider_id' },
  { table: 'tasks', column: 'status' },
  { table: 'assets', column: 'project_id' },
  { table: 'assets', column: 'provider_id' },
  { table: 'assets', column: 'task_id' },
  { table: 'usage_records', column: 'task_id' },
  { table: 'usage_records', column: 'project_id' },
  { table: 'quality_feedback', column: 'target_type' },
  { table: 'quality_feedback', column: 'target_id' },
  { table: 'benchmark_run_items', column: 'run_id' },
  { table: 'benchmark_run_items', column: 'task_id' },
];

// snake_case 转换
function toSnake(table: string): string {
  return table.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function colName(table: string, suffix: string): string {
  return suffix; // 简洁：直接用 project_id, task_id 等
}

let dbInstance: Database.Database | null = null;

function getDbPath(): string {
  const envPath = process.env.SQLITE_DB_PATH;
  if (envPath) return path.resolve(envPath);
  return path.resolve(process.cwd(), 'data', 'app.sqlite');
}

export function getSqliteDb(): Database.Database {
  if (!dbInstance) {
    const dbPath = getDbPath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    dbInstance = new Database(dbPath);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
  }
  return dbInstance;
}

export function closeSqliteDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

function initSchema(db: Database.Database): void {
  // schema_version 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const currentVersion = 1;
  const row = db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as { version: number } | undefined;

  if (!row || row.version < currentVersion) {
    // 创建所有实体表
    for (const table of ENTITY_TABLES) {
      const t = toSnake(table);
      db.exec(`
        CREATE TABLE IF NOT EXISTS ${t} (
          id TEXT PRIMARY KEY,
          payload TEXT NOT NULL,
          created_at TEXT,
          updated_at TEXT
        );
      `);
    }

    // 第一阶段暂不创建索引列（列尚未从 payload 提升到表列）。
    // 后续版本在 ALTER TABLE ADD COLUMN 后再启用索引。
    // for (const idx of INDEXES) {
    //   const t = toSnake(idx.table);
    //   const col = idx.column;
    //   const idxName = `idx_${t}_${col}`;
    //   db.exec(`CREATE INDEX IF NOT EXISTS ${idxName} ON ${t}(${col});`);
    // }

    // 更新 schema version
    if (row) {
      db.prepare('DELETE FROM schema_version').run();
    }
    db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(currentVersion, new Date().toISOString());
  }
}

// 读单表全部记录
function readTable(db: Database.Database, table: string): AnyRecord[] {
  const t = toSnake(table);
  const rows = db.prepare(`SELECT payload FROM ${t} ORDER BY id`).all() as Array<{ payload: string }>;
  return rows.map(r => JSON.parse(r.payload));
}

// 写单表（全量替换）。
// 第一阶段：完整 JSON payload 存储，不做列提升（后续可逐步规范化字段）。
function writeTable(db: Database.Database, table: string, records: AnyRecord[]): void {
  const t = toSnake(table);
  const del = db.prepare(`DELETE FROM ${t}`);
  const ins = db.prepare(`INSERT OR REPLACE INTO ${t} (id, payload, created_at, updated_at) VALUES (?, ?, ?, ?)`);
  const txn = db.transaction(() => {
    del.run();
    for (const r of records) {
      // 保留完整字段在 payload 中，不做删除（后续可逐步提升为表列 + 索引）
      ins.run(
        r.id as string,
        JSON.stringify(r),
        (r.createdAt as string) || (r.created_at as string) || new Date().toISOString(),
        (r.updatedAt as string) || (r.updated_at as string) || new Date().toISOString(),
      );
    }
  });
  txn();
}

// 组装 DbShape
function assembleDb(db: Database.Database): DbShape {
  const workspaceRows = readTable(db, 'workspace');
  const raw: Partial<DbShape> = {
    workspace: workspaceRows[0] as DbShape['workspace'],
    providers: readTable(db, 'providers') as DbShape['providers'],
    projects: readTable(db, 'projects') as DbShape['projects'],
    assets: readTable(db, 'assets') as DbShape['assets'],
    tasks: readTable(db, 'tasks') as DbShape['tasks'],
    promptTemplates: readTable(db, 'prompt_templates') as DbShape['promptTemplates'],
    auditLogs: readTable(db, 'audit_logs') as DbShape['auditLogs'],
    usageRecords: readTable(db, 'usage_records') as DbShape['usageRecords'],
    costRules: readTable(db, 'cost_rules') as DbShape['costRules'],
    qualityFeedback: readTable(db, 'quality_feedback') as DbShape['qualityFeedback'],
    storageConfig: (readTable(db, 'storage_config')[0] || defaultStorageConfig()) as DbShape['storageConfig'],
    benchmarkSets: readTable(db, 'benchmark_sets') as DbShape['benchmarkSets'],
    benchmarkRuns: readTable(db, 'benchmark_runs') as DbShape['benchmarkRuns'],
    benchmarkRunItems: readTable(db, 'benchmark_run_items') as DbShape['benchmarkRunItems'],
  };
  return normalizeDb(raw);
}

// 保存 DbShape 到 SQLite
function saveDb(db: Database.Database, data: DbShape): void {
  writeTable(db, 'workspace', [data.workspace as unknown as AnyRecord]);
  writeTable(db, 'providers', data.providers as unknown as AnyRecord[]);
  writeTable(db, 'projects', data.projects as unknown as AnyRecord[]);
  writeTable(db, 'assets', data.assets as unknown as AnyRecord[]);
  writeTable(db, 'tasks', data.tasks as unknown as AnyRecord[]);
  writeTable(db, 'prompt_templates', data.promptTemplates as unknown as AnyRecord[]);
  writeTable(db, 'audit_logs', data.auditLogs as unknown as AnyRecord[]);
  writeTable(db, 'usage_records', data.usageRecords as unknown as AnyRecord[]);
  writeTable(db, 'cost_rules', data.costRules as unknown as AnyRecord[]);
  writeTable(db, 'quality_feedback', data.qualityFeedback as unknown as AnyRecord[]);
  writeTable(db, 'storage_config', [data.storageConfig as unknown as AnyRecord]);
  writeTable(db, 'benchmark_sets', data.benchmarkSets as unknown as AnyRecord[]);
  writeTable(db, 'benchmark_runs', data.benchmarkRuns as unknown as AnyRecord[]);
  writeTable(db, 'benchmark_run_items', data.benchmarkRunItems as unknown as AnyRecord[]);
}

export function createSqliteRepository(): AppRepository {
  return {
    async getDb() {
      const db = getSqliteDb();
      initSchema(db);
      return assembleDb(db);
    },
    async updateDb(mutator) {
      const db = getSqliteDb();
      initSchema(db);
      const current = assembleDb(db);
      const next = (await mutator(current)) ?? current;
      saveDb(db, next);
      return next;
    },
    async resetDb() {
      const db = getSqliteDb();
      initSchema(db);
      const empty: DbShape = {
        workspace: defaultWorkspace(),
        providers: [],
        projects: [],
        assets: [],
        tasks: [],
        promptTemplates: [],
        auditLogs: [],
        usageRecords: [],
        costRules: [],
        qualityFeedback: [],
        storageConfig: defaultStorageConfig(),
        benchmarkSets: [],
        benchmarkRuns: [],
        benchmarkRunItems: [],
      };
      saveDb(db, empty);
      return empty;
    },
    async seedDb() {
      // delegate to storageServiceCore seed logic
      const { seedDb: coreSeed } = await import('../services/storageServiceCore.js');
      const jsonData = await coreSeed();
      const db = getSqliteDb();
      initSchema(db);
      saveDb(db, jsonData);
      console.log('db:seed (sqlite) 完成');
      return jsonData;
    },
    async close() {
      closeSqliteDb();
    },
  };
}
