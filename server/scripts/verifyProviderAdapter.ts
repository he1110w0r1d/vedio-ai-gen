import { mockProviderAdapter } from '../src/providers/mockProviderAdapter.js';
import { HttpError } from '../src/utils/errors.js';
import type { ProviderRecord } from '../src/types/provider.js';

const provider: ProviderRecord = {
  id: 'provider_test',
  name: 'Mock Test Provider',
  providerType: 'mock',
  encryptedApiKey: 'encrypted',
  maskedApiKey: 'test****1234',
  defaultModel: 'mock-model',
  capabilities: ['image', 't2v', 'i2v', 'r2v', 'asyncTask'],
  status: 'connected',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const connection = await mockProviderAdapter.testConnection(provider);
assert(connection.ok, 'testConnection 应该成功');
assert(Array.isArray(connection.capabilities), 'testConnection 应返回能力列表');

const image = await mockProviderAdapter.generateImage(provider, {
  projectId: 'p1',
  providerId: provider.id,
  model: 'mock-image',
  prompt: '测试图片',
  count: 2,
});
assert(image.task.status === 'completed', '图片任务应快速完成');
assert(image.assets.length === 2, '图片生成应返回 2 个资产');
assert(image.assets.every((asset) => asset.storageType === 'mock'), 'Mock 图片资产应标记 storageType');

const t2v = await mockProviderAdapter.generateVideoT2V(provider, { projectId: 'p1', providerId: provider.id, model: 'mock-video', prompt: 't2v', mode: 'T2V' });
const i2v = await mockProviderAdapter.generateVideoI2V(provider, { projectId: 'p1', providerId: provider.id, model: 'mock-video', prompt: 'i2v', mode: 'I2V' });
const r2v = await mockProviderAdapter.generateVideoR2V(provider, { projectId: 'p1', providerId: provider.id, model: 'mock-video', prompt: 'r2v', mode: 'R2V' });
assert(t2v.task.mode === 'T2V' && i2v.task.mode === 'I2V' && r2v.task.mode === 'R2V', '视频模式应正确');

const status = await mockProviderAdapter.getTaskStatus('task_test');
assert(status.id === 'task_test' && typeof status.progress === 'number' && status.status === 'polling', '任务状态格式应正确');

try {
  await mockProviderAdapter.generateVideoT2V({ ...provider, capabilities: ['image'] }, { projectId: 'p1', providerId: provider.id, model: 'mock-video', prompt: 't2v', mode: 'T2V' });
  throw new Error('不支持能力时应该抛错');
} catch (error) {
  assert(error instanceof HttpError, '不支持能力应抛出 HttpError');
  const httpError = error as HttpError;
  assert(httpError.apiError.code === 'MODEL_NOT_SUPPORTED', '不支持能力应返回 MODEL_NOT_SUPPORTED');
}

try {
  await mockProviderAdapter.testConnection({ ...provider, maskedApiKey: '' });
  throw new Error('未配置 Key 时应该抛错');
} catch (error) {
  assert(error instanceof HttpError, '无效 Key 应抛出 HttpError');
  const httpError = error as HttpError;
  assert(httpError.apiError.code === 'INVALID_API_KEY', '无效 Key 应返回 INVALID_API_KEY');
}

console.log('verifyProviderAdapter passed');
