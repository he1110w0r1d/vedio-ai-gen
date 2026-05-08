import fs from 'node:fs/promises';
import path from 'node:path';
import type { AssetRecord } from '../types/asset.js';
import type { ProviderRecord } from '../types/provider.js';
import type { GenerationTaskRecord } from '../types/task.js';
import type { ProjectRecord } from '../types/project.js';
import type { PromptTemplateRecord } from '../types/promptTemplate.js';
import type { WorkspaceProfile } from '../types/workspace.js';

export type DbShape = {
  workspace: WorkspaceProfile;
  providers: ProviderRecord[];
  projects: ProjectRecord[];
  assets: AssetRecord[];
  tasks: GenerationTaskRecord[];
  promptTemplates: PromptTemplateRecord[];
  auditLogs: Array<Record<string, unknown>>;
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

export function defaultPromptTemplates(): PromptTemplateRecord[] {
  const now = new Date().toISOString();
  return [
    { id: 'tpl_default_image', name: '电影级图片主视觉', category: 'image', content: '{{scene}} 中的 {{character}}，{{style}}，高对比电影光，精细材质', variables: ['scene', 'character', 'style'], favorite: true, usageCount: 0, createdAt: now, updatedAt: now },
    { id: 'tpl_default_video', name: '产品广告片镜头', category: 'advertising', content: '{{camera}} 缓慢靠近产品，{{emotion}} 氛围，背景为 {{scene}}', variables: ['camera', 'emotion', 'scene'], favorite: false, usageCount: 0, createdAt: now, updatedAt: now },
    { id: 'tpl_default_character', name: '角色一致性参考', category: 'character', content: '保持 {{character}} 的脸部、服装与比例一致，在 {{scene}} 中执行 {{action}}', variables: ['character', 'scene', 'action'], favorite: false, usageCount: 0, createdAt: now, updatedAt: now },
  ];
}

function normalizeDb(value: Partial<DbShape> | undefined): DbShape {
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
  };
}

export async function readDb(): Promise<DbShape> {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    const db = normalizeDb(JSON.parse(raw) as Partial<DbShape>);
    await writeDb(db);
    return db;
  } catch (error) {
    const db = normalizeDb(await readExampleDb());
    await writeDb(db);
    return db;
  }
}

export async function writeDb(db: DbShape) {
  await writeDbFile(normalizeDb(db));
}

async function writeDbFile(db: DbShape) {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, `${JSON.stringify(db, null, 2)}\n`, 'utf8');
}

export async function updateDb(updater: (db: DbShape) => DbShape | void): Promise<DbShape> {
  const db = await readDb();
  const next = updater(db) ?? db;
  await writeDb(next);
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
  };
  await writeDbFile(db);
  return db;
}

export async function seedDb() {
  const now = new Date().toISOString();
  const db: DbShape = {
    workspace: defaultWorkspace(),
    providers: [],
    projects: [
      defaultProject(),
      { id: 'p2', name: '素材探索', description: '用于测试真实图片和模板工作流', status: 'active', favorite: false, tags: ['demo'], createdAt: now, updatedAt: now },
    ],
    assets: [
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
  };
  await writeDb(db);
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
