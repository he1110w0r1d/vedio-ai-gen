import { getAsset } from '../services/assetService.js';
import { readLocalAssetFile } from '../services/fileStorageService.js';
import type { ImageGenerationInput, VideoGenerationInput } from '../types/generation.js';
import type { ProviderRecord } from '../types/provider.js';
import type { GenerationTaskRecord } from '../types/task.js';
import { HttpError, invalidSourceImage, modelNotSupported, sourceImageNotAccessible, sourceImageTooLarge, videoTaskFailed } from '../utils/errors.js';
import { createId } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import type { ImageGenerationResult, ProviderAdapter, VideoGenerationResult } from './types.js';
import {
  endpoint,
  fetchJson,
  mapWanxiangError,
  normalizeStatus,
  taskEndpoint,
  type WanxiangCreateResponse,
  type WanxiangTaskResponse,
} from './wanxiangShared.js';

const providerName = '阿里云百炼 万相图生视频';
export const defaultWanxiangI2VModel = 'wan2.6-i2v-flash';
const createTimeoutMs = 60000; // I2V with base64 upload might take longer
const pollTimeoutMs = 15000;
const testConnectionTimeoutMs = 15000;
const MAX_BASE64_BYTES = 20 * 1024 * 1024; // 20MB limit for wan2.6

export type WanxiangI2VResolvedParams = {
  requestedDuration: number;
  resolvedDuration: number;
  resolution: string;
  promptExtend: boolean;
  watermark: boolean;
};

export function mapI2VParamsToWanxiang(input: VideoGenerationInput): WanxiangI2VResolvedParams {
  const duration = Number(input.params?.duration ?? 5);
  const resolvedDuration = Math.max(2, Math.min(Number.isFinite(duration) ? Math.round(duration) : 5, 15));
  const resolutionInput = String(input.params?.resolution ?? '720p').toUpperCase();
  const resolution = resolutionInput.includes('1080') ? '1080P' : '720P';
  return {
    requestedDuration: duration,
    resolvedDuration,
    resolution,
    promptExtend: true,
    watermark: false,
  };
}

function resolveModel(provider: ProviderRecord, inputModel?: string) {
  return inputModel || provider.defaultModel || defaultWanxiangI2VModel;
}

function buildPrompt(input: VideoGenerationInput) {
  const parts = [(input.prompt || '').trim()];
  if (input.params?.camera) parts.push(`镜头运动：${input.params.camera}`);
  if (input.params?.style) parts.push(`风格：${input.params.style}`);
  if (input.params?.motion !== undefined) parts.push(`运动强度：${input.params.motion}`);
  return parts.filter(Boolean).join('\n');
}

async function resolveImageUrl(input: VideoGenerationInput): Promise<{ url: string; sourceImageAssetId?: string; inputImageMode: string; inputAssetStorageType?: string; inputAssetPublicUrlUsed?: boolean; inputAssetFallbackMode?: string; inputAssetAccessMode?: string; inputAssetPresignedUrlUsed?: boolean; inputAssetPresignedUrlExpiresAt?: string }> {
  const sourceImageAssetId = input.params?.sourceImageAssetId as string | undefined;
  const sourceImageUrl = input.params?.sourceImageUrl as string | undefined;

  if (sourceImageAssetId) {
    const asset = await getAsset(sourceImageAssetId);
    if (asset.type !== 'image') {
      throw invalidSourceImage('所选资产不是图片类型');
    }
    
    if (asset.storageType === 'local' && asset.localPath) {
      const file = await readLocalAssetFile(asset.localPath);
      if (!file) throw sourceImageNotAccessible('本地图片文件无法读取');
      if (file.sizeBytes > MAX_BASE64_BYTES) throw sourceImageTooLarge(`图片文件过大（超过 20MB限制）`);
      
      const mimeType = asset.mimeType || 'image/png';
      const base64 = file.buffer.toString('base64');
      return {
        url: `data:${mimeType};base64,${base64}`,
        sourceImageAssetId,
        inputImageMode: 'base64',
        inputAssetStorageType: 'local',
        inputAssetFallbackMode: 'base64',
      };
    }
    
    if (asset.storageType === 'remote' && asset.url) {
      return { url: asset.url, sourceImageAssetId, inputImageMode: 'publicUrl', inputAssetStorageType: 'remote', inputAssetPublicUrlUsed: true };
    }
    
    if (asset.storageType === 'object') {
      const { readDb } = await import('../services/storageService.js');
      const db = await readDb();
      const accessMode = db.storageConfig.accessMode;

      if (accessMode === 'public') {
        if (asset.publicUrl) return { url: asset.publicUrl, sourceImageAssetId, inputImageMode: 'publicUrl', inputAssetStorageType: 'object', inputAssetPublicUrlUsed: true, inputAssetAccessMode: 'public', inputAssetFallbackMode: 'publicUrl' };
        if (asset.url) return { url: asset.url, sourceImageAssetId, inputImageMode: 'publicUrl', inputAssetStorageType: 'object', inputAssetPublicUrlUsed: true, inputAssetAccessMode: 'public', inputAssetFallbackMode: 'publicUrl' };
      }
      
      if (accessMode === 'private-presigned' && asset.objectKey) {
        const { createPresignedUrl } = await import('../services/fileStorageService.js');
        const expiresIn = db.storageConfig.providerInputUrlExpiresInSeconds ?? 3600;
        const tempUrl = await createPresignedUrl({ objectKey: asset.objectKey, expiresInSeconds: expiresIn });
        return {
          url: tempUrl,
          sourceImageAssetId,
          inputImageMode: 'publicUrl',
          inputAssetStorageType: 'object',
          inputAssetAccessMode: 'private-presigned',
          inputAssetPresignedUrlUsed: true,
          inputAssetPresignedUrlExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
          inputAssetFallbackMode: 'presignedUrl',
        };
      }
    }
    
    throw sourceImageNotAccessible('当前图片仅存储在本地，且无有效路径可供读取转码。请使用公网图片 URL 或后续接入对象存储。');
  }

  if (sourceImageUrl) {
    if (sourceImageUrl.includes('127.0.0.1') || sourceImageUrl.includes('localhost')) {
      throw sourceImageNotAccessible('当前提供的 URL 是本地地址，供应商无法访问。请使用公网图片 URL。');
    }
    return {
      url: sourceImageUrl,
      inputImageMode: 'publicUrl',
      inputAssetStorageType: 'remote',
      inputAssetPublicUrlUsed: true,
    };
  }

  throw invalidSourceImage('必须提供 sourceImageAssetId 或 sourceImageUrl');
}

function createTask(
  provider: ProviderRecord,
  input: VideoGenerationInput,
  providerTaskId: string,
  imgData: { sourceImageAssetId?: string; inputImageMode: string },
  providerTaskStatus?: string
): GenerationTaskRecord {
  const now = nowIso();
  const mapped = mapI2VParamsToWanxiang(input);
  return {
    id: createId('task'),
    type: 'video',
    mode: 'I2V',
    status: 'polling',
    progress: 5,
    title: '阿里云百炼万相 I2V 图生视频',
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
      sourceImageAssetId: imgData.sourceImageAssetId,
      inputImageMode: imgData.inputImageMode,
      inputAssetStorageType: (imgData as any).inputAssetStorageType,
      inputAssetPublicUrlUsed: (imgData as any).inputAssetPublicUrlUsed,
      inputAssetFallbackMode: (imgData as any).inputAssetFallbackMode,
      inputAssetAccessMode: (imgData as any).inputAssetAccessMode,
      inputAssetPresignedUrlUsed: (imgData as any).inputAssetPresignedUrlUsed,
      inputAssetPresignedUrlExpiresAt: (imgData as any).inputAssetPresignedUrlExpiresAt,
      requestedDuration: mapped.requestedDuration,
      resolvedDuration: mapped.resolvedDuration,
      resolution: mapped.resolution,
      promptExtend: mapped.promptExtend,
      watermark: mapped.watermark,
    },
  };
}

export const aliyunWanxiangI2VAdapter: ProviderAdapter = {
  id: 'aliyun-wanxiang-i2v',
  name: providerName,
  capabilities: ['i2v', 'asyncTask', 'polling'],

  async testConnection(provider) {
    try {
      await fetchJson(taskEndpoint(provider, '__connection_test__'), provider, { method: 'GET' }, testConnectionTimeoutMs, providerName).catch((error) => {
        if (error.apiError?.code === 'INVALID_API_KEY') throw error;
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
    throw modelNotSupported(providerName, '该 Provider 仅用于图生视频');
  },

  async generateVideoT2V(_provider: ProviderRecord, _input: VideoGenerationInput): Promise<VideoGenerationResult> {
    throw modelNotSupported(providerName, '该 Provider 仅用于图生视频，文生视频请使用 T2V Provider');
  },

  async generateVideoI2V(provider: ProviderRecord, input: VideoGenerationInput): Promise<VideoGenerationResult> {
    const mapped = mapI2VParamsToWanxiang(input);
    const imgData = await resolveImageUrl(input);

    try {
      const response = await fetchJson<WanxiangCreateResponse>(endpoint(provider), provider, {
        method: 'POST',
        headers: { 'X-DashScope-Async': 'enable' },
        body: JSON.stringify({
          model: resolveModel(provider, input.model),
          input: {
            prompt: buildPrompt(input),
            img_url: imgData.url,
          },
          parameters: {
            duration: mapped.resolvedDuration,
            resolution: mapped.resolution,
            prompt_extend: mapped.promptExtend,
            watermark: mapped.watermark,
          },
        }),
      }, createTimeoutMs, providerName);

      const providerTaskId = response.output?.task_id;
      if (!providerTaskId) throw videoTaskFailed(providerName, '供应商未返回视频任务 ID', response.code);

      return { task: createTask(provider, input, providerTaskId, imgData, response.output?.task_status) };
    } catch (error) {
      mapWanxiangError(error, providerName);
    }
  },

  async generateVideoR2V(_provider: ProviderRecord, _input: VideoGenerationInput): Promise<VideoGenerationResult> {
    throw modelNotSupported(providerName, '本阶段只接入真实 I2V，R2V 仍为 Mock');
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
