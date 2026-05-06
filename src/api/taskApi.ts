import type { GenerationTask } from '../types';
import { realApiNotImplemented, shouldUseMockApi } from './client';
import type { TaskListQuery } from './types';

export const taskApi = {
  async listTasks(tasks: GenerationTask[], query: TaskListQuery = {}): Promise<GenerationTask[]> {
    if (!shouldUseMockApi()) realApiNotImplemented('GET /api/tasks');
    return tasks.filter((task) => {
      const matchProject = !query.projectId || task.projectId === query.projectId;
      const matchStatus = !query.status || task.status === query.status;
      const matchType = !query.type || task.type === query.type;
      const matchProvider = !query.providerId || task.providerId === query.providerId;
      return matchProject && matchStatus && matchType && matchProvider;
    });
  },

  async getTask(tasks: GenerationTask[], taskId: string): Promise<GenerationTask | undefined> {
    if (!shouldUseMockApi()) realApiNotImplemented('GET /api/tasks/:id');
    return tasks.find((task) => task.id === taskId);
  },

  async cancelTask(task: GenerationTask): Promise<GenerationTask> {
    if (!shouldUseMockApi()) realApiNotImplemented('POST /api/tasks/:id/cancel');
    return { ...task, status: 'canceled', progress: 0 };
  },

  async retryTask(task: GenerationTask): Promise<GenerationTask> {
    if (!shouldUseMockApi()) realApiNotImplemented('POST /api/tasks/:id/retry');
    return { ...task, status: 'queued', progress: 0, errorReason: undefined, assetCreated: false };
  },
};
