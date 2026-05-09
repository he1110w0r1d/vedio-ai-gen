/**
 * aliyunHappyHorseT2VAdapter.ts
 *
 * HappyHorse-1.0 文生视频 Adapter
 * 阿里云百炼 HappyHorse T2V: 输入文本提示词生成物理真实、运动流畅的视频
 *
 * API Ref: https://help.aliyun.com/zh/model-studio/happyhorse-text-to-video-api-reference
 */

import type { ImageGenerationInput, VideoGenerationInput } from '../types/generation.js';
import type { ProviderRecord } from '../types/provider.js';
import type { GenerationTaskRecord } from '../types/task.js';
import { createId } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import {
  HttpError,
  modelNotSupported,
  videoTaskFailed,
} from '../utils/errors.js';
import type { ImageGenerationResult, ProviderAdapter, ProviderTaskStatusResult, VideoGenerationResult } from './types.js';
import {
  endpoint,
  fetchJson,
  mapWanxiangError,
  normalizeStatus,
  taskEndpoint,
  type WanxiangCreateResponse,
  type WanxiangTaskResponse,
} from './wanxiangShared.js';

const providerName = '阿里云百炼 HappyHorse 文生视频';
export const defaultHappyHorseT2VModel = 'happyhorse-1.0-t2v';
const createTimeoutMs = 30000;
const pollTimeoutMs = 15000;
const testConnectionTimeoutMs = 15000;

export type HappyHorseT2VResolvedParams = {
  requestedDuration: number;
  resolvedDuration: number;
  requestedRatio: string;
  resolvedSize: string;
  resolution: string;
  watermark: boolean;
  seed?: number;
};

export function mapHappyHorseT2VParams(input: VideoGenerationInput): HappyHorseT2VResolvedParams {
  const duration = Number(input.params?.duration ?? 5);
  const resolvedDuration = Math.max(3, Math.min(Number.isFinite(duration) ? Math.round(duration) : 5, 15));
  const ratio = String(input.params?.aspect ?? input.params?.aspectRatio ?? '16:9');
  const resolutionInput = String(input.params?.resolution ?? '1080p').toUpperCase();
  const resolution = resolutionInput.includes('720') ? '720P' : '1080P';
  // HappyHorse supports: 16:9, 9:16, 1:1, 4:3, 3:4
  const sizeMap: Record<string, { w: number; h: number }> = {
    '16:9': resolution === '720P' ? { w: 1280, h: 720 } : { w: 1920, h: 1080 },
    '9:16': resolution === '720P' ? { w: 720, h: 1280 } : { w: 1080, h: 1920 },
    '1:1':  resolution === '720P' ? { w: 720, h: 720 }  : { w: 1080, h: 1080 },
    '4:3':  resolution === '720P' ? { w: 960, h: 720 }   : { w: 1440, h: 1080 },
    '3:4':  resolution === '720P' ? { w: 720, h: 960 }   : { w: 1080, h: 1440 },
  };
  const size = sizeMap[ratio] ?? sizeMap['16:9'];
  return {
    requestedDuration: duration,
    resolvedDuration,
    requestedRatio: ratio,
    resolvedSize: `${size.w}*${size.h}`,
    resolution,
    watermark: false,
    seed: input.params?.seed as number | undefined,
  };
}

function resolveModel(provider: ProviderRecord, inputModel?: string) {
  return inputModel || provider.defaultModel || defaultHappyHorseT2VModel;
}

function buildPrompt(input: VideoGenerationInput) {
  const parts = [input.prompt.trim()];
  if (input.params?.camera) parts.push(`镜头运动：${input.params.camera}`);
  if (input.params?.style) parts.push(`风格：${input.params.style}`);
  if (input.params?.motion !== undefined) parts.push(`运动强度：${input.params.motion}`);
  return parts.filter(Boolean).join('\n');
}

function createTask(provider: ProviderRecord, input: VideoGenerationInput, providerTaskId: string, providerTaskStatus?: string): GenerationTaskRecord {
  const now = nowIso();
  const mapped = mapHappyHorseT2VParams(input);
  return {
    id: createId('task'),
    type: 'video',
    mode: 'T2V',
    status: 'polling',
    progress: 5,
    title: '阿里云百炼 HappyHorse T2V 文生视频',
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
      requestedRatio: mapped.requestedRatio,
      resolvedSize: mapped.resolvedSize,
      resolution: mapped.resolution,
      watermark: mapped.watermark,
      seed: mapped.seed,
    },
  };
}

export const aliyunHappyHorseT2VAdapter: ProviderAdapter = {
  id: 'aliyun-happyhorse-t2v',
  name: providerName,
  capabilities: ['t2v', 'asyncTask', 'polling'],

  async testConnection(provider) {
    try {
      await fetchJson(taskEndpoint(provider, '__connection_test__'), provider, { method: 'GET' }, testConnectionTimeoutMs, providerName).catch((error) => {
        if (error instanceof HttpError && error.apiError.code === 'INVALID_API_KEY') throw error;
      });
      return {
        ok: true,
        message: 'HappyHorse API Key 已通过轻量连接校验。该测试不创建视频任务，余额、权限、模型可用性和内容审核仍会在真实生成时确认。',
        capabilities: this.capabilities,
      };
    } catch (error) {
      mapWanxiangError(error, providerName);
    }
  },

  async generateImage(_provider: ProviderRecord, _input: ImageGenerationInput): Promise<ImageGenerationResult> {
    throw modelNotSupported(providerName, '该 Provider 仅用于文生视频');
  },

  async generateVideoT2V(provider: ProviderRecord, input: VideoGenerationInput): Promise<VideoGenerationResult> {
    const mapped = mapHappyHorseT2VParams(input);
    const prompt = buildPrompt(input);

    const body: Record<string, unknown> = {
      model: resolveModel(provider, input.model),
      input: { prompt },
      parameters: {
        resolution: mapped.resolution,
        ratio: mapped.requestedRatio,
        duration: mapped.resolvedDuration,
        watermark: mapped.watermark,
      },
    };
    if (mapped.seed !== undefined) {
      (body.parameters as Record<string, unknown>).seed = mapped.seed;
    }

    try {
      const response = await fetchJson<WanxiangCreateResponse>(endpoint(provider), provider, {
        method: 'POST',
        headers: { 'X-DashScope-Async': 'enable' },
        body: JSON.stringify(body),
      }, createTimeoutMs, providerName);

      const providerTaskId = response.output?.task_id;
      if (!providerTaskId) throw videoTaskFailed(providerName, '供应商未返回视频任务 ID', response.code);

      return { task: createTask(provider, input, providerTaskId, response.output?.task_status) };
    } catch (error) {
      mapWanxiangError(error, providerName);
    }
  },

  async generateVideoI2V(_provider: ProviderRecord, _input: VideoGenerationInput): Promise<VideoGenerationResult> {
    throw modelNotSupported(providerName, '该 Provider 仅用于文生视频，图生视频请使用 HappyHorse I2V Provider');
  },

  async generateVideoR2V(_provider: ProviderRecord, _input: VideoGenerationInput): Promise<VideoGenerationResult> {
    throw modelNotSupported(providerName, '该 Provider 仅用于文生视频，参考生视频请使用 HappyHorse R2V Provider');
  },

  async getTaskStatus(provider: ProviderRecord, task: GenerationTaskRecord): Promise<ProviderTaskStatusResult> {
    if (!task.providerTaskId) return { id: task.id, status: task.status, progress: task.progress };
    try {
      const response = await fetchJson<WanxiangTaskResponse>(taskEndpoint(provider, task.providerTaskId), provider, { method: 'GET' }, pollTimeoutMs, providerName);
      return normalizeStatus(response, task);
    } catch (error) {
      if (error instanceof HttpError) {
        return {
          id: task.id,
          status: 'failed',
          progress: 100,
          errorCode: error.apiError.code,
          errorReason: error.apiError.message,
        };
      }
      throw error;
    }
  },
};
