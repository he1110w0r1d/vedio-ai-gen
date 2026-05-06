import type { ApiError, ApiMode } from './types';

const viteEnv = import.meta as ImportMeta & { env?: Record<string, string | undefined> };

export const API_MODE: ApiMode = viteEnv.env?.VITE_API_MODE === 'real' ? 'real' : 'mock';

export class ApiClientError extends Error {
  error: ApiError;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.error = error;
  }
}

export function realApiNotImplemented(endpoint: string): never {
  throw new ApiClientError({
    code: 'UNKNOWN_PROVIDER_ERROR',
    message: `真实后端接口尚未接入：${endpoint}`,
    retryable: false,
  });
}

export function shouldUseMockApi() {
  return API_MODE === 'mock';
}
