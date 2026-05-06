import type { VideoMode } from './task.js';

export type ImageGenerationInput = {
  projectId: string;
  providerId: string;
  model: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  count?: number;
  seed?: string;
  style?: string;
};

export type VideoGenerationInput = {
  projectId: string;
  providerId: string;
  model: string;
  prompt: string;
  mode: VideoMode;
  params?: Record<string, string | number | boolean>;
};
