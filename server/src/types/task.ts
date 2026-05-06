export type TaskStatus = 'queued' | 'running' | 'polling' | 'completed' | 'failed' | 'canceled' | 'timeout';
export type TaskType = 'image' | 'video';
export type VideoMode = 'T2V' | 'I2V' | 'R2V';

export type GenerationTaskRecord = {
  id: string;
  type: TaskType;
  mode?: VideoMode;
  status: TaskStatus;
  progress: number;
  assetCreated?: boolean;
  title: string;
  prompt: string;
  providerId: string;
  providerName: string;
  providerTaskId?: string;
  model: string;
  projectId: string;
  projectName?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  errorReason?: string;
  params: Record<string, string | number | boolean>;
};
