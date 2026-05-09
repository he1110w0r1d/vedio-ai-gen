import type { Asset, GenerationTask, Project, PromptTemplate } from '../types';
import { API_BASE_URL, shouldUseMockApi } from './client';

export type ProjectImportValidationResult = {
  valid: boolean;
  manifest?: {
    exportVersion: string;
    exportedAt: string;
    appName: string;
    projectId: string;
    projectName: string;
    assetCount: number;
    taskCount: number;
    templateCount: number;
    includeFiles: boolean;
  };
  summary?: {
    projectName: string;
    assetCount: number;
    taskCount: number;
    templateCount: number;
    fileCount: number;
  };
  warnings: string[];
  errors: string[];
};

export type ProjectImportResult = {
  project: Project;
  assets: Asset[];
  tasks: GenerationTask[];
  promptTemplates: PromptTemplate[];
  idMaps: {
    projectId: Record<string, string>;
    assetIds: Record<string, string>;
    taskIds: Record<string, string>;
    templateIds: Record<string, string>;
  };
  warnings: string[];
};

export const projectImportApi = {
  async validate(file: File) {
    if (shouldUseMockApi()) throw new Error('Mock 模式暂不支持真实归档导入');
    const form = new FormData();
    form.append('file', file);
    return requestImport<ProjectImportValidationResult>('/api/project-imports/validate', form);
  },

  async import(file: File, options: { importFiles: boolean; importTasks: boolean; importTemplates: boolean; importQuality: boolean }) {
    if (shouldUseMockApi()) throw new Error('Mock 模式暂不支持真实归档导入');
    const form = new FormData();
    form.append('file', file);
    const params = new URLSearchParams({
      importFiles: String(options.importFiles),
      importTasks: String(options.importTasks),
      importTemplates: String(options.importTemplates),
      importQuality: String(options.importQuality),
    });
    return requestImport<ProjectImportResult>(`/api/project-imports?${params}`, form);
  },
};

async function requestImport<T>(path: string, body: FormData) {
  const response = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', body });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message ?? payload.error?.message ?? '项目归档包导入失败');
  return payload.data as T;
}
