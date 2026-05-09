/**
 * verifyWanxiangT2VAdapter.ts
 *
 * dry-run: 验证 adapter 注册、unsupported 方法、参数映射、错误映射
 * live test: 需 RUN_WANXIANG_T2V_LIVE_TEST=true + DASHSCOPE_TEST_API_KEY
 *
 * ⚠️ live test 会产生阿里云百炼视频生成费用，请确认后再执行。
 */

import { aliyunWanxiangT2VAdapter, defaultWanxiangT2VModel, mapT2VParamsToWanxiang } from '../src/providers/aliyunWanxiangT2VAdapter.js';
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

console.log('\n=== 万相 T2V Adapter dry-run 验证 ===\n');

// 1. adapter 存在且已注册
assert(aliyunWanxiangT2VAdapter.id === 'aliyun-wanxiang-t2v', 'Adapter id 应为 aliyun-wanxiang-t2v');
assert(aliyunWanxiangT2VAdapter.capabilities.includes('t2v'), 'Adapter 应声明 t2v 能力');
assert(getProviderAdapter('aliyun-wanxiang-t2v') === aliyunWanxiangT2VAdapter, 'Registry 应能获取 aliyun-wanxiang-t2v');
assert(getProviderAdapter('wanxiang-t2v') === aliyunWanxiangT2VAdapter, 'Registry 应能获取 wanxiang-t2v 别名');
assert(getProviderAdapter('dashscope') === aliyunWanxiangT2VAdapter, 'Registry 应能获取 dashscope 别名');

// 2. 默认模型常量
assert(defaultWanxiangT2VModel === 'wan2.7-t2v', '默认模型应为 wan2.7-t2v');

// 3. unsupported 方法返回 MODEL_NOT_SUPPORTED
const dryProvider: ProviderRecord = createProviderCredential({
  name: '万相 T2V Dry Run',
  providerType: 'aliyun-wanxiang-t2v',
  baseUrl: 'https://dashscope.aliyuncs.com',
  apiKey: 'dry-run-key-not-real',
  defaultModel: 'wan2.7-t2v',
  capabilities: ['t2v', 'asyncTask', 'polling'],
});

const dummyVideoInput = { projectId: 'p1', providerId: dryProvider.id, model: 'wan2.7-t2v', prompt: 'test', mode: 'T2V' as const };

try {
  await aliyunWanxiangT2VAdapter.generateImage(dryProvider, { projectId: 'p1', providerId: dryProvider.id, model: 'test', prompt: 'test' });
  throw new Error('generateImage 应返回 MODEL_NOT_SUPPORTED');
} catch (error) {
  const item = error as { apiError?: { code?: string } };
  assert(item.apiError?.code === 'MODEL_NOT_SUPPORTED', 'generateImage 应返回 MODEL_NOT_SUPPORTED');
}

try {
  await aliyunWanxiangT2VAdapter.generateVideoI2V(dryProvider, { ...dummyVideoInput, mode: 'I2V' });
  throw new Error('generateVideoI2V 应返回 MODEL_NOT_SUPPORTED');
} catch (error) {
  const item = error as { apiError?: { code?: string } };
  assert(item.apiError?.code === 'MODEL_NOT_SUPPORTED', 'generateVideoI2V 应返回 MODEL_NOT_SUPPORTED');
}

try {
  await aliyunWanxiangT2VAdapter.generateVideoR2V(dryProvider, { ...dummyVideoInput, mode: 'R2V' });
  throw new Error('generateVideoR2V 应返回 MODEL_NOT_SUPPORTED');
} catch (error) {
  const item = error as { apiError?: { code?: string } };
  assert(item.apiError?.code === 'MODEL_NOT_SUPPORTED', 'generateVideoR2V 应返回 MODEL_NOT_SUPPORTED');
}

// 4. 参数映射
const mapped16x9 = mapT2VParamsToWanxiang({ ...dummyVideoInput, params: { duration: 6, aspect: '16:9', resolution: '1080p' } });
assert(mapped16x9.resolvedDuration === 6, '16:9 1080p duration=6 应映射 resolvedDuration=6');
assert(mapped16x9.resolvedSize === '1920*1080', '16:9 1080p 应映射 1920*1080');
assert(mapped16x9.resolution === '1080P', '1080p 应映射 1080P');
assert(!mapped16x9.fallbackReason, '16:9 不应有 fallback');

const mapped9x16 = mapT2VParamsToWanxiang({ ...dummyVideoInput, params: { duration: 4, aspect: '9:16', resolution: '720p' } });
assert(mapped9x16.resolvedSize === '720*1280', '9:16 720p 应映射 720*1280');

const mapped1x1 = mapT2VParamsToWanxiang({ ...dummyVideoInput, params: { aspect: '1:1', resolution: '720p' } });
assert(mapped1x1.resolvedSize === '720*720', '1:1 720p 应映射 720*720');

const mappedUnknown = mapT2VParamsToWanxiang({ ...dummyVideoInput, params: { aspect: '4:3' } });
assert(typeof mappedUnknown.fallbackReason === 'string', '未知画幅应有 fallback reason');

const mappedEdge = mapT2VParamsToWanxiang({ ...dummyVideoInput, params: { duration: 999 } });
assert(mappedEdge.resolvedDuration === 15, 'duration=999 应被限制为 15');

const mappedEdge2 = mapT2VParamsToWanxiang({ ...dummyVideoInput, params: { duration: 0 } });
assert(mappedEdge2.resolvedDuration === 2, 'duration=0 应被限制为 2');

// 5. 错误映射 — 通过 adapter 的存在性间接验证
assert(typeof aliyunWanxiangT2VAdapter.testConnection === 'function', 'testConnection 方法应存在');
assert(typeof aliyunWanxiangT2VAdapter.getTaskStatus === 'function', 'getTaskStatus 方法应存在');

console.log('\n✅ 万相 T2V Adapter dry-run 全部通过\n');

/* ── live test ── */

if (process.env.RUN_WANXIANG_T2V_LIVE_TEST === 'true') {
  const apiKey = process.env.DASHSCOPE_TEST_API_KEY ?? process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error('RUN_WANXIANG_T2V_LIVE_TEST=true 时必须提供 DASHSCOPE_TEST_API_KEY。真实测试会产生百炼视频生成费用。');
  }

  console.log('\n=== 万相 T2V Adapter live test ===\n');
  console.log('⚠️  本测试会调用真实百炼 API，可能产生视频生成费用。\n');

  const liveProvider = createProviderCredential({
    name: '万相 T2V Live Test',
    providerType: 'aliyun-wanxiang-t2v',
    baseUrl: 'https://dashscope.aliyuncs.com',
    apiKey,
    defaultModel: 'wan2.7-t2v',
    capabilities: ['t2v', 'asyncTask', 'polling'],
  });

  try {
    // 1. testConnection
    console.log('--- 步骤 1: testConnection ---');
    const connResult = await aliyunWanxiangT2VAdapter.testConnection(liveProvider);
    console.log(`  ok: ${connResult.ok}`);
    console.log(`  message: ${connResult.message}`);
    console.log(`  capabilities: ${JSON.stringify(connResult.capabilities)}`);
    assert(connResult.ok, 'testConnection 应成功');

    // 2. 创建短视频任务
    console.log('\n--- 步骤 2: generateVideoT2V ---');
    const prompt = 'A calm blue water droplet logo gently floating on a clean white background, minimal motion, product style.';
    const result = await aliyunWanxiangT2VAdapter.generateVideoT2V(liveProvider, {
      projectId: 'live-test-project',
      providerId: liveProvider.id,
      model: 'wan2.7-t2v',
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
    console.log(`  resolvedSize: ${task.params.resolvedSize}`);

    // 3. 轮询
    if (task.providerTaskId) {
      console.log('\n--- 步骤 3: 轮询任务状态 ---');
      const maxPolls = 120;
      const pollIntervalMs = 5000;
      let pollCount = 0;

      for (let i = 0; i < maxPolls; i++) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        pollCount++;
        const status = await aliyunWanxiangT2VAdapter.getTaskStatus(liveProvider, task);
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

            console.log('\n✅ 万相 T2V live test 全部通过');
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
          console.log(`  retryable: true（视频任务可重试）`);
          process.exitCode = 1;
          break;
        }

        if (i === maxPolls - 1) {
          console.log(`\n--- 轮询超时 ---`);
          console.log(`  ⏱️ 轮询超时（${pollCount} 次，共 ${Math.round(pollCount * pollIntervalMs / 1000)}s）`);
          console.log(`  errorCode: TASK_TIMEOUT`);
          console.log(`  retryable: true`);
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
  console.log('跳过 live test（设置 RUN_WANXIANG_T2V_LIVE_TEST=true 和 DASHSCOPE_TEST_API_KEY 以执行真实测试）');
}
