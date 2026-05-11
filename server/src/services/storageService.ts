// 存储服务薄封装层：根据 DATA_BACKEND 环境变量路由到 JSON 或 SQLite Repository。
// 所有现有 imports 无需修改，此文件保持向后兼容的导出签名。

// 类型和默认值从 core 直接导出（不依赖后端选择）
export type { DbShape } from './storageServiceCore.js';
export {
  defaultWorkspace,
  defaultProject,
  defaultStorageConfig,
  defaultPromptTemplates,
  defaultCostRules,
  normalizeDb,
  defaultBenchmarkSet,
  sanitizeAssetUrls,
} from './storageServiceCore.js';

// writeDb 也从 core 导出（仅 json repository 内部使用）
export { writeDb } from './storageServiceCore.js';

// 运行时函数：根据 DATA_BACKEND 路由
import { getRepository, resetRepository, getCurrentBackend } from '../repositories/repositoryFactory.js';
import type { DbShape } from './storageServiceCore.js';

export async function readDb(): Promise<DbShape> {
  const repo = await getRepository();
  return repo.getDb();
}

export async function updateDb(updater: (db: DbShape) => DbShape | void): Promise<DbShape> {
  const repo = await getRepository();
  return repo.updateDb(updater);
}

export async function resetDb(): Promise<DbShape> {
  const repo = await getRepository();
  return repo.resetDb();
}

export async function seedDb(): Promise<DbShape> {
  const repo = await getRepository();
  return repo.seedDb();
}

// 重置 Repository（测试用）
export { resetRepository, getCurrentBackend };
