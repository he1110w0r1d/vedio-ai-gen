import type { GenerationTaskRecord } from '../types/task.js';
import type { UsageRecord, CostRule, CostConfidence, UsageSummary } from '../types/usage.js';
import type { AssetRecord } from '../types/asset.js';
import { createId } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import { readDb, updateDb } from './storageService.js';
import { notFound } from '../utils/errors.js';

function calculateEstimatedCost(task: GenerationTaskRecord, rules: CostRule[]): UsageRecord['estimatedCost'] {
  const mode = task.mode?.toLowerCase() ?? (task.type === 'image' ? 'image' : 'mock');
  const providerType = task.providerName; // Simplification: we might need exact providerType but we can match by model/mode
  
  // Find applicable rule
  const rule = rules.find(r => 
    r.enabled && 
    r.mode === mode && 
    (r.model ? r.model === task.model : true)
  );

  if (!rule) {
    return { confidence: 'none' };
  }

  let amount = 0;
  if (rule.unit === 'per_task') {
    amount = rule.price;
  } else if (rule.unit === 'per_image') {
    const count = Number(task.params.count ?? 1);
    amount = rule.price * count;
  } else if (rule.unit === 'per_second') {
    const duration = Number(task.params.duration ?? 5);
    amount = rule.price * duration;
  } else if (rule.unit === 'per_video') {
    amount = rule.price;
  }

  return {
    amount,
    currency: rule.currency,
    confidence: 'medium', // User configured rules are medium/low confidence
    ruleId: rule.id,
    note: rule.note,
  };
}

export async function createUsageRecord(task: GenerationTaskRecord, inputAssets?: string[]) {
  const db = await readDb();
  const estimatedCost = calculateEstimatedCost(task, db.costRules);
  const now = nowIso();
  
  const record: UsageRecord = {
    id: createId('usage'),
    taskId: task.id,
    projectId: task.projectId,
    providerId: task.providerId,
    providerName: task.providerName,
    model: task.model,
    mode: (task.mode?.toLowerCase() as UsageRecord['mode']) ?? (task.type === 'image' ? 'image' : 'mock'),
    status: task.status === 'failed' ? 'failed' : task.status === 'completed' ? 'completed' : 'estimated',
    quantity: task.type === 'image' ? Number(task.params.count ?? 1) : 1,
    durationSeconds: task.type === 'video' ? Number(task.params.duration ?? 0) : undefined,
    inputAssetIds: inputAssets,
    promptLength: task.prompt.length,
    estimatedCost,
    createdAt: now,
    updatedAt: now,
  };

  await updateDb(next => {
    next.usageRecords.unshift(record);
  });

  return record;
}

export async function completeUsageRecord(taskId: string, generatedAssets: AssetRecord[]) {
  let updated: UsageRecord | undefined;
  await updateDb(db => {
    db.usageRecords = db.usageRecords.map(record => {
      if (record.taskId !== taskId) return record;
      
      const fileSizeBytes = generatedAssets.reduce((sum, asset) => sum + (asset.sizeBytes ?? 0), 0);
      const width = generatedAssets[0]?.width;
      const height = generatedAssets[0]?.height;
      const durationSeconds = generatedAssets[0]?.durationSeconds ?? record.durationSeconds;

      updated = {
        ...record,
        status: 'completed',
        assetIds: generatedAssets.map(a => a.id),
        fileSizeBytes: fileSizeBytes > 0 ? fileSizeBytes : undefined,
        width,
        height,
        durationSeconds,
        updatedAt: nowIso(),
      };
      return updated;
    });
  });
  return updated;
}

export async function failUsageRecord(taskId: string, errorReason?: string) {
  await updateDb(db => {
    db.usageRecords = db.usageRecords.map(record => {
      if (record.taskId !== taskId) return record;
      return {
        ...record,
        status: 'failed',
        updatedAt: nowIso(),
        estimatedCost: record.estimatedCost ? { ...record.estimatedCost, note: errorReason ?? record.estimatedCost.note } : undefined
      };
    });
  });
}

export async function cancelUsageRecord(taskId: string) {
  await updateDb(db => {
    db.usageRecords = db.usageRecords.map(record => {
      if (record.taskId !== taskId) return record;
      return { ...record, status: 'canceled', updatedAt: nowIso() };
    });
  });
}

export async function listUsageRecords(filter: { projectId?: string; providerId?: string; mode?: string; status?: string }) {
  const db = await readDb();
  return db.usageRecords.filter(record => {
    if (filter.projectId && record.projectId !== filter.projectId) return false;
    if (filter.providerId && record.providerId !== filter.providerId) return false;
    if (filter.mode && record.mode !== filter.mode) return false;
    if (filter.status && record.status !== filter.status) return false;
    return true;
  });
}

export async function getUsageSummary(filter: { projectId?: string; providerId?: string; mode?: string }): Promise<UsageSummary> {
  const records = await listUsageRecords(filter);
  
  const summary: UsageSummary = {
    totalTasks: records.length,
    completedTasks: records.filter(r => r.status === 'completed').length,
    failedTasks: records.filter(r => r.status === 'failed').length,
    totalAssets: records.reduce((sum, r) => sum + (r.assetIds?.length ?? 0), 0),
    totalImages: records.filter(r => r.mode === 'image' && r.status === 'completed').reduce((sum, r) => sum + (r.assetIds?.length ?? 0), 0),
    totalVideos: records.filter(r => ['t2v', 'i2v', 'r2v'].includes(r.mode) && r.status === 'completed').reduce((sum, r) => sum + (r.assetIds?.length ?? 0), 0),
    totalVideoSeconds: records.filter(r => ['t2v', 'i2v', 'r2v'].includes(r.mode) && r.status === 'completed').reduce((sum, r) => sum + (r.durationSeconds ?? 0), 0),
    totalFileSizeBytes: records.reduce((sum, r) => sum + (r.fileSizeBytes ?? 0), 0),
    estimatedCostTotal: { amount: 0, currency: 'CNY', confidence: 'none' },
    byProvider: [],
    byMode: [],
    byProject: [],
  };

  const providerMap = new Map<string, { providerName?: string; taskCount: number; estimatedCost: number }>();
  const modeMap = new Map<string, { taskCount: number; assetCount: number; estimatedCost: number }>();
  const projectMap = new Map<string, { taskCount: number; assetCount: number; estimatedCost: number }>();

  let hasCost = false;
  let totalCost = 0;

  for (const r of records) {
    const cost = r.estimatedCost?.amount ?? 0;
    if (r.estimatedCost && r.estimatedCost.confidence !== 'none') {
      hasCost = true;
      if (r.status === 'completed') {
        totalCost += cost;
      }
    }

    // Provider
    const provId = r.providerId ?? 'unknown';
    const prov = providerMap.get(provId) ?? { providerName: r.providerName, taskCount: 0, estimatedCost: 0 };
    prov.taskCount += 1;
    if (r.status === 'completed') prov.estimatedCost += cost;
    providerMap.set(provId, prov);

    // Mode
    const mod = modeMap.get(r.mode) ?? { taskCount: 0, assetCount: 0, estimatedCost: 0 };
    mod.taskCount += 1;
    mod.assetCount += (r.assetIds?.length ?? 0);
    if (r.status === 'completed') mod.estimatedCost += cost;
    modeMap.set(r.mode, mod);

    // Project
    const projId = r.projectId ?? 'unknown';
    const proj = projectMap.get(projId) ?? { taskCount: 0, assetCount: 0, estimatedCost: 0 };
    proj.taskCount += 1;
    proj.assetCount += (r.assetIds?.length ?? 0);
    if (r.status === 'completed') proj.estimatedCost += cost;
    projectMap.set(projId, proj);
  }

  summary.estimatedCostTotal = hasCost ? { amount: totalCost, currency: 'CNY', confidence: 'medium' } : undefined;

  summary.byProvider = Array.from(providerMap.entries()).map(([id, data]) => ({ providerId: id, ...data }));
  summary.byMode = Array.from(modeMap.entries()).map(([mode, data]) => ({ mode, ...data }));
  summary.byProject = Array.from(projectMap.entries()).map(([id, data]) => ({ projectId: id, ...data }));

  return summary;
}

export async function listCostRules() {
  const db = await readDb();
  return db.costRules;
}

export async function createCostRule(rule: CostRule) {
  await updateDb(db => {
    db.costRules.push(rule);
  });
  return rule;
}

export async function updateCostRule(ruleId: string, patch: Partial<CostRule>) {
  let updated: CostRule | undefined;
  await updateDb(db => {
    db.costRules = db.costRules.map(rule => {
      if (rule.id !== ruleId) return rule;
      updated = { ...rule, ...patch, updatedAt: nowIso() };
      return updated;
    });
  });
  if (!updated) throw notFound('成本规则不存在');
  return updated;
}

export async function deleteCostRule(ruleId: string) {
  await updateDb(db => {
    db.costRules = db.costRules.filter(r => r.id !== ruleId);
  });
}
