import { createTask } from '../services/mockService';
import type { ImageGenerationInput } from '../api/types';
import type { GenerationTaskStatus, I2VGenerationInput, ProviderAdapter, R2VGenerationInput, T2VGenerationInput } from './types';

const unsupported = (provider: string) => ({
  code: 'MODEL_NOT_SUPPORTED' as const,
  message: `${provider} 的 Mock Adapter 未声明该生成能力`,
  provider,
  retryable: false,
});

export const mockProviderAdapter: ProviderAdapter = {
  id: 'mock',
  name: 'Mock Provider Adapter',
  capabilities: ['图片生成', 'T2V', 'I2V', 'R2V', '首帧', '尾帧', '多参考图', '负面提示词', 'Seed', '异步任务'],

  async testConnection(input) {
    const ok = Boolean(input.apiKeyMasked);
    return {
      ok,
      message: ok ? 'Mock 连接成功' : '未配置 API Key，Mock 连接失败',
      capabilities: this.capabilities,
      error: ok ? undefined : {
        code: 'INVALID_API_KEY',
        message: '未配置 API Key',
        provider: input.providerId,
        retryable: true,
      },
    };
  },

  async generateImage(input: ImageGenerationInput) {
    if (!input.provider.capabilities.includes('图片生成')) throw unsupported(input.provider.name);
    return {
      task: createTask({
        type: 'image',
        title: '图片生成任务',
        prompt: input.prompt,
        provider: input.provider,
        project: input.project,
        model: input.model,
        params: {
          aspectRatio: input.aspectRatio,
          count: input.count,
          seed: input.seed || '随机',
          negativePrompt: input.negativePrompt ?? '',
          style: input.style,
        },
      }),
    };
  },

  async generateVideoT2V(input: T2VGenerationInput) {
    if (!input.provider.capabilities.includes('T2V')) throw unsupported(input.provider.name);
    return { task: createTask({ ...input, type: 'video' }) };
  },

  async generateVideoI2V(input: I2VGenerationInput) {
    if (!input.provider.capabilities.includes('I2V')) throw unsupported(input.provider.name);
    return { task: createTask({ ...input, type: 'video' }) };
  },

  async generateVideoR2V(input: R2VGenerationInput) {
    if (!input.provider.capabilities.includes('R2V')) throw unsupported(input.provider.name);
    return { task: createTask({ ...input, type: 'video' }) };
  },

  async getTaskStatus(taskId: string): Promise<GenerationTaskStatus> {
    return {
      taskId,
      status: 'polling',
      progress: 50,
    };
  },
};
