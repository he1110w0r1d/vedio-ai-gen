import type { AssetRecord } from '../types/asset.js';
import type { GenerationTaskRecord, TaskStatus } from '../types/task.js';
import { createId } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import { videoDownloadFailed, videoResultNotFound, notFound } from '../utils/errors.js';
import { getProviderAdapter } from '../providers/providerRegistry.js';
import { saveRemoteVideoToLocal } from './fileStorageService.js';
import { readDb, updateDb } from './storageService.js';
import { completeUsageRecord, failUsageRecord, cancelUsageRecord, createUsageRecord } from './usageService.js';
import { syncBenchmarkRunItems } from './benchmarkRunnerService.js';

const videoThumb = 'https://images.unsplash.com/photo-1484950763426-56b5bf172dbb?auto=format&fit=crop&w=1200&q=80';

export async function listTasks() {
  await refreshRealVideoTasks();
  const db = await readDb();
  return db.tasks;
}

export async function getTask(taskId: string) {
  await refreshRealVideoTasks(taskId);
  const db = await readDb();
  const task = db.tasks.find((item) => item.id === taskId);
  if (!task) throw notFound('任务不存在');
  return task;
}

export async function addTask(task: GenerationTaskRecord) {
  await updateDb((db) => {
    db.tasks.unshift(task);
  });
  return task;
}

export async function updateTask(taskId: string, patch: Partial<GenerationTaskRecord>) {
  let updated: GenerationTaskRecord | undefined;
  await updateDb((db) => {
    db.tasks = db.tasks.map((task) => {
      if (task.id !== taskId) return task;
      updated = { ...task, ...patch, updatedAt: nowIso() };
      return updated;
    });
  });
  if (!updated) throw notFound('任务不存在');
  return updated;
}

export async function addTaskWithAssets(task: GenerationTaskRecord, assets: AssetRecord[]) {
  await updateDb((db) => {
    db.tasks.unshift(task);
    db.assets.unshift(...assets);
  });
  return { task, assets };
}

function createVideoAssetForTask(task: GenerationTaskRecord): AssetRecord {
  const now = nowIso();
  return {
    id: createId('asset_vid'),
    type: 'video',
    title: `${task.mode ?? 'T2V'} Mock 视频结果`,
    prompt: task.prompt,
    thumbnail: videoThumb,
    thumbnailUrl: videoThumb,
    url: 'mock://video/generated-preview.mp4',
    fileUrl: 'mock://video/generated-preview.mp4',
    storageType: 'mock',
    mimeType: 'video/mp4',
    providerId: task.providerId,
    providerName: task.providerName,
    model: task.model,
    projectId: task.projectId,
    createdAt: now,
    updatedAt: now,
    favorite: false,
    taskId: task.id,
    duration: Number(task.params.duration ?? 6),
    durationSeconds: Number(task.params.duration ?? 6),
    mode: task.mode,
    params: task.params,
    parameters: task.params,
  };
}

export async function advanceMockTasks() {
  await updateDb((db) => {
    const newAssets: AssetRecord[] = [];
    db.tasks = db.tasks.map((task) => {
      if (task.providerTaskId || task.type !== 'video' || task.status === 'completed' || task.status === 'failed' || task.status === 'canceled') return task;
      const nextProgress = task.status === 'queued' ? 12 : Math.min(100, task.progress + 28);
      const nextStatus: TaskStatus = nextProgress >= 100 ? 'completed' : 'running';
      const nextTask: GenerationTaskRecord = {
        ...task,
        status: nextStatus,
        progress: nextProgress,
        updatedAt: nowIso(),
        completedAt: nextStatus === 'completed' ? nowIso() : task.completedAt,
      };
      if (nextStatus === 'completed' && !task.assetCreated && !db.assets.some((asset) => asset.taskId === task.id)) {
        const mockAsset = createVideoAssetForTask(nextTask);
        newAssets.push(mockAsset);
        nextTask.assetCreated = true;
        completeUsageRecord(nextTask.id, [mockAsset]).catch(() => undefined);
      }
      return nextTask;
    });
    if (newAssets.length) db.assets.unshift(...newAssets);
  });
}

export async function refreshRealVideoTasks(taskId?: string) {
  const db = await readDb();
  const activeTasks = db.tasks.filter((task) => {
    if (taskId && task.id !== taskId) return false;
    return task.type === 'video' && Boolean(task.providerTaskId) && ['queued', 'running', 'polling'].includes(task.status);
  });
  if (!activeTasks.length) return;

  for (const task of activeTasks) {
    const provider = db.providers.find((item) => item.id === task.providerId);
    if (!provider) {
      await updateTask(task.id, { status: 'failed', progress: 100, errorCode: 'PROVIDER_UNAVAILABLE', errorReason: '供应商配置不存在' });
      await failUsageRecord(task.id, '供应商配置不存在');
      continue;
    }
    const status = await getProviderAdapter(provider.providerType).getTaskStatus(provider, task);
    if (status.status === 'completed') {
      if (db.assets.some((asset) => asset.taskId === task.id)) {
        await updateTask(task.id, { status: 'completed', progress: 100, providerTaskStatus: status.providerTaskStatus, completedAt: nowIso(), assetCreated: true });
        continue;
      }
      if (!status.videoUrl) {
        const error = videoResultNotFound(provider.name);
        await updateTask(task.id, { status: 'failed', progress: 100, providerTaskStatus: status.providerTaskStatus, errorCode: error.apiError.code, errorReason: error.apiError.message });
        await failUsageRecord(task.id, error.apiError.message);
        continue;
      }
      try {
        const assetId = createId('asset_vid');
        const stored = await saveRemoteVideoToLocal({ remoteUrl: status.videoUrl, fileName: `${assetId}.mp4` });
        const now = nowIso();
        const asset: AssetRecord = {
          id: assetId,
          type: 'video',
          title: `${task.mode ?? 'T2V'} 真实视频结果`,
          prompt: task.prompt,
          thumbnail: stored.publicUrl,
          thumbnailUrl: stored.publicUrl,
          url: stored.publicUrl,
          fileUrl: stored.publicUrl,
          storageType: 'local',
          localPath: stored.localPath,
          mimeType: stored.mimeType ?? 'video/mp4',
          sizeBytes: stored.sizeBytes,
          providerId: task.providerId,
          providerName: task.providerName,
          model: task.model,
          projectId: task.projectId,
          createdAt: now,
          updatedAt: now,
          favorite: false,
          taskId: task.id,
          duration: Number(task.params.resolvedDuration ?? task.params.duration ?? 6),
          durationSeconds: Number(task.params.resolvedDuration ?? task.params.duration ?? 6),
          mode: task.mode,
          params: { ...task.params, providerTaskId: task.providerTaskId, providerTaskStatus: status.providerTaskStatus },
          parameters: { ...task.params, providerTaskId: task.providerTaskId, providerTaskStatus: status.providerTaskStatus, sourceUrl: status.videoUrl },
        };
        await updateDb((next) => {
          next.assets.unshift(asset);
          next.tasks = next.tasks.map((item) => item.id === task.id ? {
            ...item,
            status: 'completed',
            progress: 100,
            providerTaskStatus: status.providerTaskStatus,
            completedAt: now,
            updatedAt: now,
            assetCreated: true,
          } : item);
        });
        await completeUsageRecord(task.id, [asset]);
      } catch {
        const error = videoDownloadFailed(provider.name);
        await updateTask(task.id, { status: 'failed', progress: 100, providerTaskStatus: status.providerTaskStatus, errorCode: error.apiError.code, errorReason: error.apiError.message });
        await failUsageRecord(task.id, error.apiError.message);
      }
      continue;
    }
    await updateTask(task.id, {
      status: status.status,
      progress: status.progress,
      providerTaskStatus: status.providerTaskStatus,
      errorCode: status.errorCode,
      errorReason: status.errorReason,
      completedAt: status.status === 'failed' ? nowIso() : undefined,
    });
    if (status.status === 'failed') {
      await failUsageRecord(task.id, status.errorReason);
    }
  }
  // Sync benchmark run items after task polling
  syncBenchmarkRunItems().catch(() => undefined);
}

export async function cancelTask(taskId: string) {
  let updated: GenerationTaskRecord | undefined;
  await updateDb((db) => {
    db.tasks = db.tasks.map((task) => {
      if (task.id !== taskId) return task;
      updated = { ...task, status: 'canceled', progress: 0, updatedAt: nowIso() };
      return updated;
    });
  });
  if (!updated) throw notFound('任务不存在');
  await cancelUsageRecord(taskId);
  return updated;
}

export async function retryTask(taskId: string) {
  const task = await getTask(taskId);
  const now = nowIso();
  const retry: GenerationTaskRecord = {
    ...task,
    id: createId('task'),
    status: 'queued',
    progress: 0,
    assetCreated: false,
    providerTaskId: undefined,
    providerTaskStatus: undefined,
    errorCode: undefined,
    errorReason: undefined,
    createdAt: now,
    updatedAt: now,
    completedAt: undefined,
  };
  await addTask(retry);
  await createUsageRecord(retry);
  return retry;
}
