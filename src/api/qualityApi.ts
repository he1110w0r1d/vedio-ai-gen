import type { QualityFeedback, QualitySummary } from '../types';
import { requestJson, shouldUseMockApi } from './client';

export const qualityApi = {
  async list(filter: Record<string, string | undefined>): Promise<QualityFeedback[]> {
    if (shouldUseMockApi()) return [];
    const params = new URLSearchParams(filter as Record<string, string>).toString();
    return requestJson<QualityFeedback[]>(`/api/quality?${params}`);
  },

  async getSummary(filter: Record<string, string | undefined>): Promise<QualitySummary> {
    if (shouldUseMockApi()) {
      return { totalFeedback: 0, averageRating: 0, excellentCount: 0, usableCount: 0, needsFixCount: 0, unusableCount: 0, worthRetryCount: 0, ratingDistribution: {}, totalRated: 0, byQualityStatus: {}, byMode: [], byProvider: [], byFailureCategory: [] };
    }
    const params = new URLSearchParams(filter as Record<string, string>).toString();
    return requestJson<QualitySummary>(`/api/quality/summary?${params}`);
  },

  async getAssetFeedback(assetId: string): Promise<QualityFeedback | null> {
    if (shouldUseMockApi()) return null;
    return requestJson<QualityFeedback | null>(`/api/quality/assets/${assetId}`);
  },

  async upsertAssetFeedback(assetId: string, data: Partial<QualityFeedback>): Promise<QualityFeedback> {
    return requestJson<QualityFeedback>(`/api/quality/assets/${assetId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTaskFeedback(taskId: string): Promise<QualityFeedback | null> {
    if (shouldUseMockApi()) return null;
    return requestJson<QualityFeedback | null>(`/api/quality/tasks/${taskId}`);
  },

  async upsertTaskFeedback(taskId: string, data: Partial<QualityFeedback>): Promise<QualityFeedback> {
    return requestJson<QualityFeedback>(`/api/quality/tasks/${taskId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteFeedback(id: string): Promise<void> {
    await requestJson<void>(`/api/quality/${id}`, { method: 'DELETE' });
  },
};
