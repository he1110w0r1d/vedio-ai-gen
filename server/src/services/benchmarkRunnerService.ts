import type { BenchmarkRun, BenchmarkRunItem, BenchmarkRunItemStatus } from '../types/benchmark.js';
import type { ProviderRecord } from '../types/provider.js';
import { createId } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import { readDb, updateDb } from './storageService.js';
import { getBenchmarkSet, getBenchmarkRun, createBenchmarkRun } from './benchmarkService.js';
import { generateVideo } from './generationService.js';
import { getProviderRecord } from './providerService.js';
import { notFound, validationError } from '../utils/errors.js';
import type { VideoMode } from '../types/task.js';
import type { VideoGenerationInput } from '../types/generation.js';

const MODE_TO_VIDEO_MODE: Record<string, VideoMode> = {
  t2v: 'T2V',
  i2v: 'I2V',
  r2v: 'R2V',
};

export async function startBenchmarkRun(
  runId: string,
  confirmLiveRun: boolean,
): Promise<{ run: BenchmarkRun; items: BenchmarkRunItem[]; warning?: string }> {
  const { run } = await getBenchmarkRun(runId);
  if (run.status === 'running') throw validationError('该 Run 已在运行中');
  if (run.status === 'completed' || run.status === 'canceled') {
    // Prevent re-starting completed/canceled runs to avoid duplicate items
    throw validationError('该 Run 已完成或已取消。如需重新运行，请创建新的 Benchmark Run。');
  }

  const set = await getBenchmarkSet(run.setId);
  const now = nowIso();

  // Generate run items
  const items: BenchmarkRunItem[] = [];
  const db = await readDb();
  const providers = db.providers.filter(p => run.providerIds.includes(p.id) || run.providerTypes.includes(p.providerType));

  for (const benchmarkCase of set.cases) {
    const videoMode = MODE_TO_VIDEO_MODE[benchmarkCase.mode];
    if (!videoMode) continue;

    for (const provider of providers) {
      const adapter = await getCapableProvider(benchmarkCase.mode, provider);
      if (!adapter) {
        // Provider doesn't support this mode, create skipped item
        items.push({
          id: createId('bri'),
          runId,
          caseId: benchmarkCase.id,
          providerId: provider.id,
          providerType: provider.providerType,
          model: run.modelMap?.[provider.id] ?? provider.defaultModel ?? 'unknown',
          mode: benchmarkCase.mode,
          status: 'skipped' as BenchmarkRunItemStatus,
          errorCode: 'MODE_UNSUPPORTED',
          errorReason: `该供应商不支持 ${benchmarkCase.mode}`,
          createdAt: now,
          updatedAt: now,
        });
        continue;
      }

      items.push({
        id: createId('bri'),
        runId,
        caseId: benchmarkCase.id,
        providerId: provider.id,
        providerType: provider.providerType,
        model: run.modelMap?.[provider.id] ?? provider.defaultModel ?? 'unknown',
        mode: benchmarkCase.mode,
        status: 'pending' as BenchmarkRunItemStatus,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // If live run without confirmation, reject and do NOT persist items.
  // Items are only persisted when the run actually starts (dry-run or confirmed live-run).
  // This prevents orphaned pending items in the database.
  if (run.liveRun && !confirmLiveRun) {
    return {
      run,
      items,
      warning: '真实运行将产生供应商费用。请将 confirmLiveRun 设为 true 以确认执行。',
    };
  }

  // Dry run: mark all pending items as skipped (DRY_RUN) for data hygiene
  if (!run.liveRun) {
    const dryRunItems = items.map(item =>
      item.status === 'pending'
        ? { ...item, status: 'skipped' as BenchmarkRunItemStatus, errorCode: 'DRY_RUN', errorReason: 'dry-run 模式，不执行真实任务', updatedAt: now }
        : item
    );
    await updateDb(db2 => {
      db2.benchmarkRunItems.push(...dryRunItems);
      const runRef = db2.benchmarkRuns.find(r => r.id === runId);
      if (runRef) {
        runRef.status = 'completed';
        runRef.startedAt = now;
        runRef.completedAt = now;
        runRef.updatedAt = now;
      }
    });
    return { run: { ...run, status: 'completed', startedAt: now, completedAt: now, updatedAt: now }, items: dryRunItems };
  }

  // Live run: execute tasks
  await updateDb(db2 => {
    db2.benchmarkRunItems.push(...items);
    const runRef = db2.benchmarkRuns.find(r => r.id === runId);
    if (runRef) {
      runRef.status = 'running';
      runRef.startedAt = now;
      runRef.updatedAt = now;
    }
  });

  // Execute serially to avoid rate limits
  const executedItems: BenchmarkRunItem[] = [];
  const taskIds: string[] = [];
  for (const item of items) {
    if (item.status === 'skipped') {
      executedItems.push(item);
      continue;
    }

    const benchmarkCase = set.cases.find(c => c.id === item.caseId);
    if (!benchmarkCase) {
      executedItems.push({ ...item, status: 'failed', errorCode: 'CASE_NOT_FOUND', errorReason: '用例不存在', updatedAt: nowIso() });
      continue;
    }

    try {
      // Resolve prompt: append [Image 1] prefix for HappyHorse R2V, character1 for Wanxiang R2V
      const resolvedPrompt = resolvePromptForProvider(benchmarkCase.prompt, benchmarkCase.mode, item.providerType);

      const params: Record<string, string | number | boolean> = {};
      if (benchmarkCase.parameters.duration) params.duration = benchmarkCase.parameters.duration;
      if (benchmarkCase.parameters.resolution) params.resolution = benchmarkCase.parameters.resolution;
      if (benchmarkCase.parameters.aspectRatio) params.aspectRatio = benchmarkCase.parameters.aspectRatio;
      if (benchmarkCase.parameters.seed) params.seed = benchmarkCase.parameters.seed;
      if (benchmarkCase.sourceImageUrl) params.sourceImageUrl = benchmarkCase.sourceImageUrl;
      if (benchmarkCase.sourceImageAssetId) params.sourceImageAssetId = benchmarkCase.sourceImageAssetId;
      if (benchmarkCase.referenceUrl) params.referenceUrl = benchmarkCase.referenceUrl;
      if (benchmarkCase.referenceAssetId) params.referenceAssetId = benchmarkCase.referenceAssetId;

      const videoMode = MODE_TO_VIDEO_MODE[benchmarkCase.mode]!;
      const input: VideoGenerationInput = {
        projectId: db.workspace.defaultProjectId ?? 'p1',
        providerId: item.providerId,
        model: item.model,
        prompt: resolvedPrompt,
        mode: videoMode,
        params,
      };

      const result = await generateVideo(input);
      if (result.task) {
        taskIds.push(result.task.id);
        const completedItem: BenchmarkRunItem = {
          ...item,
          taskId: result.task.id,
          status: 'created' as BenchmarkRunItemStatus,
          updatedAt: nowIso(),
        };
        executedItems.push(completedItem);

        await updateDb(db2 => {
          const idx = db2.benchmarkRunItems.findIndex(i => i.id === item.id);
          if (idx !== -1) {
            db2.benchmarkRunItems[idx] = completedItem;
          }
          const runRef2 = db2.benchmarkRuns.find(r => r.id === runId);
          if (runRef2 && !runRef2.taskIds.includes(result.task.id)) {
            runRef2.taskIds.push(result.task.id);
          }
        });
      } else {
        executedItems.push({ ...item, status: 'failed', errorCode: 'NO_TASK', errorReason: '任务创建失败', updatedAt: nowIso() });
      }
    } catch (error: any) {
      const failedItem: BenchmarkRunItem = {
        ...item,
        status: 'failed' as BenchmarkRunItemStatus,
        errorCode: error?.apiError?.code ?? 'UNKNOWN',
        errorReason: error?.apiError?.message ?? error?.message ?? '未知错误',
        updatedAt: nowIso(),
      };
      executedItems.push(failedItem);

      await updateDb(db2 => {
        const idx = db2.benchmarkRunItems.findIndex(i => i.id === item.id);
        if (idx !== -1) {
          db2.benchmarkRunItems[idx] = failedItem;
        }
      });
    }
  }

  // Mark run as completed (tasks are async, will complete in background via polling)
  await updateDb(db2 => {
    const runRef = db2.benchmarkRuns.find(r => r.id === runId);
    if (runRef) {
      runRef.status = 'completed';
      runRef.completedAt = nowIso();
      runRef.updatedAt = nowIso();
    }
  });

  return {
    run: { ...run, status: 'completed', taskIds, startedAt: now, completedAt: nowIso(), updatedAt: nowIso() },
    items: executedItems,
  };
}

export async function cancelBenchmarkRun(runId: string): Promise<BenchmarkRun> {
  let result: BenchmarkRun | undefined;
  await updateDb(db => {
    const run = db.benchmarkRuns.find(r => r.id === runId);
    if (!run) throw notFound('Benchmark Run 不存在');
    run.status = 'canceled';
    run.updatedAt = nowIso();
    result = run;
  });
  return result!;
}

function resolvePromptForProvider(prompt: string, mode: string, providerType: string): string {
  if (mode !== 'r2v') return prompt;

  // Wanxiang R2V: prepend character1
  if (providerType.includes('wanxiang')) {
    return `character1 ${prompt}`;
  }

  // HappyHorse R2V: prepend [Image 1]
  if (providerType.includes('happyhorse')) {
    return `[Image 1] ${prompt}`;
  }

  return prompt;
}

function isProviderCapable(mode: string, provider: ProviderRecord): boolean {
  switch (mode) {
    case 't2v': return provider.capabilities?.includes('t2v') || provider.capabilities?.includes('T2V') || false;
    case 'i2v': return provider.capabilities?.includes('i2v') || provider.capabilities?.includes('I2V') || false;
    case 'r2v': return provider.capabilities?.includes('r2v') || provider.capabilities?.includes('R2V') || false;
    default: return false;
  }
}

async function getCapableProvider(mode: string, provider: ProviderRecord): Promise<boolean> {
  // Check capabilities first
  if (!isProviderCapable(mode, provider)) return false;

  // Try to load the adapter to verify it supports this mode
  try {
    const { getProviderAdapter } = await import('../providers/providerRegistry.js');
    const adapter = getProviderAdapter(provider.providerType);
    return !!adapter;
  } catch {
    return false;
  }
}

/**
 * Sync all active BenchmarkRunItems with their associated tasks.
 * Call this after task polling completes (e.g., from refreshRealVideoTasks).
 */
export async function syncBenchmarkRunItems(): Promise<number> {
  let syncedCount = 0;
  await updateDb(db => {
    const activeItems = db.benchmarkRunItems.filter(item =>
      (item.status === 'created' || item.status === 'pending') && item.taskId
    );
    if (activeItems.length === 0) return;

    for (const item of activeItems) {
      const task = db.tasks.find(t => t.id === item.taskId);
      if (!task) continue;

      const now = nowIso();
      let updated = false;

      if (task.status === 'completed') {
        // Find asset linked to this task
        const asset = db.assets.find(a => a.taskId === task.id);
        item.status = 'completed';
        if (asset) item.assetId = asset.id;
        item.updatedAt = now;
        updated = true;
        syncedCount++;
      } else if (task.status === 'failed' || task.status === 'canceled' || task.status === 'timeout') {
        item.status = 'failed';
        item.errorCode = task.errorCode ?? 'UNKNOWN';
        item.errorReason = task.errorReason ?? (task.status === 'timeout' ? '任务超时' : '任务失败');
        item.updatedAt = now;
        updated = true;
        syncedCount++;
      }

      if (updated) {
        // Update the run's assetIds
        const run = db.benchmarkRuns.find(r => r.id === item.runId);
        if (run && item.assetId && !run.assetIds.includes(item.assetId)) {
          run.assetIds.push(item.assetId);
        }
      }
    }

    // After syncing items, update run statuses
    const affectedRunIds = [...new Set(activeItems.map(i => i.runId))];
    for (const runId of affectedRunIds) {
      const run = db.benchmarkRuns.find(r => r.id === runId);
      if (!run || run.status === 'canceled') continue;

      const runItems = db.benchmarkRunItems.filter(i => i.runId === runId);
      if (runItems.length === 0) continue;

      const allFinal = runItems.every(i =>
        ['completed', 'failed', 'skipped'].includes(i.status)
      );
      const hasRunning = runItems.some(i =>
        i.status === 'created' || i.status === 'pending'
      );

      if (allFinal && !hasRunning) {
        run.status = 'completed';
        run.completedAt = run.completedAt ?? nowIso();
        run.updatedAt = nowIso();
      } else if (hasRunning) {
        run.status = 'running';
        run.updatedAt = nowIso();
      }
    }
  });
  return syncedCount;
}

/**
 * Sync a single benchmark run with tasks (for on-demand refreshing).
 */
export async function syncBenchmarkRun(runId: string): Promise<BenchmarkRun> {
  await syncBenchmarkRunItems();
  const db = await readDb();
  const run = db.benchmarkRuns.find(r => r.id === runId);
  if (!run) throw notFound('Benchmark Run 不存在');
  return run;
}
