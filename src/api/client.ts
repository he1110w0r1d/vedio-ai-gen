import type { ApiError, ApiMode } from './types';

const viteEnv = import.meta as ImportMeta & { env?: Record<string, string | undefined> };

export const API_MODE: ApiMode = viteEnv.env?.VITE_API_MODE === 'real' ? 'real' : 'mock';
export const API_BASE_URL = viteEnv.env?.VITE_API_BASE_URL ?? 'http://127.0.0.1:8787';

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

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiClientError(payload.error ?? payload ?? {
      code: 'UNKNOWN_PROVIDER_ERROR',
      message: `请求失败：${path}`,
      retryable: true,
    });
  }
  return payload.data as T;
}
