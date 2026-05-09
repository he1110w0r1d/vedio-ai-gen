export type BenchmarkMode = 't2v' | 'i2v' | 'r2v';

export type BenchmarkCase = {
  id: string;
  setId: string;
  title: string;
  mode: BenchmarkMode;
  prompt: string;
  negativePrompt?: string;
  referenceAssetId?: string;
  referenceUrl?: string;
  sourceImageAssetId?: string;
  sourceImageUrl?: string;
  expectedFocus?: string[];
  parameters: {
    duration?: number;
    resolution?: string;
    aspectRatio?: string;
    motionStrength?: string;
    cameraMovement?: string;
    seed?: string | number;
  };
  rubric: {
    criteria: Array<{
      key: string;
      label: string;
      description: string;
      weight?: number;
    }>;
  };
  createdAt: string;
  updatedAt: string;
};

export type BenchmarkSet = {
  id: string;
  name: string;
  description?: string;
  version: string;
  cases: BenchmarkCase[];
  createdAt: string;
  updatedAt: string;
};

export type BenchmarkRunStatus = 'draft' | 'running' | 'completed' | 'failed' | 'canceled';

export type BenchmarkRun = {
  id: string;
  setId: string;
  name: string;
  providerIds: string[];
  providerTypes: string[];
  modelMap?: Record<string, string>;
  status: BenchmarkRunStatus;
  liveRun: boolean;
  taskIds: string[];
  assetIds: string[];
  usageRecordIds?: string[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type BenchmarkRunItemStatus = 'pending' | 'created' | 'completed' | 'failed' | 'skipped';

export type BenchmarkRunItem = {
  id: string;
  runId: string;
  caseId: string;
  providerId: string;
  providerType: string;
  model: string;
  mode: BenchmarkMode;
  taskId?: string;
  assetId?: string;
  status: BenchmarkRunItemStatus;
  errorCode?: string;
  errorReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type BenchmarkRunSummary = {
  run: BenchmarkRun;
  totalCases: number;
  totalProviders: number;
  totalItems: number;
  completedItems: number;
  createdItems: number;
  failedItems: number;
  skippedItems: number;
  pendingItems: number;
  totalTasks: number;
  totalAssets: number;
  averageRating?: number;
  estimatedCostTotal?: number;
  byProvider: Array<{
    providerId: string;
    providerType: string;
    completedCount: number;
    failedCount: number;
    averageRating?: number;
    estimatedCost?: number;
  }>;
  byMode: Array<{
    mode: string;
    completedCount: number;
    failedCount: number;
  }>;
  failureCategories: Array<{
    category: string;
    count: number;
  }>;
  review: {
    totalReviewableItems: number;
    reviewedItems: number;
    unreviewedItems: number;
    failedReviewedItems: number;
    reviewProgress: number;
  };
};
