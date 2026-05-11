// SQLite Repository 验证脚本
// 用法: DATA_BACKEND=sqlite APP_ENCRYPTION_KEY=dev-only-local-secret-32-bytes!! node dist/scripts/verifySqliteRepository.js

import { getRepository, resetRepository, getCurrentBackend } from '../src/repositories/repositoryFactory.js';
import { getSqliteDb, closeSqliteDb } from '../src/repositories/sqliteRepository.js';
import { isPresignedUrl } from '../src/utils/urlSecurity.js';

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) { passed++; console.log(`  ✅ ${label}`); }
  else { failed++; console.log(`  ❌ ${label}${detail ? ` (${detail})` : ''}`); }
}

console.log('=== verifySqliteRepository ===\n');

// 1. 确认 backend
const backend = getCurrentBackend();
check('DATA_BACKEND=sqlite', backend === 'sqlite', `当前: ${backend}`);

// 2. 初始化数据库
const db = getSqliteDb();
check('SQLite 数据库连接成功', !!db);

// 预先触发 schema 初始化（通过 repository.getDb 间接调用 initSchema）
resetRepository();
const repo = await getRepository();
await repo.getDb(); // 触发 initSchema

// 3. 检查 schema
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as Array<{ name: string }>;
const tableNames = tables.map(t => t.name);
check('schema_version 表存在', tableNames.includes('schema_version'));
check('workspace 表存在', tableNames.includes('workspace'));
check('providers 表存在', tableNames.includes('providers'));
check('projects 表存在', tableNames.includes('projects'));
check('assets 表存在', tableNames.includes('assets'));
check('tasks 表存在', tableNames.includes('tasks'));
check('prompt_templates 表存在', tableNames.includes('prompt_templates'));
check('usage_records 表存在', tableNames.includes('usage_records'));
check('quality_feedback 表存在', tableNames.includes('quality_feedback'));
check('storage_config 表存在', tableNames.includes('storage_config'));
check('benchmark_sets 表存在', tableNames.includes('benchmark_sets'));
check('benchmark_runs 表存在', tableNames.includes('benchmark_runs'));
check('benchmark_run_items 表存在', tableNames.includes('benchmark_run_items'));

// 4. 检查索引（第一阶段暂未创建——列尚未从 payload 提升到表列）
const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name").all() as Array<{ name: string }>;
console.log(`  ℹ️  索引总数: ${indexes.length}（第一阶段暂不创建业务索引，后续 ALTER TABLE ADD COLUMN 后启用）`);

// 5. seed / read / update 验证（repo 已在前面初始化）

// 6. seedDb
console.log('\n6. 数据读写验证…');
const seeded = await repo.seedDb();
check('seedDb 返回 DbShape', !!seeded && !!seeded.workspace);
check('seedDb providers', Array.isArray(seeded.providers));
check('seedDb projects ≥ 1', seeded.projects.length >= 1, `实际: ${seeded.projects.length}`);
check('seedDb assets ≥ 1', seeded.assets.length >= 1, `实际: ${seeded.assets.length}`);
check('seedDb benchmarkSets ≥ 1', seeded.benchmarkSets.length >= 1);

// 7. 重复 seed 不崩溃
const seeded2 = await repo.seedDb();
check('重复 seedDb 不崩溃', !!seeded2);

// 8. 写入一个 provider
await repo.updateDb(db => {
  db.providers.push({
    id: 'test_provider_1',
    name: 'Test Provider',
    providerType: 'aliyun-wanxiang-t2v',
    apiKeyMasked: 'sk-****test',
    encrypted: 'encrypted-test-value-32-bytes!!',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    capabilities: ['t2v'],
    enabled: true,
  } as any);
});
const db2 = await repo.getDb();
check('写入 provider 后可读取', db2.providers.length >= 1, `数量: ${db2.providers.length}`);

// 9. 不出现明文 API Key
const allPayloads = db.prepare("SELECT payload FROM providers").all() as Array<{ payload: string }>;
let hasCleartextKey = false;
for (const row of allPayloads) {
  const p = JSON.parse(row.payload);
  if (p.apiKey && !p.apiKey.startsWith('****')) { hasCleartextKey = true; break; }
}
check('不出现明文 API Key', !hasCleartextKey);

// 10. 不出现 presigned URL
const allAssetPayloads = db.prepare("SELECT payload FROM assets").all() as Array<{ payload: string }>;
let hasPresigned = false;
for (const row of allAssetPayloads) {
  const p = JSON.parse(row.payload);
  if ((p.url && isPresignedUrl(p.url)) || (p.publicUrl && isPresignedUrl(p.publicUrl))) {
    hasPresigned = true; break;
  }
}
check('不出现 presigned URL', !hasPresigned);

// 11. resetDb（注意：normalizeDb 会对空数组注入默认值，如 projects/bencmarkSets 等）
await repo.resetDb();
const reset = await repo.getDb();
// 检查原始表数据是否已清空
const rawProviderCount = (db.prepare('SELECT COUNT(*) as cnt FROM providers').get() as { cnt: number }).cnt;
const rawProjectCount = (db.prepare('SELECT COUNT(*) as cnt FROM projects').get() as { cnt: number }).cnt;
const rawAssetCount = (db.prepare('SELECT COUNT(*) as cnt FROM assets').get() as { cnt: number }).cnt;
check('resetDb 后 providers 表清空', rawProviderCount === 0, `实际: ${rawProviderCount}`);
check('resetDb 后 projects 表清空', rawProjectCount === 0, `实际: ${rawProjectCount}`);
check('resetDb 后 assets 表清空', rawAssetCount === 0, `实际: ${rawAssetCount}`);
check('resetDb 后 normalizeDb 填充 projects 默认值', reset.projects.length >= 1, `实际: ${reset.projects.length}（normalizeDb 行为——空数组时注入默认项目）`);

// 12. close
closeSqliteDb();

console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败 ===`);
process.exit(failed > 0 ? 1 : 0);
