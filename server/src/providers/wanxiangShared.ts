import { decryptSecret } from '../services/encryptionService.js';
import type { ProviderRecord } from '../types/provider.js';
import type { GenerationTaskRecord } from '../types/task.js';
import {
  contentRejected,
  HttpError,
  insufficientBalance,
  invalidApiKey,
  modelNotSupported,
  providerUnavailable,
  rateLimited,
  taskTimeout,
  unknownProviderError,
} from '../utils/errors.js';
import type { ProviderTaskStatusResult } from './types.js';

export const defaultBaseUrl = 'https://dashscope.aliyuncs.com';

export type WanxiangCreateResponse = {
  output?: {
    task_id?: string;
    task_status?: string;
  };
  request_id?: string;
  code?: string;
  message?: string;
};

export type WanxiangTaskResponse = {
  output?: {
    task_id?: string;
    task_status?: string;
    video_url?: string;
    message?: string;
    code?: string;
  };
  usage?: {
    duration?: number;
  };
  code?: string;
  message?: string;
};

export function endpoint(provider: ProviderRecord) {
  return `${(provider.baseUrl || defaultBaseUrl).replace(/\/+$/, '')}/api/v1/services/aigc/video-generation/video-synthesis`;
}

export function taskEndpoint(provider: ProviderRecord, taskId: string) {
  return `${(provider.baseUrl || defaultBaseUrl).replace(/\/+$/, '')}/api/v1/tasks/${taskId}`;
}

export async function fetchJson<T>(url: string, provider: ProviderRecord, init: RequestInit, timeoutMs: number, providerName: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${decryptSecret(provider.encryptedApiKey)}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
      signal: controller.signal,
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    if (!response.ok || body.code) throw { status: response.status, code: body.code, message: body.message || response.statusText };
    return body as T;
  } catch (error) {
    if (error instanceof SyntaxError) throw unknownProviderError(providerName, 'INVALID_JSON');
    mapWanxiangError(error, providerName);
  } finally {
    clearTimeout(timeout);
  }
}

export function mapWanxiangError(error: unknown, providerName: string): never {
  if (error instanceof HttpError) throw error;
  const item = error as { status?: number; code?: string; message?: string; name?: string };
  const status = item.status;
  const code = String(item.code ?? '').toLowerCase();
  const message = String(item.message ?? '').toLowerCase();
  const name = String(item.name ?? '').toLowerCase();
  if (status === 401 || status === 403 || code.includes('invalid') || message.includes('api key')) throw invalidApiKey('百炼 API Key 无效，请检查 Provider 配置');
  if (status === 429 || code.includes('throttl') || code.includes('rate')) throw rateLimited(providerName, item.code);
  if (code.includes('quota') || message.includes('quota') || message.includes('balance') || message.includes('余额') || message.includes('额度')) throw insufficientBalance(providerName, '百炼账户余额或额度不足');
  if (code.includes('content') || code.includes('safety') || message.includes('审核') || message.includes('policy')) throw contentRejected(providerName, item.code);
  if (code.includes('model') || message.includes('model') || status === 404) throw modelNotSupported(providerName, '当前模型不可用，可能与账户权限或模型支持有关');
  if (name.includes('abort') || code.includes('timeout') || message.includes('timeout')) throw taskTimeout(providerName, '万相任务请求超时');
  if (typeof status === 'number' && status >= 500) throw providerUnavailable(providerName, item.code);
  throw unknownProviderError(providerName, item.code, { status, code: item.code });
}

export function normalizeStatus(response: WanxiangTaskResponse, task: GenerationTaskRecord): ProviderTaskStatusResult {
  const output = response.output ?? {};
  const providerTaskStatus = output.task_status ?? 'UNKNOWN';
  const status = providerTaskStatus.toUpperCase();
  if (status === 'SUCCEEDED') {
    return { id: task.id, status: 'completed', progress: 100, providerTaskStatus, videoUrl: output.video_url };
  }
  if (['FAILED', 'CANCELED', 'UNKNOWN'].includes(status)) {
    return {
      id: task.id,
      status: 'failed',
      progress: 100,
      providerTaskStatus,
      errorCode: 'VIDEO_TASK_FAILED',
      errorReason: output.message || response.message || '视频任务失败',
    };
  }
  return {
    id: task.id,
    status: 'polling',
    progress: Math.max(10, Math.min(95, task.progress + 8)),
    providerTaskStatus,
  };
}
