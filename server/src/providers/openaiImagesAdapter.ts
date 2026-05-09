import { decryptSecret } from '../services/encryptionService.js';
import { deleteLocalFile, saveRemoteFileToLocal, type LocalFileRecord } from '../services/fileStorageService.js';
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

const providerName = '万物焕新 gpt-image-2';
const defaultBaseUrl = 'https://api.wanwuhuanxin.cn/v1';
const defaultModel = 'gpt-image-2';
const testConnectionTimeoutMs = 15000;
const imageGenerationTimeoutMs = 120000;
const supportedModels = new Set(['gpt-image-2']);

type WanwuSizeMapping = {
  requestedAspectRatio: string;
  resolvedWidth?: number;
  resolvedHeight?: number;
  resolvedSizeLabel: string;
  fallbackReason?: string;
};

type WanwuChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
    text?: string;
  }>;
  output_text?: string;
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
};

function resolveModel(provider: ProviderRecord, inputModel?: string) {
  const model = inputModel || provider.defaultModel || defaultModel;
  if (!supportedModels.has(model)) {
    throw modelNotSupported(providerName, '万物焕新图片测试链路当前仅支持 gpt-image-2');
  }
  return model;
}

export function mapAspectRatioToWanwuSize(aspectRatio = '1:1', _model = defaultModel): WanwuSizeMapping {
  const map: Record<string, WanwuSizeMapping> = {
    '1:1': { requestedAspectRatio: '1:1', resolvedWidth: 1024, resolvedHeight: 1024, resolvedSizeLabel: 'square 1024x1024' },
    '16:9': { requestedAspectRatio: '16:9', resolvedWidth: 1536, resolvedHeight: 864, resolvedSizeLabel: 'landscape 1536x864' },
    '9:16': { requestedAspectRatio: '9:16', resolvedWidth: 864, resolvedHeight: 1536, resolvedSizeLabel: 'portrait 864x1536' },
    '4:3': {
      requestedAspectRatio: '4:3',
      resolvedWidth: 1536,
      resolvedHeight: 1024,
      resolvedSizeLabel: 'landscape 1536x1024',
      fallbackReason: '万物焕新 chat/completions 当前未声明精确尺寸参数，4:3 仅作为期望画幅写入提示词与参数记录',
    },
  };
  return map[aspectRatio] ?? {
    requestedAspectRatio: aspectRatio,
    resolvedWidth: 1024,
    resolvedHeight: 1024,
    resolvedSizeLabel: 'square 1024x1024',
    fallbackReason: `未知画幅 ${aspectRatio} 已回退为 1:1 期望画幅`,
  };
}

function resolveEndpoint(provider: ProviderRecord) {
  const baseUrl = (provider.baseUrl || defaultBaseUrl).replace(/\/+$/, '');
  return `${baseUrl}/chat/completions`;
}

function resolveCount(input: ImageGenerationInput) {
  return Math.max(1, Math.min(input.count ?? 1, 4));
}

function createImageTask(provider: ProviderRecord, input: ImageGenerationInput, status: GenerationTaskRecord['status']): GenerationTaskRecord {
  const now = nowIso();
  const model = resolveModel(provider, input.model);
  const size = mapAspectRatioToWanwuSize(input.aspectRatio, model);
  return {
    id: createId('task'),
    type: 'image',
    status,
    progress: status === 'completed' ? 100 : status === 'failed' ? 100 : 20,
    title: '万物焕新 gpt-image-2 文生图',
    prompt: input.prompt,
    providerId: provider.id,
    providerName: provider.name,
    model,
    projectId: input.projectId,
    projectName: '默认项目',
    createdAt: now,
    updatedAt: now,
    completedAt: status === 'completed' ? now : undefined,
    params: {
      requestedAspectRatio: size.requestedAspectRatio,
      resolvedWidth: size.resolvedWidth,
      resolvedHeight: size.resolvedHeight,
      resolvedSizeLabel: size.resolvedSizeLabel,
      fallbackReason: size.fallbackReason,
      count: resolveCount(input),
      style: input.style ?? '',
      seed: input.seed ?? '',
      negativePrompt: input.negativePrompt ?? '',
      quality: input.quality ?? '供应商默认',
      outputFormat: input.outputFormat ?? '供应商返回链接格式',
      background: input.background ?? '供应商默认',
    },
  };
}

function buildPrompt(input: ImageGenerationInput, size: WanwuSizeMapping) {
  const parts = [input.prompt.trim()];
  if (input.style) parts.push(`风格：${input.style}`);
  parts.push(`期望画幅：${size.requestedAspectRatio}，参考尺寸：${size.resolvedSizeLabel}`);
  if (input.quality) parts.push(`质量偏好：${input.quality}`);
  if (input.outputFormat) parts.push(`输出格式偏好：${input.outputFormat}`);
  if (input.background) parts.push(`背景偏好：${input.background}`);
  if (input.negativePrompt) parts.push(`避免：${input.negativePrompt}`);
  parts.push('不要文字，不要水印。请返回生成图片链接。');
  return parts.filter(Boolean).join('\n');
}

function extractText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        return [record.text, record.content, record.url, record.image_url].map(extractText).filter(Boolean).join('\n');
      }
      return '';
    }).filter(Boolean).join('\n');
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return [record.text, record.content, record.url, record.image_url].map(extractText).filter(Boolean).join('\n');
  }
  return '';
}

function extractImageUrl(response: WanwuChatCompletionResponse) {
  const texts = [
    response.output_text,
    ...(response.choices ?? []).flatMap((choice) => [choice.text, extractText(choice.message?.content)]),
    JSON.stringify(response),
  ].filter(Boolean).join('\n');
  const match = texts.match(/https?:\/\/[^\s"'<>)]*?\.(?:png|jpe?g|webp)(?:\?[^\s"'<>)]*)?/i);
  return match?.[0];
}

function imageExtensionFromUrl(url: string) {
  const match = url.match(/\.(png|jpe?g|webp)(?:\?|#|$)/i);
  const extension = match?.[1]?.toLowerCase() ?? 'png';
  return extension === 'jpeg' ? 'jpg' : extension;
}

function sanitizeDetail(error: unknown) {
  if (!error || typeof error !== 'object') return undefined;
  const item = error as Record<string, unknown>;
  return {
    status: item.status,
    code: item.code,
    type: item.type,
  };
}

function mapWanwuError(error: unknown): never {
  if (error instanceof HttpError) throw error;
  const item = error as { status?: number; code?: string | null; type?: string; name?: string; message?: string };
  const status = item.status;
  const code = String(item.code ?? item.type ?? '').toLowerCase();
  const name = String(item.name ?? '').toLowerCase();
  const message = String(item.message ?? '').toLowerCase();

  if (status === 401 || status === 403 || code.includes('invalid_api_key') || message.includes('api key')) {
    throw invalidApiKey('万物焕新 API Key 无效或无权限');
  }
  if (status === 429 || code.includes('rate')) throw rateLimited(providerName, item.code ?? undefined);
  if (code.includes('timeout') || name.includes('abort') || name.includes('timeout') || message.includes('timeout') || message.includes('timed out')) {
    throw taskTimeout(providerName, '万物焕新图片生成或连接验证超时，请稍后重试');
  }
  if (code.includes('insufficient') || message.includes('quota') || message.includes('balance') || message.includes('余额') || message.includes('额度')) {
    throw insufficientBalance(providerName, '万物焕新账户余额或额度不足');
  }
  if (code.includes('content') || code.includes('safety') || message.includes('审核') || message.includes('policy') || message.includes('safety')) {
    throw contentRejected(providerName, item.code ?? undefined);
  }
  if (status === 404 || code.includes('model') || message.includes('model')) {
    throw modelNotSupported(providerName, '万物焕新 gpt-image-2 模型不存在、不可用或当前账户无权限');
  }
  if (typeof status === 'number' && status >= 500) throw providerUnavailable(providerName, item.code ?? undefined);

  throw unknownProviderError(providerName, item.code ?? undefined, sanitizeDetail(error));
}

async function postChatCompletion(provider: ProviderRecord, prompt: string, model: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(resolveEndpoint(provider), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${decryptSecret(provider.encryptedApiKey)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) as WanwuChatCompletionResponse : {};
    if (!response.ok || body.error) {
      throw {
        status: response.status,
        code: body.error?.code,
        type: body.error?.type,
        message: body.error?.message || text || response.statusText,
      };
    }
    return body;
  } catch (error) {
    if (error instanceof SyntaxError) throw unknownProviderError(providerName, 'INVALID_JSON');
    mapWanwuError(error);
  } finally {
    clearTimeout(timeout);
  }
}

export const openaiImagesAdapter: ProviderAdapter = {
  id: 'openai-images',
  name: providerName,
  capabilities: ['image'],

  async testConnection(provider) {
    try {
      await postChatCompletion(provider, '请只回复 OK，用于验证 API Key 可用性，不要生成图片。', resolveModel(provider), testConnectionTimeoutMs);
      return {
        ok: true,
        message: '万物焕新 API Key 验证成功。图片 URL 生成、下载和审核结果仍需要在真实生成时确认；视频生成仍使用 Mock。',
        capabilities: ['image'],
      };
    } catch (error) {
      mapWanwuError(error);
    }
  },

  async generateImage(provider: ProviderRecord, input: ImageGenerationInput): Promise<ImageGenerationResult> {
    const task = createImageTask(provider, input, 'running');
    const model = resolveModel(provider, input.model);
    const size = mapAspectRatioToWanwuSize(input.aspectRatio, model);
    const count = resolveCount(input);
    const storedFiles: LocalFileRecord[] = [];

    try {
      const now = nowIso();
      const assets: AssetRecord[] = [];
      for (let index = 0; index < count; index += 1) {
        const response = await postChatCompletion(provider, buildPrompt(input, size), model, imageGenerationTimeoutMs);
        const imageUrl = extractImageUrl(response);
        if (!imageUrl) throw unknownProviderError(providerName, 'IMAGE_URL_NOT_FOUND');
        const assetId = createId('asset_img');
        const stored = await saveRemoteFileToLocal({
          remoteUrl: imageUrl,
          fileName: `${assetId}.${imageExtensionFromUrl(imageUrl)}`,
        });
        storedFiles.push(stored);
        const parameters = {
          ...task.params,
          requestedAspectRatio: size.requestedAspectRatio,
          resolvedWidth: size.resolvedWidth,
          resolvedHeight: size.resolvedHeight,
          resolvedSizeLabel: size.resolvedSizeLabel,
          fallbackReason: size.fallbackReason,
          sourceUrl: imageUrl,
          quality: input.quality ?? '供应商默认',
          outputFormat: input.outputFormat ?? stored.mimeType ?? '供应商返回格式',
          background: input.background ?? '供应商默认',
        };
        assets.push({
          id: assetId,
          type: 'image',
          title: `万物焕新图片结果 ${index + 1}`,
          prompt: input.prompt,
          thumbnail: stored.publicUrl,
          thumbnailUrl: stored.publicUrl,
          url: stored.publicUrl,
          fileUrl: stored.publicUrl,
          storageType: stored.storageType,
          localPath: stored.localPath,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          width: stored.width,
          height: stored.height,
          providerId: provider.id,
          providerName: provider.name,
          model,
          projectId: input.projectId,
          createdAt: now,
          updatedAt: now,
          favorite: false,
          taskId: task.id,
          aspectRatio: size.requestedAspectRatio,
          params: parameters,
          parameters,
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
      await Promise.allSettled(storedFiles.map((file) => (file.localPath ? deleteLocalFile({ localPath: file.localPath }) : Promise.resolve({ deleted: false }))));
      mapWanwuError(error);
    }
  },

  async generateVideoT2V(_provider: ProviderRecord, _input: VideoGenerationInput): Promise<VideoGenerationResult> {
    throw modelNotSupported(providerName, '万物焕新图片 Adapter 不支持 T2V，视频生成仍使用 Mock');
  },

  async generateVideoI2V(_provider: ProviderRecord, _input: VideoGenerationInput): Promise<VideoGenerationResult> {
    throw modelNotSupported(providerName, '万物焕新图片 Adapter 不支持 I2V，视频生成仍使用 Mock');
  },

  async generateVideoR2V(_provider: ProviderRecord, _input: VideoGenerationInput): Promise<VideoGenerationResult> {
    throw modelNotSupported(providerName, '万物焕新图片 Adapter 不支持 R2V，视频生成仍使用 Mock');
  },

  async getTaskStatus(_provider, task) {
    return { id: task.id, status: 'completed', progress: 100 };
  },
};
