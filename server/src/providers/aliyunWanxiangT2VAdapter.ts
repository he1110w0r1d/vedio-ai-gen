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

const providerName = '阿里云百炼 万相文生视频';
export const defaultWanxiangT2VModel = 'wan2.7-t2v';
const createTimeoutMs = 30000;
const pollTimeoutMs = 15000;
const testConnectionTimeoutMs = 15000;

export type WanxiangT2VResolvedParams = {
  requestedDuration: number;
  resolvedDuration: number;
  requestedAspectRatio: string;
  resolvedSize: string;
  resolution: string;
  promptExtend: boolean;
  watermark: boolean;
  fallbackReason?: string;
};

export function mapT2VParamsToWanxiang(input: VideoGenerationInput): WanxiangT2VResolvedParams {
  const duration = Number(input.params?.duration ?? 6);
  const resolvedDuration = Math.max(2, Math.min(Number.isFinite(duration) ? Math.round(duration) : 6, 15));
  const aspect = String(input.params?.aspect ?? input.params?.aspectRatio ?? '16:9');
  const resolutionInput = String(input.params?.resolution ?? '720p').toUpperCase();
  const resolution = resolutionInput.includes('1080') ? '1080P' : '720P';
  const sizeMap: Record<string, string> = {
    '16:9': resolution === '1080P' ? '1920*1080' : '1280*720',
    '9:16': resolution === '1080P' ? '1080*1920' : '720*1280',
    '1:1': resolution === '1080P' ? '1080*1080' : '720*720',
  };
  return {
    requestedDuration: duration,
    resolvedDuration,
    requestedAspectRatio: aspect,
    resolvedSize: sizeMap[aspect] ?? sizeMap['16:9'],
    resolution,
    promptExtend: true,
    watermark: false,
    fallbackReason: sizeMap[aspect] ? undefined : `未知画幅 ${aspect} 已回退为 16:9`,
  };
}

function resolveModel(provider: ProviderRecord, inputModel?: string) {
  return inputModel || provider.defaultModel || defaultWanxiangT2VModel;
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
  const mapped = mapT2VParamsToWanxiang(input);
  return {
    id: createId('task'),
    type: 'video',
    mode: 'T2V',
    status: 'polling',
    progress: 5,
    title: '阿里云百炼万相 T2V 文生视频',
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
      resolvedSize: mapped.resolvedSize,
      resolution: mapped.resolution,
      promptExtend: mapped.promptExtend,
      watermark: mapped.watermark,
      fallbackReason: mapped.fallbackReason,
    },
  };
}

export const aliyunWanxiangT2VAdapter: ProviderAdapter = {
  id: 'aliyun-wanxiang-t2v',
  name: providerName,
  capabilities: ['t2v', 'asyncTask', 'polling'],

  async testConnection(provider) {
    try {
      await fetchJson(taskEndpoint(provider, '__connection_test__'), provider, { method: 'GET' }, testConnectionTimeoutMs, providerName).catch((error) => {
        if (error instanceof HttpError && error.apiError.code === 'INVALID_API_KEY') throw error;
      });
      return {
        ok: true,
        message: '百炼 API Key 已通过轻量连接校验。该测试不创建视频任务，余额、权限、模型可用性和内容审核仍会在真实生成时确认。',
        capabilities: this.capabilities,
      };
    } catch (error) {
      mapWanxiangError(error, providerName);
    }
  },

  async generateImage(_provider: ProviderRecord, _input: ImageGenerationInput): Promise<ImageGenerationResult> {
    throw modelNotSupported(providerName, '阿里云百炼万相 T2V Adapter 不支持图片生成');
  },

  async generateVideoT2V(provider: ProviderRecord, input: VideoGenerationInput): Promise<VideoGenerationResult> {
    const mapped = mapT2VParamsToWanxiang(input);
    try {
      const response = await fetchJson<WanxiangCreateResponse>(endpoint(provider), provider, {
        method: 'POST',
        headers: { 'X-DashScope-Async': 'enable' },
        body: JSON.stringify({
          model: resolveModel(provider, input.model),
          input: { prompt: buildPrompt(input) },
          parameters: {
            duration: mapped.resolvedDuration,
            resolution: mapped.resolution,
            size: mapped.resolvedSize,
            prompt_extend: mapped.promptExtend,
            watermark: mapped.watermark,
          },
        }),
      }, createTimeoutMs, providerName);
      const providerTaskId = response.output?.task_id;
      if (!providerTaskId) throw videoTaskFailed(providerName, '供应商未返回视频任务 ID', response.code);
      return { task: createTask(provider, input, providerTaskId, response.output?.task_status) };
    } catch (error) {
      mapWanxiangError(error, providerName);
    }
  },

  async generateVideoI2V(_provider: ProviderRecord, _input: VideoGenerationInput): Promise<VideoGenerationResult> {
    throw modelNotSupported(providerName, '本阶段只接入真实 T2V，I2V 仍为 Mock');
  },

  async generateVideoR2V(_provider: ProviderRecord, _input: VideoGenerationInput): Promise<VideoGenerationResult> {
    throw modelNotSupported(providerName, '本阶段只接入真实 T2V，R2V 仍为 Mock');
  },

  async getTaskStatus(provider: ProviderRecord, task: GenerationTaskRecord) {
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
