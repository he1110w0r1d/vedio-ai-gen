/**
 * 8.3.4 Provider 初始化脚本
 * 创建万相 I2V + R2V Provider 并持久化到 db.json
 * 用法: cd server && npx tsx scripts/initProviders834.ts
 */
import { updateDb, readDb } from '../src/services/storageService.js';
import { createProviderCredential } from '../src/services/credentialService.js';

const apiKey = process.env.DASHSCOPE_TEST_API_KEY!;
if (!apiKey) {
  console.error('❌ DASHSCOPE_TEST_API_KEY 未设置');
  process.exit(1);
}

async function main() {
  const i2vInput = {
    name: '阿里云百炼 万相图生视频',
    providerType: 'aliyun-wanxiang-i2v',
    apiKey,
    defaultModel: 'wan2.6-i2v-flash',
    capabilities: ['i2v', 'asyncTask', 'polling'],
  };

  const r2vInput = {
    name: '阿里云百炼 万相参考生视频',
    providerType: 'aliyun-wanxiang-r2v',
    apiKey,
    defaultModel: 'wan2.7-r2v',
    capabilities: ['r2v', 'asyncTask', 'polling'],
  };

  await updateDb(db => {
    // 清除已有 providers，只保留这两个
    db.providers = [];
    const i2v = createProviderCredential(i2vInput);
    const r2v = createProviderCredential(r2vInput);
    db.providers.push(i2v, r2v);
  });

  const db = await readDb();
  console.log('✅ Providers written:');
  db.providers.forEach(p => {
    console.log(`  ${p.id}: ${p.name} (${p.providerType})`);
    console.log(`    defaultModel: ${p.defaultModel}`);
    console.log(`    capabilities: ${JSON.stringify(p.capabilities)}`);
    console.log(`    maskedApiKey: ${p.maskedApiKey}`);
  });
  console.log(`\nTotal providers in db.json: ${db.providers.length}`);
}

main().catch(e => {
  console.error('❌', e);
  process.exit(1);
});
