import { getProviderAdapter } from '../providers/providerRegistry.js';
import type { ImageGenerationInput, VideoGenerationInput } from '../types/generation.js';
import { validationError } from '../utils/errors.js';
import { getProviderRecord } from './providerService.js';
import { addTask, addTaskWithAssets } from './taskService.js';

export async function generateImage(input: ImageGenerationInput) {
  if (!input.projectId || !input.providerId || !input.model || !input.prompt) {
    throw validationError('projectId、providerId、model、prompt 为必填字段');
  }
  const provider = await getProviderRecord(input.providerId);
  const result = await getProviderAdapter(provider.providerType).generateImage(provider, input);
  return addTaskWithAssets(result.task, result.assets);
}

export async function generateVideo(input: VideoGenerationInput) {
  if (!input.projectId || !input.providerId || !input.model || !input.prompt || !input.mode) {
    throw validationError('projectId、providerId、model、prompt、mode 为必填字段');
  }
  const provider = await getProviderRecord(input.providerId);
  const adapter = getProviderAdapter(provider.providerType);
  const result =
    input.mode === 'I2V'
      ? await adapter.generateVideoI2V(provider, input)
      : input.mode === 'R2V'
        ? await adapter.generateVideoR2V(provider, input)
        : await adapter.generateVideoT2V(provider, input);
  return { task: await addTask(result.task) };
}
