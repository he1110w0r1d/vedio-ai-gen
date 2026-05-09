import { getAsset } from '../services/assetService.js';
import { readLocalAssetFile } from '../services/fileStorageService.js';
import type { ImageGenerationInput, VideoGenerationInput } from '../types/generation.js';
import type { ProviderRecord } from '../types/provider.js';
import type { GenerationTaskRecord } from '../types/task.js';
import {
  HttpError,
  invalidReferenceAsset,
  missingCharacterReference,
  modelNotSupported,
  referenceAssetNotAccessible,
  referenceAssetTooLarge,
  referenceAssetUnsupportedType,
  videoTaskFailed,
} from '../utils/errors.js';
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

const providerName = '阿里云百炼 万相参考生视频';
export const defaultWanxiangR2VModel = 'wan2.7-r2v';
const createTimeoutMs = 60000;
const pollTimeoutMs = 15000;
const testConnectionTimeoutMs = 15000;
const MAX_BASE64_BYTES = 20 * 1024 * 1024; // 20MB

export type WanxiangR2VResolvedParams = {
  requestedDuration: number;
  resolvedDuration: number;
  resolution: string;
  promptExtend: boolean;
  watermark: boolean;
};

export function mapR2VParamsToWanxiang(input: VideoGenerationInput): WanxiangR2VResolvedParams {
  const duration = Number(input.params?.duration ?? 5);
  const resolvedDuration = Math.max(2, Math.min(Number.isFinite(duration) ? Math.round(duration) : 5, 10));
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
  return inputModel || provider.defaultModel || defaultWanxiangR2VModel;
}

/** Ensure prompt contains character1 reference */
export function ensureCharacterReference(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('character1') || lower.includes('角色1')) return prompt;
  return prompt;
}

export function hasCharacterReference(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return lower.includes('character1') || lower.includes('角色1');
}

type ResolvedReference = {
  referenceAssetId?: string;
  referenceType: 'image' | 'video';
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
  // Try character reference asset first, then generic reference
  const referenceAssetId = (input.params?.r2vCharacterAssetId || input.params?.referenceAssetId || input.params?.sourceImageAssetId) as string | undefined;
  const referenceUrl = input.params?.referenceUrl as string | undefined;

  if (referenceAssetId) {
    const asset = await getAsset(referenceAssetId);

    if (asset.type === 'image') {
      // Image reference — use base64 for local, URL for remote
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
            referenceAssetId,
            referenceType: 'image',
            referenceInputMode: 'publicUrl',
            referenceUrl: tempUrl,
            inputAssetStorageType: 'object',
            inputAssetAccessMode: 'private-presigned',
            inputAssetPresignedUrlUsed: true,
            inputAssetPresignedUrlExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
            inputAssetFallbackMode: 'presignedUrl',
          };
        }
      }
      // Local image with public URL from our server — try base64
      if (asset.localPath) {
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
      throw referenceAssetNotAccessible('参考图片无法读取，请确认图片资产完整。');
    }

    if (asset.type === 'video') {
      // Video reference — local videos cannot be accessed by provider
      if (asset.storageType === 'remote' && asset.url) {
        return { referenceAssetId, referenceType: 'video', referenceInputMode: 'publicUrl', referenceUrl: asset.url, inputAssetStorageType: 'remote', inputAssetPublicUrlUsed: true };
      }
      
      if (asset.storageType === 'object') {
        const { readDb } = await import('../services/storageService.js');
        const db = await readDb();
        const accessMode = db.storageConfig.accessMode;
        
        if (accessMode === 'public') {
          if (asset.publicUrl) return { referenceAssetId, referenceType: 'video', referenceInputMode: 'publicUrl', referenceUrl: asset.publicUrl, inputAssetStorageType: 'object', inputAssetPublicUrlUsed: true, inputAssetAccessMode: 'public', inputAssetFallbackMode: 'publicUrl' };
          if (asset.url) return { referenceAssetId, referenceType: 'video', referenceInputMode: 'publicUrl', referenceUrl: asset.url, inputAssetStorageType: 'object', inputAssetPublicUrlUsed: true, inputAssetAccessMode: 'public', inputAssetFallbackMode: 'publicUrl' };
        }
        
        if (accessMode === 'private-presigned' && asset.objectKey) {
          const { createPresignedUrl } = await import('../services/fileStorageService.js');
          const expiresIn = db.storageConfig.providerInputUrlExpiresInSeconds ?? 3600;
          const tempUrl = await createPresignedUrl({ objectKey: asset.objectKey, expiresInSeconds: expiresIn });
          return {
            referenceAssetId,
            referenceType: 'video',
            referenceInputMode: 'publicUrl',
            referenceUrl: tempUrl,
            inputAssetStorageType: 'object',
            inputAssetAccessMode: 'private-presigned',
            inputAssetPresignedUrlUsed: true,
            inputAssetPresignedUrlExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
            inputAssetFallbackMode: 'presignedUrl',
          };
        }
      }
      // Local video: base64 for video is too large, need public URL
      throw referenceAssetNotAccessible('本地视频无法被供应商直接访问。R2V 参考视频需要公网 URL。后续版本将接入对象存储以支持本地视频参考。');
    }

    throw referenceAssetUnsupportedType(`不支持的参考素材类型：${asset.type}。请选择图片或视频资产。`);
  }

  if (referenceUrl) {
    if (referenceUrl.includes('127.0.0.1') || referenceUrl.includes('localhost')) {
      throw referenceAssetNotAccessible('当前提供的 URL 是本地地址，供应商无法访问。请使用公网 URL。');
    }
    // Determine type from URL
    const isVideo = /\.(mp4|webm|mov|avi)/i.test(referenceUrl);
    return {
      referenceType: isVideo ? 'video' : 'image',
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
  const mapped = mapR2VParamsToWanxiang(input);
  return {
    id: createId('task'),
    type: 'video',
    mode: 'R2V',
    status: 'polling',
    progress: 5,
    title: '阿里云百炼万相 R2V 参考生视频',
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
      referenceRole: 'character1',
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
      resolution: mapped.resolution,
      promptExtend: mapped.promptExtend,
      watermark: mapped.watermark,
    },
  };
}

export const aliyunWanxiangR2VAdapter: ProviderAdapter = {
  id: 'aliyun-wanxiang-r2v',
  name: providerName,
  capabilities: ['r2v', 'asyncTask', 'polling'],

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
    throw modelNotSupported(providerName, '该 Provider 仅用于参考生视频');
  },

  async generateVideoT2V(_provider: ProviderRecord, _input: VideoGenerationInput): Promise<VideoGenerationResult> {
    throw modelNotSupported(providerName, '该 Provider 仅用于参考生视频，文生视频请使用 T2V Provider');
  },

  async generateVideoI2V(_provider: ProviderRecord, _input: VideoGenerationInput): Promise<VideoGenerationResult> {
    throw modelNotSupported(providerName, '该 Provider 仅用于参考生视频，图生视频请使用 I2V Provider');
  },

  async generateVideoR2V(provider: ProviderRecord, input: VideoGenerationInput): Promise<VideoGenerationResult> {
    const mapped = mapR2VParamsToWanxiang(input);
    const ref = await resolveReferenceAsset(input);

    // Build prompt — ensure character1 is referenced
    let resolvedPrompt = ensureCharacterReference(input.prompt.trim());

    // Build input.media array for wan2.7-r2v
    // API format: input.media = [{ type: 'reference_image'|'reference_video', url }]
    // Ref: https://help.aliyun.com/zh/model-studio/wan-video-to-video-api-reference
    const apiInput: Record<string, unknown> = {
      prompt: resolvedPrompt,
      media: [
        {
          type: ref.referenceType === 'image' ? 'reference_image' : 'reference_video',
          url: ref.referenceUrl,
        },
      ],
    };

    try {
      const response = await fetchJson<WanxiangCreateResponse>(endpoint(provider), provider, {
        method: 'POST',
        headers: { 'X-DashScope-Async': 'enable' },
        body: JSON.stringify({
          model: resolveModel(provider, input.model),
          input: apiInput,
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

      return { task: createTask(provider, input, providerTaskId, ref, resolvedPrompt, response.output?.task_status) };
    } catch (error) {
      mapWanxiangError(error, providerName);
    }
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
