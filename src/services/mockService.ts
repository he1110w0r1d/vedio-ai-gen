import { imagePool } from '../data/mockData';
import type { Asset, GenerationTask, Project, Provider, VideoMode } from '../types';

const now = () => new Date().toLocaleString('zh-CN', { hour12: false });
const id = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export function maskKey(value: string) {
  if (!value.trim()) return '';
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}

export function createImageAssets(input: {
  prompt: string;
  count: number;
  provider: Provider;
  project: Project;
  model: string;
  aspectRatio: string;
  style: string;
  seed: string;
}): Asset[] {
  return Array.from({ length: input.count }).map((_, index) => ({
    id: id('img'),
    type: 'image',
    title: `图片生成结果 ${index + 1}`,
    prompt: input.prompt || '未命名创意图片',
    thumbnail: imagePool[(index + Math.floor(Math.random() * imagePool.length)) % imagePool.length],
    providerId: input.provider.id,
    providerName: input.provider.name,
    model: input.model,
    projectId: input.project.id,
    createdAt: now(),
    favorite: false,
    aspectRatio: input.aspectRatio,
    params: { style: input.style, seed: input.seed || '随机' },
  }));
}

export function createTask(input: {
  type: 'image' | 'video';
  title: string;
  prompt: string;
  provider: Provider;
  project: Project;
  model: string;
  mode?: VideoMode;
  params?: Record<string, string | number | boolean>;
}): GenerationTask {
  return {
    id: id('task'),
    type: input.type,
    mode: input.mode,
    status: 'queued',
    progress: 0,
    title: input.title,
    prompt: input.prompt,
    providerId: input.provider.id,
    providerName: input.provider.name,
    model: input.model,
    projectId: input.project.id,
    projectName: input.project.name,
    createdAt: now(),
    params: input.params ?? {},
  };
}

export function createVideoAsset(task: GenerationTask): Asset {
  return {
    id: id('vid'),
    type: 'video',
    title: `${task.mode ?? 'T2V'} 视频结果`,
    prompt: task.prompt,
    thumbnail: imagePool[Math.floor(Math.random() * imagePool.length)],
    providerId: task.providerId,
    providerName: task.providerName,
    model: task.model,
    projectId: task.projectId,
    createdAt: now(),
    favorite: false,
    taskId: task.id,
    duration: Number(task.params.duration ?? 6),
    mode: task.mode ?? 'T2V',
    params: task.params,
  };
}

export const mockErrors = ['API Key 无效', '余额不足', '供应商限流', '内容审核未通过', '模型暂不可用', '任务超时'];
