/**
 * verifyNoPresignedUrlPersistence.ts
 * 
 * 验证 db.json 中不包含供应商 presigned URL：
 * - 检查 assets.url / publicUrl / fileUrl
 * - 检查 assets.parameters / params
 * - 检查 tasks.params
 * - 检查 usageRecords
 * - 检查 qualityFeedback
 * - 检查 benchmarkRuns / benchmarkRunItems
 */

import { readDb } from '../src/services/storageService.js';
import { assertNoPresignedUrlInDb } from '../src/utils/urlSecurity.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    failed++;
  }
}

async function main() {
  console.log('=== verifyNoPresignedUrlPersistence ===\n');

  const db = await readDb();

  console.log(`1. 检查 ${db.assets.length} 个 assets…`);
  console.log(`2. 检查 ${db.tasks.length} 个 tasks…`);
  console.log(`3. 检查 ${db.usageRecords.length} 个 usageRecords…`);
  console.log(`4. 检查 ${db.qualityFeedback.length} 个 qualityFeedback…`);
  console.log(`5. 检查 ${db.benchmarkRuns.length} 个 benchmarkRuns…`);
  console.log(`6. 检查 ${db.benchmarkRunItems.length} 个 benchmarkRunItems…\n`);

  const result = assertNoPresignedUrlInDb(db);

  if (result.violations.length > 0) {
    console.error('发现 presigned URL 违规：');
    for (const v of result.violations) {
      console.error(`  ⚠️  ${v}`);
    }
  }

  assert(result.clean, 'db.json 中无 presigned URL 残留');

  // Also check for common OSS host patterns in raw JSON
  console.log('\n7. 检查特定 OSS host 模式…');
  const dbStr = JSON.stringify(db);
  const ossPatterns = [
    'Expires=',
    'Signature=',
    'OSSAccessKeyId=',
    'X-Amz-Signature',
    'X-Amz-Credential',
  ];
  let ossFound = false;
  for (const pattern of ossPatterns) {
    if (dbStr.includes(pattern)) {
      console.error(`  ⚠️  发现字段 "${pattern}" 在 db.json 中`);
      ossFound = true;
    }
  }
  assert(!ossFound, 'db.json 不含 OSS/AWS 签名字段');

  // Check for DashScope OSS URLs
  console.log('\n8. 检查 DashScope OSS URL（dashscope-result-*）…');
  const dashscopeOssPattern = /dashscope-result/i;
  if (dashscopeOssPattern.test(dbStr)) {
    console.error('  ⚠️  发现 DashScope OSS result URL');
    assert(false, 'db.json 不含 DashScope OSS result URL');
  } else {
    assert(true, 'db.json 不含 DashScope OSS result URL');
  }

  // Summary
  console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败 ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('验证脚本异常:', err);
  process.exit(1);
});
