export type CostConfidence = 'none' | 'low' | 'medium';

export type UsageRecord = {
  id: string;
  taskId: string;
  assetIds?: string[];
  projectId?: string;
  providerId?: string;
  providerName?: string;
  providerType?: string;
  model?: string;
  mode: 'image' | 't2v' | 'i2v' | 'r2v' | 'mock';
  status: 'estimated' | 'completed' | 'failed' | 'canceled';
  quantity?: number;
  durationSeconds?: number;
  width?: number;
  height?: number;
  fileSizeBytes?: number;
  inputAssetIds?: string[];
  promptLength?: number;
  estimatedCost?: {
    amount?: number;
    currency?: string;
    confidence: CostConfidence;
    ruleId?: string;
    note?: string;
  };
  actualCost?: {
    amount?: number;
    currency?: string;
    source?: 'manual' | 'provider' | 'unknown';
    note?: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type CostRule = {
  id: string;
  providerType: string;
  providerName?: string;
  model?: string;
  mode: 'image' | 't2v' | 'i2v' | 'r2v';
  unit: 'per_image' | 'per_video' | 'per_second' | 'per_task' | 'manual';
  price: number;
  currency: 'CNY' | 'USD';
  enabled: boolean;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type UsageSummary = {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalAssets: number;
  totalImages: number;
  totalVideos: number;
  totalVideoSeconds?: number;
  totalFileSizeBytes?: number;
  estimatedCostTotal?: {
    amount?: number;
    currency?: string;
    confidence: CostConfidence;
  };
  byProvider: Array<{
    providerId?: string;
    providerName?: string;
    taskCount: number;
    estimatedCost?: number;
  }>;
  byMode: Array<{
    mode: string;
    taskCount: number;
    assetCount: number;
    estimatedCost?: number;
  }>;
  byProject: Array<{
    projectId?: string;
    projectName?: string;
    taskCount: number;
    assetCount: number;
    estimatedCost?: number;
  }>;
};
