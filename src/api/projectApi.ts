import type { Project } from '../types';
import { API_BASE_URL, requestJson, shouldUseMockApi } from './client';

type ServerProject = {
  id: string;
  name: string;
  description?: string;
  coverAssetId?: string;
  defaultProviderId?: string;
  status: 'active' | 'archived';
  favorite?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

type ServerMoveAssetsResult = {
  movedCount: number;
  assets: unknown[];
};

function toProject(input: ServerProject): Project {
  return {
    id: input.id,
    name: input.name,
    description: input.description ?? '',
    assetCount: 0,
    updatedAt: input.updatedAt,
    coverAssetId: input.coverAssetId,
    defaultProviderId: input.defaultProviderId,
    status: input.status,
    favorite: input.favorite,
    tags: input.tags,
    createdAt: input.createdAt,
  };
}

export const projectApi = {
  async listProjects(projects: Project[]) {
    if (!shouldUseMockApi()) return (await requestJson<ServerProject[]>('/api/projects')).map(toProject);
    return projects;
  },

  async createProject(input: Partial<Project>) {
    if (!shouldUseMockApi()) {
      return toProject(await requestJson<ServerProject>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(input),
      }));
    }
    const now = new Date().toISOString();
    return { id: `project_${Date.now()}`, name: input.name ?? '新项目', description: input.description ?? '', assetCount: 0, updatedAt: now, status: 'active' as const, favorite: false };
  },

  async updateProject(project: Project) {
    if (!shouldUseMockApi()) {
      return toProject(await requestJson<ServerProject>(`/api/projects/${project.id}`, {
        method: 'PATCH',
        body: JSON.stringify(project),
      }));
    }
    return { ...project, updatedAt: new Date().toISOString() };
  },

  async deleteProject(projectId: string) {
    if (!shouldUseMockApi()) return requestJson<{ id: string; deleted: true }>(`/api/projects/${projectId}`, { method: 'DELETE' });
    return { id: projectId, deleted: true };
  },

  async archiveProject(project: Project) {
    if (!shouldUseMockApi()) return toProject(await requestJson<ServerProject>(`/api/projects/${project.id}/archive`, { method: 'POST' }));
    return { ...project, status: 'archived' as const, updatedAt: new Date().toISOString() };
  },

  async favoriteProject(project: Project, favorite = !project.favorite) {
    if (!shouldUseMockApi()) {
      return toProject(await requestJson<ServerProject>(`/api/projects/${project.id}/favorite`, {
        method: 'POST',
        body: JSON.stringify({ favorite }),
      }));
    }
    return { ...project, favorite, updatedAt: new Date().toISOString() };
  },

  async moveAssets(sourceProjectId: string, targetProjectId: string, assetIds?: string[]) {
    if (!shouldUseMockApi()) {
      return requestJson<ServerMoveAssetsResult>(`/api/projects/${sourceProjectId}/move-assets`, {
        method: 'POST',
        body: JSON.stringify({ targetProjectId, assetIds }),
      });
    }
    return { movedCount: assetIds?.length ?? 0, assets: [] };
  },

  async exportProject(project: Project, options: { includeFiles: boolean; includeTasks: boolean; includeTemplates: boolean }) {
    if (shouldUseMockApi()) return;
    const params = new URLSearchParams({
      includeFiles: String(options.includeFiles),
      includeTasks: String(options.includeTasks),
      includeTemplates: String(options.includeTemplates),
    });
    const response = await fetch(`${API_BASE_URL}/api/projects/${project.id}/export?${params}`);
    if (!response.ok) throw new Error('项目归档包导出失败');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const disposition = response.headers.get('Content-Disposition') ?? '';
    link.href = url;
    link.download = parseFileName(disposition) ?? `project_${project.name}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

function parseFileName(disposition: string) {
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1];
  if (encoded) return decodeURIComponent(encoded);
  return disposition.match(/filename="?([^";]+)"?/)?.[1];
}
