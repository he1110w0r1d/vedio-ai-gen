import { openaiImagesAdapter } from '../src/providers/openaiImagesAdapter.js';
import { createProviderCredential } from '../src/services/credentialService.js';
import type { ProviderRecord } from '../src/types/provider.js';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const dryRunProvider: ProviderRecord = createProviderCredential({
  name: 'OpenAI Images Dry Run',
  providerType: 'openai-images',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: 'dry-run-key-not-real',
  defaultModel: 'gpt-image-1.5',
  capabilities: ['image'],
});

assert(openaiImagesAdapter.id === 'openai-images', 'Adapter id 应为 openai-images');
assert(openaiImagesAdapter.capabilities.includes('image'), 'OpenAI Images Adapter 应声明 image 能力');

try {
  await openaiImagesAdapter.generateVideoT2V(dryRunProvider, {
    projectId: 'p1',
    providerId: dryRunProvider.id,
    model: 'mock-video',
    prompt: 'video',
    mode: 'T2V',
  });
  throw new Error('视频方法应该返回 MODEL_NOT_SUPPORTED');
} catch (error) {
  const item = error as { apiError?: { code?: string } };
  assert(item.apiError?.code === 'MODEL_NOT_SUPPORTED', '视频方法应返回 MODEL_NOT_SUPPORTED');
}

if (process.env.RUN_OPENAI_LIVE_TEST === 'true') {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('RUN_OPENAI_LIVE_TEST=true 时必须提供 OPENAI_API_KEY。真实测试会产生费用。');
  const liveProvider = createProviderCredential({
    name: 'OpenAI Images Live Test',
    providerType: 'openai-images',
    baseUrl: 'https://api.openai.com/v1',
    apiKey,
    defaultModel: process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1.5',
    capabilities: ['image'],
  });
  const result = await openaiImagesAdapter.testConnection(liveProvider);
  assert(result.ok, 'OpenAI live testConnection 应成功');
  console.log('verifyOpenAIAdapter live connection passed');
} else {
  console.log('verifyOpenAIAdapter dry-run passed');
}
