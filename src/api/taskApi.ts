import type { GenerationTask } from '../types';
import { requestJson, shouldUseMockApi } from './client';
import type { TaskListQuery } from './types';

function normalizeTask(task: GenerationTask): GenerationTask {
  const status = task.status as string;
  if (status === 'polling') return { ...task, status: 'running' };
  if (status === 'timeout') return { ...task, status: 'failed', errorReason: task.errorReason ?? '任务超时' };
  return task;
}

export const taskApi = {
  async listTasks(tasks: GenerationTask[], query: TaskListQuery = {}): Promise<GenerationTask[]> {
    if (!shouldUseMockApi()) {
      const items = await requestJson<GenerationTask[]>('/api/tasks');
      return items.map(normalizeTask);
    }
    return tasks.filter((task) => {
      const matchProject = !query.projectId || task.projectId === query.projectId;
      const matchStatus = !query.status || task.status === query.status;
      const matchType = !query.type || task.type === query.type;
      const matchProvider = !query.providerId || task.providerId === query.providerId;
      return matchProject && matchStatus && matchType && matchProvider;
    });
  },

  async getTask(tasks: GenerationTask[], taskId: string): Promise<GenerationTask | undefined> {
    if (!shouldUseMockApi()) return normalizeTask(await requestJson<GenerationTask>(`/api/tasks/${taskId}`));
    return tasks.find((task) => task.id === taskId);
  },

  async cancelTask(task: GenerationTask): Promise<GenerationTask> {
    if (!shouldUseMockApi()) return normalizeTask(await requestJson<GenerationTask>(`/api/tasks/${task.id}/cancel`, { method: 'POST' }));
    return { ...task, status: 'canceled', progress: 0 };
  },

  async retryTask(task: GenerationTask): Promise<GenerationTask> {
    if (!shouldUseMockApi()) return normalizeTask(await requestJson<GenerationTask>(`/api/tasks/${task.id}/retry`, { method: 'POST' }));
    return { ...task, status: 'queued', progress: 0, errorReason: undefined, assetCreated: false };
  },
};
