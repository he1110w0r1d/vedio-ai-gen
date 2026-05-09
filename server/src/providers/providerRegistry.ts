import { aliyunHappyHorseI2VAdapter } from './aliyunHappyHorseI2VAdapter.js';
import { aliyunHappyHorseR2VAdapter } from './aliyunHappyHorseR2VAdapter.js';
import { aliyunHappyHorseT2VAdapter } from './aliyunHappyHorseT2VAdapter.js';
import { aliyunWanxiangI2VAdapter } from './aliyunWanxiangI2VAdapter.js';
import { aliyunWanxiangR2VAdapter } from './aliyunWanxiangR2VAdapter.js';
import { aliyunWanxiangT2VAdapter } from './aliyunWanxiangT2VAdapter.js';
import { klingT2VAdapter } from './klingT2VAdapter.js';
import { mockProviderAdapter } from './mockProviderAdapter.js';
import { openaiImagesAdapter } from './openaiImagesAdapter.js';
import type { ProviderAdapter } from './types.js';
import { providerUnavailable } from '../utils/errors.js';

const registry: Record<string, ProviderAdapter> = {
  mock: mockProviderAdapter,
  google: mockProviderAdapter,
  openai: openaiImagesAdapter,
  'openai-images': openaiImagesAdapter,
  wanwuhuanxin: openaiImagesAdapter,
  'wanwuhuanxin-image': openaiImagesAdapter,
  'aliyun-wanxiang-t2v': aliyunWanxiangT2VAdapter,
  'wanxiang-t2v': aliyunWanxiangT2VAdapter,
  'aliyun-wanxiang-i2v': aliyunWanxiangI2VAdapter,
  'wanxiang-i2v': aliyunWanxiangI2VAdapter,
  'aliyun-wanxiang-r2v': aliyunWanxiangR2VAdapter,
  'wanxiang-r2v': aliyunWanxiangR2VAdapter,
  'aliyun-happyhorse-t2v': aliyunHappyHorseT2VAdapter,
  'happyhorse-t2v': aliyunHappyHorseT2VAdapter,
  'aliyun-happyhorse-i2v': aliyunHappyHorseI2VAdapter,
  'happyhorse-i2v': aliyunHappyHorseI2VAdapter,
  'aliyun-happyhorse-r2v': aliyunHappyHorseR2VAdapter,
  'happyhorse-r2v': aliyunHappyHorseR2VAdapter,
  dashscope: aliyunWanxiangT2VAdapter,
  'kling-t2v': klingT2VAdapter,
  kling: mockProviderAdapter,
  minimax: mockProviderAdapter,
  pika: mockProviderAdapter,
  luma: mockProviderAdapter,
  stability: mockProviderAdapter,
  custom: mockProviderAdapter,
};

export function getProviderAdapter(providerType?: string): ProviderAdapter {
  if (providerType && registry[providerType]) return registry[providerType];
  throw providerUnavailable(providerType ?? 'unknown', 'UNKNOWN_PROVIDER_TYPE');
}

export function registerProviderAdapter(providerType: string, adapter: ProviderAdapter) {
  registry[providerType] = adapter;
}
