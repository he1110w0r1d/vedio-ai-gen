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
  capabilities: ProviderCapability[];
  status: ProviderStatus;
  isDefault?: boolean;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  assetCount: number;
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
  providerId: string;
  providerName: string;
  model: string;
  projectId: string;
  createdAt: string;
  favorite: boolean;
  taskId?: string;
  params: Record<string, string | number | boolean>;
};

export type ImageAsset = AssetBase & {
  type: 'image' | 'reference';
  aspectRatio: string;
};

export type VideoAsset = AssetBase & {
  type: 'video';
  duration: number;
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
  title: string;
  prompt: string;
  providerId: string;
  providerName: string;
  model: string;
  projectId: string;
  projectName: string;
  createdAt: string;
  errorReason?: string;
  params: Record<string, string | number | boolean>;
};

export type PromptTemplate = {
  id: string;
  title: string;
  category: string;
  body: string;
  variables: string[];
  favorite?: boolean;
};

export type VideoSeed = {
  assetId: string;
  usage: 'i2v-first' | 'i2v-last' | 'r2v-character' | 'r2v-style';
};
