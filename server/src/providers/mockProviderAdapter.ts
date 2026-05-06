import type { ImageGenerationInput, VideoGenerationInput } from '../types/generation.js';
import type { ProviderRecord } from '../types/provider.js';
import type { GenerationTaskRecord } from '../types/task.js';
import { createId } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import type { ImageGenerationResult, ProviderAdapter, VideoGenerationResult } from './types.js';

const imagePool = [
  'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1484950763426-56b5bf172dbb?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
];

function makeTask(provider: ProviderRecord, input: ImageGenerationInput | VideoGenerationInput, type: 'image' | 'video'): GenerationTaskRecord {
  const now = nowIso();
  return {
    id: createId('task'),
    type,
    mode: type === 'video' ? (input as VideoGenerationInput).mode : undefined,
    status: type === 'image' ? 'completed' : 'queued',
    progress: type === 'image' ? 100 : 0,
    title: type === 'image' ? 'Mock 图片生成任务' : `${(input as VideoGenerationInput).mode} Mock 视频任务`,
    prompt: input.prompt,
    providerId: provider.id,
    providerName: provider.name,
    model: input.model,
    projectId: input.projectId,
    projectName: '默认项目',
    createdAt: now,
    updatedAt: now,
    completedAt: type === 'image' ? now : undefined,
    params: type === 'image'
      ? {
          aspectRatio: (input as ImageGenerationInput).aspectRatio ?? '1:1',
          count: (input as ImageGenerationInput).count ?? 1,
          seed: (input as ImageGenerationInput).seed ?? '随机',
          style: (input as ImageGenerationInput).style ?? '默认',
          negativePrompt: (input as ImageGenerationInput).negativePrompt ?? '',
        }
      : ((input as VideoGenerationInput).params ?? {}),
  };
}

export const mockProviderAdapter: ProviderAdapter = {
  id: 'mock',
  name: 'Mock Provider Adapter',
  capabilities: ['image', 't2v', 'i2v', 'r2v', 'firstFrame', 'lastFrame', 'multiReference', 'negativePrompt', 'seed', 'asyncTask', 'polling'],

  async testConnection(provider) {
    return {
      ok: Boolean(provider.maskedApiKey),
      message: provider.maskedApiKey ? 'Mock 连接成功' : '未配置 API Key',
      capabilities: provider.capabilities.length ? provider.capabilities : this.capabilities,
    };
  },

  async generateImage(provider: ProviderRecord, input: ImageGenerationInput): Promise<ImageGenerationResult> {
    const task = makeTask(provider, input, 'image');
    const count = Math.max(1, Math.min(input.count ?? 1, 4));
    const now = nowIso();
    const assets = Array.from({ length: count }).map((_, index) => ({
      id: createId('asset_img'),
      type: 'image' as const,
      title: `Mock 图片结果 ${index + 1}`,
      prompt: input.prompt,
      thumbnail: imagePool[index % imagePool.length],
      fileUrl: imagePool[index % imagePool.length],
      providerId: provider.id,
      providerName: provider.name,
      model: input.model,
      projectId: input.projectId,
      createdAt: now,
      updatedAt: now,
      favorite: false,
      taskId: task.id,
      aspectRatio: input.aspectRatio ?? '1:1',
      params: task.params,
    }));
    return { task, assets };
  },

  async generateVideoT2V(provider: ProviderRecord, input: VideoGenerationInput): Promise<VideoGenerationResult> {
    return { task: makeTask(provider, { ...input, mode: 'T2V' }, 'video') };
  },

  async generateVideoI2V(provider: ProviderRecord, input: VideoGenerationInput): Promise<VideoGenerationResult> {
    return { task: makeTask(provider, { ...input, mode: 'I2V' }, 'video') };
  },

  async generateVideoR2V(provider: ProviderRecord, input: VideoGenerationInput): Promise<VideoGenerationResult> {
    return { task: makeTask(provider, { ...input, mode: 'R2V' }, 'video') };
  },

  async getTaskStatus(taskId: string) {
    return { id: taskId, status: 'polling', progress: 50 };
  },
};
