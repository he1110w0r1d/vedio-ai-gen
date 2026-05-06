import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AssetRecord } from '../types/asset.js';
import type { ProviderRecord } from '../types/provider.js';
import type { GenerationTaskRecord } from '../types/task.js';

export type DbShape = {
  providers: ProviderRecord[];
  projects: Array<Record<string, unknown>>;
  assets: AssetRecord[];
  tasks: GenerationTaskRecord[];
  promptTemplates: Array<Record<string, unknown>>;
  auditLogs: Array<Record<string, unknown>>;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../../data/db.json');

const emptyDb = (): DbShape => ({
  providers: [],
  projects: [],
  assets: [],
  tasks: [],
  promptTemplates: [],
  auditLogs: [],
});

function normalizeDb(value: Partial<DbShape> | undefined): DbShape {
  return {
    providers: Array.isArray(value?.providers) ? value.providers : [],
    projects: Array.isArray(value?.projects) ? value.projects : [],
    assets: Array.isArray(value?.assets) ? value.assets : [],
    tasks: Array.isArray(value?.tasks) ? value.tasks : [],
    promptTemplates: Array.isArray(value?.promptTemplates) ? value.promptTemplates : [],
    auditLogs: Array.isArray(value?.auditLogs) ? value.auditLogs : [],
  };
}

export async function readDb(): Promise<DbShape> {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    return normalizeDb(JSON.parse(raw) as Partial<DbShape>);
  } catch {
    return emptyDb();
  }
}

export async function writeDb(db: DbShape) {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, `${JSON.stringify(normalizeDb(db), null, 2)}\n`, 'utf8');
}

export async function updateDb(updater: (db: DbShape) => DbShape | void): Promise<DbShape> {
  const db = await readDb();
  const next = updater(db) ?? db;
  await writeDb(next);
  return next;
}

export async function resetDb() {
  const db = emptyDb();
  await writeDb(db);
  return db;
}
