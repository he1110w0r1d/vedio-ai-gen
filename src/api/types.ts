import type { Asset, GenerationTask, Project, Provider, ProviderCapability, ProviderStatus, VideoMode } from '../types';

export type ApiMode = 'mock' | 'real';

export type ApiErrorCode =
  | 'INVALID_API_KEY'
  | 'INSUFFICIENT_BALANCE'
  | 'RATE_LIMITED'
  | 'CONTENT_REJECTED'
  | 'PROVIDER_UNAVAILABLE'
  | 'MODEL_NOT_SUPPORTED'
  | 'TASK_TIMEOUT'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'UNKNOWN_PROVIDER_ERROR';

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  provider?: string;
  providerCode?: string;
  retryable: boolean;
  detail?: unknown;
};

export type ApiResult<T> = {
  data: T;
  error?: never;
} | {
  data?: never;
  error: ApiError;
};

export type ProviderInput = {
  name: string;
  baseUrl: string;
  defaultModel: string;
  apiKey?: string;
  capabilities: ProviderCapability[];
};

export type ProviderTestResult = {
  status: ProviderStatus;
  message: string;
  capabilities?: ProviderCapability[];
};

export type ImageGenerationInput = {
  prompt: string;
  negativePrompt?: string;
  count: number;
  provider: Provider;
  project: Project;
  model: string;
  aspectRatio: string;
  style: string;
  seed: string;
};

export type ImageGenerationResult = {
  task: GenerationTask;
  assets: Asset[];
};

export type VideoGenerationInput = {
  mode: VideoMode;
  title: string;
  prompt: string;
  provider: Provider;
  project: Project;
  model: string;
  params?: Record<string, string | number | boolean>;
};

export type GenerationStartResult = {
  task: GenerationTask;
  providerTaskId?: string;
};

export type AssetListQuery = {
  projectId?: string;
  type?: string;
  providerId?: string;
  model?: string;
  favorite?: boolean;
  search?: string;
};

export type TaskListQuery = {
  projectId?: string;
  status?: string;
  type?: string;
  providerId?: string;
};
