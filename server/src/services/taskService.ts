import type { AssetRecord } from '../types/asset.js';
import type { GenerationTaskRecord, TaskStatus } from '../types/task.js';
import { createId } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import { notFound } from '../utils/errors.js';
import { readDb, updateDb } from './storageService.js';

const videoThumb = 'https://images.unsplash.com/photo-1484950763426-56b5bf172dbb?auto=format&fit=crop&w=1200&q=80';

export async function listTasks() {
  const db = await readDb();
  return db.tasks;
}

export async function getTask(taskId: string) {
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
      if (task.type !== 'video' || task.status === 'completed' || task.status === 'failed' || task.status === 'canceled') return task;
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
        newAssets.push(createVideoAssetForTask(nextTask));
        nextTask.assetCreated = true;
      }
      return nextTask;
    });
    if (newAssets.length) db.assets.unshift(...newAssets);
  });
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
    errorReason: undefined,
    createdAt: now,
    updatedAt: now,
    completedAt: undefined,
  };
  await addTask(retry);
  return retry;
}
