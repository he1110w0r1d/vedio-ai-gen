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
  const apiKey = process.env.OPENAI_TEST_API_KEY;
  if (!apiKey) throw new Error('RUN_OPENAI_LIVE_TEST=true 时必须提供 OPENAI_TEST_API_KEY。真实测试会产生 OpenAI 图片生成费用。');
  const liveProvider = createProviderCredential({
    name: 'OpenAI Images Live Test',
    providerType: 'openai-images',
    baseUrl: 'https://api.openai.com/v1',
    apiKey,
    defaultModel: process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1.5',
    capabilities: ['image'],
  });
  const model = liveProvider.defaultModel ?? 'gpt-image-1.5';
  try {
    const result = await openaiImagesAdapter.testConnection(liveProvider);
    assert(result.ok, 'OpenAI live testConnection 应成功');
    console.log(`provider testConnection: ${result.message}`);

    const generation = await openaiImagesAdapter.generateImage(liveProvider, {
      projectId: 'live-test-project',
      providerId: liveProvider.id,
      model,
      prompt: 'A small watercolor icon of a blue water droplet on a white background.',
      aspectRatio: '1:1',
      count: 1,
      style: 'watercolor icon',
    });
    const asset = generation.assets[0];
    assert(generation.task.status === 'completed', 'OpenAI live image task 应完成');
    assert(Boolean(asset?.localPath), 'OpenAI live image 应保存到本地');
    console.log(`image generation task status: ${generation.task.status}`);
    console.log(`asset id: ${asset.id}`);
    console.log(`localPath: ${asset.localPath ?? ''}`);
    console.log(`sizeBytes: ${asset.sizeBytes ?? 0}`);
    console.log(`public url: ${asset.url ?? asset.fileUrl ?? ''}`);
  } catch (error) {
    const item = error as { apiError?: { code?: string; message?: string } };
    if (item.apiError) {
      console.log(`OpenAI live test failed: ${item.apiError.code} ${item.apiError.message}`);
      process.exitCode = 1;
    } else {
      throw error;
    }
  }
} else {
  console.log('verifyOpenAIAdapter dry-run passed');
}
