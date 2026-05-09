import type { Asset, GenerationTask, Provider, ProviderBenchmarkFilters, ProviderBenchmarkRow, ProviderBenchmarkSummary } from '../types';
import { requestJson, shouldUseMockApi } from './client';

type AppData = {
  tasks: GenerationTask[];
  providers: Provider[];
  assets: Asset[];
};

function safeRate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

function taskMode(task: GenerationTask): string {
  return task.mode?.toLowerCase() ?? (task.type === 'image' ? 'image' : 'mock');
}

export const providerBenchmarkApi = {
  async getSummary(
    filters: ProviderBenchmarkFilters,
    appData?: AppData,
  ): Promise<ProviderBenchmarkSummary> {
    if (!shouldUseMockApi()) {
      const params = new URLSearchParams();
      if (filters.projectId) params.set('projectId', filters.projectId);
      if (filters.providerId) params.set('providerId', filters.providerId);
      if (filters.providerType) params.set('providerType', filters.providerType);
      if (filters.mode) params.set('mode', filters.mode);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      return requestJson<ProviderBenchmarkSummary>(`/api/provider-benchmark/summary${params.toString() ? `?${params}` : ''}`);
    }

    // Mock mode: compute basic stats from available app data
    if (!appData) {
      return emptySummary(filters);
    }

    const { tasks, providers } = appData;
    const providerMap = new Map(providers.map((p) => [p.id, p]));

    let filteredTasks = tasks.filter((task) => {
      if (filters.projectId && task.projectId !== filters.projectId) return false;
      if (filters.providerId && task.providerId !== filters.providerId) return false;
      if (filters.mode && taskMode(task) !== filters.mode) return false;
      return true;
    });

    // Aggregate by provider
    const byProviderAgg = new Map<string, {
      providerId: string;
      providerName: string;
      providerType: string;
      totalTasks: number;
      completedTasks: number;
      failedTasks: number;
      assetCount: number;
      durations: number[];
    }>();

    const byModeAgg = new Map<string, { mode: string; totalTasks: number; completedTasks: number; failedTasks: number }>();

    let overallTotal = 0;
    let overallCompleted = 0;
    let overallFailed = 0;
    const overallDurations: number[] = [];

    for (const task of filteredTasks) {
      const provider = providerMap.get(task.providerId);
      const providerType = provider?.providerType ?? 'custom';
      const mode = taskMode(task);

      overallTotal++;
      if (task.status === 'completed') overallCompleted++;
      if (task.status === 'failed') overallFailed++;

      // Provider aggregation
      const provKey = task.providerId;
      if (!byProviderAgg.has(provKey)) {
        byProviderAgg.set(provKey, {
          providerId: task.providerId,
          providerName: task.providerName,
          providerType,
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          assetCount: 0,
          durations: [],
        });
      }
      const prov = byProviderAgg.get(provKey)!;
      prov.totalTasks++;
      if (task.status === 'completed') prov.completedTasks++;
      if (task.status === 'failed') prov.failedTasks++;

      // Duration
      if (task.completedAt && task.createdAt) {
        const diff = new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime();
        if (diff > 0) {
          const secs = Math.round(diff / 100) / 10;
          prov.durations.push(secs);
          overallDurations.push(secs);
        }
      }

      // Mode aggregation
      if (!byModeAgg.has(mode)) {
        byModeAgg.set(mode, { mode, totalTasks: 0, completedTasks: 0, failedTasks: 0 });
      }
      const modeAgg = byModeAgg.get(mode)!;
      modeAgg.totalTasks++;
      if (task.status === 'completed') modeAgg.completedTasks++;
      if (task.status === 'failed') modeAgg.failedTasks++;
    }

    const buildRow = (agg: { totalTasks: number; completedTasks: number; failedTasks: number; durations?: number[] }): ProviderBenchmarkRow => {
      const avgDur = agg.durations && agg.durations.length > 0
        ? Math.round((agg.durations.reduce((s, d) => s + d, 0) / agg.durations.length) * 10) / 10
        : undefined;
      return {
        totalTasks: agg.totalTasks,
        completedTasks: agg.completedTasks,
        failedTasks: agg.failedTasks,
        successRate: safeRate(agg.completedTasks, agg.totalTasks),
        failureRate: safeRate(agg.failedTasks, agg.totalTasks),
        averageTaskDurationSeconds: avgDur,
        averageGenerationDurationSeconds: avgDur,
        totalAssets: 0,
        excellentCount: 0,
        usableCount: 0,
        needsFixCount: 0,
        unusableCount: 0,
        worthRetryCount: 0,
      };
    };

    const overallAvgDuration = overallDurations.length > 0
      ? Math.round((overallDurations.reduce((s, d) => s + d, 0) / overallDurations.length) * 10) / 10
      : undefined;

    return {
      filters,
      overall: {
        totalTasks: overallTotal,
        completedTasks: overallCompleted,
        failedTasks: overallFailed,
        successRate: safeRate(overallCompleted, overallTotal),
        failureRate: safeRate(overallFailed, overallTotal),
        averageDurationSeconds: overallAvgDuration,
        totalEstimatedCost: undefined,
        wastedEstimatedCost: undefined,
        averageRating: undefined,
        reviewedCount: 0,
        unreviewedCount: overallTotal,
      },
      byProvider: Array.from(byProviderAgg.values()).map((agg) => ({
        ...buildRow(agg),
        providerId: agg.providerId,
        providerName: agg.providerName,
        providerType: agg.providerType,
      })),
      byModel: [],
      byMode: Array.from(byModeAgg.values()).map((agg) => ({
        ...buildRow(agg),
        mode: agg.mode as ProviderBenchmarkRow['mode'],
        providerName: 'Mock',
      })),
      failureCategories: [],
    };
  },
};

function emptySummary(filters: ProviderBenchmarkFilters): ProviderBenchmarkSummary {
  return {
    filters,
    overall: {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      successRate: 0,
      failureRate: 0,
      reviewedCount: 0,
      unreviewedCount: 0,
    },
    byProvider: [],
    byModel: [],
    byMode: [],
    failureCategories: [],
  };
}
