import type { GenerationTask, ProviderCapability } from '../types';
import type { ApiError, ImageGenerationInput, VideoGenerationInput } from '../api/types';

export type TestConnectionInput = {
  providerId: string;
  apiKeyMasked?: string;
  baseUrl: string;
  defaultModel: string;
};

export type TestConnectionResult = {
  ok: boolean;
  message: string;
  capabilities: ProviderCapability[];
  error?: ApiError;
};

export type T2VGenerationInput = VideoGenerationInput & { mode: 'T2V' };
export type I2VGenerationInput = VideoGenerationInput & { mode: 'I2V' };
export type R2VGenerationInput = VideoGenerationInput & { mode: 'R2V' };

export type GenerationStartResult = {
  task: GenerationTask;
  providerTaskId?: string;
};

export type GenerationTaskStatus = {
  taskId: string;
  status: 'queued' | 'running' | 'polling' | 'completed' | 'failed' | 'canceled' | 'timeout';
  progress: number;
  error?: ApiError;
};

export interface ProviderAdapter {
  id: string;
  name: string;
  capabilities: ProviderCapability[];
  testConnection(input: TestConnectionInput): Promise<TestConnectionResult>;
  generateImage(input: ImageGenerationInput): Promise<GenerationStartResult>;
  generateVideoT2V(input: T2VGenerationInput): Promise<GenerationStartResult>;
  generateVideoI2V(input: I2VGenerationInput): Promise<GenerationStartResult>;
  generateVideoR2V(input: R2VGenerationInput): Promise<GenerationStartResult>;
  getTaskStatus(taskId: string): Promise<GenerationTaskStatus>;
}
