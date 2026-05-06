import type { VideoMode } from './task.js';

export type AssetType = 'image' | 'video' | 'reference';

export type AssetRecord = {
  id: string;
  type: AssetType;
  title: string;
  prompt: string;
  thumbnail: string;
  fileUrl?: string;
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
  mode?: VideoMode;
  params: Record<string, string | number | boolean>;
};
