import type { Asset, GenerationTask } from '../types';

export function getCompletedVideoTasksNeedingAssets(tasks: GenerationTask[], assets: Asset[]) {
  return tasks.filter(
    (task) =>
      task.type === 'video' &&
      task.status === 'completed' &&
      !task.assetCreated &&
      !assets.some((asset) => asset.type === 'video' && asset.taskId === task.id),
  );
}

export function markVideoAssetsCreated(tasks: GenerationTask[], completedTasks: GenerationTask[]) {
  const completedIds = new Set(completedTasks.map((task) => task.id));
  return tasks.map((task) => (completedIds.has(task.id) ? { ...task, assetCreated: true } : task));
}
