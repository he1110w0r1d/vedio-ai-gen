import { getProviderAdapter } from '../providers/providerRegistry';
import { createImageAssets } from '../services/mockService';
import { requestJson, shouldUseMockApi } from './client';
import type { GenerationStartResult, ImageGenerationInput, ImageGenerationResult, VideoGenerationInput } from './types';

export const generationApi = {
  async generateImage(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    if (!shouldUseMockApi()) {
      return requestJson<ImageGenerationResult>('/api/generations/image', {
        method: 'POST',
        body: JSON.stringify({
          projectId: input.project.id,
          providerId: input.provider.id,
          model: input.model,
          prompt: input.prompt,
          negativePrompt: input.negativePrompt,
          aspectRatio: input.aspectRatio,
          count: input.count,
          seed: input.seed,
          style: input.style,
        }),
      });
    }
    const adapter = getProviderAdapter(input.provider.id);
    const { task } = await adapter.generateImage(input);
    return {
      task,
      assets: createImageAssets(input),
    };
  },

  async generateVideoT2V(input: VideoGenerationInput & { mode: 'T2V' }): Promise<GenerationStartResult> {
    if (!shouldUseMockApi()) {
      return requestJson<GenerationStartResult>('/api/generations/video/t2v', {
        method: 'POST',
        body: JSON.stringify({ projectId: input.project.id, providerId: input.provider.id, model: input.model, prompt: input.prompt, params: input.params }),
      });
    }
    return getProviderAdapter(input.provider.id).generateVideoT2V(input);
  },

  async generateVideoI2V(input: VideoGenerationInput & { mode: 'I2V' }): Promise<GenerationStartResult> {
    if (!shouldUseMockApi()) {
      return requestJson<GenerationStartResult>('/api/generations/video/i2v', {
        method: 'POST',
        body: JSON.stringify({ projectId: input.project.id, providerId: input.provider.id, model: input.model, prompt: input.prompt, params: input.params }),
      });
    }
    return getProviderAdapter(input.provider.id).generateVideoI2V(input);
  },

  async generateVideoR2V(input: VideoGenerationInput & { mode: 'R2V' }): Promise<GenerationStartResult> {
    if (!shouldUseMockApi()) {
      return requestJson<GenerationStartResult>('/api/generations/video/r2v', {
        method: 'POST',
        body: JSON.stringify({ projectId: input.project.id, providerId: input.provider.id, model: input.model, prompt: input.prompt, params: input.params }),
      });
    }
    return getProviderAdapter(input.provider.id).generateVideoR2V(input);
  },

  async generateVideo(input: VideoGenerationInput): Promise<GenerationStartResult> {
    if (input.mode === 'I2V') return this.generateVideoI2V({ ...input, mode: 'I2V' });
    if (input.mode === 'R2V') return this.generateVideoR2V({ ...input, mode: 'R2V' });
    return this.generateVideoT2V({ ...input, mode: 'T2V' });
  },
};
