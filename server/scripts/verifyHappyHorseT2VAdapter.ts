/**
 * verifyHappyHorseT2VAdapter.ts
 *
 * dry-run: 验证 HappyHorse T2V adapter 注册、unsupported 方法、参数映射
 * live test: 需 RUN_HAPPYHORSE_T2V_LIVE_TEST=true + DASHSCOPE_TEST_API_KEY
 */

import { aliyunHappyHorseT2VAdapter, defaultHappyHorseT2VModel, mapHappyHorseT2VParams } from '../src/providers/aliyunHappyHorseT2VAdapter.js';
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

console.log('\n=== HappyHorse T2V Adapter dry-run 验证 ===\n');

assert(aliyunHappyHorseT2VAdapter.id === 'aliyun-happyhorse-t2v', 'Adapter id 应为 aliyun-happyhorse-t2v');
assert(aliyunHappyHorseT2VAdapter.capabilities.includes('t2v'), 'Adapter 应声明 t2v 能力');
assert(getProviderAdapter('aliyun-happyhorse-t2v') === aliyunHappyHorseT2VAdapter, 'Registry 应能获取 aliyun-happyhorse-t2v');
assert(getProviderAdapter('happyhorse-t2v') === aliyunHappyHorseT2VAdapter, 'Registry 应能获取 happyhorse-t2v 别名');
assert(defaultHappyHorseT2VModel === 'happyhorse-1.0-t2v', '默认模型应为 happyhorse-1.0-t2v');

const dryProvider: ProviderRecord = createProviderCredential({
  name: 'HappyHorse T2V Dry Run',
  providerType: 'aliyun-happyhorse-t2v',
  baseUrl: 'https://dashscope.aliyuncs.com',
  apiKey: 'dry-run-key-not-real',
  defaultModel: 'happyhorse-1.0-t2v',
  capabilities: ['t2v', 'asyncTask', 'polling'],
});

const dummyVideoInput = { projectId: 'p1', providerId: dryProvider.id, model: 'happyhorse-1.0-t2v', prompt: 'test', mode: 'T2V' as const };

// Unsupported methods
try { await aliyunHappyHorseT2VAdapter.generateImage(dryProvider, { projectId: 'p1', providerId: dryProvider.id, model: 'test', prompt: 'test' }); throw new Error('generateImage 应返回 MODEL_NOT_SUPPORTED'); }
catch (error) { assert((error as { apiError?: { code?: string } }).apiError?.code === 'MODEL_NOT_SUPPORTED', 'generateImage 应返回 MODEL_NOT_SUPPORTED'); }
try { await aliyunHappyHorseT2VAdapter.generateVideoI2V(dryProvider, { ...dummyVideoInput, mode: 'I2V' }); throw new Error('generateVideoI2V 应返回 MODEL_NOT_SUPPORTED'); }
catch (error) { assert((error as { apiError?: { code?: string } }).apiError?.code === 'MODEL_NOT_SUPPORTED', 'generateVideoI2V 应返回 MODEL_NOT_SUPPORTED'); }
try { await aliyunHappyHorseT2VAdapter.generateVideoR2V(dryProvider, { ...dummyVideoInput, mode: 'R2V' }); throw new Error('generateVideoR2V 应返回 MODEL_NOT_SUPPORTED'); }
catch (error) { assert((error as { apiError?: { code?: string } }).apiError?.code === 'MODEL_NOT_SUPPORTED', 'generateVideoR2V 应返回 MODEL_NOT_SUPPORTED'); }

// Parameter mapping
const m1 = mapHappyHorseT2VParams({ ...dummyVideoInput, params: { duration: 6, aspect: '16:9', resolution: '1080p' } });
assert(m1.resolvedDuration === 6, '16:9 1080p duration=6');
assert(m1.resolvedSize === '1920*1080', '16:9 1080p → 1920*1080');
assert(m1.resolution === '1080P', '1080p → 1080P');

const m2 = mapHappyHorseT2VParams({ ...dummyVideoInput, params: { aspect: '9:16', resolution: '720p' } });
assert(m2.resolvedSize === '720*1280', '9:16 720p → 720*1280');

const m3 = mapHappyHorseT2VParams({ ...dummyVideoInput, params: { aspect: '4:3', resolution: '720p' } });
assert(m3.resolvedSize === '960*720', '4:3 720p → 960*720');

const m4 = mapHappyHorseT2VParams({ ...dummyVideoInput, params: { aspect: '3:4' } });
assert(m4.requestedRatio === '3:4', '3:4 → requestedRatio=3:4');

const m5 = mapHappyHorseT2VParams({ ...dummyVideoInput, params: { duration: 999 } });
assert(m5.resolvedDuration === 15, 'duration=999 → 15');

const m6 = mapHappyHorseT2VParams({ ...dummyVideoInput, params: { duration: 1 } });
assert(m6.resolvedDuration === 3, 'duration=1 → 3 (min=3)');

assert(typeof aliyunHappyHorseT2VAdapter.testConnection === 'function', 'testConnection 方法应存在');
assert(typeof aliyunHappyHorseT2VAdapter.getTaskStatus === 'function', 'getTaskStatus 方法应存在');

console.log('\n✅ HappyHorse T2V Adapter dry-run 全部通过\n');

/* ── live test ── */

if (process.env.RUN_HAPPYHORSE_T2V_LIVE_TEST === 'true') {
  const apiKey = process.env.DASHSCOPE_TEST_API_KEY ?? process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error('RUN_HAPPYHORSE_T2V_LIVE_TEST=true 时必须提供 DASHSCOPE_TEST_API_KEY');
  }

  console.log('\n=== HappyHorse T2V Adapter live test ===\n');
  console.log('⚠️  本测试会调用真实百炼 API，可能产生视频生成费用。\n');

  const liveProvider = createProviderCredential({
    name: 'HappyHorse T2V Live Test',
    providerType: 'aliyun-happyhorse-t2v',
    baseUrl: 'https://dashscope.aliyuncs.com',
    apiKey,
    defaultModel: 'happyhorse-1.0-t2v',
    capabilities: ['t2v', 'asyncTask', 'polling'],
  });

  try {
    console.log('--- 步骤 1: testConnection ---');
    const connResult = await aliyunHappyHorseT2VAdapter.testConnection(liveProvider);
    console.log(`  ok: ${connResult.ok}`);
    console.log(`  message: ${connResult.message}`);
    assert(connResult.ok, 'testConnection 应成功');

    console.log('\n--- 步骤 2: generateVideoT2V ---');
    const prompt = 'A calm blue water droplet logo gently floating on a clean white background, minimal motion, product style.';
    const result = await aliyunHappyHorseT2VAdapter.generateVideoT2V(liveProvider, {
      projectId: 'live-test-project', providerId: liveProvider.id, model: 'happyhorse-1.0-t2v',
      prompt, mode: 'T2V',
      params: { duration: 5, aspect: '16:9', resolution: '720p' },
    });

    const task = result.task;
    console.log(`  本地 task id: ${task.id}`);
    console.log(`  providerTaskId: ${task.providerTaskId ? maskId(task.providerTaskId) : '无'}`);
    console.log(`  task status: ${task.status}`);
    console.log(`  model: ${task.model}`);

    if (task.providerTaskId) {
      console.log('\n--- 步骤 3: 轮询任务状态 ---');
      const maxPolls = 120;
      const pollIntervalMs = 5000;
      let pollCount = 0;

      for (let i = 0; i < maxPolls; i++) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        pollCount++;
        const status = await aliyunHappyHorseT2VAdapter.getTaskStatus(liveProvider, task);
        console.log(`  [${pollCount}/${maxPolls}] status=${status.status} progress=${status.progress} providerTaskStatus=${status.providerTaskStatus ?? '?'}`);

        if (status.status === 'completed') {
          console.log(`\n--- 步骤 4: 任务完成 ---`);
          console.log(`  ✅ 任务完成`);
          console.log(`  polling 总次数: ${pollCount}`);

          if (status.videoUrl) {
            console.log(`  视频 URL host: ${new URL(status.videoUrl).hostname}`);

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

            console.log('\n✅ HappyHorse T2V live test 全部通过');
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
          console.log(`  ⏱️ 轮询超时（${pollCount} 次）`);
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
      process.exitCode = 1;
    } else if (error instanceof Error) {
      console.log(`  ❌ ${error.message}`);
      process.exitCode = 1;
    } else { throw error; }
  }
} else {
  console.log('跳过 live test（设置 RUN_HAPPYHORSE_T2V_LIVE_TEST=true 和 DASHSCOPE_TEST_API_KEY 以执行真实测试）');
}
