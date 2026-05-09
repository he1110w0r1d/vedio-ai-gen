/**
 * aliyunHappyHorseR2VAdapter.ts
 *
 * HappyHorse-1.0 参考生视频 Adapter
 * 阿里云百炼 HappyHorse R2V: 传入参考图像，通过文本提示词将主体角色融合生成视频
 *
 * API Ref: https://help.aliyun.com/zh/model-studio/happyhorse-reference-to-video-api-reference
 */

import { getAsset } from '../services/assetService.js';
import { readLocalAssetFile } from '../services/fileStorageService.js';
import type { ImageGenerationInput, VideoGenerationInput } from '../types/generation.js';
import type { ProviderRecord } from '../types/provider.js';
import type { GenerationTaskRecord } from '../types/task.js';
import {
  HttpError,
  invalidReferenceAsset,
  modelNotSupported,
  referenceAssetNotAccessible,
  referenceAssetTooLarge,
  referenceAssetUnsupportedType,
  videoTaskFailed,
} from '../utils/errors.js';
import { createId } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
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

const providerName = '阿里云百炼 HappyHorse 参考生视频';
export const defaultHappyHorseR2VModel = 'happyhorse-1.0-r2v';
const createTimeoutMs = 60000;
const pollTimeoutMs = 15000;
const testConnectionTimeoutMs = 15000;
const MAX_BASE64_BYTES = 20 * 1024 * 1024; // 20MB

export type HappyHorseR2VResolvedParams = {
  requestedDuration: number;
  resolvedDuration: number;
  requestedRatio: string;
  resolution: string;
  watermark: boolean;
  seed?: number;
};

export function mapHappyHorseR2VParams(input: VideoGenerationInput): HappyHorseR2VResolvedParams {
  const duration = Number(input.params?.duration ?? 5);
  const resolvedDuration = Math.max(3, Math.min(Number.isFinite(duration) ? Math.round(duration) : 5, 15));
  const ratio = String(input.params?.aspect ?? input.params?.aspectRatio ?? '16:9');
  const resolutionInput = String(input.params?.resolution ?? '1080p').toUpperCase();
  const resolution = resolutionInput.includes('720') ? '720P' : '1080P';
  return {
    requestedDuration: duration,
    resolvedDuration,
    requestedRatio: ratio,
    resolution,
    watermark: false,
    seed: input.params?.seed as number | undefined,
  };
}

function resolveModel(provider: ProviderRecord, inputModel?: string) {
  return inputModel || provider.defaultModel || defaultHappyHorseR2VModel;
}

/** Wrap prompt with [Image 1] reference for HappyHorse R2V format */
export function ensureImageReference(prompt: string): string {
  const trimmed = prompt.trim();
  // If prompt already uses [Image n] format, return as-is
  if (/\[Image\s*\d+\]/i.test(trimmed)) return trimmed;
  // Prepend reference for single image
  return `[Image 1] ${trimmed}`;
}

type ResolvedReference = {
  referenceAssetId?: string;
  referenceType: 'image';
  referenceInputMode: 'base64' | 'publicUrl';
  referenceUrl: string;
  inputAssetStorageType?: string;
  inputAssetPublicUrlUsed?: boolean;
  inputAssetFallbackMode?: string;
  inputAssetAccessMode?: string;
  inputAssetPresignedUrlUsed?: boolean;
  inputAssetPresignedUrlExpiresAt?: string;
};

async function resolveReferenceAsset(input: VideoGenerationInput): Promise<ResolvedReference> {
  const referenceAssetId = (input.params?.r2vCharacterAssetId || input.params?.referenceAssetId || input.params?.sourceImageAssetId) as string | undefined;
  const referenceUrl = input.params?.referenceUrl as string | undefined;

  if (referenceAssetId) {
    const asset = await getAsset(referenceAssetId);

    if (asset.type === 'image') {
      if (asset.storageType === 'local' && asset.localPath) {
        const file = await readLocalAssetFile(asset.localPath);
        if (!file) throw referenceAssetNotAccessible('本地参考图片文件无法读取');
        if (file.sizeBytes > MAX_BASE64_BYTES) throw referenceAssetTooLarge('参考图片过大（超过 20MB 限制）');
        const mimeType = asset.mimeType || 'image/png';
        const base64 = file.buffer.toString('base64');
        return {
          referenceAssetId,
          referenceType: 'image',
          referenceInputMode: 'base64',
          referenceUrl: `data:${mimeType};base64,${base64}`,
          inputAssetStorageType: 'local',
          inputAssetFallbackMode: 'base64',
        };
      }
      if (asset.storageType === 'remote' && asset.url) {
        return { referenceAssetId, referenceType: 'image', referenceInputMode: 'publicUrl', referenceUrl: asset.url, inputAssetStorageType: 'remote', inputAssetPublicUrlUsed: true };
      }

      if (asset.storageType === 'object') {
        const { readDb } = await import('../services/storageService.js');
        const db = await readDb();
        const accessMode = db.storageConfig.accessMode;

        if (accessMode === 'public') {
          if (asset.publicUrl) return { referenceAssetId, referenceType: 'image', referenceInputMode: 'publicUrl', referenceUrl: asset.publicUrl, inputAssetStorageType: 'object', inputAssetPublicUrlUsed: true, inputAssetAccessMode: 'public', inputAssetFallbackMode: 'publicUrl' };
          if (asset.url) return { referenceAssetId, referenceType: 'image', referenceInputMode: 'publicUrl', referenceUrl: asset.url, inputAssetStorageType: 'object', inputAssetPublicUrlUsed: true, inputAssetAccessMode: 'public', inputAssetFallbackMode: 'publicUrl' };
        }

        if (accessMode === 'private-presigned' && asset.objectKey) {
          const { createPresignedUrl } = await import('../services/fileStorageService.js');
          const expiresIn = db.storageConfig.providerInputUrlExpiresInSeconds ?? 3600;
          const tempUrl = await createPresignedUrl({ objectKey: asset.objectKey, expiresInSeconds: expiresIn });
          return {
            referenceAssetId, referenceType: 'image', referenceInputMode: 'publicUrl', referenceUrl: tempUrl,
            inputAssetStorageType: 'object', inputAssetAccessMode: 'private-presigned',
            inputAssetPresignedUrlUsed: true,
            inputAssetPresignedUrlExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
            inputAssetFallbackMode: 'presignedUrl',
          };
        }
      }

      if (asset.localPath) {
        const file = await readLocalAssetFile(asset.localPath);
        if (!file) throw referenceAssetNotAccessible('本地参考图片文件无法读取');
        if (file.sizeBytes > MAX_BASE64_BYTES) throw referenceAssetTooLarge('参考图片过大（超过 20MB 限制）');
        const mimeType = asset.mimeType || 'image/png';
        const base64 = file.buffer.toString('base64');
        return {
          referenceAssetId, referenceType: 'image', referenceInputMode: 'base64',
          referenceUrl: `data:${mimeType};base64,${base64}`,
          inputAssetStorageType: 'local', inputAssetFallbackMode: 'base64',
        };
      }
      throw referenceAssetNotAccessible('参考图片无法读取，请确认图片资产完整。');
    }

    throw referenceAssetUnsupportedType(`不支持的参考素材类型：${asset.type}。HappyHorse R2V 当前仅支持图片参考。`);
  }

  if (referenceUrl) {
    if (referenceUrl.includes('127.0.0.1') || referenceUrl.includes('localhost')) {
      throw referenceAssetNotAccessible('当前提供的 URL 是本地地址，供应商无法访问。请使用公网 URL。');
    }
    return {
      referenceType: 'image',
      referenceInputMode: 'publicUrl',
      referenceUrl,
      inputAssetStorageType: 'remote',
      inputAssetPublicUrlUsed: true,
    };
  }

  throw invalidReferenceAsset('R2V 必须提供参考素材（referenceAssetId 或 referenceUrl）');
}

function createTask(
  provider: ProviderRecord,
  input: VideoGenerationInput,
  providerTaskId: string,
  ref: ResolvedReference,
  resolvedPrompt: string,
  providerTaskStatus?: string,
): GenerationTaskRecord {
  const now = nowIso();
  const mapped = mapHappyHorseR2VParams(input);
  return {
    id: createId('task'),
    type: 'video',
    mode: 'R2V',
    status: 'polling',
    progress: 5,
    title: '阿里云百炼 HappyHorse R2V 参考生视频',
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
      referenceAssetId: ref.referenceAssetId,
      referenceType: ref.referenceType,
      referenceInputMode: ref.referenceInputMode,
      inputAssetStorageType: ref.inputAssetStorageType,
      inputAssetPublicUrlUsed: ref.inputAssetPublicUrlUsed,
      inputAssetFallbackMode: ref.inputAssetFallbackMode,
      inputAssetAccessMode: ref.inputAssetAccessMode,
      inputAssetPresignedUrlUsed: ref.inputAssetPresignedUrlUsed,
      inputAssetPresignedUrlExpiresAt: ref.inputAssetPresignedUrlExpiresAt,
      originalPrompt: input.prompt,
      resolvedPrompt,
      requestedDuration: mapped.requestedDuration,
      resolvedDuration: mapped.resolvedDuration,
      requestedRatio: mapped.requestedRatio,
      resolution: mapped.resolution,
      watermark: mapped.watermark,
      seed: mapped.seed,
    },
  };
}

export const aliyunHappyHorseR2VAdapter: ProviderAdapter = {
  id: 'aliyun-happyhorse-r2v',
  name: providerName,
  capabilities: ['r2v', 'asyncTask', 'polling'],

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
    throw modelNotSupported(providerName, '该 Provider 仅用于参考生视频');
  },

  async generateVideoT2V(_provider: ProviderRecord, _input: VideoGenerationInput): Promise<VideoGenerationResult> {
    throw modelNotSupported(providerName, '该 Provider 仅用于参考生视频，文生视频请使用 HappyHorse T2V Provider');
  },

  async generateVideoI2V(_provider: ProviderRecord, _input: VideoGenerationInput): Promise<VideoGenerationResult> {
    throw modelNotSupported(providerName, '该 Provider 仅用于参考生视频，图生视频请使用 HappyHorse I2V Provider');
  },

  async generateVideoR2V(provider: ProviderRecord, input: VideoGenerationInput): Promise<VideoGenerationResult> {
    const mapped = mapHappyHorseR2VParams(input);
    const ref = await resolveReferenceAsset(input);

    // HappyHorse R2V uses [Image 1] reference format in prompt
    let resolvedPrompt = ensureImageReference(input.prompt.trim());

    // Build input.media array
    const apiInput: Record<string, unknown> = {
      prompt: resolvedPrompt,
      media: [
        {
          type: 'reference_image',
          url: ref.referenceUrl,
        },
      ],
    };

    const parameters: Record<string, unknown> = {
      resolution: mapped.resolution,
      ratio: mapped.requestedRatio,
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

      return { task: createTask(provider, input, providerTaskId, ref, resolvedPrompt, response.output?.task_status) };
    } catch (error) {
      mapWanxiangError(error, providerName);
    }
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
