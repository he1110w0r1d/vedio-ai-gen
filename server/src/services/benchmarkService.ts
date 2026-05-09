import type {
  BenchmarkSet, BenchmarkCase,
  BenchmarkRun, BenchmarkRunItem, BenchmarkRunSummary,
  BenchmarkRunStatus,
} from '../types/benchmark.js';
import { createId } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import { readDb, updateDb } from './storageService.js';
import { notFound, validationError } from '../utils/errors.js';

// ── Benchmark Sets ──

export async function listBenchmarkSets(): Promise<BenchmarkSet[]> {
  const db = await readDb();
  return db.benchmarkSets;
}

export async function getBenchmarkSet(id: string): Promise<BenchmarkSet> {
  const db = await readDb();
  const set = db.benchmarkSets.find(s => s.id === id);
  if (!set) throw notFound('Benchmark Set 不存在');
  return set;
}

export async function createBenchmarkSet(data: {
  name: string;
  description?: string;
  version: string;
  cases: Array<Omit<BenchmarkCase, 'id' | 'setId' | 'createdAt' | 'updatedAt'>>;
}): Promise<BenchmarkSet> {
  const now = nowIso();
  const setId = createId('bset');
  const cases: BenchmarkCase[] = data.cases.map(c => ({
    ...c,
    id: createId('bcase'),
    setId,
    createdAt: now,
    updatedAt: now,
  }));
  const set: BenchmarkSet = {
    id: setId,
    name: data.name,
    description: data.description,
    version: data.version,
    cases,
    createdAt: now,
    updatedAt: now,
  };
  await updateDb(db => {
    db.benchmarkSets.push(set);
  });
  return set;
}

export async function updateBenchmarkSet(id: string, data: Partial<Pick<BenchmarkSet, 'name' | 'description' | 'version'>> & {
  cases?: Array<Omit<BenchmarkCase, 'id' | 'setId' | 'createdAt' | 'updatedAt'> & { id?: string }>;
}): Promise<BenchmarkSet> {
  const now = nowIso();
  let result: BenchmarkSet | undefined;
  await updateDb(db => {
    const idx = db.benchmarkSets.findIndex(s => s.id === id);
    if (idx === -1) throw notFound('Benchmark Set 不存在');
    const existing = db.benchmarkSets[idx];
    const updated: BenchmarkSet = {
      ...existing,
      name: data.name ?? existing.name,
      description: data.description !== undefined ? data.description : existing.description,
      version: data.version ?? existing.version,
      updatedAt: now,
    };
    if (data.cases) {
      updated.cases = data.cases.map(c => {
        const caseId = c.id ?? createId('bcase');
        return {
          ...c,
          id: caseId,
          setId: id,
          createdAt: c.id ? (existing.cases.find(ec => ec.id === c.id)?.createdAt ?? now) : now,
          updatedAt: now,
        } as BenchmarkCase;
      });
    }
    db.benchmarkSets[idx] = updated;
    result = updated;
  });
  return result!;
}

export async function deleteBenchmarkSet(id: string): Promise<void> {
  await updateDb(db => {
    db.benchmarkSets = db.benchmarkSets.filter(s => s.id !== id);
  });
}

// ── Benchmark Runs ──

export async function listBenchmarkRuns(): Promise<BenchmarkRun[]> {
  const db = await readDb();
  return db.benchmarkRuns;
}

export async function getBenchmarkRun(id: string): Promise<{ run: BenchmarkRun; items: BenchmarkRunItem[]; qualityFeedbacks: import('../types/quality.js').QualityFeedback[] }> {
  const db = await readDb();
  const run = db.benchmarkRuns.find(r => r.id === id);
  if (!run) throw notFound('Benchmark Run 不存在');
  const items = db.benchmarkRunItems.filter(i => i.runId === id);
  const taskIds = items.filter(i => i.taskId).map(i => i.taskId!) as string[];
  const assetIds = items.filter(i => i.assetId).map(i => i.assetId!) as string[];
  const allTargetIds = new Set([...taskIds, ...assetIds]);
  const qualityFeedbacks = db.qualityFeedback.filter(fb => allTargetIds.has(fb.targetId));
  return { run, items, qualityFeedbacks };
}

export async function createBenchmarkRun(data: {
  setId: string;
  name: string;
  providerIds: string[];
  liveRun?: boolean;
}): Promise<BenchmarkRun> {
  const db = await readDb();
  const set = db.benchmarkSets.find(s => s.id === data.setId);
  if (!set) throw notFound('Benchmark Set 不存在');

  const now = nowIso();
  const providers = db.providers.filter(p => data.providerIds.includes(p.id));
  if (providers.length === 0) throw validationError('至少选择一个供应商');

  const run: BenchmarkRun = {
    id: createId('brun'),
    setId: data.setId,
    name: data.name,
    providerIds: providers.map(p => p.id),
    providerTypes: [...new Set(providers.map(p => p.providerType))],
    status: 'draft' as BenchmarkRunStatus,
    liveRun: data.liveRun ?? false,
    taskIds: [],
    assetIds: [],
    createdAt: now,
    updatedAt: now,
  };

  await updateDb(db2 => {
    db2.benchmarkRuns.push(run);
  });

  return run;
}

export async function getBenchmarkRunSummary(id: string): Promise<BenchmarkRunSummary> {
  const { run, items } = await getBenchmarkRun(id);
  const db = await readDb();
  const set = db.benchmarkSets.find(s => s.id === run.setId);

  const totalCases = set?.cases.length ?? 0;
  const totalProviders = run.providerIds.length;
  const totalItems = items.length;
  const completedItems = items.filter(i => i.status === 'completed').length;
  const createdItems = items.filter(i => i.status === 'created').length;
  const failedItems = items.filter(i => i.status === 'failed').length;
  const skippedItems = items.filter(i => i.status === 'skipped').length;
  const pendingItems = items.filter(i => i.status === 'pending').length;

  // Tasks + Assets
  const taskIds = items.filter(i => i.taskId).map(i => i.taskId!) as string[];
  const assetIds = items.filter(i => i.assetId).map(i => i.assetId!) as string[];
  const totalTasks = taskIds.length;
  const totalAssets = assetIds.length;

  // Overall rating from quality feedback on benchmark assets/tasks
  const allFeedback = db.qualityFeedback.filter(fb =>
    taskIds.includes(fb.targetId) || assetIds.includes(fb.targetId)
  );
  const allRatings = allFeedback.filter(fb => fb.rating != null).map(fb => fb.rating!);
  const averageRating = allRatings.length > 0
    ? Math.round(allRatings.reduce((s, r) => s + r, 0) / allRatings.length * 100) / 100
    : undefined;

  // Total estimated cost
  const allUsage = db.usageRecords.filter(ur => taskIds.includes(ur.taskId));
  const estimatedCostTotal = allUsage.reduce((sum, ur) => sum + (ur.estimatedCost?.amount ?? 0), 0);

  // Failure categories
  const catMap = new Map<string, number>();
  for (const item of items) {
    if (item.status === 'failed' && item.errorCode) {
      const cat = item.errorCode;
      catMap.set(cat, (catMap.get(cat) ?? 0) + 1);
    }
  }
  // Also include quality feedback failure categories
  for (const fb of allFeedback) {
    if (fb.failureCategory) {
      catMap.set(fb.failureCategory, (catMap.get(fb.failureCategory) ?? 0) + 1);
    }
  }
  const failureCategories = Array.from(catMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // By provider
  const byProvider = run.providerIds.map(pid => {
    const provItems = items.filter(i => i.providerId === pid);
    const provider = db.providers.find(p => p.id === pid);
    const relevantFeedback = db.qualityFeedback.filter(fb =>
      provItems.some(ri => ri.assetId && fb.targetId === ri.assetId)
    );
    const ratings = relevantFeedback.filter(fb => fb.rating != null).map(fb => fb.rating!);
    const relevantUsage = db.usageRecords.filter(ur =>
      provItems.some(ri => ri.taskId && ur.taskId === ri.taskId)
    );

    return {
      providerId: pid,
      providerType: provider?.providerType ?? provider?.name ?? pid,
      completedCount: provItems.filter(i => i.status === 'completed').length,
      failedCount: provItems.filter(i => i.status === 'failed').length,
      averageRating: ratings.length > 0 ? Math.round(ratings.reduce((s, r) => s + r, 0) / ratings.length * 100) / 100 : undefined,
      estimatedCost: relevantUsage.reduce((sum, ur) => sum + (ur.estimatedCost?.amount ?? 0), 0),
    };
  });

  // By mode
  const modeMap = new Map<string, { completedCount: number; failedCount: number }>();
  for (const item of items) {
    const entry = modeMap.get(item.mode) ?? { completedCount: 0, failedCount: 0 };
    if (item.status === 'completed') entry.completedCount++;
    if (item.status === 'failed') entry.failedCount++;
    modeMap.set(item.mode, entry);
  }
  const byMode = Array.from(modeMap.entries()).map(([mode, data]) => ({
    mode,
    ...data,
  }));

  // Review progress (reuse allFeedback from above for review computation)
  const reviewableItems = items.filter(i =>
    (i.status === 'completed' || i.status === 'failed') &&
    (i.taskId || i.assetId) &&
    !i.errorCode?.includes('DRY_RUN')
  );
  const totalReviewableItems = reviewableItems.length;
  const reviewedItemIds = new Set(allFeedback.map(fb => fb.targetId));
  const reviewedItemsCount = reviewableItems.filter(i =>
    (i.assetId && reviewedItemIds.has(i.assetId)) ||
    (i.taskId && reviewedItemIds.has(i.taskId))
  ).length;
  const failedReviewedItemsCount = reviewableItems.filter(i =>
    i.status === 'failed' &&
    ((i.assetId && reviewedItemIds.has(i.assetId)) ||
     (i.taskId && reviewedItemIds.has(i.taskId)))
  ).length;

  return {
    run,
    totalCases,
    totalProviders,
    totalItems,
    completedItems,
    createdItems,
    failedItems,
    skippedItems,
    pendingItems,
    totalTasks,
    totalAssets,
    averageRating,
    estimatedCostTotal,
    byProvider,
    byMode,
    failureCategories,
    review: {
      totalReviewableItems,
      reviewedItems: reviewedItemsCount,
      unreviewedItems: totalReviewableItems - reviewedItemsCount,
      failedReviewedItems: failedReviewedItemsCount,
      reviewProgress: totalReviewableItems > 0
        ? Math.round(reviewedItemsCount / totalReviewableItems * 10000) / 100
        : 0,
    },
  };
}
