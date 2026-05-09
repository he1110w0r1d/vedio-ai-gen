/**
 * 8.3.4 万相 I2V live-run 一体化脚本
 * 用法: cd server && APP_ENCRYPTION_KEY=dev-only-local-secret-32-bytes!! npx tsx scripts/runI2VLive834.ts
 */
import { readDb, updateDb } from '../src/services/storageService.js';
import { createProviderCredential } from '../src/services/credentialService.js';
import { createBenchmarkRun, updateBenchmarkSet } from '../src/services/benchmarkService.js';
import { startBenchmarkRun } from '../src/services/benchmarkRunnerService.js';

const apiKey = process.env.DASHSCOPE_TEST_API_KEY!;
if (!apiKey) { console.error('❌ DASHSCOPE_TEST_API_KEY 未设置'); process.exit(1); }

async function main() {
  // 1. Ensure providers exist
  const db0 = await readDb();
  if (db0.providers.length === 0) {
    console.log('Creating providers...');
    await updateDb(db => {
      db.providers = [
        createProviderCredential({
          name: '阿里云百炼 万相图生视频',
          providerType: 'aliyun-wanxiang-i2v',
          apiKey,
          defaultModel: 'wan2.6-i2v-flash',
          capabilities: ['i2v', 'asyncTask', 'polling'],
        }),
        createProviderCredential({
          name: '阿里云百炼 万相参考生视频',
          providerType: 'aliyun-wanxiang-r2v',
          apiKey,
          defaultModel: 'wan2.7-r2v',
          capabilities: ['r2v', 'asyncTask', 'polling'],
        }),
      ];
    });
  }

  const db = await readDb();
  const i2vProvider = db.providers.find(p => p.providerType === 'aliyun-wanxiang-i2v')!;
  console.log(`I2V Provider: ${i2vProvider.id}`);

  // 2. Save all cases, then limit set to I2V only
  const set = db.benchmarkSets.find(s => s.id === 'bset_default_v1')!;
  const allCases = [...set.cases];
  const i2vCases = allCases.filter(c => c.mode === 'i2v');
  console.log(`Total cases: ${allCases.length}, I2V: ${i2vCases.length}`);

  // Limit to I2V only
  await updateBenchmarkSet('bset_default_v1', { cases: i2vCases });
  console.log('Set limited to I2V cases');

  // 3. Create Run
  const run = await createBenchmarkRun({
    setId: 'bset_default_v1',
    name: '8.3.4 万相 I2V 三用例 live-run',
    providerIds: [i2vProvider.id],
    liveRun: true,
  });
  console.log(`Run created: ${run.id} (status: ${run.status})`);

  // 4. Start with confirmLiveRun=true
  const { run: startedRun, items, warning } = await startBenchmarkRun(run.id, true);
  console.log(`Started: status=${startedRun.status}, warning=${warning || 'none'}`);
  console.log(`Items: ${items.length}`);
  for (const item of items) {
    console.log(`  ${item.id}: caseId=${item.caseId}, status=${item.status}, taskId=${item.taskId || '-'}`);
  }

  // 5. Restore full set
  await updateBenchmarkSet('bset_default_v1', { cases: allCases });
  console.log('Set restored to full 9 cases');

  console.log(`\n✅ I2V live-run started: ${run.id}`);
  console.log(`   Monitor tasks via API: curl http://127.0.0.1:8787/api/tasks`);
  console.log(`   Check run: curl http://127.0.0.1:8787/api/benchmarks/runs/${run.id}`);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
