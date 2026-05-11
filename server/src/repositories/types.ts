// Repository 抽象接口，统一 JSON 和 SQLite 两种后端。
import type { DbShape } from '../services/storageService.js';

export interface AppRepository {
  getDb(): Promise<DbShape>;
  updateDb(mutator: (db: DbShape) => DbShape | void | Promise<DbShape | void>): Promise<DbShape>;
  resetDb(): Promise<DbShape>;
  seedDb(): Promise<DbShape>;
  close?(): Promise<void>;
}
