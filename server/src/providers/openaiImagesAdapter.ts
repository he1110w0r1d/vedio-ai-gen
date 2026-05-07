import OpenAI from 'openai';
import type { ImageGenerateParams } from 'openai/resources/images';
import { decryptSecret } from '../services/encryptionService.js';
import { saveBufferToLocal } from '../services/fileStorageService.js';
import type { AssetRecord } from '../types/asset.js';
import type { ImageGenerationInput, VideoGenerationInput } from '../types/generation.js';
import type { ProviderRecord } from '../types/provider.js';
import type { GenerationTaskRecord } from '../types/task.js';
import { createId } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
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
import type { ImageGenerationResult, ProviderAdapter, VideoGenerationResult } from './types.js';

const providerName = 'OpenAI Images';
const defaultModel = 'gpt-image-1.5';
const testConnectionTimeoutMs = 15000;
const imageGenerationTimeoutMs = 120000;
const supportedModels = new Set(['gpt-image-2', 'gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini']);
const sizeMap: Record<string, ImageGenerateParams['size']> = {
  '1:1': '1024x1024',
  '16:9': '1536x1024',
  '9:16': '1024x1536',
  '4:3': '1536x1024',
};

function getOpenAIClient(provider: ProviderRecord, timeout: number) {
  const apiKey = decryptSecret(provider.encryptedApiKey);
  return new OpenAI({ apiKey, timeout });
}

function resolveModel(provider: ProviderRecord, inputModel?: string) {
  const model = inputModel || provider.defaultModel || defaultModel;
  if (!supportedModels.has(model)) {
    throw modelNotSupported(providerName, `当前仅支持 GPT Image 模型：${Array.from(supportedModels).join('、')}`);
  }
  return model;
}

function createImageTask(provider: ProviderRecord, input: ImageGenerationInput, status: GenerationTaskRecord['status']): GenerationTaskRecord {
  const now = nowIso();
  return {
    id: createId('task'),
    type: 'image',
    status,
    progress: status === 'completed' ? 100 : status === 'failed' ? 100 : 20,
    title: 'OpenAI Images 文生图',
    prompt: input.prompt,
    providerId: provider.id,
    providerName: provider.name,
    model: resolveModel(provider, input.model),
    projectId: input.projectId,
    projectName: '默认项目',
    createdAt: now,
    updatedAt: now,
    completedAt: status === 'completed' ? now : undefined,
    params: {
      aspectRatio: input.aspectRatio ?? '1:1',
      count: input.count ?? 1,
      style: input.style ?? '',
      seed: input.seed ?? '',
      negativePrompt: input.negativePrompt ?? '',
    },
  };
}

function sanitizeDetail(error: unknown) {
  if (!error || typeof error !== 'object') return undefined;
  const item = error as Record<string, unknown>;
  return {
    status: item.status,
    code: item.code,
    type: item.type,
    requestID: item.requestID,
  };
}

function mapOpenAIError(error: unknown): never {
  if (error instanceof HttpError) throw error;
  const item = error as { status?: number; code?: string | null; type?: string; message?: string };
  const status = item.status;
  const code = String(item.code ?? item.type ?? '').toLowerCase();
  const name = String((item as { name?: string }).name ?? '').toLowerCase();
  const message = String(item.message ?? '').toLowerCase();

  if (status === 401 || code.includes('invalid_api_key')) throw invalidApiKey('OpenAI API Key 无效或无权限');
  if (status === 429) throw rateLimited(providerName, item.code ?? undefined);
  if (code.includes('timeout') || name.includes('timeout') || message.includes('timeout') || message.includes('timed out')) {
    throw taskTimeout(providerName, 'OpenAI 图片生成或连接验证超时，请稍后重试，复杂提示词可能需要更长等待时间');
  }
  if (code.includes('insufficient_quota') || message.includes('billing') || message.includes('quota') || message.includes('balance')) {
    throw insufficientBalance(providerName, 'OpenAI 账户余额或额度不足');
  }
  if (code.includes('content_policy') || code.includes('safety') || message.includes('safety') || message.includes('policy')) {
    throw contentRejected(providerName, item.code ?? undefined);
  }
  if (
    status === 403 ||
    status === 404 ||
    code.includes('model_not_found') ||
    code.includes('unsupported_model') ||
    message.includes('permission') ||
    message.includes('access denied') ||
    message.includes('not have access')
  ) {
    throw modelNotSupported(providerName, 'OpenAI 图片模型不存在、账户无权限，或组织验证尚未满足模型使用要求');
  }
  if (typeof status === 'number' && status >= 500) throw providerUnavailable(providerName, item.code ?? undefined);

  throw unknownProviderError(providerName, item.code ?? undefined, sanitizeDetail(error));
}

export const openaiImagesAdapter: ProviderAdapter = {
  id: 'openai-images',
  name: providerName,
  capabilities: ['image'],

  async testConnection(provider) {
    try {
      const client = getOpenAIClient(provider, testConnectionTimeoutMs);
      await client.models.list();
      return {
        ok: true,
        message: 'OpenAI API Key 验证成功。具体图片模型权限、组织验证状态和审核结果需要在真实生成时确认；视频生成仍使用 Mock。',
        capabilities: ['image'],
      };
    } catch (error) {
      mapOpenAIError(error);
    }
  },

  async generateImage(provider: ProviderRecord, input: ImageGenerationInput): Promise<ImageGenerationResult> {
    const task = createImageTask(provider, input, 'running');
    const model = resolveModel(provider, input.model);
    const size = sizeMap[input.aspectRatio ?? '1:1'] ?? '1024x1024';
    const count = Math.max(1, Math.min(input.count ?? 1, 4));

    try {
      const client = getOpenAIClient(provider, imageGenerationTimeoutMs);
      const response = await client.images.generate({
        model,
        prompt: input.prompt,
        n: count,
        size,
        output_format: 'png',
      });

      const now = nowIso();
      const assets: AssetRecord[] = [];
      for (const [index, image] of (response.data ?? []).entries()) {
        if (!image.b64_json) throw unknownProviderError(providerName, 'MISSING_B64_JSON');
        const assetId = createId('asset_img');
        const buffer = Buffer.from(image.b64_json, 'base64');
        const stored = await saveBufferToLocal({
          buffer,
          fileName: `${assetId}.png`,
          mimeType: 'image/png',
        });
        assets.push({
          id: assetId,
          type: 'image',
          title: `OpenAI 图片结果 ${index + 1}`,
          prompt: input.prompt,
          thumbnail: stored.publicUrl,
          thumbnailUrl: stored.publicUrl,
          url: stored.publicUrl,
          fileUrl: stored.publicUrl,
          storageType: stored.storageType,
          localPath: stored.localPath,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          providerId: provider.id,
          providerName: provider.name,
          model,
          projectId: input.projectId,
          createdAt: now,
          updatedAt: now,
          favorite: false,
          taskId: task.id,
          aspectRatio: input.aspectRatio ?? '1:1',
          params: { ...task.params, size, outputFormat: 'png' },
          parameters: { ...task.params, size, outputFormat: 'png' },
        });
      }

      return {
        task: {
          ...task,
          status: 'completed',
          progress: 100,
          completedAt: nowIso(),
          updatedAt: nowIso(),
        },
        assets,
      };
    } catch (error) {
      mapOpenAIError(error);
    }
  },

  async generateVideoT2V(_provider: ProviderRecord, _input: VideoGenerationInput): Promise<VideoGenerationResult> {
    throw modelNotSupported(providerName, 'OpenAI Images Adapter 不支持 T2V，视频生成仍使用 Mock');
  },

  async generateVideoI2V(_provider: ProviderRecord, _input: VideoGenerationInput): Promise<VideoGenerationResult> {
    throw modelNotSupported(providerName, 'OpenAI Images Adapter 不支持 I2V，视频生成仍使用 Mock');
  },

  async generateVideoR2V(_provider: ProviderRecord, _input: VideoGenerationInput): Promise<VideoGenerationResult> {
    throw modelNotSupported(providerName, 'OpenAI Images Adapter 不支持 R2V，视频生成仍使用 Mock');
  },

  async getTaskStatus(taskId: string) {
    return { id: taskId, status: 'completed', progress: 100 };
  },
};
