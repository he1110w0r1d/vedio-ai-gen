/**
 * verifyWanxiangR2VAdapter.ts
 *
 * dry-run: 验证 adapter 注册、unsupported 方法、参数映射、错误映射
 * live test: 需 RUN_WANXIANG_R2V_LIVE_TEST=true + DASHSCOPE_TEST_API_KEY + WANXIANG_R2V_TEST_REFERENCE_IMAGE_URL
 *
 * ⚠️ live test 会产生阿里云百炼视频生成费用，请确认后再执行。
 */

import { aliyunWanxiangR2VAdapter, defaultWanxiangR2VModel, mapR2VParamsToWanxiang, hasCharacterReference } from '../src/providers/aliyunWanxiangR2VAdapter.js';
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

/* ── dry-run ── */

console.log('\n=== 万相 R2V Adapter dry-run 验证 ===\n');

// 1. adapter 存在且已注册
assert(aliyunWanxiangR2VAdapter.id === 'aliyun-wanxiang-r2v', 'Adapter id 应为 aliyun-wanxiang-r2v');
assert(aliyunWanxiangR2VAdapter.capabilities.includes('r2v'), 'Adapter 应声明 r2v 能力');
assert(getProviderAdapter('aliyun-wanxiang-r2v') === aliyunWanxiangR2VAdapter, 'Registry 应能获取 aliyun-wanxiang-r2v');
assert(getProviderAdapter('wanxiang-r2v') === aliyunWanxiangR2VAdapter, 'Registry 应能获取 wanxiang-r2v 别名');

// 2. 默认模型常量
assert(defaultWanxiangR2VModel === 'wan2.7-r2v', '默认模型应为 wan2.7-r2v');

// 3. unsupported 方法返回 MODEL_NOT_SUPPORTED
const dryProvider: ProviderRecord = createProviderCredential({
  name: '万相 R2V Dry Run',
  providerType: 'aliyun-wanxiang-r2v',
  baseUrl: 'https://dashscope.aliyuncs.com',
  apiKey: 'dry-run-key-not-real',
  defaultModel: 'wan2.7-r2v',
  capabilities: ['r2v', 'asyncTask', 'polling'],
});

const dummyVideoInput = { projectId: 'p1', providerId: dryProvider.id, model: 'wan2.7-r2v', prompt: 'test', mode: 'R2V' as const };

try {
  await aliyunWanxiangR2VAdapter.generateImage(dryProvider, { projectId: 'p1', providerId: dryProvider.id, model: 'test', prompt: 'test' });
  throw new Error('generateImage 应返回 MODEL_NOT_SUPPORTED');
} catch (error) {
  const item = error as { apiError?: { code?: string } };
  assert(item.apiError?.code === 'MODEL_NOT_SUPPORTED', 'generateImage 应返回 MODEL_NOT_SUPPORTED');
}

try {
  await aliyunWanxiangR2VAdapter.generateVideoT2V(dryProvider, { ...dummyVideoInput, mode: 'T2V' });
  throw new Error('generateVideoT2V 应返回 MODEL_NOT_SUPPORTED');
} catch (error) {
  const item = error as { apiError?: { code?: string } };
  assert(item.apiError?.code === 'MODEL_NOT_SUPPORTED', 'generateVideoT2V 应返回 MODEL_NOT_SUPPORTED');
}

try {
  await aliyunWanxiangR2VAdapter.generateVideoI2V(dryProvider, { ...dummyVideoInput, mode: 'I2V' });
  throw new Error('generateVideoI2V 应返回 MODEL_NOT_SUPPORTED');
} catch (error) {
  const item = error as { apiError?: { code?: string } };
  assert(item.apiError?.code === 'MODEL_NOT_SUPPORTED', 'generateVideoI2V 应返回 MODEL_NOT_SUPPORTED');
}

// 4. R2V 参数缺失参考素材时应报错
try {
  await aliyunWanxiangR2VAdapter.generateVideoR2V(dryProvider, dummyVideoInput);
  throw new Error('缺少参考素材时应抛出 INVALID_REFERENCE_ASSET 异常');
} catch (error) {
  const item = error as { apiError?: { code?: string } };
  assert(item.apiError?.code === 'INVALID_REFERENCE_ASSET', '缺少参考素材时正确返回 INVALID_REFERENCE_ASSET');
}

// 5. 参数映射
const mapped720p = mapR2VParamsToWanxiang({ ...dummyVideoInput, params: { duration: 5, resolution: '720p' } });
assert(mapped720p.resolvedDuration === 5, 'duration=5 应映射 resolvedDuration=5');
assert(mapped720p.resolution === '720P', '720p 应映射 720P');

const mapped1080p = mapR2VParamsToWanxiang({ ...dummyVideoInput, params: { duration: 4, resolution: '1080p' } });
assert(mapped1080p.resolution === '1080P', '1080p 应映射 1080P');

const mappedEdge = mapR2VParamsToWanxiang({ ...dummyVideoInput, params: { duration: 999 } });
assert(mappedEdge.resolvedDuration === 10, 'duration=999 应被限制为 10');

const mappedEdge2 = mapR2VParamsToWanxiang({ ...dummyVideoInput, params: { duration: 0 } });
assert(mappedEdge2.resolvedDuration === 2, 'duration=0 应被限制为 2');

// 6. character1 prompt 检查
assert(hasCharacterReference('character1 正在微笑') === true, 'character1 prompt 应通过检查');
assert(hasCharacterReference('角色1 正在微笑') === true, '角色1 prompt 应通过检查');
assert(hasCharacterReference('一个人在微笑') === false, '没有 character1 的 prompt 不应通过检查');

// 7. 方法存在性
assert(typeof aliyunWanxiangR2VAdapter.testConnection === 'function', 'testConnection 方法应存在');
assert(typeof aliyunWanxiangR2VAdapter.getTaskStatus === 'function', 'getTaskStatus 方法应存在');

console.log('\n✅ 万相 R2V Adapter dry-run 全部通过\n');

/* ── live test ── */

if (process.env.RUN_WANXIANG_R2V_LIVE_TEST === 'true') {
  const apiKey = process.env.DASHSCOPE_TEST_API_KEY ?? process.env.DASHSCOPE_API_KEY;
  const testReferenceImageUrl = process.env.WANXIANG_R2V_TEST_REFERENCE_IMAGE_URL || 'https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg';

  if (!apiKey) {
    throw new Error('RUN_WANXIANG_R2V_LIVE_TEST=true 时必须提供 DASHSCOPE_TEST_API_KEY。真实测试会产生百炼视频生成费用。');
  }

  console.log('\n=== 万相 R2V Adapter live test ===\n');
  console.log('⚠️  本测试会调用真实百炼 API，可能产生视频生成费用。\n');

  const liveProvider = createProviderCredential({
    name: '万相 R2V Live Test',
    providerType: 'aliyun-wanxiang-r2v',
    baseUrl: 'https://dashscope.aliyuncs.com',
    apiKey,
    defaultModel: 'wan2.7-r2v',
    capabilities: ['r2v', 'asyncTask', 'polling'],
  });

  try {
    // 1. testConnection
    console.log('--- 步骤 1: testConnection ---');
    const connResult = await aliyunWanxiangR2VAdapter.testConnection(liveProvider);
    console.log(`  ok: ${connResult.ok}`);
    console.log(`  message: ${connResult.message}`);
    console.log(`  capabilities: ${JSON.stringify(connResult.capabilities)}`);
    assert(connResult.ok, 'testConnection 应成功');

    // 2. 创建 R2V task
    console.log('\n--- 步骤 2: generateVideoR2V ---');
    console.log(`  使用的测试参考图片 URL: ${testReferenceImageUrl}`);
    const prompt = 'character1 is smiling and waving at the camera in a sunny park.';
    const result = await aliyunWanxiangR2VAdapter.generateVideoR2V(liveProvider, {
      projectId: 'live-test-project',
      providerId: liveProvider.id,
      model: 'wan2.7-r2v',
      prompt,
      mode: 'R2V',
      params: { duration: 5, resolution: '720p', referenceUrl: testReferenceImageUrl },
    });

    const task = result.task;
    console.log(`  本地 task id: ${task.id}`);
    console.log(`  providerTaskId: ${task.providerTaskId ? maskId(task.providerTaskId) : '无'}`);
    console.log(`  task status: ${task.status}`);
    console.log(`  providerTaskStatus: ${task.providerTaskStatus ?? '无'}`);
    console.log(`  model: ${task.model}`);
    console.log(`  resolvedDuration: ${task.params.resolvedDuration}`);
    console.log(`  referenceType: ${task.params.referenceType}`);
    console.log(`  referenceRole: ${task.params.referenceRole}`);

    // 3. 轮询
    if (task.providerTaskId) {
      console.log('\n--- 步骤 3: 轮询任务状态 ---');
      const maxPolls = 120;
      const pollIntervalMs = 5000;
      let pollCount = 0;

      for (let i = 0; i < maxPolls; i++) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        pollCount++;
        const status = await aliyunWanxiangR2VAdapter.getTaskStatus(liveProvider, task);
        console.log(`  [${pollCount}/${maxPolls}] status=${status.status} progress=${status.progress} providerTaskStatus=${status.providerTaskStatus ?? '?'}`);

        if (status.status === 'completed') {
          console.log(`\n--- 步骤 4: 任务完成 ---`);
          console.log(`  ✅ 任务完成`);
          console.log(`  polling 总次数: ${pollCount}`);

          if (status.videoUrl) {
            const urlHost = new URL(status.videoUrl).hostname;
            console.log(`  视频 URL host: ${urlHost}`);

            console.log('\n--- 步骤 5: 下载视频文件 ---');
            const { saveRemoteVideoToLocal } = await import('../src/services/fileStorageService.js');
            const { createId } = await import('../src/utils/id.js');
            const assetId = createId('asset_vid');
            const stored = await saveRemoteVideoToLocal({ remoteUrl: status.videoUrl, fileName: `${assetId}.mp4` });
            console.log(`  asset id: ${assetId}`);
            console.log(`  localPath: ${stored.localPath ?? ''}`);
            console.log(`  sizeBytes: ${stored.sizeBytes ?? 0}`);
            console.log(`  mimeType: ${stored.mimeType ?? 'unknown'}`);
            console.log(`  public url: ${stored.publicUrl}`);
            console.log(`  storageType: ${stored.storageType}`);

            console.log('\n✅ 万相 R2V live test 全部通过');
          } else {
            console.log('  ⚠️ 任务完成但未返回视频 URL');
            process.exitCode = 1;
          }
          break;
        }

        if (status.status === 'failed') {
          console.log(`\n--- 任务失败 ---`);
          console.log(`  ❌ 任务失败`);
          console.log(`  polling 总次数: ${pollCount}`);
          console.log(`  errorCode: ${status.errorCode ?? '无'}`);
          console.log(`  errorReason: ${status.errorReason ?? '无'}`);
          process.exitCode = 1;
          break;
        }

        if (i === maxPolls - 1) {
          console.log(`\n--- 轮询超时 ---`);
          console.log(`  ⏱️ 轮询超时（${pollCount} 次，共 ${Math.round(pollCount * pollIntervalMs / 1000)}s）`);
          process.exitCode = 1;
        }
      }
    }
  } catch (error) {
    console.log('\n--- 失败 ---');
    if (error instanceof HttpError) {
      console.log(`  ❌ Live test failed`);
      console.log(`  errorCode: ${error.apiError.code}`);
      console.log(`  message: ${error.apiError.message}`);
      console.log(`  retryable: ${error.apiError.retryable}`);
      console.log(`  provider: ${error.apiError.provider ?? '无'}`);
      process.exitCode = 1;
    } else if (error instanceof Error) {
      console.log(`  ❌ ${error.message}`);
      process.exitCode = 1;
    } else {
      throw error;
    }
  }
} else {
  console.log('跳过 live test（设置 RUN_WANXIANG_R2V_LIVE_TEST=true 和 DASHSCOPE_TEST_API_KEY 以执行真实测试）');
}
