import path from 'node:path';
import type { AssetRecord } from '../types/asset.js';
import type { GenerationTaskRecord } from '../types/task.js';
import type { PromptTemplateRecord } from '../types/promptTemplate.js';
import { notFound } from '../utils/errors.js';
import { readLocalAssetFile } from './fileStorageService.js';
import { readDb } from './storageService.js';
import { createZip, type ZipEntry } from './zipService.js';

export type ProjectExportOptions = {
  includeFiles: boolean;
  includeTasks: boolean;
  includeTemplates: boolean;
  includeUsage: boolean;
  includeQuality: boolean;
};

export async function exportProjectArchive(projectId: string, options: Partial<ProjectExportOptions>) {
  const includeFiles = options.includeFiles ?? true;
  const includeTasks = options.includeTasks ?? true;
  const includeTemplates = options.includeTemplates ?? true;
  const includeUsage = options.includeUsage ?? true;
  const includeQuality = options.includeQuality ?? true;
  const db = await readDb();
  const project = db.projects.find((item) => item.id === projectId);
  if (!project) throw notFound('项目不存在');

  const warnings = [
    '导出包不包含任何 API Key。',
    '导出包不包含供应商凭据或任何加密后的密钥字段。',
  ];
  const projectAssets = db.assets.filter((asset) => asset.projectId === projectId);
  const projectTasks = includeTasks ? db.tasks.filter((task) => task.projectId === projectId) : [];
  const templates = includeTemplates ? db.promptTemplates : [];
  const usageRecords = includeUsage ? db.usageRecords.filter((u) => u.projectId === projectId) : [];
  const qualityFeedback = includeQuality ? db.qualityFeedback.filter((q) => q.projectId === projectId) : [];
  const fileEntries: ZipEntry[] = [];
  const exportedAssets = [];

  for (const asset of projectAssets) {
    const fileName = buildExportFileName(asset);
    let exportedFileName: string | undefined;
    if (includeFiles && asset.storageType === 'local') {
      const localFile = await readLocalAssetFile(asset.localPath);
      if (localFile) {
        exportedFileName = fileName;
        fileEntries.push({ path: `project-export/files/${fileName}`, data: localFile.buffer });
      } else {
        warnings.push(`资产 ${asset.id} 的本地文件不存在，已跳过。`);
      }
    } else if (includeFiles && asset.storageType === 'object') {
      warnings.push(`资产 ${asset.id} 存储在对象存储，本次导出仅包含元数据，未打包源文件。`);
    }
    if (asset.providerId === 'mock') warnings.push(`资产 ${asset.id} 是使用 Mock Provider 生成的。`);
    exportedAssets.push(sanitizeAsset(asset, exportedFileName));
  }

  const manifest = {
    exportVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    appName: 'API Asset Studio',
    projectId: project.id,
    projectName: project.name,
    assetCount: exportedAssets.length,
    taskCount: projectTasks.length,
    templateCount: templates.length,
    usageRecordCount: usageRecords.length,
    qualityFeedbackCount: qualityFeedback.length,
    includeFiles,
    includeUsage,
    includeQuality,
    warnings: Array.from(new Set(warnings)),
  };

  const entries: ZipEntry[] = [
    { path: 'project-export/manifest.json', data: json(manifest) },
    { path: 'project-export/project.json', data: json(project) },
    { path: 'project-export/assets.json', data: json(exportedAssets) },
    { path: 'project-export/tasks.json', data: json(projectTasks.map(sanitizeTask)) },
    { path: 'project-export/prompt-templates.json', data: json(templates.map(sanitizeTemplate)) },
    ...(includeUsage ? [{ path: 'project-export/usage-records.json', data: json(usageRecords) }] : []),
    ...(includeQuality ? [{ path: 'project-export/quality-feedback.json', data: json(qualityFeedback) }] : []),
    { path: 'project-export/README.md', data: buildReadme(project.name, manifest.warnings) },
    ...(includeFiles ? [{ path: 'project-export/files/README.txt', data: '本目录存放导出的本地资产文件。若没有本地文件，目录中只保留此说明。\n' }] : []),
    ...fileEntries,
  ];

  return {
    buffer: createZip(entries),
    fileName: `project_${safeName(project.name)}_${new Date().toISOString().slice(0, 10)}.zip`,
    manifest,
  };
}

function sanitizeAsset(asset: AssetRecord, fileName?: string) {
  const { localPath: _localPath, fileUrl: _fileUrl, url: _url, thumbnail: _thumbnail, thumbnailUrl: _thumbnailUrl, ...rest } = asset;
  return {
    ...rest,
    storageType: fileName ? 'exported' : asset.storageType,
    fileName,
    url: fileName ? `files/${fileName}` : undefined,
    thumbnail: fileName ? `files/${fileName}` : undefined,
    thumbnailUrl: fileName ? `files/${fileName}` : undefined,
  };
}

function sanitizeTask(task: GenerationTaskRecord) {
  return task;
}

function sanitizeTemplate(template: PromptTemplateRecord) {
  return template;
}

function buildExportFileName(asset: AssetRecord) {
  const extension = extensionFromMime(asset.mimeType) ?? (asset.localPath ? path.extname(asset.localPath).replace('.', '') : undefined);
  return `${safeName(asset.id)}.${extension || 'bin'}`;
}

function extensionFromMime(mimeType?: string) {
  if (!mimeType) return undefined;
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('mp4')) return 'mp4';
  return undefined;
}

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_').slice(0, 80) || 'project';
}

function json(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function buildReadme(projectName: string, warnings: string[]) {
  return `# API Asset Studio 项目归档包

项目：${projectName}

本归档包用于备份、迁移、交付或演示项目资产。

## 包含内容

- manifest.json：导出清单
- project.json：项目信息
- assets.json：项目资产元数据
- tasks.json：项目任务元数据
- prompt-templates.json：提示词模板
- files/：本地资产文件（如果导出时选择包含文件）

## 安全说明

${warnings.map((warning) => `- ${warning}`).join('\n')}

导入功能当前尚未实现，请参考 docs/project-archive-import-design.md。
`;
}
