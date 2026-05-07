import type { VideoMode } from './task.js';

export type AssetType = 'image' | 'video' | 'reference';

export type AssetRecord = {
  id: string;
  type: AssetType;
  title: string;
  prompt: string;
  thumbnail: string;
  thumbnailUrl?: string;
  url?: string;
  fileUrl?: string;
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
  updatedAt: string;
  favorite: boolean;
  taskId?: string;
  aspectRatio?: string;
  duration?: number;
  durationSeconds?: number;
  mode?: VideoMode;
  params: Record<string, string | number | boolean | undefined>;
  parameters?: Record<string, unknown>;
};
