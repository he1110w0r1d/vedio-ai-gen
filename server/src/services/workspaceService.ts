import type { WorkspaceProfile } from '../types/workspace.js';
import { validationError } from '../utils/errors.js';
import { readDb, updateDb } from './storageService.js';

export async function getWorkspace() {
  const db = await readDb();
  return db.workspace;
}

export async function updateWorkspace(input: Partial<WorkspaceProfile>) {
  if ('id' in input) throw validationError('工作区 ID 不允许修改');
  if (!input.name?.trim() && input.name !== undefined) throw validationError('工作区名称不能为空');

  let updated: WorkspaceProfile | undefined;
  await updateDb((db) => {
    if (input.defaultProjectId && !db.projects.some((project) => project.id === input.defaultProjectId)) {
      throw validationError('默认项目不存在');
    }
    updated = {
      ...db.workspace,
      name: input.name?.trim() ?? db.workspace.name,
      ownerName: input.ownerName ?? db.workspace.ownerName,
      description: input.description ?? db.workspace.description,
      avatarUrl: input.avatarUrl ?? db.workspace.avatarUrl,
      defaultProjectId: input.defaultProjectId ?? db.workspace.defaultProjectId,
      updatedAt: new Date().toISOString(),
    };
    db.workspace = updated;
  });

  return updated!;
}
