export type ViewId =
  | 'dashboard'
  | 'projects'
  | 'image-studio'
  | 'video-studio'
  | 'assets'
  | 'tasks'
  | 'providers'
  | 'templates'
  | 'usage'
  | 'provider-benchmark'
  | 'benchmarks'
  | 'settings';

export type ProviderCapability =
  | '图片生成'
  | 'T2V'
  | 'I2V'
  | 'R2V'
  | '首帧'
  | '尾帧'
  | '多参考图'
  | '负面提示词'
  | 'Seed'
  | '异步任务';

export type ProviderStatus = 'connected' | 'failed' | 'unconfigured' | 'testing';

export type Provider = {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  apiKeyMasked?: string;
  providerType?: string;
  capabilities: ProviderCapability[];
  status: ProviderStatus;
  isDefault?: boolean;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  assetCount: number;
  updatedAt: string;
  coverAssetId?: string;
  defaultProviderId?: string;
  status?: 'active' | 'archived';
  favorite?: boolean;
  tags?: string[];
  createdAt?: string;
};

export type WorkspaceProfile = {
  id: string;
  name: string;
  ownerName?: string;
  description?: string;
  avatarUrl?: string;
  defaultProjectId?: string;
  createdAt: string;
  updatedAt: string;
};

export type AssetType = 'image' | 'video' | 'reference';
export type VideoMode = 'T2V' | 'I2V' | 'R2V';

export type AssetBase = {
  id: string;
  type: AssetType;
  title: string;
  prompt: string;
  thumbnail: string;
  thumbnailUrl?: string;
  url?: string;
  storageType?: 'mock' | 'local' | 'remote' | 'object';
  objectKey?: string;
  publicUrl?: string;
  localPath?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  providerId: string;
  providerName: string;
  providerTaskId?: string;
  providerTaskStatus?: string;
  model: string;
  projectId: string;
  createdAt: string;
  favorite: boolean;
  taskId?: string;
  params: Record<string, string | number | boolean | undefined>;
  parameters?: Record<string, unknown>;
};

export type ImageAsset = AssetBase & {
  type: 'image' | 'reference';
  aspectRatio: string;
};

export type VideoAsset = AssetBase & {
  type: 'video';
  duration: number;
  durationSeconds?: number;
  mode: VideoMode;
};

export type Asset = ImageAsset | VideoAsset;

export type TaskStatus = 'queued' | 'running' | 'polling' | 'completed' | 'failed' | 'canceled' | 'timeout';
export type TaskType = 'image' | 'video';

export type GenerationTask = {
  id: string;
  type: TaskType;
  mode?: VideoMode;
  status: TaskStatus;
  progress: number;
  assetCreated?: boolean;
  title: string;
  prompt: string;
  providerId: string;
  providerName: string;
  model: string;
  projectId: string;
  projectName: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  errorCode?: string;
  errorReason?: string;
  params: Record<string, string | number | boolean | undefined>;
};

export type PromptTemplate = {
  id: string;
  title: string;
  category: string;
  body: string;
  variables: string[];
  favorite?: boolean;
  description?: string;
  tags?: string[];
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type VideoSeed = {
  assetId: string;
  usage: 'i2v-first' | 'i2v-last' | 'r2v-character' | 'r2v-style' | 'r2v-video';
};

export type PendingPromptInput = {
  target: 'image' | 'video';
  mode?: 't2v' | 'i2v' | 'r2v';
  prompt: string;
  templateId?: string;
};

export type AppStateSnapshot = {
  version: number;
  providers: Provider[];
  assets: Asset[];
  tasks: GenerationTask[];
  promptTemplates: PromptTemplate[];
  projects: Project[];
  currentProjectId: string;
  selectedVideoInput?: VideoSeed;
  workspace?: WorkspaceProfile;
};

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

export type QualityRating = 1 | 2 | 3 | 4 | 5;
export type QualityStatus = 'excellent' | 'usable' | 'needs_fix' | 'unusable';
export type FailureCategory =
  | 'prompt_issue'
  | 'model_issue'
  | 'provider_error'
  | 'content_rejected'
  | 'technical_error'
  | 'bad_composition'
  | 'bad_motion'
  | 'identity_drift'
  | 'style_mismatch'
  | 'low_resolution'
  | 'artifact'
  | 'other';

export type QualityFeedback = {
  id: string;
  targetType: 'asset' | 'task';
  targetId: string;
  projectId?: string;
  providerId?: string;
  providerName?: string;
  model?: string;
  mode?: 'image' | 't2v' | 'i2v' | 'r2v' | 'mock';
  rating?: QualityRating;
  qualityStatus?: QualityStatus;
  failureCategory?: FailureCategory;
  tags?: string[];
  note?: string;
  worthRetry?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type QualitySummary = {
  totalFeedback: number;
  averageRating: number;
  excellentCount: number;
  usableCount: number;
  needsFixCount: number;
  unusableCount: number;
  worthRetryCount: number;
  ratingDistribution: Record<string, number>;
  totalRated: number;
  byQualityStatus: Record<string, number>;
  byMode: Array<{
    mode: string;
    averageRating?: number;
    total: number;
    unusableCount: number;
  }>;
  byProvider: Array<{
    providerId?: string;
    providerName?: string;
    averageRating?: number;
    total: number;
    unusableCount: number;
  }>;
  byFailureCategory: Array<{
    category: string;
    count: number;
  }>;
};

export type StorageConfig = {
  id: string;
  activeProvider: 'local' | 'object';
  objectProvider?: 'aliyun-oss' | 's3-compatible' | 'custom';
  bucket?: string;
  region?: string;
  endpoint?: string;
  publicBaseUrl?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  maskedAccessKeyId?: string;
  usePathStyle?: boolean;
  folderPrefix?: string;
  deleteLocalAfterUpload?: boolean;
  accessMode?: 'public' | 'private-presigned';
  presignedUrlExpiresInSeconds?: number;
  providerInputUrlExpiresInSeconds?: number;
  createdAt: string;
  updatedAt: string;
};

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
