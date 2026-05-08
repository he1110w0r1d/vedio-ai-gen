import type { AssetRecord } from '../types/asset.js';
import type { ProjectImportManifest, ProjectImportValidationResult } from '../types/projectImport.js';
import type { ProjectRecord } from '../types/project.js';
import type { PromptTemplateRecord } from '../types/promptTemplate.js';
import type { GenerationTaskRecord } from '../types/task.js';
import { createId } from '../utils/id.js';
import { validationError } from '../utils/errors.js';
import { saveBufferToLocal } from './fileStorageService.js';
import { updateDb } from './storageService.js';
import { readZipEntries, type ZipReadEntry } from './zipReadService.js';

const allowedFiles = new Set([
  'project-export/manifest.json',
  'project-export/project.json',
  'project-export/assets.json',
  'project-export/tasks.json',
  'project-export/prompt-templates.json',
  'project-export/README.md',
  'project-export/files/README.txt',
]);
const allowedFileExtensions = new Set(['png', 'jpg', 'jpeg', 'webp', 'mp4', 'webm']);

export type ProjectImportOptions = {
  importFiles: boolean;
  importTasks: boolean;
  importTemplates: boolean;
};

export async function validateProjectImport(buffer: Buffer): Promise<ProjectImportValidationResult> {
  const parsed = parseProjectArchive(buffer);
  return buildValidationResult(parsed);
}

export async function importProjectArchive(buffer: Buffer, options: ProjectImportOptions) {
  const parsed = parseProjectArchive(buffer);
  const validation = buildValidationResult(parsed);
  if (!validation.valid) throw validationError('归档包校验失败', { errors: validation.errors });

  const now = new Date().toISOString();
  const projectId = createId('project');
  const assetIdMap: Record<string, string> = {};
  const taskIdMap: Record<string, string> = {};
  const templateIdMap: Record<string, string> = {};
  const warnings = [...validation.warnings];

  const project: ProjectRecord = {
    ...parsed.project,
    id: projectId,
    name: `${parsed.project.name} - 导入副本`,
    status: 'active',
    favorite: false,
    createdAt: now,
    updatedAt: now,
  };

  for (const task of parsed.tasks) taskIdMap[task.id] = createId('task');
  for (const asset of parsed.assets) assetIdMap[asset.id] = createId(asset.type === 'video' ? 'asset_video' : 'asset_img');
  for (const template of parsed.templates) templateIdMap[template.id] = createId('tpl');

  const assets: AssetRecord[] = [];
  for (const asset of parsed.assets) {
    const newAssetId = assetIdMap[asset.id];
    const fileNameCandidate = (asset as unknown as { fileName?: unknown }).fileName;
    const fileName = typeof fileNameCandidate === 'string' ? fileNameCandidate : undefined;
    const fileEntry = fileName ? parsed.files.get(`project-export/files/${fileName}`) : undefined;
    let localFile;
    if (options.importFiles && fileName && fileEntry) {
      const extension = extensionFromName(fileName);
      localFile = await saveBufferToLocal({
        buffer: fileEntry.data,
        fileName: `${newAssetId}.${extension}`,
        mimeType: mimeFromExtension(extension),
      });
    } else if (options.importFiles && fileName && !fileEntry) {
      warnings.push(`资产 ${asset.id} 对应文件 ${fileName} 不存在，已作为元数据导入。`);
    }

    const params = replaceIds(asset.params ?? {}, assetIdMap);
    const parameters = {
      ...(typeof asset.parameters === 'object' && asset.parameters ? replaceIds(asset.parameters as Record<string, unknown>, assetIdMap) : {}),
      importedFromProjectId: parsed.project.id,
      importedAt: now,
      importWarnings: warnings,
    };

    const importedAsset: AssetRecord = {
      ...asset,
      id: newAssetId,
      projectId,
      taskId: asset.taskId ? taskIdMap[asset.taskId] : undefined,
      title: asset.title ?? '导入资产',
      thumbnail: localFile?.publicUrl ?? '',
      thumbnailUrl: localFile?.publicUrl ?? '',
      url: localFile?.publicUrl ?? '',
      fileUrl: localFile?.publicUrl,
      storageType: localFile ? 'local' : 'mock',
      localPath: localFile?.localPath,
      mimeType: localFile?.mimeType ?? asset.mimeType,
      sizeBytes: localFile?.sizeBytes ?? asset.sizeBytes,
      width: localFile?.width ?? asset.width,
      height: localFile?.height ?? asset.height,
      createdAt: now,
      updatedAt: now,
      favorite: false,
      params,
      parameters,
    };
    assets.push(importedAsset);
  }

  const tasks = options.importTasks
    ? parsed.tasks.map((task) => ({
        ...task,
        id: taskIdMap[task.id],
        projectId,
        projectName: project.name,
        status: ['queued', 'running', 'polling'].includes(task.status) ? 'canceled' as const : task.status,
        params: replaceIds(task.params ?? {}, assetIdMap) as GenerationTaskRecord['params'],
        createdAt: now,
        updatedAt: now,
      }))
    : [];

  const promptTemplates = options.importTemplates
    ? parsed.templates.map((template) => ({
        ...template,
        id: templateIdMap[template.id],
        name: `${template.name} - 导入副本`,
        favorite: false,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
      }))
    : [];

  await updateDb((db) => {
    db.projects.unshift(project);
    db.assets.unshift(...assets);
    db.tasks.unshift(...tasks);
    db.promptTemplates.unshift(...promptTemplates);
  });

  return {
    project,
    assets,
    tasks,
    promptTemplates,
    idMaps: {
      projectId: { [parsed.project.id]: project.id },
      assetIds: assetIdMap,
      taskIds: taskIdMap,
      templateIds: templateIdMap,
    },
    warnings,
  };
}

function parseProjectArchive(buffer: Buffer) {
  const entries = readZipEntries(buffer);
  const warnings: string[] = [];
  const files = new Map<string, ZipReadEntry>();

  for (const entry of entries) {
    if (!entry.path.startsWith('project-export/')) warnings.push(`忽略非预期路径：${entry.path}`);
    else if (entry.path.startsWith('project-export/files/')) {
      if (entry.path === 'project-export/files/README.txt') continue;
      const extension = extensionFromName(entry.path);
      if (!allowedFileExtensions.has(extension)) warnings.push(`忽略不支持的文件类型：${entry.path}`);
      else files.set(entry.path, entry);
    } else if (!allowedFiles.has(entry.path)) {
      warnings.push(`忽略未知文件：${entry.path}`);
    }
  }

  const manifest = readJson<ProjectImportManifest>(entries, 'project-export/manifest.json', 'manifest.json 必须存在');
  const project = readJson<ProjectRecord>(entries, 'project-export/project.json', 'project.json 必须存在');
  const assets = readJson<AssetRecord[]>(entries, 'project-export/assets.json', 'assets.json 必须存在');
  const tasks = readOptionalJson<GenerationTaskRecord[]>(entries, 'project-export/tasks.json') ?? [];
  const templates = readOptionalJson<PromptTemplateRecord[]>(entries, 'project-export/prompt-templates.json') ?? [];

  return { manifest, project, assets, tasks, templates, files, warnings };
}

function buildValidationResult(parsed: ReturnType<typeof parseProjectArchive>): ProjectImportValidationResult {
  const errors: string[] = [];
  const warnings = [...parsed.warnings, ...(parsed.manifest.warnings ?? [])];
  if (parsed.manifest.appName !== 'API Asset Studio') errors.push('manifest.appName 与当前应用不兼容');
  if (!parsed.manifest.exportVersion) errors.push('manifest.exportVersion 缺失');
  if (!parsed.project.id || !parsed.project.name) errors.push('project.id 和 project.name 为必填字段');
  if (!Array.isArray(parsed.assets)) errors.push('assets.json 必须是数组');
  parsed.assets.forEach((asset, index) => {
    const unsafe = JSON.stringify(asset);
    if (!asset.id || !['image', 'video', 'reference'].includes(asset.type)) errors.push(`第 ${index + 1} 个 asset 结构不合法`);
    if (/encryptedApiKey|apiKey|provider_credentials/i.test(unsafe)) errors.push(`第 ${index + 1} 个 asset 包含敏感字段`);
    if (typeof asset.localPath === 'string' && (asset.localPath.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(asset.localPath))) errors.push(`第 ${index + 1} 个 asset 包含本机绝对路径`);
  });
  parsed.tasks.forEach((task, index) => {
    if (/encryptedApiKey|apiKey|provider_credentials/i.test(JSON.stringify(task))) errors.push(`第 ${index + 1} 个 task 包含敏感字段`);
  });
  parsed.templates.forEach((template, index) => {
    if (typeof template.content !== 'string') errors.push(`第 ${index + 1} 个 template.content 必须是字符串`);
  });
  return {
    valid: errors.length === 0,
    manifest: parsed.manifest,
    summary: {
      projectName: parsed.project.name,
      assetCount: parsed.assets.length,
      taskCount: parsed.tasks.length,
      templateCount: parsed.templates.length,
      fileCount: parsed.files.size,
    },
    warnings: Array.from(new Set(warnings)),
    errors,
  };
}

function readJson<T>(entries: ZipReadEntry[], entryPath: string, errorMessage: string): T {
  const entry = entries.find((item) => item.path === entryPath);
  if (!entry) throw validationError(errorMessage);
  try {
    return JSON.parse(entry.data.toString('utf8')) as T;
  } catch {
    throw validationError(`${entryPath} 不是合法 JSON`);
  }
}

function readOptionalJson<T>(entries: ZipReadEntry[], entryPath: string): T | undefined {
  const entry = entries.find((item) => item.path === entryPath);
  if (!entry) return undefined;
  return JSON.parse(entry.data.toString('utf8')) as T;
}

function replaceIds<T>(value: T, assetIdMap: Record<string, string>): T {
  if (typeof value === 'string') return (assetIdMap[value] ?? value) as T;
  if (Array.isArray(value)) return value.map((item) => replaceIds(item, assetIdMap)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceIds(item, assetIdMap)])) as T;
  }
  return value;
}

function extensionFromName(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? 'bin';
}

function mimeFromExtension(extension: string) {
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'mp4') return 'video/mp4';
  if (extension === 'webm') return 'video/webm';
  return 'application/octet-stream';
}
