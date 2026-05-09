/**
 * seedR2VSamples.ts - 第 8.2.4 阶段 R2V 页面级样本补充生成
 * 
 * 由于 db.json 中的 provider 加密 key 可能与运行时的 APP_ENCRYPTION_KEY 不匹配，
 * 本脚本使用 createProviderCredential 即建即调 adapter，成功后再写入 db.json。
 * 
 * 用法:
 *   source ~/.zshrc
 *   cd server
 *   APP_ENCRYPTION_KEY=dev-only-local-secret-32-bytes!! \
 *   DASHSCOPE_TEST_API_KEY="$DASHSCOPE_TEST_API_KEY" \
 *   npm run build && node dist/scripts/seedR2VSamples.js
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { getProviderAdapter } from '../src/providers/providerRegistry.js';
import { createProviderCredential } from '../src/services/credentialService.js';
import { createId } from '../src/utils/id.js';
import { nowIso } from '../src/utils/time.js';
import type { ProviderRecord } from '../src/types/provider.js';

const DB_PATH = join(process.cwd(), 'data', 'db.json');
const REF_URL = 'https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg';
const POLL_MS = 5000;
const POLL_MAX = 120;

const specs = [
  {
    providerType: 'aliyun-wanxiang-r2v',
    providerName: '阿里云百炼万相 R2V',
    model: 'wan2.7-r2v',
    prompt: 'character1 gently moves forward, turns slightly toward the camera, and presents a calm product-style motion on a clean white background.',
  },
  {
    providerType: 'aliyun-happyhorse-r2v',
    providerName: '阿里云百炼 HappyHorse R2V',
    model: 'happyhorse-1.0-r2v',
    prompt: '[Image 1] gently moves forward, turns slightly toward the camera, and presents a calm product-style motion on a clean white background.',
  },
];

function readDb() { return JSON.parse(readFileSync(DB_PATH, 'utf8')); }
function writeDb(data: any) { writeFileSync(DB_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8'); }

async function main() {
  const apiKey = process.env.DASHSCOPE_TEST_API_KEY || process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error('缺少 DASHSCOPE_TEST_API_KEY');
  console.log(`API Key: ${apiKey.substring(0, 4)}****${apiKey.substring(apiKey.length - 4)}`);

  for (const spec of specs) {
    console.log(`\n=== ${spec.providerName} ===`);

    // 每次创建全新的 provider（确保加密一致性）
    const provider = createProviderCredential({
      name: spec.providerName,
      providerType: spec.providerType,
      baseUrl: 'https://dashscope.aliyuncs.com',
      apiKey,
      defaultModel: spec.model,
      capabilities: ['r2v', 'asyncTask', 'polling'],
    });

    const adapter = getProviderAdapter(spec.providerType);
    const input = {
      projectId: 'p1',
      providerId: provider.id,
      model: spec.model,
      prompt: spec.prompt,
      mode: 'R2V' as const,
      params: { duration: 5, referenceUrl: REF_URL },
    };

    // Step 1: 生成
    let result;
    try {
      result = await adapter.generateVideoR2V(provider, input);
    } catch (err: any) {
      console.log(`  ❌ 生成失败: ${err.message}`);
      continue;
    }

    const task = result.task;
    console.log(`  task: ${task.id}`);
    console.log(`  providerTaskId: ${(task.providerTaskId || '').substring(0, 8) || '(无)'}…`);

    if (!task.providerTaskId) {
      console.log('  ⚠️ providerTaskId 缺失，跳过轮询');
      // 仍写入失败任务到 db.json
      const db = readDb();
      db.tasks.unshift({ ...task, status: 'failed', progress: 100, errorCode: 'MISSING_TASK_ID', errorReason: '供应商未返回任务 ID', updatedAt: nowIso() });
      writeDb(db);
      continue;
    }

    // Step 2: 写入 db.json
    const db1 = readDb();
    db1.tasks.unshift(task);
    writeDb(db1);

    // Step 3: 轮询
    for (let i = 1; i <= POLL_MAX; i++) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      const status = await adapter.getTaskStatus(provider, task);
      if (i % 5 === 0 || status.status !== 'polling') {
        console.log(`  [${i}/${POLL_MAX}] status=${status.status} progress=${status.progress} providerTaskStatus=${status.providerTaskStatus ?? '?'}`);
      }

      if (status.status === 'failed') {
        const db = readDb();
        db.tasks = db.tasks.map((t: any) => t.id === task.id ? { ...t, status: 'failed', progress: 100, errorCode: status.errorCode, errorReason: status.errorReason, updatedAt: nowIso() } : t);
        writeDb(db);
        console.log(`  ❌ 失败: ${status.errorReason}`);
        break;
      }

      if (status.status === 'completed') {
        console.log(`  ✅ 完成 (polls=${i})`);
        if (!status.videoUrl) {
          console.log('  ⚠️ 无视频 URL');
          break;
        }

        // Step 4: 下载视频
        try {
          const { saveRemoteVideoToLocal } = await import('../src/services/fileStorageService.js');
          const assetId = createId('asset_vid');
          const stored = await saveRemoteVideoToLocal({ remoteUrl: status.videoUrl, fileName: `${assetId}.mp4` });
          const now = nowIso();
          const asset = {
            id: assetId, type: 'video',
            title: `R2V ${spec.providerName} 真实视频样本`,
            prompt: spec.prompt,
            thumbnail: stored.publicUrl, thumbnailUrl: stored.publicUrl,
            url: stored.publicUrl, fileUrl: stored.publicUrl,
            storageType: 'local', localPath: stored.localPath,
            mimeType: stored.mimeType ?? 'video/mp4', sizeBytes: stored.sizeBytes,
            providerId: provider.id, providerName: provider.name,
            model: spec.model, projectId: 'p1',
            createdAt: now, updatedAt: now, favorite: false,
            taskId: task.id, duration: 5, durationSeconds: 5, mode: 'R2V',
            params: { ...task.params, providerTaskId: task.providerTaskId, providerTaskStatus: status.providerTaskStatus },
            parameters: { ...task.params, providerTaskId: task.providerTaskId, providerTaskStatus: status.providerTaskStatus },
          };

          const db = readDb();
          db.assets.unshift(asset);
          db.tasks = db.tasks.map((t: any) => t.id === task.id ? { ...t, status: 'completed', progress: 100, providerTaskStatus: status.providerTaskStatus, completedAt: now, updatedAt: now } : t);
          writeDb(db);
          console.log(`  asset: ${assetId}, sizeBytes: ${stored.sizeBytes}`);
        } catch (err: any) {
          console.log(`  ⚠️ 下载失败: ${err.message}`);
          const db = readDb();
          db.tasks = db.tasks.map((t: any) => t.id === task.id ? { ...t, status: 'failed', progress: 100, errorCode: 'DOWNLOAD_FAILED', errorReason: err.message, updatedAt: nowIso() } : t);
          writeDb(db);
        }
        break;
      }

      // 更新中间状态
      const dbUpdate = readDb();
      dbUpdate.tasks = dbUpdate.tasks.map((t: any) => t.id === task.id ? { ...t, status: status.status, progress: status.progress, providerTaskStatus: status.providerTaskStatus, updatedAt: nowIso() } : t);
      writeDb(dbUpdate);

      if (i === POLL_MAX) {
        console.log('  ⏱️ 轮询超时');
        const db = readDb();
        db.tasks = db.tasks.map((t: any) => t.id === task.id ? { ...t, status: 'failed', progress: task.progress ?? 0, errorCode: 'TIMEOUT', errorReason: '轮询超时', updatedAt: nowIso() } : t);
        writeDb(db);
      }
    }
  }

  const finalDb = readDb();
  console.log(`\n\n最终 db.json: tasks=${finalDb.tasks.length}, assets=${finalDb.assets.length}`);
}

main().catch((err) => {
  console.error('脚本异常:', err);
  process.exit(1);
});
