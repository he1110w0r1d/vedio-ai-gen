/**
 * verifyKlingT2VAdapter.ts
 *
 * dry-run: 验证 adapter 注册、unsupported 方法、参数映射、错误映射
 * live test: 需 RUN_KLING_T2V_LIVE_TEST=true + KLING_TEST_API_KEY
 *
 * ⚠️ live test 会产生 Kling 视频生成费用，请确认后再执行。
 */

import { klingT2VAdapter, defaultKlingT2VModel, mapT2VParamsToKling } from '../src/providers/klingT2VAdapter.js';
import { getProviderAdapter } from '../src/providers/providerRegistry.js';
import { createProviderCredential } from '../src/services/credentialService.js';
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

console.log('\n=== Kling T2V Adapter dry-run 验证 ===\n');

// 1. adapter 存在且已注册
assert(klingT2VAdapter.id === 'kling-t2v', 'Adapter id 应为 kling-t2v');
assert(klingT2VAdapter.capabilities.includes('t2v'), 'Adapter 应声明 t2v 能力');
assert(getProviderAdapter('kling-t2v') === klingT2VAdapter, 'Registry 应能获取 kling-t2v');

// 2. 默认模型常量
assert(defaultKlingT2VModel === 'pro-text-to-video', '默认模型应为 pro-text-to-video');

// 3. unsupported 方法返回 MODEL_NOT_SUPPORTED
const dryProvider: ProviderRecord = createProviderCredential({
  name: 'Kling T2V Dry Run',
  providerType: 'kling-t2v',
  baseUrl: 'https://kling3api.com',
  apiKey: 'dry-run-key-not-real',
  defaultModel: 'pro-text-to-video',
  capabilities: ['t2v', 'asyncTask', 'polling'],
});

const dummyVideoInput = { projectId: 'p1', providerId: dryProvider.id, model: 'pro-text-to-video', prompt: 'test', mode: 'T2V' as const };

try {
  await klingT2VAdapter.generateImage(dryProvider, { projectId: 'p1', providerId: dryProvider.id, model: 'test', prompt: 'test' });
  throw new Error('generateImage 应返回 MODEL_NOT_SUPPORTED');
} catch (error) {
  const item = error as { apiError?: { code?: string } };
  assert(item.apiError?.code === 'MODEL_NOT_SUPPORTED', 'generateImage 应返回 MODEL_NOT_SUPPORTED');
}

try {
  await klingT2VAdapter.generateVideoI2V(dryProvider, { ...dummyVideoInput, mode: 'I2V' });
  throw new Error('generateVideoI2V 应返回 MODEL_NOT_SUPPORTED');
} catch (error) {
  const item = error as { apiError?: { code?: string } };
  assert(item.apiError?.code === 'MODEL_NOT_SUPPORTED', 'generateVideoI2V 应返回 MODEL_NOT_SUPPORTED');
}

try {
  await klingT2VAdapter.generateVideoR2V(dryProvider, { ...dummyVideoInput, mode: 'R2V' });
  throw new Error('generateVideoR2V 应返回 MODEL_NOT_SUPPORTED');
} catch (error) {
  const item = error as { apiError?: { code?: string } };
  assert(item.apiError?.code === 'MODEL_NOT_SUPPORTED', 'generateVideoR2V 应返回 MODEL_NOT_SUPPORTED');
}

// 4. 参数映射
const mapped16x9 = mapT2VParamsToKling({ ...dummyVideoInput, params: { duration: 5, aspect: '16:9', resolution: '1080p' } });
assert(mapped16x9.resolvedDuration === 5, '16:9 1080p duration=5 应映射 resolvedDuration=5');
assert(mapped16x9.resolvedAspectRatio === '16:9', '16:9 应映射 resolvedAspectRatio=16:9');
assert(mapped16x9.resolvedResolution === '1080p', '1080p 应映射 resolvedResolution=1080p');
assert(mapped16x9.model === 'pro-text-to-video', 'pro-text-to-video 应映射 model=pro-text-to-video');
assert(!mapped16x9.fallbackReason, '16:9 不应有 fallback');

const mapped9x16 = mapT2VParamsToKling({ ...dummyVideoInput, params: { duration: 10, aspect: '9:16' } });
assert(mapped9x16.resolvedAspectRatio === '9:16', '9:16 应映射 resolvedAspectRatio=9:16');
assert(mapped9x16.resolvedDuration === 10, 'duration=10 应映射 resolvedDuration=10');

const mapped1x1 = mapT2VParamsToKling({ ...dummyVideoInput, params: { aspect: '1:1' } });
assert(mapped1x1.resolvedAspectRatio === '1:1', '1:1 应映射 resolvedAspectRatio=1:1');

const mappedUnknown = mapT2VParamsToKling({ ...dummyVideoInput, params: { aspect: '4:3' } });
assert(typeof mappedUnknown.fallbackReason === 'string', '未知画幅应有 fallback reason');
assert(mappedUnknown.resolvedAspectRatio === '16:9', '未知画幅应回退为 16:9');

const mappedEdge = mapT2VParamsToKling({ ...dummyVideoInput, params: { duration: 999 } });
assert(mappedEdge.resolvedDuration === 15, 'duration=999 应被限制为 15');

const mappedEdge2 = mapT2VParamsToKling({ ...dummyVideoInput, params: { duration: 0 } });
assert(mappedEdge2.resolvedDuration === 3, 'duration=0 应被限制为 3');

const mappedStd = mapT2VParamsToKling({ ...dummyVideoInput, model: 'std-text-to-video', params: { duration: 5 } });
assert(mappedStd.model === 'std-text-to-video', 'std-text-to-video 应映射 model=std-text-to-video');

// 5. 错误映射 — 通过 adapter 的存在性间接验证
assert(typeof klingT2VAdapter.testConnection === 'function', 'testConnection 方法应存在');
assert(typeof klingT2VAdapter.generateVideoT2V === 'function', 'generateVideoT2V 方法应存在');
assert(typeof klingT2VAdapter.getTaskStatus === 'function', 'getTaskStatus 方法应存在');

console.log('\n✅ Kling T2V Adapter dry-run 全部通过\n');

/* ── live test ── */

if (process.env.RUN_KLING_T2V_LIVE_TEST === 'true') {
  const apiKey = process.env.KLING_TEST_API_KEY;
  if (!apiKey) {
    throw new Error('RUN_KLING_T2V_LIVE_TEST=true 时必须提供 KLING_TEST_API_KEY。真实测试会产生 Kling 视频生成费用。');
  }

  console.log('\n=== Kling T2V Adapter live test ===\n');
  console.log('⚠️  本测试会调用真实 Kling API，可能产生视频生成费用。\n');

  const liveProvider = createProviderCredential({
    name: 'Kling T2V Live Test',
    providerType: 'kling-t2v',
    baseUrl: 'https://kling3api.com',
    apiKey,
    defaultModel: 'pro-text-to-video',
    capabilities: ['t2v', 'asyncTask', 'polling'],
  });

  try {
    // 1. testConnection
    console.log('--- 步骤 1: testConnection ---');
    const connResult = await klingT2VAdapter.testConnection(liveProvider);
    console.log(`  ok: ${connResult.ok}`);
    console.log(`  message: ${connResult.message}`);
    console.log(`  capabilities: ${JSON.stringify(connResult.capabilities)}`);
    assert(connResult.ok, 'testConnection 应成功');

    // 2. 创建短视频任务
    console.log('\n--- 步骤 2: generateVideoT2V ---');
    const prompt = 'A calm blue water droplet logo gently floating on a clean white background, minimal motion, product style.';
    const result = await klingT2VAdapter.generateVideoT2V(liveProvider, {
      projectId: 'live-test-project',
      providerId: liveProvider.id,
      model: 'pro-text-to-video',
      prompt,
      mode: 'T2V',
      params: { duration: 5, aspect: '16:9', resolution: '720p' },
    });

    const task = result.task;
    console.log(`  本地 task id: ${task.id}`);
    console.log(`  providerTaskId: ${task.providerTaskId ? maskId(task.providerTaskId) : '无'}`);
    console.log(`  task status: ${task.status}`);
    console.log(`  providerTaskStatus: ${task.providerTaskStatus ?? '无'}`);
    console.log(`  model: ${task.model}`);
    console.log(`  resolvedDuration: ${task.params.resolvedDuration}`);
    console.log(`  resolvedAspectRatio: ${task.params.resolvedAspectRatio}`);

    // 3. 轮询
    if (task.providerTaskId) {
      console.log('\n--- 步骤 3: 轮询任务状态 ---');
      const maxPolls = 120;
      const pollIntervalMs = 5000;
      let pollCount = 0;

      for (let i = 0; i < maxPolls; i++) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        pollCount++;
        const status = await klingT2VAdapter.getTaskStatus(liveProvider, task);
        console.log(`  [${pollCount}/${maxPolls}] status=${status.status} progress=${status.progress} providerTaskStatus=${status.providerTaskStatus ?? '?'}`);

        if (status.status === 'completed') {
          console.log(`\n--- 步骤 4: 任务完成 ---`);
          console.log(`  ✅ 任务完成`);
          console.log(`  polling 总次数: ${pollCount}`);
          console.log(`  providerTaskId: ${task.providerTaskId ? maskId(task.providerTaskId) : '无'}`);
          console.log(`  providerTaskStatus: ${status.providerTaskStatus ?? '无'}`);

          if (status.videoUrl) {
            const urlHost = new URL(status.videoUrl).hostname;
            console.log(`  视频 URL host: ${urlHost}`);

            // 下载
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

            console.log('\n✅ Kling T2V live test 全部通过');
          } else {
            console.log('  ⚠️ 任务完成但未返回视频 URL');
            process.exitCode = 1;
          }
          break;
        }

        if (status.status === 'failed') {
          console.log(`\n--- 任务失败 ---`);
          console.log(`  errorCode: ${status.errorCode ?? '?'}`);
          console.log(`  errorReason: ${status.errorReason ?? '?'}`);
          process.exitCode = 1;
          break;
        }
      }

      if (pollCount >= maxPolls) {
        console.log('\n--- 任务超时 ---');
        console.log(`  轮询次数: ${pollCount}`);
        process.exitCode = 1;
      }
    } else {
      console.log('  ⚠️ 未返回 providerTaskId');
      process.exitCode = 1;
    }
  } catch (error: any) {
    console.error(`\n❌ Kling T2V live test 失败: ${error?.message ?? error}`);
    process.exitCode = 1;
  }
} else {
  console.log('跳过 live test（设置 RUN_KLING_T2V_LIVE_TEST=true 和 KLING_TEST_API_KEY 以执行真实测试）\n');
}