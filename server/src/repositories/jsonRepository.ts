// JSON Repository：包装现有 db.json 文件存储。
import type { AppRepository } from './types.js';
import type { DbShape } from '../services/storageService.js';
import {
  readDb as rawReadDb,
  writeDb as rawWriteDb,
  resetDb as rawResetDb,
  seedDb as rawSeedDb,
} from '../services/storageServiceCore.js';

export function createJsonRepository(): AppRepository {
  return {
    async getDb() {
      return rawReadDb();
    },
    async updateDb(mutator) {
      // 重新读取以保证原子性，然后应用 mutator
      const current = await rawReadDb();
      const next = (await mutator(current)) ?? current;
      await rawWriteDb(next);
      return next;
    },
    async resetDb() {
      return rawResetDb();
    },
    async seedDb() {
      return rawSeedDb();
    },
  };
}
