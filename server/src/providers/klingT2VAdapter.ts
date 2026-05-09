import type { ImageGenerationInput, VideoGenerationInput } from '../types/generation.js';
import type { ProviderRecord } from '../types/provider.js';
import type { GenerationTaskRecord } from '../types/task.js';
import { createId } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import { HttpError, modelNotSupported, videoTaskFailed, invalidApiKey, insufficientBalance, rateLimited, contentRejected, taskTimeout, videoResultNotFound, videoDownloadFailed, providerUnavailable, unknownProviderError } from '../utils/errors.js';
import type { ImageGenerationResult, ProviderAdapter, ProviderTaskStatusResult, VideoGenerationResult } from './types.js';

const providerName = 'Kling 文生视频';
export const defaultKlingT2VModel = 'pro-text-to-video';
const createTimeoutMs = 30000;
const pollTimeoutMs = 15000;
const testConnectionTimeoutMs = 15000;
const baseUrl = 'https://kling3api.com';

export type KlingT2VResolvedParams = {
  requestedDuration: number;
  resolvedDuration: number;
  requestedAspectRatio: string;
  resolvedAspectRatio: string;
  requestedResolution: string;
  resolvedResolution: string;
  model: string;
  negativePrompt?: string;
  fallbackReason?: string;
};

function getApiKey(provider: ProviderRecord): string {
  const key = (provider as any).apiKey;
  if (!key) throw invalidApiKey('Kling API Key 未配置');
  return key;
}

function getProviderBaseUrl(provider: ProviderRecord): string {
  return provider.baseUrl || baseUrl;
}

export function mapT2VParamsToKling(input: VideoGenerationInput): KlingT2VResolvedParams {
  const duration = Number(input.params?.duration ?? 5);
  const resolvedDuration = Math.max(3, Math.min(Number.isFinite(duration) ? Math.round(duration) : 5, 15));
  const aspect = String(input.params?.aspect ?? input.params?.aspectRatio ?? '16:9');
  const aspectMap: Record<string, string> = {
    '16:9': '16:9',
    '9:16': '9:16',
    '1:1': '1:1',
  };
  const resolvedAspectRatio = aspectMap[aspect] ?? '16:9';
  const resolution = String(input.params?.resolution ?? '720p').toLowerCase();
  const resolvedResolution = resolution.includes('1080') ? '1080p' : '720p';
  const modelMap: Record<string, string> = {
    'pro-text-to-video': 'pro-text-to-video',
    'std-text-to-video': 'std-text-to-video',
    'pro': 'pro-text-to-video',
    'std': 'std-text-to-video',
    '2.1': 'pro-text-to-video',
  };
  const model = modelMap[input.model?.toLowerCase()] ?? defaultKlingT2VModel;
  const negativePrompt = input.params?.negativePrompt as string | undefined;
  return {
    requestedDuration: duration,
    resolvedDuration,
    requestedAspectRatio: aspect,
    resolvedAspectRatio,
    requestedResolution: resolution,
    resolvedResolution,
    model,
    negativePrompt,
    fallbackReason: !aspectMap[aspect] ? `未知画幅 ${aspect} 已回退为 16:9` : undefined,
  };
}

function resolveModel(provider: ProviderRecord, inputModel?: string): string {
  const model = inputModel?.toLowerCase() ?? provider.defaultModel?.toLowerCase() ?? defaultKlingT2VModel;
  const modelMap: Record<string, string> = {
    'pro-text-to-video': 'pro-text-to-video',
    'std-text-to-video': 'std-text-to-video',
    'pro': 'pro-text-to-video',
    'std': 'std-text-to-video',
    '2.1': 'pro-text-to-video',
  };
  return modelMap[model] ?? defaultKlingT2VModel;
}

function buildPrompt(input: VideoGenerationInput): string {
  const parts = [input.prompt.trim()];
  if (input.params?.camera) parts.push(`镜头运动：${input.params.camera}`);
  if (input.params?.style) parts.push(`风格：${input.params.style}`);
  if (input.params?.motion !== undefined) parts.push(`运动强度：${input.params.motion}`);
  return parts.filter(Boolean).join('\n');
}

function createTask(provider: ProviderRecord, input: VideoGenerationInput, providerTaskId: string, providerTaskStatus?: string): GenerationTaskRecord {
  const now = nowIso();
  const mapped = mapT2VParamsToKling(input);
  return {
    id: createId('task'),
    type: 'video',
    mode: 'T2V',
    status: 'polling',
    progress: 5,
    title: 'Kling T2V 文生视频',
    prompt: input.prompt,
    providerId: provider.id,
    providerName: provider.name,
    providerTaskId,
    providerTaskStatus,
    model: resolveModel(provider, input.model),
    projectId: input.projectId,
    projectName: '默认项目',
    createdAt: now,
    updatedAt: now,
    params: {
      ...input.params,
      requestedDuration: mapped.requestedDuration,
      resolvedDuration: mapped.resolvedDuration,
      requestedAspectRatio: mapped.requestedAspectRatio,
      resolvedAspectRatio: mapped.resolvedAspectRatio,
      requestedResolution: mapped.requestedResolution,
      resolvedResolution: mapped.resolvedResolution,
      model: mapped.model,
      negativePrompt: mapped.negativePrompt,
      fallbackReason: mapped.fallbackReason,
    },
  };
}

function mapKlingError(error: unknown, provider: string): never {
  if (error instanceof HttpError) throw error;
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('unauthorized') || message.includes('401') || message.includes('invalid')) {
      throw invalidApiKey('Kling API Key 无效或已过期');
    }
    if (message.includes('insufficient') || message.includes('balance') || message.includes('credits')) {
      throw insufficientBalance(provider);
    }
    if (message.includes('rate') || message.includes('429')) {
      throw rateLimited(provider);
    }
    if (message.includes('content') || message.includes('reject') || message.includes('policy')) {
      throw contentRejected(provider);
    }
    if (message.includes('timeout') || message.includes('504')) {
      throw taskTimeout(provider);
    }
    if (message.includes('not found') || message.includes('404') || message.includes('no result')) {
      throw videoResultNotFound(provider);
    }
    if (message.includes('download') || message.includes('fetch')) {
      throw videoDownloadFailed(provider);
    }
    if (message.includes('service') || message.includes('unavailable') || message.includes('503')) {
      throw providerUnavailable(provider);
    }
  }
  throw unknownProviderError(provider);
}

async function klingFetch<T>(url: string, provider: ProviderRecord, options: RequestInit, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const apiKey = getApiKey(provider);
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      if (response.status === 401) throw invalidApiKey('Kling API Key 无效');
      if (response.status === 402) throw insufficientBalance(providerName);
      if (response.status === 429) throw rateLimited(providerName);
      if (response.status === 400) {
        if (body.toLowerCase().includes('content')) throw contentRejected(providerName);
        throw new HttpError(400, { code: 'VALIDATION_ERROR', message: `Kling 请求参数错误: ${body.slice(0, 200)}`, retryable: false });
      }
      throw new HttpError(response.status, { code: 'VIDEO_TASK_FAILED', message: `Kling API 返回错误 ${response.status}: ${body.slice(0, 200)}`, provider: providerName, retryable: response.status >= 500 });
    }
    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof SyntaxError) throw new HttpError(502, { code: 'VIDEO_TASK_FAILED', message: 'Kling 返回了无效的 JSON 响应', provider: providerName, retryable: true });
    if ((error as any)?.name === 'AbortError') throw taskTimeout(providerName);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const klingT2VAdapter: ProviderAdapter = {
  id: 'kling-t2v',
  name: providerName,
  capabilities: ['t2v', 'asyncTask', 'polling'],

  async testConnection(provider: ProviderRecord) {
    try {
      const url = `${getProviderBaseUrl(provider)}/api/status?task_id=__connection_test__`;
      const response = await klingFetch<{ code: number; message: string }>(url, provider, { method: 'GET' }, testConnectionTimeoutMs);
      if (response.code === 200 || response.code === 404) {
        return {
          ok: true,
          message: 'Kling API Key 已通过连接校验。该测试不创建视频任务，余额、权限、模型可用性和内容审核仍会在真实生成时确认。',
          capabilities: this.capabilities,
        };
      }
      throw invalidApiKey();
    } catch (error) {
      mapKlingError(error, providerName);
    }
  },

  async generateImage(_provider: ProviderRecord, _input: ImageGenerationInput): Promise<ImageGenerationResult> {
    throw modelNotSupported(providerName, 'Kling T2V Adapter 不支持图片生成');
  },

  async generateVideoT2V(provider: ProviderRecord, input: VideoGenerationInput): Promise<VideoGenerationResult> {
    const mapped = mapT2VParamsToKling(input);
    try {
      const url = `${getProviderBaseUrl(provider)}/api/generate`;
      const body: Record<string, unknown> = {
        type: mapped.model,
        prompt: buildPrompt(input),
        duration: mapped.resolvedDuration,
        aspect_ratio: mapped.resolvedAspectRatio,
      };
      if (mapped.negativePrompt) body.negative_prompt = mapped.negativePrompt;
      const response = await klingFetch<{ code: number; message: string; data?: { task_id: string; status: string } }>(url, provider, {
        method: 'POST',
        body: JSON.stringify(body),
      }, createTimeoutMs);
      if (response.code !== 200 || !response.data?.task_id) {
        throw videoTaskFailed(providerName, `Kling 创建任务失败: ${response.message}`);
      }
      return { task: createTask(provider, input, response.data.task_id, response.data.status) };
    } catch (error) {
      mapKlingError(error, providerName);
    }
  },

  async generateVideoI2V(_provider: ProviderRecord, _input: VideoGenerationInput): Promise<VideoGenerationResult> {
    throw modelNotSupported(providerName, 'Kling 当前仅接入 T2V 文生视频，I2V 暂未接入');
  },

  async generateVideoR2V(_provider: ProviderRecord, _input: VideoGenerationInput): Promise<VideoGenerationResult> {
    throw modelNotSupported(providerName, 'Kling 当前仅接入 T2V 文生视频，R2V 暂未接入');
  },

  async getTaskStatus(provider: ProviderRecord, task: GenerationTaskRecord) {
    if (!task.providerTaskId) return { id: task.id, status: task.status, progress: task.progress };
    try {
      const url = `${getProviderBaseUrl(provider)}/api/status?task_id=${encodeURIComponent(task.providerTaskId)}`;
      const response = await klingFetch<{ code: number; message: string; data?: { status: string; response?: string[] | string; failed_reason?: string } }>(url, provider, { method: 'GET' }, pollTimeoutMs);
      const status = response.data?.status?.toUpperCase() ?? 'UNKNOWN';
      const progress = status === 'IN_PROGRESS' ? 50 : status === 'COMPLETED' ? 100 : status === 'FAILED' ? 100 : 5;
      if (status === 'COMPLETED' && response.data?.response) {
        const videoUrl = Array.isArray(response.data.response) ? response.data.response[0] : String(response.data.response);
        return { id: task.id, status: 'completed', progress: 100, providerTaskStatus: status, videoUrl };
      }
      if (status === 'FAILED') {
        return { id: task.id, status: 'failed', progress: 100, providerTaskStatus: status, errorCode: 'VIDEO_TASK_FAILED', errorReason: response.data?.failed_reason ?? 'Kling 视频生成失败' };
      }
      if (status === 'EXPIRED') {
        return { id: task.id, status: 'failed', progress: 100, providerTaskStatus: status, errorCode: 'TASK_TIMEOUT', errorReason: 'Kling 任务已过期' };
      }
      return { id: task.id, status: 'polling', progress, providerTaskStatus: status };
    } catch (error) {
      if (error instanceof HttpError) {
        return { id: task.id, status: 'failed', progress: 100, errorCode: error.apiError.code, errorReason: error.apiError.message };
      }
      throw error;
    }
  },
};