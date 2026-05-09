/**
 * repairDataHygiene.ts
 * 
 * 历史脏数据修复脚本：
 * - 清理 assets.url 中的供应商 presigned URL
 * - 对 local asset 重建本地 URL
 * - 对 private object asset 移除 url
 * - 将无 taskId 的 pending benchmarkRunItems 标记 skipped
 * - 输出修复数量
 * - 不删除真实文件
 * - 不清空 db
 */

import { readDb, writeDb, sanitizeAssetUrls } from '../src/services/storageService.js';
import { isPresignedUrl } from '../src/utils/urlSecurity.js';

const now = new Date().toISOString();

async function main() {
  console.log('=== db:repair-hygiene ===\n');

  console.log('读取 db.json…');
  const db = await readDb();
  let totalCleaned = 0;

  // 1. Clean presigned URLs from asset URLs
  console.log(`\n1. 清理 ${db.assets.length} 个 assets 的 presigned URL…`);
  const assetUrlCleaned = sanitizeAssetUrls(db);
  if (assetUrlCleaned > 0) {
    console.log(`   清理了 ${assetUrlCleaned} 个 presigned URL`);
  } else {
    console.log('   无需清理');
  }
  totalCleaned += assetUrlCleaned;

  // 2. Clean asset.parameters / params
  console.log(`\n2. 清理 assets.parameters 中的签名参数…`);
  let paramCleaned = 0;
  for (const asset of db.assets) {
    for (const field of ['parameters', 'params'] as const) {
      const obj = asset[field] as Record<string, unknown> | undefined;
      if (!obj) continue;
      // Remove sourceUrl if it contains signature
      if (typeof obj.sourceUrl === 'string' && isPresignedUrl(obj.sourceUrl)) {
        delete (obj as any).sourceUrl;
        paramCleaned++;
      }
      // Remove any value that is a presigned URL
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string' && isPresignedUrl(obj[key] as string)) {
          delete obj[key];
          paramCleaned++;
        }
      }
    }
  }
  if (paramCleaned > 0) {
    console.log(`   清理了 ${paramCleaned} 个参数中的 presigned URL`);
  } else {
    console.log('   无需清理');
  }
  totalCleaned += paramCleaned;

  // 3. Fix orphaned pending benchmarkRunItems (no taskId, status=pending)
  console.log(`\n3. 修复 ${db.benchmarkRunItems.length} 个 benchmarkRunItems…`);
  let pendingFixed = 0;
  for (const item of db.benchmarkRunItems) {
    if (item.status === 'pending' && !item.taskId) {
      item.status = 'skipped';
      item.errorCode = item.errorCode || 'ORPHANED_PENDING';
      item.errorReason = item.errorReason || '历史残留 pending item（无关联任务）';
      item.updatedAt = now;
      pendingFixed++;
    }
    // Also fix items with presigned URLs in errorReason
    if (item.errorReason && isPresignedUrl(item.errorReason)) {
      item.errorReason = '错误信息中包含临时 URL，已脱敏';
      item.updatedAt = now;
      pendingFixed++;
    }
  }
  if (pendingFixed > 0) {
    console.log(`   修复了 ${pendingFixed} 个 pending/脏数据 items`);
  } else {
    console.log('   无需修复');
  }
  totalCleaned += pendingFixed;

  // 4. Clean task.params from presigned URLs
  console.log(`\n4. 检查 ${db.tasks.length} 个 tasks.params…`);
  let taskParamCleaned = 0;
  for (const task of db.tasks) {
    if (!task.params) continue;
    for (const key of Object.keys(task.params)) {
      if (typeof task.params[key] === 'string' && isPresignedUrl(task.params[key] as string)) {
        task.params[key] = undefined;
        taskParamCleaned++;
      }
    }
    // Also clean sourceImageUrl and referenceUrl that contain signatures
    if (typeof task.params.sourceImageUrl === 'string' && isPresignedUrl(task.params.sourceImageUrl)) {
      task.params.sourceImageUrl = undefined;
      taskParamCleaned++;
    }
    if (typeof task.params.referenceUrl === 'string' && isPresignedUrl(task.params.referenceUrl)) {
      task.params.referenceUrl = undefined;
      taskParamCleaned++;
    }
  }
  if (taskParamCleaned > 0) {
    console.log(`   清理了 ${taskParamCleaned} 个 task 参数中的 presigned URL`);
  } else {
    console.log('   无需清理');
  }
  totalCleaned += taskParamCleaned;

  // Save
  console.log('\n保存修复结果…');
  await writeDb(db);

  console.log(`\n=== 修复完成: 共修复 ${totalCleaned} 处 ===`);
  console.log('未删除任何真实文件，未清空 db。');
}

main().catch((err) => {
  console.error('修复脚本异常:', err);
  process.exit(1);
});
