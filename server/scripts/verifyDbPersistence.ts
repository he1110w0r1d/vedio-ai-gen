/**
 * verifyDbPersistence.ts
 * 
 * 验证 DB 持久化逻辑：
 * - 写入测试 provider/task/asset/benchmarkRun
 * - 调用 normalizeDb
 * - 模拟 read/write 循环
 * - 确认数据仍存在
 * - 确认新增字段被补齐
 * - 确认数组不被清空
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeDb, readDb, writeDb, updateDb, resetDb, DbShape } from '../src/services/storageService.js';

const DB_PATH = path.resolve(process.cwd(), 'data/db.json');
const DB_BACKUP = path.resolve(process.cwd(), 'data/db.json.verify-backup');

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
  console.log('=== verifyDbPersistence ===\n');

  // Step 0: Backup current db.json
  console.log('0. 备份当前 db.json…');
  try {
    const existing = await fs.readFile(DB_PATH, 'utf8');
    await fs.writeFile(DB_BACKUP, existing, 'utf8');
    console.log('   已备份至 db.json.verify-backup');
  } catch {
    console.log('   无现有 db.json，跳过备份');
  }

  // Step 1: Reset to clean state
  console.log('\n1. 重置为干净 DB…');
  await resetDb();
  let db = await readDb();
  assert(db.providers.length === 0, 'reset 后 providers 为空');
  assert(db.tasks.length === 0, 'reset 后 tasks 为空');
  assert(db.assets.length === 0, 'reset 后 assets 为空');

  // Step 2: Write test data via updateDb
  console.log('\n2. 写入测试数据…');
  const now = new Date().toISOString();
  await updateDb(d => {
    d.providers.push({
      id: 'prov_test',
      name: '测试供应商',
      providerType: 'aliyun-wanxiang-t2v',
      defaultModel: 'test-model',
      apiKeyMasked: 'sk-***',
      encryptedApiKey: 'encrypted-test-key',
      capabilities: ['t2v'],
      createdAt: now,
      updatedAt: now,
    } as any);
    d.tasks.push({
      id: 'task_test',
      type: 'video',
      mode: 'T2V',
      status: 'completed',
      progress: 100,
      title: '测试任务',
      prompt: 'test prompt',
      providerId: 'prov_test',
      providerName: '测试供应商',
      model: 'test-model',
      projectId: 'p1',
      createdAt: now,
      updatedAt: now,
      params: {},
    } as any);
    d.assets.push({
      id: 'asset_test',
      type: 'video',
      title: '测试资产',
      prompt: 'test prompt',
      thumbnail: '/storage/assets/test.mp4',
      url: 'http://127.0.0.1:8787/storage/assets/test.mp4',
      storageType: 'local',
      localPath: '/path/to/test.mp4',
      providerId: 'prov_test',
      providerName: '测试供应商',
      model: 'test-model',
      projectId: 'p1',
      createdAt: now,
      updatedAt: now,
      favorite: false,
      params: {},
    } as any);
    d.benchmarkRuns.push({
      id: 'brun_test',
      setId: 'bset_default_v1',
      name: '测试 Run',
      providerIds: ['prov_test'],
      providerTypes: ['aliyun-wanxiang-t2v'],
      status: 'draft',
      liveRun: false,
      taskIds: [],
      assetIds: [],
      createdAt: now,
      updatedAt: now,
    } as any);
  });

  db = await readDb();
  assert(db.providers.length === 1, '写入后 providers 有 1 条');
  assert(db.tasks.length === 1, '写入后 tasks 有 1 条');
  assert(db.assets.length === 1, '写入后 assets 有 1 条');
  assert(db.benchmarkRuns.length === 1, '写入后 benchmarkRuns 有 1 条');

  // Step 3: Verify normalizeDb preserves existing arrays
  console.log('\n3. 验证 normalizeDb 不破坏已有数据…');
  const normalized = normalizeDb(db);
  assert(normalized.providers.length === 1, 'normalizeDb 后 providers 仍为 1');
  assert(normalized.tasks.length === 1, 'normalizeDb 后 tasks 仍为 1');
  assert(normalized.assets.length === 1, 'normalizeDb 后 assets 仍为 1');
  assert(normalized.benchmarkRuns.length === 1, 'normalizeDb 后 benchmarkRuns 仍为 1');

  // Step 4: Verify normalizeDb fills missing fields
  console.log('\n4. 验证 normalizeDb 补齐缺失字段…');
  const partial = { workspace: { id: 'test' } } as any;
  const filled = normalizeDb(partial);
  assert(Array.isArray(filled.providers), '缺失 providers → 补齐为空数组');
  assert(Array.isArray(filled.tasks), '缺失 tasks → 补齐为空数组');
  assert(Array.isArray(filled.assets), '缺失 assets → 补齐为空数组');
  assert(filled.benchmarkSets.length > 0, '缺失 benchmarkSets → 补齐默认集');
  assert(filled.workspace.name !== undefined, 'workspace 缺失字段被补齐');

  // Step 5: Simulate read/write round-trip (atomic write)
  console.log('\n5. 模拟读写往返（原子写入）…');
  await writeDb(db);
  const reread = await readDb();
  assert(reread.providers.length === 1, '写后读 providers 仍为 1');
  assert(reread.tasks.length === 1, '写后读 tasks 仍为 1');
  assert(reread.assets.length === 1, '写后读 assets 仍为 1');
  assert(reread.benchmarkRuns.length === 1, '写后读 benchmarkRuns 仍为 1');

  // Step 6: Verify readDb does NOT write back (critical fix)
  console.log('\n6. 验证 readDb 不写回（关键修复）…');
  const beforeStat = await fs.stat(DB_PATH);
  await readDb(); // should NOT change file
  const afterStat = await fs.stat(DB_PATH);
  assert(beforeStat.mtimeMs === afterStat.mtimeMs, 'readDb 后文件 mtime 未变（不写回）');

  // Step 7: Cleanup
  console.log('\n7. 清理测试数据…');
  await resetDb();

  // Restore backup
  try {
    const backup = await fs.readFile(DB_BACKUP, 'utf8');
    await fs.writeFile(DB_PATH, backup, 'utf8');
    await fs.unlink(DB_BACKUP);
    console.log('   已恢复原 db.json');
  } catch {
    console.log('   无备份需要恢复');
  }

  // Summary
  console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败 ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('验证脚本异常:', err);
  process.exit(1);
});
