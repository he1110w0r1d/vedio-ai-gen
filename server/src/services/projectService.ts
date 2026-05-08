import type { ProjectRecord } from '../types/project.js';
import { notFound, validationError } from '../utils/errors.js';
import { createId } from '../utils/id.js';
import { defaultProject, updateDb, readDb } from './storageService.js';

function nowIso() {
  return new Date().toISOString();
}

export async function listProjects() {
  const db = await readDb();
  return db.projects;
}

export async function getProject(projectId: string) {
  const db = await readDb();
  const project = db.projects.find((item) => item.id === projectId);
  if (!project) throw notFound('项目不存在');
  return project;
}

export async function createProject(input: Partial<ProjectRecord>) {
  if (!input.name?.trim()) throw validationError('项目名称为必填字段');
  const now = nowIso();
  const project: ProjectRecord = {
    id: createId('project'),
    name: input.name.trim(),
    description: input.description ?? '',
    coverAssetId: input.coverAssetId,
    defaultProviderId: input.defaultProviderId,
    status: 'active',
    favorite: Boolean(input.favorite),
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };
  await updateDb((db) => {
    db.projects.unshift(project);
  });
  return project;
}

export async function updateProject(projectId: string, input: Partial<ProjectRecord>) {
  let updated: ProjectRecord | undefined;
  await updateDb((db) => {
    db.projects = db.projects.map((project) => {
      if (project.id !== projectId) return project;
      updated = {
        ...project,
        name: input.name ?? project.name,
        description: input.description ?? project.description,
        coverAssetId: input.coverAssetId ?? project.coverAssetId,
        defaultProviderId: input.defaultProviderId ?? project.defaultProviderId,
        tags: input.tags ?? project.tags,
        updatedAt: nowIso(),
      };
      return updated;
    });
  });
  if (!updated) throw notFound('项目不存在');
  return updated;
}

export async function deleteProject(projectId: string) {
  const db = await readDb();
  if (!db.projects.some((project) => project.id === projectId)) throw notFound('项目不存在');
  if (db.assets.some((asset) => asset.projectId === projectId)) {
    throw validationError('该项目下已有资产，请先迁移或删除资产后再删除项目');
  }
  if (db.projects.length <= 1) throw validationError('至少需要保留一个项目');
  await updateDb((next) => {
    next.projects = next.projects.filter((project) => project.id !== projectId);
    if (!next.projects.length) next.projects = [defaultProject()];
  });
  return { id: projectId, deleted: true };
}

export async function archiveProject(projectId: string) {
  return setProjectState(projectId, { status: 'archived' });
}

export async function favoriteProject(projectId: string, favorite?: boolean) {
  const project = await getProject(projectId);
  return setProjectState(projectId, { favorite: favorite ?? !project.favorite });
}

export async function moveProjectAssets(sourceProjectId: string, input: { targetProjectId?: string; assetIds?: string[] }) {
  const targetProjectId = input.targetProjectId?.trim();
  if (!targetProjectId) throw validationError('目标项目为必填字段');
  if (sourceProjectId === targetProjectId) throw validationError('不能迁移到当前项目');

  const db = await readDb();
  const sourceProject = db.projects.find((project) => project.id === sourceProjectId);
  const targetProject = db.projects.find((project) => project.id === targetProjectId);
  if (!sourceProject) throw notFound('源项目不存在');
  if (!targetProject) throw notFound('目标项目不存在');

  const requestedAssetIds = Array.isArray(input.assetIds) && input.assetIds.length ? new Set(input.assetIds) : undefined;
  if (requestedAssetIds) {
    const missingIds = Array.from(requestedAssetIds).filter((assetId) => !db.assets.some((asset) => asset.id === assetId));
    if (missingIds.length) throw validationError('部分资产不存在', { assetIds: missingIds });
  }

  let movedAssets = db.assets.filter((asset) => asset.projectId === sourceProjectId);
  if (requestedAssetIds) movedAssets = movedAssets.filter((asset) => requestedAssetIds.has(asset.id));
  if (requestedAssetIds && movedAssets.length !== requestedAssetIds.size) {
    throw validationError('部分资产不属于源项目，无法迁移', {
      assetIds: Array.from(requestedAssetIds).filter((assetId) => !movedAssets.some((asset) => asset.id === assetId)),
    });
  }

  let updatedAssets = movedAssets.map((asset) => ({ ...asset, projectId: targetProjectId }));
  const now = nowIso();
  await updateDb((next) => {
    next.assets = next.assets.map((asset) => {
      const moved = updatedAssets.find((item) => item.id === asset.id);
      return moved ?? asset;
    });
    next.projects = next.projects.map((project) => {
      if (project.id === sourceProjectId || project.id === targetProjectId) return { ...project, updatedAt: now };
      return project;
    });
  });

  return {
    movedCount: updatedAssets.length,
    assets: updatedAssets,
  };
}

async function setProjectState(projectId: string, patch: Partial<ProjectRecord>) {
  let updated: ProjectRecord | undefined;
  await updateDb((db) => {
    db.projects = db.projects.map((project) => {
      if (project.id !== projectId) return project;
      updated = { ...project, ...patch, updatedAt: nowIso() };
      return updated;
    });
  });
  if (!updated) throw notFound('项目不存在');
  return updated;
}
