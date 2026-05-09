/**
 * verifyHappyHorseR2VAdapter.ts
 *
 * dry-run: 验证 HappyHorse R2V adapter 注册、unsupported 方法、参数映射
 * live test: 需 RUN_HAPPYHORSE_R2V_LIVE_TEST=true + DASHSCOPE_TEST_API_KEY
 */

import { aliyunHappyHorseR2VAdapter, defaultHappyHorseR2VModel, ensureImageReference, mapHappyHorseR2VParams } from '../src/providers/aliyunHappyHorseR2VAdapter.js';
import { getProviderAdapter } from '../src/providers/providerRegistry.js';
import { createProviderCredential } from '../src/services/credentialService.js';
import { HttpError } from '../src/utils/errors.js';
import type { ProviderRecord } from '../src/types/provider.js';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`❌ ${message}`);
  console.log(`  ✅ ${message}`);
}

function maskId(value: string) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

console.log('\n=== HappyHorse R2V Adapter dry-run 验证 ===\n');

assert(aliyunHappyHorseR2VAdapter.id === 'aliyun-happyhorse-r2v', 'Adapter id 应为 aliyun-happyhorse-r2v');
assert(aliyunHappyHorseR2VAdapter.capabilities.includes('r2v'), 'Adapter 应声明 r2v 能力');
assert(getProviderAdapter('aliyun-happyhorse-r2v') === aliyunHappyHorseR2VAdapter, 'Registry 应能获取 aliyun-happyhorse-r2v');
assert(defaultHappyHorseR2VModel === 'happyhorse-1.0-r2v', '默认模型应为 happyhorse-1.0-r2v');

const dryProvider: ProviderRecord = createProviderCredential({
  name: 'HappyHorse R2V Dry Run', providerType: 'aliyun-happyhorse-r2v',
  baseUrl: 'https://dashscope.aliyuncs.com', apiKey: 'dry-run-key-not-real',
  defaultModel: 'happyhorse-1.0-r2v', capabilities: ['r2v', 'asyncTask', 'polling'],
});

const dummyVideoInput = { projectId: 'p1', providerId: dryProvider.id, model: 'happyhorse-1.0-r2v', prompt: 'test', mode: 'R2V' as const };

try { await aliyunHappyHorseR2VAdapter.generateImage(dryProvider, { projectId: 'p1', providerId: dryProvider.id, model: 'test', prompt: 'test' }); throw new Error('generateImage 应返回 MODEL_NOT_SUPPORTED'); }
catch (error) { assert((error as { apiError?: { code?: string } }).apiError?.code === 'MODEL_NOT_SUPPORTED', 'generateImage 应返回 MODEL_NOT_SUPPORTED'); }
try { await aliyunHappyHorseR2VAdapter.generateVideoT2V(dryProvider, { ...dummyVideoInput, mode: 'T2V' }); throw new Error('generateVideoT2V 应返回 MODEL_NOT_SUPPORTED'); }
catch (error) { assert((error as { apiError?: { code?: string } }).apiError?.code === 'MODEL_NOT_SUPPORTED', 'generateVideoT2V 应返回 MODEL_NOT_SUPPORTED'); }
try { await aliyunHappyHorseR2VAdapter.generateVideoI2V(dryProvider, { ...dummyVideoInput, mode: 'I2V' }); throw new Error('generateVideoI2V 应返回 MODEL_NOT_SUPPORTED'); }
catch (error) { assert((error as { apiError?: { code?: string } }).apiError?.code === 'MODEL_NOT_SUPPORTED', 'generateVideoI2V 应返回 MODEL_NOT_SUPPORTED'); }

// Missing reference asset
try { await aliyunHappyHorseR2VAdapter.generateVideoR2V(dryProvider, { ...dummyVideoInput, params: {} }); throw new Error('应抛出异常'); }
catch (error) { assert(error instanceof Error, '缺少参考素材时应抛出异常'); }

// Parameter mapping
const m1 = mapHappyHorseR2VParams({ ...dummyVideoInput, params: { duration: 7, aspect: '16:9', resolution: '1080p' } });
assert(m1.resolvedDuration === 7, '16:9 1080p duration=7');
assert(m1.resolution === '1080P', '1080p → 1080P');

const m2 = mapHappyHorseR2VParams({ ...dummyVideoInput, params: { duration: 999 } });
assert(m2.resolvedDuration === 15, 'duration=999 → 15');

const m3 = mapHappyHorseR2VParams({ ...dummyVideoInput, params: { duration: 1 } });
assert(m3.resolvedDuration === 3, 'duration=1 → 3 (min=3)');

// Prompt reference formatting
const r1 = ensureImageReference('A dog runs happily.');
assert(r1 === '[Image 1] A dog runs happily.', 'ensureImageReference 应添加 [Image 1] 前缀');
const r2 = ensureImageReference('[Image 1] A dog runs happily.');
assert(r2 === '[Image 1] A dog runs happily.', '已有 [Image 1] 不重复添加');
const r3 = ensureImageReference('[Image 2] A cat jumps.');
assert(r3 === '[Image 2] A cat jumps.', '已有 [Image n] 不修改');

assert(typeof aliyunHappyHorseR2VAdapter.testConnection === 'function', 'testConnection 方法应存在');
assert(typeof aliyunHappyHorseR2VAdapter.getTaskStatus === 'function', 'getTaskStatus 方法应存在');

console.log('\n✅ HappyHorse R2V Adapter dry-run 全部通过\n');

if (process.env.RUN_HAPPYHORSE_R2V_LIVE_TEST === 'true') {
  const apiKey = process.env.DASHSCOPE_TEST_API_KEY ?? process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error('RUN_HAPPYHORSE_R2V_LIVE_TEST=true 时必须提供 DASHSCOPE_TEST_API_KEY');
  const testReferenceUrl = process.env.HAPPYHORSE_R2V_TEST_REFERENCE_IMAGE_URL || 'https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg';

  console.log('\n=== HappyHorse R2V Adapter live test ===\n');
  console.log('⚠️  本测试会调用真实百炼 API，可能产生视频生成费用。\n');

  const liveProvider = createProviderCredential({
    name: 'HappyHorse R2V Live Test', providerType: 'aliyun-happyhorse-r2v',
    baseUrl: 'https://dashscope.aliyuncs.com', apiKey,
    defaultModel: 'happyhorse-1.0-r2v', capabilities: ['r2v', 'asyncTask', 'polling'],
  });

  try {
    console.log('--- 步骤 1: testConnection ---');
    const connResult = await aliyunHappyHorseR2VAdapter.testConnection(liveProvider);
    console.log(`  ok: ${connResult.ok}`);
    console.log(`  message: ${connResult.message}`);
    assert(connResult.ok, 'testConnection 应成功');

    console.log('\n--- 步骤 2: generateVideoR2V ---');
    console.log(`  使用的测试参考图片 URL: ${testReferenceUrl}`);
    const result = await aliyunHappyHorseR2VAdapter.generateVideoR2V(liveProvider, {
      projectId: 'live-test-project', providerId: liveProvider.id, model: 'happyhorse-1.0-r2v',
      prompt: 'smiling and waving at the camera in a sunny park.', mode: 'R2V',
      params: { duration: 5, resolution: '720p', aspect: '16:9', referenceUrl: testReferenceUrl },
    });

    const task = result.task;
    console.log(`  本地 task id: ${task.id}`);
    console.log(`  providerTaskId: ${task.providerTaskId ? maskId(task.providerTaskId) : '无'}`);
    console.log(`  task status: ${task.status}`);
    console.log(`  model: ${task.model}`);

    if (task.providerTaskId) {
      console.log('\n--- 步骤 3: 轮询任务状态 ---');
      const maxPolls = 120; const pollIntervalMs = 5000; let pollCount = 0;
      for (let i = 0; i < maxPolls; i++) {
        await new Promise((r) => setTimeout(r, pollIntervalMs)); pollCount++;
        const status = await aliyunHappyHorseR2VAdapter.getTaskStatus(liveProvider, task);
        console.log(`  [${pollCount}/${maxPolls}] status=${status.status} progress=${status.progress} providerTaskStatus=${status.providerTaskStatus ?? '?'}`);
        if (status.status === 'completed') {
          console.log(`\n--- 步骤 4: 任务完成 ---\n  ✅ 任务完成\n  polling 总次数: ${pollCount}`);
          if (status.videoUrl) {
            console.log(`  视频 URL host: ${new URL(status.videoUrl).hostname}`);
            const { saveRemoteVideoToLocal } = await import('../src/services/fileStorageService.js');
            const { createId } = await import('../src/utils/id.js');
            const stored = await saveRemoteVideoToLocal({ remoteUrl: status.videoUrl, fileName: `${createId('asset_vid')}.mp4` });
            console.log(`  sizeBytes: ${stored.sizeBytes ?? 0}\n  storageType: ${stored.storageType}`);
            console.log('\n✅ HappyHorse R2V live test 全部通过');
          } else { console.log('  ⚠️ 无视频 URL'); process.exitCode = 1; }
          break;
        }
        if (status.status === 'failed') { console.log(`\n  ❌ 失败\nerrorCode: ${status.errorCode}`); process.exitCode = 1; break; }
        if (i === maxPolls - 1) { console.log('\n  ⏱️ 超时'); process.exitCode = 1; }
      }
    }
  } catch (error) {
    console.log('\n--- 失败 ---');
    if (error instanceof HttpError) { console.log(`  ❌ ${error.apiError.code}: ${error.apiError.message}`); process.exitCode = 1; }
    else if (error instanceof Error) { console.log(`  ❌ ${error.message}`); process.exitCode = 1; }
    else { throw error; }
  }
} else {
  console.log('跳过 live test（设置 RUN_HAPPYHORSE_R2V_LIVE_TEST=true 和 DASHSCOPE_TEST_API_KEY 以执行真实测试）');
}
