import { getProviderAdapter } from '../providers/providerRegistry.js';
import type { ImageGenerationInput, VideoGenerationInput } from '../types/generation.js';
import { HttpError, validationError } from '../utils/errors.js';
import { createId } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import { getProviderRecord } from './providerService.js';
import { addTask, addTaskWithAssets } from './taskService.js';
import { createUsageRecord, failUsageRecord, completeUsageRecord } from './usageService.js';

export async function generateImage(input: ImageGenerationInput) {
  if (!input.projectId || !input.providerId || !input.model || !input.prompt) {
    throw validationError('projectId、providerId、model、prompt 为必填字段');
  }
  const provider = await getProviderRecord(input.providerId);
  try {
    const result = await getProviderAdapter(provider.providerType).generateImage(provider, input);
    await createUsageRecord(result.task);
    await completeUsageRecord(result.task.id, result.assets);
    return addTaskWithAssets(result.task, result.assets);
  } catch (error) {
    if (error instanceof HttpError) {
      const now = nowIso();
      await addTask({
        id: createId('task'),
        type: 'image',
        status: 'failed',
        progress: 100,
        title: '图片生成失败',
        prompt: input.prompt,
        providerId: provider.id,
        providerName: provider.name,
        model: input.model || provider.defaultModel || 'unknown',
        projectId: input.projectId,
        projectName: '默认项目',
        createdAt: now,
        updatedAt: now,
        errorCode: error.apiError.code,
        errorReason: error.apiError.message,
        params: {
          aspectRatio: input.aspectRatio ?? '1:1',
          count: input.count ?? 1,
          seed: input.seed ?? '',
          style: input.style ?? '',
          negativePrompt: input.negativePrompt ?? '',
        },
      });
      await createUsageRecord({ ...input, type: 'image', status: 'failed', providerId: provider.id, providerName: provider.name, id: 'temp', progress: 0, title: '', prompt: input.prompt, model: input.model ?? '', projectId: input.projectId, createdAt: now, updatedAt: now, params: {} } as any).then(r => failUsageRecord(r.taskId, error.apiError.message));
    }
    throw error;
  }
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
  
  const inputAssets = input.mode === 'I2V' && input.params?.sourceImageAssetId ? [String(input.params.sourceImageAssetId)] : input.mode === 'R2V' && input.params?.referenceAssetId ? [String(input.params.referenceAssetId)] : undefined;
  await createUsageRecord(result.task, inputAssets);
  
  return { task: await addTask(result.task) };
}
