// Repository Factory：根据 DATA_BACKEND 环境变量选择存储后端。
import type { AppRepository } from './types.js';
import { createJsonRepository } from './jsonRepository.js';

let repo: AppRepository | null = null;

function getBackend(): 'json' | 'sqlite' {
  const val = process.env.DATA_BACKEND?.toLowerCase();
  if (val === 'sqlite') return 'sqlite';
  return 'json';
}

export async function getRepository(): Promise<AppRepository> {
  if (repo) return repo;

  const backend = getBackend();

  if (backend === 'sqlite') {
    const { createSqliteRepository } = await import('./sqliteRepository.js');
    repo = createSqliteRepository();
  } else {
    repo = createJsonRepository();
  }

  return repo;
}

// 重置（测试用）
export function resetRepository(): void {
  repo = null;
}

export function getCurrentBackend(): 'json' | 'sqlite' {
  return getBackend();
}
