import { requestJson, shouldUseMockApi } from './client';

// Frontend-friendly types (mirrors backend benchmark types)
export type BenchmarkMode = 't2v' | 'i2v' | 'r2v';

export type BenchmarkRubricCriterion = {
  key: string;
  label: string;
  description: string;
  weight?: number;
};

export type BenchmarkCase = {
  id: string;
  setId: string;
  title: string;
  mode: BenchmarkMode;
  prompt: string;
  negativePrompt?: string;
  referenceAssetId?: string;
  referenceUrl?: string;
  sourceImageAssetId?: string;
  sourceImageUrl?: string;
  expectedFocus?: string[];
  parameters: {
    duration?: number;
    resolution?: string;
    aspectRatio?: string;
    motionStrength?: string;
    cameraMovement?: string;
    seed?: string | number;
  };
  rubric: { criteria: BenchmarkRubricCriterion[] };
  createdAt: string;
  updatedAt: string;
};

export type BenchmarkSet = {
  id: string;
  name: string;
  description?: string;
  version: string;
  cases: BenchmarkCase[];
  createdAt: string;
  updatedAt: string;
};

export type BenchmarkRunStatus = 'draft' | 'running' | 'completed' | 'failed' | 'canceled';

export type BenchmarkRun = {
  id: string;
  setId: string;
  name: string;
  providerIds: string[];
  providerTypes: string[];
  modelMap?: Record<string, string>;
  status: BenchmarkRunStatus;
  liveRun: boolean;
  taskIds: string[];
  assetIds: string[];
  usageRecordIds?: string[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type BenchmarkRunItemStatus = 'pending' | 'created' | 'completed' | 'failed' | 'skipped';

export type BenchmarkRunItem = {
  id: string;
  runId: string;
  caseId: string;
  providerId: string;
  providerType: string;
  model: string;
  mode: BenchmarkMode;
  taskId?: string;
  assetId?: string;
  status: BenchmarkRunItemStatus;
  errorCode?: string;
  errorReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type BenchmarkRunSummary = {
  run: BenchmarkRun;
  totalCases: number;
  totalProviders: number;
  totalItems: number;
  completedItems: number;
  createdItems: number;
  failedItems: number;
  skippedItems: number;
  pendingItems: number;
  totalTasks: number;
  totalAssets: number;
  averageRating?: number;
  estimatedCostTotal?: number;
  byProvider: Array<{
    providerId: string;
    providerType: string;
    completedCount: number;
    failedCount: number;
    averageRating?: number;
    estimatedCost?: number;
  }>;
  byMode: Array<{
    mode: string;
    completedCount: number;
    failedCount: number;
  }>;
  failureCategories: Array<{
    category: string;
    count: number;
  }>;
  review: {
    totalReviewableItems: number;
    reviewedItems: number;
    unreviewedItems: number;
    failedReviewedItems: number;
    reviewProgress: number;
  };
};

// Mock seed data
function mockBenchmarkSet(): BenchmarkSet {
  const now = new Date().toISOString();
  const setId = 'bset_default_v1';
  const sharedRubric = [
    { key: 'subject_stability', label: '主体稳定性', description: '视频中主体是否稳定、不漂移', weight: 1 },
    { key: 'motion_naturalness', label: '动作自然度', description: '动作是否自然、流畅、不卡顿', weight: 1 },
    { key: 'prompt_fidelity', label: 'Prompt 符合度', description: '画面是否符合 prompt 描述的核心内容', weight: 1 },
    { key: 'artifact', label: '伪影程度', description: '画面是否无明显伪影、闪烁、变形', weight: 1 },
    { key: 'clarity', label: '画面清晰度', description: '画面是否清晰、分辨率是否达标', weight: 0.5 },
  ];
  const cases: BenchmarkCase[] = [
    {
      id: 'bcase_t2v_1', setId, title: '水滴 Logo 极简动效', mode: 't2v',
      prompt: 'A calm blue water droplet logo gently floating on a clean white background, minimal motion, product style.',
      expectedFocus: ['背景干净', '主体稳定', '动作自然', '无伪影'],
      parameters: { duration: 5, resolution: '720p', aspectRatio: '16:9' },
      rubric: { criteria: [...sharedRubric, { key: 'bg_clean', label: '背景干净度', description: '白色背景是否干净、无杂色', weight: 0.5 }] },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'bcase_t2v_2', setId, title: '产品级展示镜头', mode: 't2v',
      prompt: 'A premium glass water bottle rotating slowly on a clean white studio background, soft lighting, smooth product showcase motion.',
      expectedFocus: ['产品形变', '光照稳定', '镜头运动平滑'],
      parameters: { duration: 5, resolution: '720p', aspectRatio: '16:9' },
      rubric: { criteria: [...sharedRubric, { key: 'product_shape', label: '产品形变', description: '产品形状是否保持完整', weight: 1 }] },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'bcase_t2v_3', setId, title: '轻微镜头推进', mode: 't2v',
      prompt: 'A minimal futuristic water utility dashboard hologram floating in the air, slow camera push-in, clean blue-white color palette.',
      expectedFocus: ['UI元素稳定', '画面清晰', '科技感'],
      parameters: { duration: 5, resolution: '720p', aspectRatio: '16:9', cameraMovement: 'push-in' },
      rubric: { criteria: [...sharedRubric, { key: 'ui_stability', label: 'UI元素稳定性', description: '测仪表盘元素是否保持稳定', weight: 1 }] },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'bcase_i2v_1', setId, title: '水滴 Logo 悬浮旋转', mode: 'i2v',
      prompt: 'Make the subject gently float and rotate in place, with soft studio lighting and minimal camera movement.',
      sourceImageUrl: 'https://picsum.photos/seed/waterdrop-logo/1024/768',
      expectedFocus: ['保留主体', '主体不漂移', '构图完整', '动作自然'],
      parameters: { duration: 5, resolution: '720p', aspectRatio: '16:9' },
      rubric: { criteria: [...sharedRubric, { key: 'composition', label: '构图保持', description: '原始构图是否被保留', weight: 1 }] },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'bcase_i2v_2', setId, title: '产品瓶慢速旋转', mode: 'i2v',
      prompt: 'Animate the product with a slow premium rotation, keeping the original shape and composition stable.',
      sourceImageUrl: 'https://picsum.photos/seed/product-bottle/1024/768',
      expectedFocus: ['保留主体', '产品形变', '光照稳定', '构图完整'],
      parameters: { duration: 5, resolution: '720p', aspectRatio: '16:9' },
      rubric: { criteria: [...sharedRubric, { key: 'product_shape', label: '产品形变', description: '产品形状是否保持完整', weight: 1 }] },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'bcase_i2v_3', setId, title: '仪表盘视差动画', mode: 'i2v',
      prompt: 'Add subtle parallax and glow animation while preserving the original dashboard layout.',
      sourceImageUrl: 'https://picsum.photos/seed/dashboard-ui/1024/768',
      expectedFocus: ['保留主体', 'UI元素稳定', '动作自然', '构图完整'],
      parameters: { duration: 5, resolution: '720p', aspectRatio: '16:9' },
      rubric: { criteria: [...sharedRubric, { key: 'ui_stability', label: 'UI元素稳定性', description: '仪表盘元素是否保持稳定', weight: 1 }] },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'bcase_r2v_1', setId, title: '水滴角色前移转身', mode: 'r2v',
      prompt: 'gently moves forward, turns slightly toward the camera, and presents a calm product-style motion on a clean white background.',
      referenceUrl: 'https://picsum.photos/seed/waterdrop-logo/1024/768',
      expectedFocus: ['参考图关联', '主体稳定', '动作自然', '背景干净'],
      parameters: { duration: 5, resolution: '720p', aspectRatio: '16:9' },
      rubric: { criteria: [...sharedRubric, { key: 'reference_fidelity', label: '参考图一致性', description: '生成角色是否与参考图一致', weight: 1.5 }] },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'bcase_r2v_2', setId, title: '产品角色展示', mode: 'r2v',
      prompt: 'slowly rotates and presents the product with a premium showcase motion, studio lighting, clean white background.',
      referenceUrl: 'https://picsum.photos/seed/product-bottle/1024/768',
      expectedFocus: ['参考图关联', '产品形变', '光照稳定', '动作自然'],
      parameters: { duration: 5, resolution: '720p', aspectRatio: '16:9' },
      rubric: { criteria: [...sharedRubric, { key: 'reference_fidelity', label: '参考图一致性', description: '生成角色是否与参考图风格一致', weight: 1.5 }] },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'bcase_r2v_3', setId, title: '仪表盘角色演示', mode: 'r2v',
      prompt: 'gestures toward the dashboard and presents the interface with clean motion, futuristic blue-white palette.',
      referenceUrl: 'https://picsum.photos/seed/dashboard-ui/1024/768',
      expectedFocus: ['参考图关联', 'UI元素稳定', '动作自然', '科技感'],
      parameters: { duration: 5, resolution: '720p', aspectRatio: '16:9' },
      rubric: { criteria: [...sharedRubric, { key: 'reference_fidelity', label: '参考图一致性', description: '生成角色与仪表盘场景是否协调', weight: 1.5 }] },
      createdAt: now, updatedAt: now,
    },
  ];
  return {
    id: setId,
    name: 'Default Video Model Benchmark v0.1',
    description: '默认视频模型基准测试集，包含 T2V×3 + I2V×3 + R2V×3 共 9 个标准化用例。用于统一比较不同模型族的生成表现。',
    version: '0.1',
    cases,
    createdAt: now,
    updatedAt: now,
  };
}

const mockSet = mockBenchmarkSet();

export const benchmarkApi = {
  // ── Sets ──
  async listBenchmarkSets(): Promise<BenchmarkSet[]> {
    if (!shouldUseMockApi()) {
      const res = await requestJson<BenchmarkSet[]>('/api/benchmarks/sets');
      return res;
    }
    return [mockSet];
  },

  async getBenchmarkSet(id: string): Promise<BenchmarkSet> {
    if (!shouldUseMockApi()) {
      const res = await requestJson<BenchmarkSet>(`/api/benchmarks/sets/${id}`);
      return res;
    }
    return mockSet; // In mock mode, always return default
  },

  async createBenchmarkSet(data: Partial<BenchmarkSet>): Promise<BenchmarkSet> {
    if (!shouldUseMockApi()) {
      const res = await requestJson<BenchmarkSet>('/api/benchmarks/sets', { method: 'POST', body: JSON.stringify(data) });
      return res;
    }
    return mockSet;
  },

  async updateBenchmarkSet(id: string, data: Partial<BenchmarkSet>): Promise<BenchmarkSet> {
    if (!shouldUseMockApi()) {
      const res = await requestJson<BenchmarkSet>(`/api/benchmarks/sets/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      return res;
    }
    return mockSet;
  },

  async deleteBenchmarkSet(id: string): Promise<void> {
    if (!shouldUseMockApi()) {
      await requestJson<void>(`/api/benchmarks/sets/${id}`, { method: 'DELETE' });
      return;
    }
  },

  // ── Runs ──
  async listBenchmarkRuns(): Promise<BenchmarkRun[]> {
    if (!shouldUseMockApi()) {
      const res = await requestJson<BenchmarkRun[]>('/api/benchmarks/runs');
      return res;
    }
    return [];
  },

  async getBenchmarkRun(id: string): Promise<{ run: BenchmarkRun; items: BenchmarkRunItem[]; qualityFeedbacks: any[] }> {
    if (!shouldUseMockApi()) {
      const res = await requestJson<{ run: BenchmarkRun; items: BenchmarkRunItem[]; qualityFeedbacks: any[] }>(`/api/benchmarks/runs/${id}`);
      return res;
    }
    return { run: {} as BenchmarkRun, items: [], qualityFeedbacks: [] };
  },

  async createBenchmarkRun(data: { setId: string; name: string; providerIds: string[]; liveRun?: boolean }): Promise<BenchmarkRun> {
    if (!shouldUseMockApi()) {
      const res = await requestJson<BenchmarkRun>('/api/benchmarks/runs', { method: 'POST', body: JSON.stringify(data) });
      return res;
    }
    return { id: 'mock-run', setId: data.setId, name: data.name, providerIds: data.providerIds, providerTypes: [], status: 'draft', liveRun: data.liveRun ?? false, taskIds: [], assetIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as BenchmarkRun;
  },

  async startBenchmarkRun(id: string, confirmLiveRun: boolean): Promise<{ run: BenchmarkRun; items: BenchmarkRunItem[]; warning?: string }> {
    if (!shouldUseMockApi()) {
      const res = await requestJson<{ run: BenchmarkRun; items: BenchmarkRunItem[]; warning?: string }>(`/api/benchmarks/runs/${id}/start`, { method: 'POST', body: JSON.stringify({ confirmLiveRun }) });
      return res;
    }
    return { run: {} as BenchmarkRun, items: [], warning: 'Mock 模式不执行真实生成' };
  },

  async cancelBenchmarkRun(id: string): Promise<BenchmarkRun> {
    if (!shouldUseMockApi()) {
      const res = await requestJson<BenchmarkRun>(`/api/benchmarks/runs/${id}/cancel`, { method: 'POST' });
      return res;
    }
    return {} as BenchmarkRun;
  },

  async getBenchmarkRunSummary(id: string): Promise<BenchmarkRunSummary> {
    if (!shouldUseMockApi()) {
      const res = await requestJson<BenchmarkRunSummary>(`/api/benchmarks/runs/${id}/summary`);
      return res;
    }
    return {
      run: {} as BenchmarkRun,
      totalCases: 0, totalProviders: 0, totalItems: 0,
      completedItems: 0, createdItems: 0, failedItems: 0, skippedItems: 0, pendingItems: 0,
      totalTasks: 0, totalAssets: 0,
      byProvider: [], byMode: [], failureCategories: [],
      review: { totalReviewableItems: 0, reviewedItems: 0, unreviewedItems: 0, failedReviewedItems: 0, reviewProgress: 0 },
    };
  },
};
