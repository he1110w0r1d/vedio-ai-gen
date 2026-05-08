export type ViewId =
  | 'dashboard'
  | 'projects'
  | 'image-studio'
  | 'video-studio'
  | 'assets'
  | 'tasks'
  | 'providers'
  | 'templates'
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
  storageType?: 'mock' | 'local' | 'remote';
  localPath?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  providerId: string;
  providerName: string;
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

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled';
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
