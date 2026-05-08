import type { WorkspaceProfile } from '../types';
import { defaultWorkspace } from '../services/storageService';
import { requestJson, shouldUseMockApi } from './client';

export const workspaceApi = {
  async getWorkspace(workspace?: WorkspaceProfile) {
    if (!shouldUseMockApi()) return requestJson<WorkspaceProfile>('/api/workspace');
    return workspace ?? defaultWorkspace;
  },

  async updateWorkspace(input: Partial<WorkspaceProfile>, current?: WorkspaceProfile) {
    if (!shouldUseMockApi()) {
      return requestJson<WorkspaceProfile>('/api/workspace', {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
    }
    return {
      ...(current ?? defaultWorkspace),
      ...input,
      id: current?.id ?? defaultWorkspace.id,
      updatedAt: new Date().toISOString(),
    };
  },
};
