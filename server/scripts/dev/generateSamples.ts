/**
 * 第 8.2.4 阶段：百炼模型族对比验收 —— 页面级样本生成
 *
 * 通过 adapter 直接生成，写入 db.json，可被 Dashboard / Provider Benchmark / Usage 等消费。
 *
 * 用法:
 *   source ~/.zshrc
 *   cd server
 *   APP_ENCRYPTION_KEY=dev-only-local-secret-32-bytes!! \
 *   DASHSCOPE_TEST_API_KEY="$DASHSCOPE_TEST_API_KEY" \
 *   npm run build && node dist/scripts/generateSamples.js
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { getProviderAdapter } from '../src/providers/providerRegistry.js';
import { encryptSecret, maskSecret } from '../src/services/encryptionService.js';
import { createId } from '../src/utils/id.js';
import { nowIso } from '../src/utils/time.js';
import type { ProviderRecord } from '../src/types/provider.js';
import type { AssetRecord } from '../src/types/asset.js';
import type { GenerationTaskRecord } from '../src/types/task.js';
import type { VideoGenerationInput } from '../src/types/generation.js';

const DB_PATH = join(process.cwd(), 'data', 'db.json');

const POLL_INTERVAL_MS = 5000;
const POLL_MAX_COUNT = 120;
const SLEEP = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ========= 样本定义 =========
const T2V_PROMPT = 'A calm blue water droplet logo gently floating on a clean white background, minimal motion, product style.';

const I2V_PROMPT = 'Make the water droplet gently float and rotate in place, with soft studio lighting and minimal camera movement.';

const WANXIANG_R2V_PROMPT = 'character1 gently moves forward, turns slightly toward the camera, and presents a calm product-style motion on a clean white background.';

const HAPPYHORSE_R2V_PROMPT = '[Image 1] gently moves forward, turns slightly toward the camera, and presents a calm product-style motion on a clean white background.';

// 用于 I2V/R2V 的公开参考图片
const REF_IMG_URL = 'https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg';

type SampleSpec = {
  providerType: string;
  providerName: string;
  mode: 'T2V' | 'I2V' | 'R2V';
  model: string;
  prompt: string;
  duration?: number;
  aspect?: string;
  resolution?: string;
  sourceImageUrl?: string;
  referenceUrl?: string;
  referenceType?: string;
};

const SAMPLES: SampleSpec[] = [
  // 万相 T2V
  { providerType: 'aliyun-wanxiang-t2v', providerName: '阿里云百炼万相 T2V', mode: 'T2V', model: 'wan2.7-t2v', prompt: T2V_PROMPT, duration: 5, aspect: '16:9', resolution: '720p' },
  // 万相 I2V
  { providerType: 'aliyun-wanxiang-i2v', providerName: '阿里云百炼万相 I2V', mode: 'I2V', model: 'wan2.6-i2v-flash', prompt: I2V_PROMPT, duration: 5, sourceImageUrl: REF_IMG_URL },
  // 万相 R2V
  { providerType: 'aliyun-wanxiang-r2v', providerName: '阿里云百炼万相 R2V', mode: 'R2V', model: 'wan2.7-r2v', prompt: WANXIANG_R2V_PROMPT, duration: 5, referenceUrl: REF_IMG_URL, referenceType: 'image' },
  // HappyHorse T2V
  { providerType: 'aliyun-happyhorse-t2v', providerName: '阿里云百炼 HappyHorse T2V', mode: 'T2V', model: 'happyhorse-1.0-t2v', prompt: T2V_PROMPT, duration: 5, aspect: '16:9', resolution: '720p' },
  // HappyHorse I2V
  { providerType: 'aliyun-happyhorse-i2v', providerName: '阿里云百炼 HappyHorse I2V', mode: 'I2V', model: 'happyhorse-1.0-i2v', prompt: I2V_PROMPT, duration: 5, sourceImageUrl: REF_IMG_URL },
  // HappyHorse R2V
  { providerType: 'aliyun-happyhorse-r2v', providerName: '阿里云百炼 HappyHorse R2V', mode: 'R2V', model: 'happyhorse-1.0-r2v', prompt: HAPPYHORSE_R2V_PROMPT, duration: 5, referenceUrl: REF_IMG_URL, referenceType: 'image' },
];

// ========= 工具 =========
function readDb(): any {
  return JSON.parse(readFileSync(DB_PATH, 'utf8'));
}

function writeDb(data: any) {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function getApiKey(): string {
  const key = process.env.DASHSCOPE_TEST_API_KEY || process.env.DASHSCOPE_API_KEY;
  if (!key) throw new Error('缺少 DASHSCOPE_TEST_API_KEY');
  return key;
}

function makeProvider(spec: SampleSpec): ProviderRecord {
  const now = nowIso();
  const apiKey = getApiKey();
  const capabilities = [spec.mode.toLowerCase(), 'polling', 'asyncTask'];
  return {
    id: createId('provider'),
    name: spec.providerName,
    providerType: spec.providerType,
    baseUrl: 'https://dashscope.aliyuncs.com',
    encryptedApiKey: encryptSecret(apiKey),
    maskedApiKey: maskSecret(apiKey),
    defaultModel: spec.model,
    capabilities,
    status: 'connected',
    createdAt: now,
    updatedAt: now,
  };
}

function makeVideoInput(spec: SampleSpec, provider: ProviderRecord): VideoGenerationInput {
  return {
    projectId: 'p1',
    providerId: provider.id,
    model: spec.model,
    prompt: spec.prompt,
    mode: spec.mode,
    params: {
      duration: spec.duration ?? 5,
      ...(spec.aspect ? { aspect: spec.aspect, aspectRatio: spec.aspect } : {}),
      ...(spec.resolution ? { resolution: spec.resolution } : {}),
      ...(spec.sourceImageUrl ? { sourceImageUrl: spec.sourceImageUrl, sourceImageMode: 'public_url' } : {}),
      ...(spec.referenceUrl ? { referenceUrl: spec.referenceUrl, referenceType: spec.referenceType ?? 'image' } : {}),
    },
  };
}

async function generateOne(spec: SampleSpec, provider: ProviderRecord): Promise<{ ok: boolean; taskId?: string; assetId?: string; sizeBytes?: number; error?: string; polls?: number }> {
  const adapter = getProviderAdapter(provider.providerType);
  const input = makeVideoInput(spec, provider);

  console.log(`\n--- [${spec.providerName}] ${spec.mode} ---`);
  console.log(`  prompt: ${spec.prompt.substring(0, 60)}...`);

  // Step 1: 生成
  let result;
  try {
    if (spec.mode === 'I2V') result = await adapter.generateVideoI2V(provider, input);
    else if (spec.mode === 'R2V') result = await adapter.generateVideoR2V(provider, input);
    else result = await adapter.generateVideoT2V(provider, input);
  } catch (err: any) {
    console.log(`  ❌ 生成失败: ${err.message}`);
    return { ok: false, error: err.message };
  }

  const task = result.task;
  console.log(`  task: ${task.id}, providerTaskId: ${task.providerTaskId?.substring(0, 8)}…`);

  // Step 2: 写 task 到 db.json
  const db = readDb();
  db.tasks.unshift(task);
  writeDb(db);

  // Step 3: 轮询
  for (let i = 1; i <= POLL_MAX_COUNT; i++) {
    await SLEEP(POLL_INTERVAL_MS);
    const status = await adapter.getTaskStatus(provider, task);
    const progress = typeof status.progress === 'number' ? status.progress : 0;
    if (i % 5 === 0 || status.status !== 'polling') {
      console.log(`  [${i}/${POLL_MAX_COUNT}] status=${status.status} progress=${progress}`);
    }

    if (status.status === 'failed') {
      const db2 = readDb();
      db2.tasks = db2.tasks.map((t: any) => t.id === task.id ? { ...t, status: 'failed', progress: 100, errorCode: status.errorCode, errorReason: status.errorReason, updatedAt: nowIso() } : t);
      writeDb(db2);
      console.log(`  ❌ 失败: ${status.errorReason}`);
      return { ok: false, error: status.errorReason };
    }

    if (status.status === 'completed') {
      console.log(`  ✅ 完成 (polls=${i})`);

      // Step 4: 下载视频
      let asset: AssetRecord;
      try {
        if (!status.videoUrl) throw new Error('缺少视频 URL');
        const { saveRemoteVideoToLocal } = await import('../src/services/fileStorageService.js');
        const assetId = createId('asset_vid');
        const stored = await saveRemoteVideoToLocal({ remoteUrl: status.videoUrl, fileName: `${assetId}.mp4` });
        const now = nowIso();
        asset = {
          id: assetId,
          type: 'video',
          title: `${spec.mode} ${spec.providerName} 真实视频样本`,
          prompt: spec.prompt,
          thumbnail: stored.publicUrl,
          thumbnailUrl: stored.publicUrl,
          url: stored.publicUrl,
          fileUrl: stored.publicUrl,
          storageType: 'local',
          localPath: stored.localPath,
          mimeType: stored.mimeType ?? 'video/mp4',
          sizeBytes: stored.sizeBytes,
          providerId: provider.id,
          providerName: provider.name,
          model: spec.model,
          projectId: 'p1',
          createdAt: now,
          updatedAt: now,
          favorite: false,
          taskId: task.id,
          duration: spec.duration ?? 5,
          durationSeconds: spec.duration ?? 5,
          mode: spec.mode,
          params: { ...task.params, providerTaskId: task.providerTaskId, providerTaskStatus: status.providerTaskStatus },
          parameters: { ...task.params, providerTaskId: task.providerTaskId, providerTaskStatus: status.providerTaskStatus },
        };
        console.log(`  asset: ${asset.id}, sizeBytes: ${stored.sizeBytes}`);
      } catch (err: any) {
        console.log(`  ⚠️  下载失败: ${err.message}`);
        const db3 = readDb();
        db3.tasks = db3.tasks.map((t: any) => t.id === task.id ? { ...t, status: 'failed', progress: 100, errorCode: 'DOWNLOAD_FAILED', errorReason: err.message, updatedAt: nowIso() } : t);
        writeDb(db3);
        return { ok: false, error: err.message };
      }

      // Step 5: 写 asset + 更新 task
      const db4 = readDb();
      db4.assets.unshift(asset);
      db4.tasks = db4.tasks.map((t: any) => t.id === task.id ? { ...t, status: 'completed', progress: 100, providerTaskStatus: status.providerTaskStatus, completedAt: nowIso(), updatedAt: nowIso() } : t);
      writeDb(db4);

      return { ok: true, taskId: task.id, assetId: asset.id, sizeBytes: asset.sizeBytes, polls: i };
    }

    // polling / running → update status
    const dbUpdate = readDb();
    dbUpdate.tasks = dbUpdate.tasks.map((t: any) => t.id === task.id ? { ...t, status: status.status, progress: status.progress, providerTaskStatus: status.providerTaskStatus, updatedAt: nowIso() } : t);
    writeDb(dbUpdate);
  }

  // 超时
  const dbTimeout = readDb();
  dbTimeout.tasks = dbTimeout.tasks.map((t: any) => t.id === task.id ? { ...t, status: 'failed', progress: task.progress ?? 0, errorCode: 'TIMEOUT', errorReason: '轮询超时', updatedAt: nowIso() } : t);
  writeDb(dbTimeout);
  return { ok: false, error: '轮询超时' };
}

// ========= 入口 =========
async function main() {
  console.log('=== 第 8.2.4 阶段页面级样本生成 ===\n');

  const apiKey = getApiKey();
  console.log(`API Key: ${apiKey.substring(0, 4)}****${apiKey.substring(apiKey.length - 4)}`);

  // Step 0: 确保 providers 已存在
  const db = readDb();
  const providerMap = new Map<string, ProviderRecord>();

  for (const spec of SAMPLES) {
    const existing = db.providers.find((p: ProviderRecord) => p.providerType === spec.providerType);
    if (existing) {
      providerMap.set(spec.providerType, existing);
    } else {
      const p = makeProvider(spec);
      db.providers.unshift(p);
      providerMap.set(spec.providerType, p);
      console.log(`  + 新增 provider: ${p.providerType} (${p.id})`);
    }
  }
  writeDb(db);

  // Step 1: 逐个生成
  const results: any[] = [];
  for (let i = 0; i < SAMPLES.length; i++) {
    const spec = SAMPLES[i];
    const provider = providerMap.get(spec.providerType)!;
    console.log(`\n[${i + 1}/${SAMPLES.length}] ${spec.providerName} ${spec.mode}`);

    const result = await generateOne(spec, provider);
    results.push({ ...spec, ...result });
  }

  // 汇总
  console.log('\n\n=== 汇总 ===');
  for (const r of results) {
    const status = r.ok ? '✅' : '❌';
    const info = r.ok ? `task=${r.taskId}, asset=${r.assetId}, size=${r.sizeBytes}B, polls=${r.polls}` : `error=${r.error}`;
    console.log(`  ${status} [${r.providerName}] ${r.mode}: ${info}`);
  }

  const finalDb = readDb();
  console.log(`\n当前 db.json: tasks=${finalDb.tasks.length}, assets=${finalDb.assets.length}, providers=${finalDb.providers.length}`);
}

main().catch((err) => {
  console.error('❌ 脚本异常:', err);
  process.exit(1);
});
