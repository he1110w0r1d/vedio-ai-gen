export type ProviderBenchmarkFilters = {
  projectId?: string;
  providerId?: string;
  providerType?: string;
  mode?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type ProviderBenchmarkRow = {
  providerId?: string;
  providerName?: string;
  providerType?: string;
  model?: string;
  mode?: 'image' | 't2v' | 'i2v' | 'r2v' | 'mock';
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  successRate: number;
  failureRate: number;
  averageTaskDurationSeconds?: number;
  averageGenerationDurationSeconds?: number;
  totalAssets: number;
  totalEstimatedCost?: number;
  wastedEstimatedCost?: number;
  averageRating?: number;
  excellentCount: number;
  usableCount: number;
  needsFixCount: number;
  unusableCount: number;
  worthRetryCount: number;
  topFailureCategory?: string;
};

export type ProviderBenchmarkSummary = {
  filters: ProviderBenchmarkFilters;
  overall: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    successRate: number;
    failureRate: number;
    averageDurationSeconds?: number;
    totalEstimatedCost?: number;
    wastedEstimatedCost?: number;
    averageRating?: number;
    reviewedCount: number;
    unreviewedCount: number;
  };
  byProvider: ProviderBenchmarkRow[];
  byModel: ProviderBenchmarkRow[];
  byMode: ProviderBenchmarkRow[];
  failureCategories: Array<{
    category: string;
    count: number;
    estimatedCost?: number;
  }>;
};
