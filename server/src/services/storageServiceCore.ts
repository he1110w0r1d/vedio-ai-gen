// 核心 JSON 文件存储操作，Repository 的最低层实现。
// jsonRepository 直接调用此文件，sqliteRepository 引用其类型和默认值。
// storageService.ts 是薄封装层，根据 DATA_BACKEND 路由到不同 Repository。

import fs from 'node:fs/promises';
import path from 'node:path';
import type { AssetRecord } from '../types/asset.js';
import type { ProviderRecord } from '../types/provider.js';
import type { GenerationTaskRecord } from '../types/task.js';
import type { ProjectRecord } from '../types/project.js';
import type { PromptTemplateRecord } from '../types/promptTemplate.js';
import type { WorkspaceProfile } from '../types/workspace.js';
import type { UsageRecord, CostRule } from '../types/usage.js';
import type { QualityFeedback } from '../types/quality.js';
import type { StorageConfig } from '../types/storage.js';
import type { BenchmarkSet, BenchmarkRun, BenchmarkRunItem, BenchmarkCase } from '../types/benchmark.js';
import { isPresignedUrl } from '../utils/urlSecurity.js';
import { SEED_IMAGE_DEFS, generateSeedPngBuffers } from '../utils/seedPng.js';

export type DbShape = {
  workspace: WorkspaceProfile;
  providers: ProviderRecord[];
  projects: ProjectRecord[];
  assets: AssetRecord[];
  tasks: GenerationTaskRecord[];
  promptTemplates: PromptTemplateRecord[];
  auditLogs: Array<Record<string, unknown>>;
  usageRecords: UsageRecord[];
  costRules: CostRule[];
  qualityFeedback: QualityFeedback[];
  storageConfig: StorageConfig;
  benchmarkSets: BenchmarkSet[];
  benchmarkRuns: BenchmarkRun[];
  benchmarkRunItems: BenchmarkRunItem[];
};

const serverRoot = process.cwd();
const DB_PATH = path.resolve(serverRoot, 'data/db.json');
const DB_EXAMPLE_PATH = path.resolve(serverRoot, 'data/db.example.json');

const emptyDb = (): DbShape => ({
  workspace: defaultWorkspace(),
  providers: [],
  projects: [defaultProject()],
  assets: [],
  tasks: [],
  promptTemplates: defaultPromptTemplates(),
  auditLogs: [],
  usageRecords: [],
  costRules: defaultCostRules(),
  qualityFeedback: [],
  storageConfig: defaultStorageConfig(),
  benchmarkSets: [],
  benchmarkRuns: [],
  benchmarkRunItems: [],
});

export function defaultWorkspace(): WorkspaceProfile {
  const now = new Date().toISOString();
  return {
    id: 'workspace_local',
    name: '本地工作区',
    ownerName: '本地创作者',
    description: '单用户本地工作台配置，用于区分当前开发数据边界。',
    defaultProjectId: 'p1',
    createdAt: now,
    updatedAt: now,
  };
}

export function defaultProject(): ProjectRecord {
  const now = new Date().toISOString();
  return {
    id: 'p1',
    name: '默认项目',
    description: '默认生成资产归档项目',
    status: 'active',
    favorite: true,
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function defaultStorageConfig(): StorageConfig {
  const now = new Date().toISOString();
  return {
    id: 'storage_config_1',
    activeProvider: 'local',
    accessMode: 'public',
    presignedUrlExpiresInSeconds: 900,
    providerInputUrlExpiresInSeconds: 3600,
    createdAt: now,
    updatedAt: now,
  };
}

export function defaultPromptTemplates(): PromptTemplateRecord[] {
  const now = new Date().toISOString();
  return [
    { id: 'tpl_default_image', name: '电影级图片主视觉', category: 'image', content: '{{scene}} 中的 {{character}}，{{style}}，高对比电影光，精细材质', variables: ['scene', 'character', 'style'], favorite: true, usageCount: 0, createdAt: now, updatedAt: now },
    { id: 'tpl_default_video', name: '产品广告片镜头', category: 'advertising', content: '{{camera}} 缓慢靠近产品，{{emotion}} 氛围，背景为 {{scene}}', variables: ['camera', 'emotion', 'scene'], favorite: false, usageCount: 0, createdAt: now, updatedAt: now },
    { id: 'tpl_default_character', name: '角色一致性参考', category: 'character', content: '保持 {{character}} 的脸部、服装与比例一致，在 {{scene}} 中执行 {{action}}', variables: ['character', 'scene', 'action'], favorite: false, usageCount: 0, createdAt: now, updatedAt: now },
  ];
}

export function defaultCostRules(): CostRule[] {
  const now = new Date().toISOString();
  return [
    { id: 'rule_1', providerType: 'wanwuhuanxin-images', model: 'gpt-image-2', mode: 'image', unit: 'per_image', price: 0.05, currency: 'CNY', enabled: false, note: '参考价格，实际以万物焕新控制台为准', createdAt: now, updatedAt: now },
    { id: 'rule_2', providerType: 'aliyun-wanxiang-t2v', mode: 't2v', unit: 'per_task', price: 0.50, currency: 'CNY', enabled: false, note: '参考价格，实际以阿里云百炼控制台为准', createdAt: now, updatedAt: now },
    { id: 'rule_3', providerType: 'aliyun-wanxiang-i2v', mode: 'i2v', unit: 'per_task', price: 0.60, currency: 'CNY', enabled: false, note: '参考价格，实际以阿里云百炼控制台为准', createdAt: now, updatedAt: now },
    { id: 'rule_4', providerType: 'aliyun-wanxiang-r2v', mode: 'r2v', unit: 'per_task', price: 0.80, currency: 'CNY', enabled: false, note: '参考价格，实际以阿里云百炼控制台为准', createdAt: now, updatedAt: now },
  ];
}

export function normalizeDb(value: Partial<DbShape> | undefined): DbShape {
  const workspace = {
    ...defaultWorkspace(),
    ...(value?.workspace && typeof value.workspace === 'object' ? value.workspace : {}),
  };
  return {
    workspace,
    providers: Array.isArray(value?.providers) ? value.providers : [],
    projects: Array.isArray(value?.projects) && value.projects.length ? value.projects as ProjectRecord[] : [defaultProject()],
    assets: Array.isArray(value?.assets) ? value.assets : [],
    tasks: Array.isArray(value?.tasks) ? value.tasks : [],
    promptTemplates: Array.isArray(value?.promptTemplates) && value.promptTemplates.length ? value.promptTemplates as PromptTemplateRecord[] : defaultPromptTemplates(),
    auditLogs: Array.isArray(value?.auditLogs) ? value.auditLogs : [],
    usageRecords: Array.isArray(value?.usageRecords) ? value.usageRecords : [],
    costRules: Array.isArray(value?.costRules) && value.costRules.length ? value.costRules as CostRule[] : defaultCostRules(),
    qualityFeedback: Array.isArray(value?.qualityFeedback) ? value.qualityFeedback : [],
    storageConfig: value?.storageConfig ? value.storageConfig : defaultStorageConfig(),
    benchmarkSets: Array.isArray(value?.benchmarkSets) && value.benchmarkSets.length ? value.benchmarkSets as BenchmarkSet[] : [defaultBenchmarkSet()],
    benchmarkRuns: Array.isArray(value?.benchmarkRuns) ? value.benchmarkRuns : [],
    benchmarkRunItems: Array.isArray(value?.benchmarkRunItems) ? value.benchmarkRunItems : [],
  };
}

export async function readDb(): Promise<DbShape> {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    return normalizeDb(JSON.parse(raw) as Partial<DbShape>);
  } catch {
    await backupCorruptedDb().catch(() => undefined);
    const db = normalizeDb(await readExampleDb());
    await writeDbFile(db);
    return db;
  }
}

export async function writeDb(db: DbShape) {
  await writeDbFile(normalizeDb(db));
}

async function writeDbFile(db: DbShape) {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  const tmpPath = `${DB_PATH}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;
  await fs.writeFile(tmpPath, `${JSON.stringify(db, null, 2)}\n`, 'utf8');
  await fs.rename(tmpPath, DB_PATH);
}

export async function updateDb(updater: (db: DbShape) => DbShape | void): Promise<DbShape> {
  let db: DbShape;
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    db = normalizeDb(JSON.parse(raw) as Partial<DbShape>);
  } catch {
    db = normalizeDb(await readExampleDb());
  }
  const next = updater(db) ?? db;
  await writeDbFile(next);
  return next;
}

export async function resetDb() {
  const db: DbShape = {
    workspace: defaultWorkspace(),
    providers: [],
    projects: [],
    assets: [],
    tasks: [],
    promptTemplates: [],
    auditLogs: [],
    usageRecords: [],
    costRules: [],
    qualityFeedback: [],
    storageConfig: defaultStorageConfig(),
    benchmarkSets: [],
    benchmarkRuns: [],
    benchmarkRunItems: [],
  };
  await writeDbFile(db);
  return db;
}

export function defaultBenchmarkSet(): BenchmarkSet {
  const now = new Date().toISOString();
  const setId = 'bset_default_v1';
  const sharedRubric = [
    { key: 'subject_stability', label: '主体稳定性', description: '视频中主体是否稳定、不漂移', weight: 1 },
    { key: 'motion_naturalness', label: '动作自然度', description: '动作是否自然、流畅、不卡顿', weight: 1 },
    { key: 'prompt_fidelity', label: 'Prompt 符合度', description: '画面是否符合 prompt 描述的核心内容', weight: 1 },
    { key: 'artifact', label: '伪影程度', description: '画面是否无明显伪影、闪烁、变形', weight: 1 },
    { key: 'clarity', label: '画面清晰度', description: '画面是否清晰、分辨率是否达标', weight: 0.5 },
  ];
  const cases: BenchmarkCase[] = [
    {
      id: 'bcase_t2v_1', setId, title: '水滴 Logo 极简动效', mode: 't2v',
      prompt: 'A calm blue water droplet logo gently floating on a clean white background, minimal motion, product style.',
      expectedFocus: ['背景干净', '主体稳定', '动作自然', '无伪影'],
      parameters: { duration: 5, resolution: '720p', aspectRatio: '16:9' },
      rubric: { criteria: [...sharedRubric, { key: 'bg_clean', label: '背景干净度', description: '白色背景是否干净、无杂色', weight: 0.5 }] },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'bcase_t2v_2', setId, title: '产品级展示镜头', mode: 't2v',
      prompt: 'A premium glass water bottle rotating slowly on a clean white studio background, soft lighting, smooth product showcase motion.',
      expectedFocus: ['产品形变', '光照稳定', '镜头运动平滑'],
      parameters: { duration: 5, resolution: '720p', aspectRatio: '16:9' },
      rubric: { criteria: [...sharedRubric, { key: 'product_shape', label: '产品形变', description: '产品形状是否保持完整', weight: 1 }] },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'bcase_t2v_3', setId, title: '轻微镜头推进', mode: 't2v',
      prompt: 'A minimal futuristic water utility dashboard hologram floating in the air, slow camera push-in, clean blue-white color palette.',
      expectedFocus: ['UI元素稳定', '画面清晰', '科技感'],
      parameters: { duration: 5, resolution: '720p', aspectRatio: '16:9', cameraMovement: 'push-in' },
      rubric: { criteria: [...sharedRubric, { key: 'ui_stability', label: 'UI元素稳定性', description: '仪表盘元素是否保持稳定', weight: 1 }] },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'bcase_i2v_1', setId, title: '水滴 Logo 悬浮旋转', mode: 'i2v',
      prompt: 'Make the subject gently float and rotate in place, with soft studio lighting and minimal camera movement.',
      sourceImageUrl: 'https://picsum.photos/seed/waterdrop-logo/1024/768',
      expectedFocus: ['保留主体', '主体不漂移', '构图完整', '动作自然'],
      parameters: { duration: 5, resolution: '720p', aspectRatio: '16:9' },
      rubric: { criteria: [...sharedRubric, { key: 'composition', label: '构图保持', description: '原始构图是否被保留', weight: 1 }] },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'bcase_i2v_2', setId, title: '产品瓶慢速旋转', mode: 'i2v',
      prompt: 'Animate the product with a slow premium rotation, keeping the original shape and composition stable.',
      sourceImageUrl: 'https://picsum.photos/seed/product-bottle/1024/768',
      expectedFocus: ['保留主体', '产品形变', '光照稳定', '构图完整'],
      parameters: { duration: 5, resolution: '720p', aspectRatio: '16:9' },
      rubric: { criteria: [...sharedRubric, { key: 'product_shape', label: '产品形变', description: '产品形状是否保持完整', weight: 1 }] },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'bcase_i2v_3', setId, title: '仪表盘视差动画', mode: 'i2v',
      prompt: 'Add subtle parallax and glow animation while preserving the original dashboard layout.',
      sourceImageUrl: 'https://picsum.photos/seed/dashboard-ui/1024/768',
      expectedFocus: ['保留主体', 'UI元素稳定', '动作自然', '构图完整'],
      parameters: { duration: 5, resolution: '720p', aspectRatio: '16:9' },
      rubric: { criteria: [...sharedRubric, { key: 'ui_stability', label: 'UI元素稳定性', description: '仪表盘元素是否保持稳定', weight: 1 }] },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'bcase_r2v_1', setId, title: '水滴角色前移转身', mode: 'r2v',
      prompt: 'gently moves forward, turns slightly toward the camera, and presents a calm product-style motion on a clean white background.',
      referenceUrl: 'https://picsum.photos/seed/waterdrop-logo/1024/768',
      expectedFocus: ['参考图关联', '主体稳定', '动作自然', '背景干净'],
      parameters: { duration: 5, resolution: '720p', aspectRatio: '16:9' },
      rubric: { criteria: [...sharedRubric, { key: 'reference_fidelity', label: '参考图一致性', description: '生成角色是否与参考图一致', weight: 1.5 }] },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'bcase_r2v_2', setId, title: '产品角色展示', mode: 'r2v',
      prompt: 'slowly rotates and presents the product with a premium showcase motion, studio lighting, clean white background.',
      referenceUrl: 'https://picsum.photos/seed/product-bottle/1024/768',
      expectedFocus: ['参考图关联', '产品形变', '光照稳定', '动作自然'],
      parameters: { duration: 5, resolution: '720p', aspectRatio: '16:9' },
      rubric: { criteria: [...sharedRubric, { key: 'reference_fidelity', label: '参考图一致性', description: '生成角色是否与参考图风格一致', weight: 1.5 }] },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'bcase_r2v_3', setId, title: '仪表盘角色演示', mode: 'r2v',
      prompt: 'gestures toward the dashboard and presents the interface with clean motion, futuristic blue-white palette.',
      referenceUrl: 'https://picsum.photos/seed/dashboard-ui/1024/768',
      expectedFocus: ['参考图关联', 'UI元素稳定', '动作自然', '科技感'],
      parameters: { duration: 5, resolution: '720p', aspectRatio: '16:9' },
      rubric: { criteria: [...sharedRubric, { key: 'reference_fidelity', label: '参考图一致性', description: '生成角色与仪表盘场景是否协调', weight: 1.5 }] },
      createdAt: now, updatedAt: now,
    },
  ];
  return {
    id: setId,
    name: 'Default Video Model Benchmark v0.1',
    description: '默认视频模型基准测试集，包含 T2V×3 + I2V×3 + R2V×3 共 9 个标准化用例。用于统一比较不同模型族的生成表现。',
    version: '0.1',
    cases,
    createdAt: now,
    updatedAt: now,
  };
}

export async function seedDb() {
  const now = new Date().toISOString();

  const seedAssetsDir = path.resolve(process.cwd(), 'storage', 'assets', 'seed');
  await fs.mkdir(seedAssetsDir, { recursive: true });

  const seedPngs = generateSeedPngBuffers();
  const seedAssetRecords: AssetRecord[] = [];

  for (const def of SEED_IMAGE_DEFS) {
    const pngBuffer = seedPngs.get(def.id);
    if (!pngBuffer) continue;
    const fileName = `${def.id}.png`;
    const localPath = path.join(seedAssetsDir, fileName);
    await fs.writeFile(localPath, pngBuffer);

    const port = process.env.PORT || '8787';
    const publicUrl = `http://127.0.0.1:${port}/storage/assets/seed/${fileName}`;

    seedAssetRecords.push({
      id: def.id,
      type: 'image',
      title: def.title,
      prompt: def.description,
      thumbnail: publicUrl,
      thumbnailUrl: publicUrl,
      url: publicUrl,
      fileUrl: publicUrl,
      storageType: 'local',
      localPath,
      mimeType: 'image/png',
      sizeBytes: pngBuffer.length,
      width: 256,
      height: 256,
      providerId: 'seed',
      providerName: 'Seed Generator',
      model: 'seed-png',
      projectId: 'p1',
      createdAt: now,
      updatedAt: now,
      favorite: false,
      aspectRatio: '1:1',
      params: {},
      parameters: { source: 'local seed png', width: 256, height: 256 },
    });
  }

  const db: DbShape = {
    workspace: defaultWorkspace(),
    storageConfig: defaultStorageConfig(),
    providers: [],
    projects: [
      defaultProject(),
      { id: 'p2', name: '素材探索', description: '用于测试真实图片和模板工作流', status: 'active', favorite: false, tags: ['demo'], createdAt: now, updatedAt: now },
    ],
    assets: [
      ...seedAssetRecords,
      {
        id: 'asset_seed_image',
        type: 'image',
        title: 'Mock 种子图片',
        prompt: '用于演示的 mock 图片资产',
        thumbnail: 'https://picsum.photos/seed/api-asset-studio/1024/768',
        thumbnailUrl: 'https://picsum.photos/seed/api-asset-studio/1024/768',
        url: 'https://picsum.photos/seed/api-asset-studio/1024/768',
        storageType: 'mock',
        providerId: 'mock',
        providerName: 'Mock Provider',
        model: 'mock-image',
        projectId: 'p1',
        createdAt: now,
        updatedAt: now,
        favorite: false,
        aspectRatio: '4:3',
        params: { requestedAspectRatio: '4:3' },
        parameters: { requestedAspectRatio: '4:3' },
      },
    ],
    tasks: [],
    promptTemplates: defaultPromptTemplates(),
    auditLogs: [],
    usageRecords: [],
    costRules: defaultCostRules(),
    qualityFeedback: [],
    benchmarkSets: [defaultBenchmarkSet()],
    benchmarkRuns: [],
    benchmarkRunItems: [],
  };
  await writeDb(db);
  console.log(`db:seed 完成：创建了 ${seedAssetRecords.length} 个本地 seed 图片资产（${seedAssetsDir}）`);
  return db;
}

async function readExampleDb() {
  try {
    const raw = await fs.readFile(DB_EXAMPLE_PATH, 'utf8');
    return JSON.parse(raw) as Partial<DbShape>;
  } catch {
    return emptyDb();
  }
}

async function backupCorruptedDb() {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    if (!raw.trim()) return;
    const backupPath = `${DB_PATH}.corrupted.${new Date().toISOString().replace(/[:.]/g, '-')}`;
    await fs.writeFile(backupPath, raw, 'utf8');
    console.warn(`[storageService] 原 db.json 解析失败，已备份至 ${backupPath}`);
  } catch {
    // File doesn't exist or can't be read — no backup needed
  }
}

export function sanitizeAssetUrls(db: DbShape): number {
  let cleaned = 0;
  for (const asset of db.assets) {
    if (asset.url && isPresignedUrl(asset.url)) {
      if (asset.localPath && (asset.storageType === 'local' || !asset.storageType)) {
        try {
          const relativePath = path.relative(
            path.resolve(process.cwd(), 'storage', 'assets'),
            path.resolve(asset.localPath),
          ).split(path.sep).join('/');
          const port = process.env.PORT || '8787';
          asset.url = `http://127.0.0.1:${port}/storage/assets/${relativePath}`;
        } catch {
          asset.url = '';
        }
      } else if (asset.storageType === 'object' || asset.storageType === 'remote') {
        asset.url = asset.publicUrl && !isPresignedUrl(asset.publicUrl) ? asset.publicUrl : '';
      } else {
        asset.url = '';
      }
      cleaned++;
    }
    if (asset.publicUrl && isPresignedUrl(asset.publicUrl)) {
      asset.publicUrl = '';
      cleaned++;
    }
    if (asset.fileUrl && isPresignedUrl(asset.fileUrl)) {
      asset.fileUrl = '';
      cleaned++;
    }
  }
  return cleaned;
}
