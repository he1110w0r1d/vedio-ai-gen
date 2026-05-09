import type { AssetRecord } from '../types/asset.js';
import type { ImageGenerationInput, VideoGenerationInput } from '../types/generation.js';
import type { ProviderCapability, ProviderRecord } from '../types/provider.js';
import type { GenerationTaskRecord } from '../types/task.js';

export type TestConnectionResult = {
  ok: boolean;
  message: string;
  capabilities: ProviderCapability[];
};

export type ImageGenerationResult = {
  task: GenerationTaskRecord;
  assets: AssetRecord[];
};

export type VideoGenerationResult = {
  task: GenerationTaskRecord;
};

export type ProviderTaskStatusResult = Pick<GenerationTaskRecord, 'id' | 'status' | 'progress'> & {
  providerTaskStatus?: string;
  videoUrl?: string;
  errorCode?: string;
  errorReason?: string;
};

export interface ProviderAdapter {
  id: string;
  name: string;
  capabilities: ProviderCapability[];
  testConnection(provider: ProviderRecord): Promise<TestConnectionResult>;
  generateImage(provider: ProviderRecord, input: ImageGenerationInput): Promise<ImageGenerationResult>;
  generateVideoT2V(provider: ProviderRecord, input: VideoGenerationInput): Promise<VideoGenerationResult>;
  generateVideoI2V(provider: ProviderRecord, input: VideoGenerationInput): Promise<VideoGenerationResult>;
  generateVideoR2V(provider: ProviderRecord, input: VideoGenerationInput): Promise<VideoGenerationResult>;
  getTaskStatus(provider: ProviderRecord, task: GenerationTaskRecord): Promise<ProviderTaskStatusResult>;
}
