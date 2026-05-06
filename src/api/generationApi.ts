import { getProviderAdapter } from '../providers/providerRegistry';
import { createImageAssets } from '../services/mockService';
import { realApiNotImplemented, shouldUseMockApi } from './client';
import type { GenerationStartResult, ImageGenerationInput, ImageGenerationResult, VideoGenerationInput } from './types';

export const generationApi = {
  async generateImage(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    if (!shouldUseMockApi()) realApiNotImplemented('POST /api/generations/image');
    const adapter = getProviderAdapter(input.provider.id);
    const { task } = await adapter.generateImage(input);
    return {
      task,
      assets: createImageAssets(input),
    };
  },

  async generateVideoT2V(input: VideoGenerationInput & { mode: 'T2V' }): Promise<GenerationStartResult> {
    if (!shouldUseMockApi()) realApiNotImplemented('POST /api/generations/video/t2v');
    return getProviderAdapter(input.provider.id).generateVideoT2V(input);
  },

  async generateVideoI2V(input: VideoGenerationInput & { mode: 'I2V' }): Promise<GenerationStartResult> {
    if (!shouldUseMockApi()) realApiNotImplemented('POST /api/generations/video/i2v');
    return getProviderAdapter(input.provider.id).generateVideoI2V(input);
  },

  async generateVideoR2V(input: VideoGenerationInput & { mode: 'R2V' }): Promise<GenerationStartResult> {
    if (!shouldUseMockApi()) realApiNotImplemented('POST /api/generations/video/r2v');
    return getProviderAdapter(input.provider.id).generateVideoR2V(input);
  },

  async generateVideo(input: VideoGenerationInput): Promise<GenerationStartResult> {
    if (input.mode === 'I2V') return this.generateVideoI2V({ ...input, mode: 'I2V' });
    if (input.mode === 'R2V') return this.generateVideoR2V({ ...input, mode: 'R2V' });
    return this.generateVideoT2V({ ...input, mode: 'T2V' });
  },
};
