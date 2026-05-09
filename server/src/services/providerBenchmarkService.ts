import type { QualityFeedback } from '../types/quality.js';
import type { UsageRecord } from '../types/usage.js';
import type { GenerationTaskRecord } from '../types/task.js';
import type { ProviderRecord } from '../types/provider.js';
import type {
  ProviderBenchmarkFilters,
  ProviderBenchmarkRow,
  ProviderBenchmarkSummary,
} from '../types/providerBenchmark.js';
import { readDb } from './storageService.js';

function dateFilter(value: string, from?: string, to?: string) {
  if (!from && !to) return true;
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
}

function safeRate(numerator: number, denominator: number) {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

function taskMode(task: GenerationTaskRecord): string {
  return task.mode?.toLowerCase() ?? (task.type === 'image' ? 'image' : 'mock');
}

function calcDurationSeconds(task: GenerationTaskRecord): number | undefined {
  if (!task.completedAt || !task.createdAt) return undefined;
  const diff = new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime();
  if (diff < 0) return undefined;
  return Math.round(diff / 100) / 10; // in seconds with 1 decimal
}

function findUsageRecord(taskId: string, usageRecords: UsageRecord[]): UsageRecord | undefined {
  return usageRecords.find((r) => r.taskId === taskId);
}

function findTaskFeedback(taskId: string, qualityFeedback: QualityFeedback[]): QualityFeedback | undefined {
  return qualityFeedback.find((fb) => fb.targetType === 'task' && fb.targetId === taskId);
}

// Group feedback by task via usageRecord assetIds
function getTaskQualityFeedback(
  taskId: string,
  usageRecord: UsageRecord | undefined,
  qualityFeedback: QualityFeedback[],
): { taskFb?: QualityFeedback; assetFbs: QualityFeedback[] } {
  const taskFb = findTaskFeedback(taskId, qualityFeedback);
  const assetFbs: QualityFeedback[] = [];
  if (usageRecord?.assetIds) {
    for (const assetId of usageRecord.assetIds) {
      const fb = qualityFeedback.find((f) => f.targetType === 'asset' && f.targetId === assetId);
      if (fb) assetFbs.push(fb);
    }
  }
  return { taskFb, assetFbs };
}

type AggregatedRow = {
  providerId?: string;
  providerName?: string;
  providerType?: string;
  model?: string;
  mode?: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  durations: number[];
  estimatedCosts: number[];
  wastedCosts: number[];
  ratings: number[];
  excellentCount: number;
  usableCount: number;
  needsFixCount: number;
  unusableCount: number;
  worthRetryCount: number;
  failureCategories: Map<string, number>;
  failureCategoryCosts: Map<string, number>;
  assetCount: number;
};

function buildRow(agg: AggregatedRow): ProviderBenchmarkRow {
  const totalCost = agg.estimatedCosts.reduce((s, c) => s + c, 0);
  const totalWasted = agg.wastedCosts.reduce((s, c) => s + c, 0);
  const avgDuration =
    agg.durations.length > 0
      ? Math.round((agg.durations.reduce((s, d) => s + d, 0) / agg.durations.length) * 10) / 10
      : undefined;
  const avgRating =
    agg.ratings.length > 0
      ? Math.round((agg.ratings.reduce((s, r) => s + r, 0) / agg.ratings.length) * 100) / 100
      : undefined;

  let topFailureCategory: string | undefined;
  let topCount = 0;
  for (const [cat, count] of agg.failureCategories) {
    if (count > topCount) {
      topCount = count;
      topFailureCategory = cat;
    }
  }

  return {
    providerId: agg.providerId,
    providerName: agg.providerName,
    providerType: agg.providerType,
    model: agg.model,
    mode: agg.mode as ProviderBenchmarkRow['mode'],
    totalTasks: agg.totalTasks,
    completedTasks: agg.completedTasks,
    failedTasks: agg.failedTasks,
    successRate: safeRate(agg.completedTasks, agg.totalTasks),
    failureRate: safeRate(agg.failedTasks, agg.totalTasks),
    averageTaskDurationSeconds: avgDuration,
    averageGenerationDurationSeconds: avgDuration,
    totalAssets: agg.assetCount,
    totalEstimatedCost: agg.estimatedCosts.length > 0 ? Math.round(totalCost * 100) / 100 : undefined,
    wastedEstimatedCost: agg.wastedCosts.length > 0 ? Math.round(totalWasted * 100) / 100 : undefined,
    averageRating: avgRating,
    excellentCount: agg.excellentCount,
    usableCount: agg.usableCount,
    needsFixCount: agg.needsFixCount,
    unusableCount: agg.unusableCount,
    worthRetryCount: agg.worthRetryCount,
    topFailureCategory,
  };
}

export async function getProviderBenchmarkSummary(
  filters: ProviderBenchmarkFilters,
): Promise<ProviderBenchmarkSummary> {
  const db = await readDb();
  const { tasks, usageRecords, qualityFeedback, providers, assets } = db;

  // Build lookup maps
  const providerMap = new Map<string, ProviderRecord>();
  for (const p of providers) {
    providerMap.set(p.id, p);
  }

  const usageMap = new Map<string, UsageRecord>();
  for (const u of usageRecords) {
    usageMap.set(u.taskId, u);
  }

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (filters.projectId && task.projectId !== filters.projectId) return false;
    if (filters.providerId && task.providerId !== filters.providerId) return false;
    if (filters.mode && taskMode(task) !== filters.mode) return false;
    if (filters.providerType) {
      const p = providerMap.get(task.providerId);
      if (!p || p.providerType !== filters.providerType) return false;
    }
    if (!dateFilter(task.createdAt, filters.dateFrom, filters.dateTo)) return false;
    return true;
  });

  // Initialize aggregations
  const byProviderAgg = new Map<string, AggregatedRow>();
  const byModelAgg = new Map<string, AggregatedRow>();
  const byModeAgg = new Map<string, AggregatedRow>();
  const failureCatAgg = new Map<string, { count: number; estimatedCost: number }>();

  let overallTotal = 0;
  let overallCompleted = 0;
  let overallFailed = 0;
  const overallDurations: number[] = [];
  const overallEstimatedCosts: number[] = [];
  const overallWastedCosts: number[] = [];
  const overallRatings: number[] = [];
  let overallReviewed = 0;
  let overallUnreviewed = 0;

  for (const task of filteredTasks) {
    const provider = providerMap.get(task.providerId);
    const providerType = provider?.providerType ?? 'unknown';
    const mode = taskMode(task);
    const model = task.model || 'unknown';
    const usageRec = usageMap.get(task.id);
    const { taskFb, assetFbs } = getTaskQualityFeedback(task.id, usageRec, qualityFeedback);

    // Determine quality feedback to use (merge task + asset feedbacks)
    const allFbs: QualityFeedback[] = [taskFb, ...assetFbs].filter(Boolean) as QualityFeedback[];
    const hasFeedback = allFbs.length > 0;
    const anyUnusable = allFbs.some(
      (fb) => fb.qualityStatus === 'unusable',
    );

    if (hasFeedback) overallReviewed++;
    else overallUnreviewed++;

    // Cost
    const estimatedCost =
      usageRec?.estimatedCost && usageRec.estimatedCost.confidence !== 'none'
        ? usageRec.estimatedCost.amount ?? 0
        : 0;
    let wastedCost = 0;
    if (task.status === 'failed' && estimatedCost > 0) {
      wastedCost = estimatedCost;
    } else if (task.status === 'completed' && anyUnusable && estimatedCost > 0) {
      wastedCost = estimatedCost;
    }

    // Duration
    const duration = calcDurationSeconds(task);

    // Ratings
    const taskRatings: number[] = [];
    for (const fb of allFbs) {
      if (typeof fb.rating === 'number') taskRatings.push(fb.rating);
    }

    // Failure categories — count per-feedback, but add wastedCost only once per task
    const primaryFb = allFbs.find((fb) => fb.failureCategory); // task-level first, then asset-level
    let wastedCostAddedToFailureCat = false;
    for (const fb of allFbs) {
      if (fb.failureCategory) {
        const entry = failureCatAgg.get(fb.failureCategory) ?? { count: 0, estimatedCost: 0 };
        entry.count++;
        // Only add wastedCost to the primary (first-found) failure category for this task
        if (!wastedCostAddedToFailureCat && wastedCost > 0 && fb === primaryFb) {
          entry.estimatedCost += wastedCost;
          wastedCostAddedToFailureCat = true;
        }
        failureCatAgg.set(fb.failureCategory, entry);
      }
    }
    // Failed tasks without any quality feedback
    if (task.status === 'failed' && !primaryFb) {
      const cat = 'provider_error';
      const entry = failureCatAgg.get(cat) ?? { count: 0, estimatedCost: 0 };
      entry.count++;
      if (estimatedCost > 0) entry.estimatedCost += estimatedCost;
      failureCatAgg.set(cat, entry);
    }

    // Overall stats
    overallTotal++;
    if (task.status === 'completed') overallCompleted++;
    if (task.status === 'failed') overallFailed++;
    if (duration !== undefined) overallDurations.push(duration);
    if (estimatedCost > 0) overallEstimatedCosts.push(estimatedCost);
    if (wastedCost > 0) overallWastedCosts.push(wastedCost);
    for (const r of taskRatings) overallRatings.push(r);

    // Helper to update aggregation
    const updateAgg = (agg: AggregatedRow) => {
      agg.totalTasks++;
      if (task.status === 'completed') agg.completedTasks++;
      if (task.status === 'failed') agg.failedTasks++;
      if (duration !== undefined) agg.durations.push(duration);
      if (estimatedCost > 0) agg.estimatedCosts.push(estimatedCost);
      if (wastedCost > 0) agg.wastedCosts.push(wastedCost);
      for (const r of taskRatings) agg.ratings.push(r);
      agg.excellentCount += allFbs.filter((fb) => fb.qualityStatus === 'excellent').length;
      agg.usableCount += allFbs.filter((fb) => fb.qualityStatus === 'usable').length;
      agg.needsFixCount += allFbs.filter((fb) => fb.qualityStatus === 'needs_fix').length;
      agg.unusableCount += allFbs.filter((fb) => fb.qualityStatus === 'unusable').length;
      agg.worthRetryCount += allFbs.filter((fb) => fb.worthRetry).length;
      for (const fb of allFbs) {
        if (fb.failureCategory) {
          agg.failureCategories.set(fb.failureCategory, (agg.failureCategories.get(fb.failureCategory) ?? 0) + 1);
        }
      }
      if (task.status === 'failed' && !allFbs.some((fb) => fb.failureCategory)) {
        agg.failureCategories.set('provider_error', (agg.failureCategories.get('provider_error') ?? 0) + 1);
      }
      // Count assets from usageRecord
      agg.assetCount += usageRec?.assetIds?.length ?? 0;
    };

    // By Provider
    const provKey = task.providerId || 'unknown';
    if (!byProviderAgg.has(provKey)) {
      byProviderAgg.set(provKey, {
        providerId: task.providerId,
        providerName: task.providerName,
        providerType,
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        durations: [],
        estimatedCosts: [],
        wastedCosts: [],
        ratings: [],
        excellentCount: 0,
        usableCount: 0,
        needsFixCount: 0,
        unusableCount: 0,
        worthRetryCount: 0,
        failureCategories: new Map(),
        failureCategoryCosts: new Map(),
        assetCount: 0,
      });
    }
    updateAgg(byProviderAgg.get(provKey)!);

    // By Model (providerId + model as key)
    const modelKey = `${task.providerId ?? 'unknown'}::${model}`;
    if (!byModelAgg.has(modelKey)) {
      byModelAgg.set(modelKey, {
        providerId: task.providerId,
        providerName: task.providerName,
        providerType,
        model,
        mode: mode,
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        durations: [],
        estimatedCosts: [],
        wastedCosts: [],
        ratings: [],
        excellentCount: 0,
        usableCount: 0,
        needsFixCount: 0,
        unusableCount: 0,
        worthRetryCount: 0,
        failureCategories: new Map(),
        failureCategoryCosts: new Map(),
        assetCount: 0,
      });
    }
    updateAgg(byModelAgg.get(modelKey)!);

    // By Mode
    if (!byModeAgg.has(mode)) {
      byModeAgg.set(mode, {
        mode,
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        durations: [],
        estimatedCosts: [],
        wastedCosts: [],
        ratings: [],
        excellentCount: 0,
        usableCount: 0,
        needsFixCount: 0,
        unusableCount: 0,
        worthRetryCount: 0,
        failureCategories: new Map(),
        failureCategoryCosts: new Map(),
        assetCount: 0,
      });
    }
    updateAgg(byModeAgg.get(mode)!);
  }

  // Build result
  const overallAvgDuration =
    overallDurations.length > 0
      ? Math.round((overallDurations.reduce((s, d) => s + d, 0) / overallDurations.length) * 10) / 10
      : undefined;
  const overallAvgRating =
    overallRatings.length > 0
      ? Math.round((overallRatings.reduce((s, r) => s + r, 0) / overallRatings.length) * 100) / 100
      : undefined;
  const overallTotalCost =
    overallEstimatedCosts.length > 0 ? Math.round(overallEstimatedCosts.reduce((s, c) => s + c, 0) * 100) / 100 : undefined;
  const overallWastedCost =
    overallWastedCosts.length > 0 ? Math.round(overallWastedCosts.reduce((s, c) => s + c, 0) * 100) / 100 : undefined;

  return {
    filters,
    overall: {
      totalTasks: overallTotal,
      completedTasks: overallCompleted,
      failedTasks: overallFailed,
      successRate: safeRate(overallCompleted, overallTotal),
      failureRate: safeRate(overallFailed, overallTotal),
      averageDurationSeconds: overallAvgDuration,
      totalEstimatedCost: overallTotalCost,
      wastedEstimatedCost: overallWastedCost,
      averageRating: overallAvgRating,
      reviewedCount: overallReviewed,
      unreviewedCount: overallUnreviewed,
    },
    byProvider: Array.from(byProviderAgg.values()).map(buildRow),
    byModel: Array.from(byModelAgg.values()).map(buildRow),
    byMode: Array.from(byModeAgg.values()).map(buildRow),
    failureCategories: Array.from(failureCatAgg.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        estimatedCost: data.estimatedCost > 0 ? Math.round(data.estimatedCost * 100) / 100 : undefined,
      }))
      .sort((a, b) => b.count - a.count),
  };
}
