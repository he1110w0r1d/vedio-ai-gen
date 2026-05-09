/**
 * aliyunHappyHorseI2VAdapter.ts
 *
 * HappyHorse-1.0 图生视频 Adapter (基于首帧)
 * 阿里云百炼 HappyHorse I2V: 以首帧图片为基础，通过文本描述引导生成视频
 *
 * API Ref: https://help.aliyun.com/zh/model-studio/happyhorse-image-to-video-api-reference
 */

import { getAsset } from '../services/assetService.js';
import { readLocalAssetFile } from '../services/fileStorageService.js';
import type { ImageGenerationInput, VideoGenerationInput } from '../types/generation.js';
import type { ProviderRecord } from '../types/provider.js';
import type { GenerationTaskRecord } from '../types/task.js';
import { createId } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import {
  HttpError,
  invalidSourceImage,
  modelNotSupported,
  sourceImageNotAccessible,
  sourceImageTooLarge,
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

const providerName = '阿里云百炼 HappyHorse 图生视频';
export const defaultHappyHorseI2VModel = 'happyhorse-1.0-i2v';
const createTimeoutMs = 60000;
const pollTimeoutMs = 15000;
const testConnectionTimeoutMs = 15000;
const MAX_BASE64_BYTES = 20 * 1024 * 1024; // 20MB

export type HappyHorseI2VResolvedParams = {
  requestedDuration: number;
  resolvedDuration: number;
  resolution: string;
  watermark: boolean;
  seed?: number;
};

export function mapHappyHorseI2VParams(input: VideoGenerationInput): HappyHorseI2VResolvedParams {
  const duration = Number(input.params?.duration ?? 5);
  const resolvedDuration = Math.max(3, Math.min(Number.isFinite(duration) ? Math.round(duration) : 5, 15));
  const resolutionInput = String(input.params?.resolution ?? '1080p').toUpperCase();
  const resolution = resolutionInput.includes('720') ? '720P' : '1080P';
  return {
    requestedDuration: duration,
    resolvedDuration,
    resolution,
    watermark: false,
    seed: input.params?.seed as number | undefined,
  };
}

function resolveModel(provider: ProviderRecord, inputModel?: string) {
  return inputModel || provider.defaultModel || defaultHappyHorseI2VModel;
}

/** Resolve source image URL (public, base64, or object storage) */
async function resolveImageUrl(input: VideoGenerationInput): Promise<{
  url: string;
  sourceImageAssetId?: string;
  inputImageMode: string;
  inputAssetStorageType?: string;
  inputAssetPublicUrlUsed?: boolean;
  inputAssetFallbackMode?: string;
  inputAssetAccessMode?: string;
  inputAssetPresignedUrlUsed?: boolean;
  inputAssetPresignedUrlExpiresAt?: string;
}> {
  const sourceImageAssetId = input.params?.sourceImageAssetId as string | undefined;
  const sourceImageUrl = input.params?.sourceImageUrl as string | undefined;

  if (sourceImageAssetId) {
    const asset = await getAsset(sourceImageAssetId);
    if (asset.type !== 'image') {
      throw sourceImageNotAccessible(`源素材类型为 ${asset.type}，图生视频需要图片资产`);
    }

    // Local storage → base64
    if (asset.storageType === 'local' && asset.localPath) {
      const file = await readLocalAssetFile(asset.localPath);
      if (!file) throw sourceImageNotAccessible('本地图片文件无法读取');
      if (file.sizeBytes > MAX_BASE64_BYTES) throw sourceImageTooLarge('图片过大（超过 20MB 限制）');
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

    // Remote storage → public URL
    if (asset.storageType === 'remote' && asset.url) {
      return {
        url: asset.url,
        sourceImageAssetId,
        inputImageMode: 'publicUrl',
        inputAssetStorageType: 'remote',
        inputAssetPublicUrlUsed: true,
      };
    }

    // Object storage
    if (asset.storageType === 'object') {
      const { readDb } = await import('../services/storageService.js');
      const db = await readDb();
      const accessMode = db.storageConfig.accessMode;

      if (accessMode === 'public') {
        if (asset.publicUrl) return {
          url: asset.publicUrl, sourceImageAssetId, inputImageMode: 'publicUrl', inputAssetStorageType: 'object',
          inputAssetPublicUrlUsed: true, inputAssetAccessMode: 'public', inputAssetFallbackMode: 'publicUrl',
        };
        if (asset.url) return {
          url: asset.url, sourceImageAssetId, inputImageMode: 'publicUrl', inputAssetStorageType: 'object',
          inputAssetPublicUrlUsed: true, inputAssetAccessMode: 'public', inputAssetFallbackMode: 'publicUrl',
        };
      }

      if (accessMode === 'private-presigned' && asset.objectKey) {
        const { createPresignedUrl } = await import('../services/fileStorageService.js');
        const expiresIn = db.storageConfig.providerInputUrlExpiresInSeconds ?? 3600;
        const tempUrl = await createPresignedUrl({ objectKey: asset.objectKey, expiresInSeconds: expiresIn });
        return {
          url: tempUrl, sourceImageAssetId, inputImageMode: 'publicUrl', inputAssetStorageType: 'object',
          inputAssetAccessMode: 'private-presigned', inputAssetPresignedUrlUsed: true,
          inputAssetPresignedUrlExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
          inputAssetFallbackMode: 'presignedUrl',
        };
      }
    }

    // Last resort: try local base64
    if (asset.localPath) {
      const file = await readLocalAssetFile(asset.localPath);
      if (!file) throw sourceImageNotAccessible('本地图片文件无法读取');
      if (file.sizeBytes > MAX_BASE64_BYTES) throw sourceImageTooLarge('图片过大（超过 20MB 限制）');
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

    throw sourceImageNotAccessible('图片无法读取，请确认图片资产完整。');
  }

  if (sourceImageUrl) {
    if (sourceImageUrl.includes('127.0.0.1') || sourceImageUrl.includes('localhost')) {
      throw sourceImageNotAccessible('当前提供的 URL 是本地地址，供应商无法访问。请使用公网 URL。');
    }
    return { url: sourceImageUrl, inputImageMode: 'publicUrl', inputAssetStorageType: 'remote', inputAssetPublicUrlUsed: true };
  }

  throw invalidSourceImage('图生视频必须提供源图片（sourceImageAssetId 或 sourceImageUrl）');
}

function createTask(
  provider: ProviderRecord,
  input: VideoGenerationInput,
  providerTaskId: string,
  imgData: Awaited<ReturnType<typeof resolveImageUrl>>,
  providerTaskStatus?: string,
): GenerationTaskRecord {
  const now = nowIso();
  const mapped = mapHappyHorseI2VParams(input);
  return {
    id: createId('task'),
    type: 'video',
    mode: 'I2V',
    status: 'polling',
    progress: 5,
    title: '阿里云百炼 HappyHorse I2V 图生视频（首帧）',
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
      inputAssetStorageType: imgData.inputAssetStorageType,
      inputAssetPublicUrlUsed: imgData.inputAssetPublicUrlUsed,
      inputAssetFallbackMode: imgData.inputAssetFallbackMode,
      inputAssetAccessMode: imgData.inputAssetAccessMode,
      inputAssetPresignedUrlUsed: imgData.inputAssetPresignedUrlUsed,
      inputAssetPresignedUrlExpiresAt: imgData.inputAssetPresignedUrlExpiresAt,
      requestedDuration: mapped.requestedDuration,
      resolvedDuration: mapped.resolvedDuration,
      resolution: mapped.resolution,
      watermark: mapped.watermark,
      seed: mapped.seed,
    },
  };
}

export const aliyunHappyHorseI2VAdapter: ProviderAdapter = {
  id: 'aliyun-happyhorse-i2v',
  name: providerName,
  capabilities: ['i2v', 'asyncTask', 'polling'],

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
    throw modelNotSupported(providerName, '该 Provider 仅用于图生视频');
  },

  async generateVideoT2V(_provider: ProviderRecord, _input: VideoGenerationInput): Promise<VideoGenerationResult> {
    throw modelNotSupported(providerName, '该 Provider 仅用于图生视频，文生视频请使用 HappyHorse T2V Provider');
  },

  async generateVideoI2V(provider: ProviderRecord, input: VideoGenerationInput): Promise<VideoGenerationResult> {
    const mapped = mapHappyHorseI2VParams(input);
    const imgData = await resolveImageUrl(input);

    // HappyHorse I2V uses media array with first_frame type
    const apiInput: Record<string, unknown> = {
      prompt: (input.prompt || '').trim(),
      media: [{ type: 'first_frame', url: imgData.url }],
    };

    const parameters: Record<string, unknown> = {
      resolution: mapped.resolution,
      duration: mapped.resolvedDuration,
      watermark: mapped.watermark,
    };
    if (mapped.seed !== undefined) parameters.seed = mapped.seed;

    try {
      const response = await fetchJson<WanxiangCreateResponse>(endpoint(provider), provider, {
        method: 'POST',
        headers: { 'X-DashScope-Async': 'enable' },
        body: JSON.stringify({
          model: resolveModel(provider, input.model),
          input: apiInput,
          parameters,
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
    throw modelNotSupported(providerName, '该 Provider 仅用于图生视频，参考生视频请使用 HappyHorse R2V Provider');
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
