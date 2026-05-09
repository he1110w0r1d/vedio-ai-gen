import type { QualityFeedback, QualitySummary } from '../types/quality.js';
import { createId } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import { readDb, updateDb } from './storageService.js';
import { notFound } from '../utils/errors.js';

export async function listQualityFeedback(filter: {
  projectId?: string;
  providerId?: string;
  mode?: string;
  rating?: string;
  qualityStatus?: string;
  failureCategory?: string;
  targetType?: string;
}): Promise<QualityFeedback[]> {
  const db = await readDb();
  return db.qualityFeedback.filter(fb => {
    if (filter.projectId && fb.projectId !== filter.projectId) return false;
    if (filter.providerId && fb.providerId !== filter.providerId) return false;
    if (filter.mode && fb.mode !== filter.mode) return false;
    if (filter.rating && fb.rating !== Number(filter.rating)) return false;
    if (filter.qualityStatus && fb.qualityStatus !== filter.qualityStatus) return false;
    if (filter.failureCategory && fb.failureCategory !== filter.failureCategory) return false;
    if (filter.targetType && fb.targetType !== filter.targetType) return false;
    return true;
  });
}

export async function getQualitySummary(filter: {
  projectId?: string;
  providerId?: string;
  mode?: string;
}): Promise<QualitySummary> {
  const feedback = await listQualityFeedback(filter);

  const ratings = feedback.filter(fb => fb.rating != null).map(fb => fb.rating!);
  const averageRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : undefined;

  const summary: QualitySummary = {
    totalFeedback: feedback.length,
    averageRating: averageRating ? Math.round(averageRating * 100) / 100 : undefined,
    excellentCount: feedback.filter(fb => fb.qualityStatus === 'excellent').length,
    usableCount: feedback.filter(fb => fb.qualityStatus === 'usable').length,
    needsFixCount: feedback.filter(fb => fb.qualityStatus === 'needs_fix').length,
    unusableCount: feedback.filter(fb => fb.qualityStatus === 'unusable').length,
    worthRetryCount: feedback.filter(fb => fb.worthRetry).length,
    byMode: [],
    byProvider: [],
    byFailureCategory: [],
  };

  // Group by mode
  const modeMap = new Map<string, { ratings: number[]; total: number; unusableCount: number }>();
  for (const fb of feedback) {
    const mode = fb.mode ?? 'unknown';
    const entry = modeMap.get(mode) ?? { ratings: [], total: 0, unusableCount: 0 };
    entry.total += 1;
    if (fb.rating != null) entry.ratings.push(fb.rating);
    if (fb.qualityStatus === 'unusable') entry.unusableCount += 1;
    modeMap.set(mode, entry);
  }
  summary.byMode = Array.from(modeMap.entries()).map(([mode, data]) => ({
    mode,
    averageRating: data.ratings.length > 0 ? Math.round(data.ratings.reduce((s, r) => s + r, 0) / data.ratings.length * 100) / 100 : undefined,
    total: data.total,
    unusableCount: data.unusableCount,
  }));

  // Group by provider
  const provMap = new Map<string, { providerName?: string; ratings: number[]; total: number; unusableCount: number }>();
  for (const fb of feedback) {
    const pid = fb.providerId ?? 'unknown';
    const entry = provMap.get(pid) ?? { providerName: fb.providerName, ratings: [], total: 0, unusableCount: 0 };
    entry.total += 1;
    if (fb.rating != null) entry.ratings.push(fb.rating);
    if (fb.qualityStatus === 'unusable') entry.unusableCount += 1;
    provMap.set(pid, entry);
  }
  summary.byProvider = Array.from(provMap.entries()).map(([id, data]) => ({
    providerId: id,
    providerName: data.providerName,
    averageRating: data.ratings.length > 0 ? Math.round(data.ratings.reduce((s, r) => s + r, 0) / data.ratings.length * 100) / 100 : undefined,
    total: data.total,
    unusableCount: data.unusableCount,
  }));

  // Group by failure category
  const catMap = new Map<string, number>();
  for (const fb of feedback) {
    if (fb.failureCategory) {
      catMap.set(fb.failureCategory, (catMap.get(fb.failureCategory) ?? 0) + 1);
    }
  }
  summary.byFailureCategory = Array.from(catMap.entries()).map(([category, count]) => ({ category, count }));

  return summary;
}

export async function getTargetFeedback(targetType: 'asset' | 'task', targetId: string): Promise<QualityFeedback | undefined> {
  const db = await readDb();
  return db.qualityFeedback.find(fb => fb.targetType === targetType && fb.targetId === targetId);
}

export async function upsertFeedback(targetType: 'asset' | 'task', targetId: string, data: Partial<QualityFeedback>): Promise<QualityFeedback> {
  const now = nowIso();
  let result: QualityFeedback | undefined;
  
  await updateDb(db => {
    const existing = db.qualityFeedback.find(fb => fb.targetType === targetType && fb.targetId === targetId);
    if (existing) {
      const updated: QualityFeedback = {
        ...existing,
        ...data,
        id: existing.id,
        targetType,
        targetId,
        updatedAt: now,
      };
      db.qualityFeedback = db.qualityFeedback.map(fb => fb.id === existing.id ? updated : fb);
      result = updated;
    } else {
      const created: QualityFeedback = {
        id: createId('qf'),
        targetType,
        targetId,
        projectId: data.projectId,
        providerId: data.providerId,
        providerName: data.providerName,
        model: data.model,
        mode: data.mode,
        rating: data.rating,
        qualityStatus: data.qualityStatus,
        failureCategory: data.failureCategory,
        tags: data.tags,
        note: data.note,
        worthRetry: data.worthRetry,
        createdAt: now,
        updatedAt: now,
      };
      db.qualityFeedback.unshift(created);
      result = created;
    }
  });

  return result!;
}

export async function updateFeedback(feedbackId: string, patch: Partial<QualityFeedback>): Promise<QualityFeedback> {
  let updated: QualityFeedback | undefined;
  await updateDb(db => {
    db.qualityFeedback = db.qualityFeedback.map(fb => {
      if (fb.id !== feedbackId) return fb;
      updated = { ...fb, ...patch, updatedAt: nowIso() };
      return updated;
    });
  });
  if (!updated) throw notFound('评价记录不存在');
  return updated;
}

export async function deleteFeedback(feedbackId: string): Promise<void> {
  await updateDb(db => {
    db.qualityFeedback = db.qualityFeedback.filter(fb => fb.id !== feedbackId);
  });
}
