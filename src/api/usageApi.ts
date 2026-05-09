import type { CostRule, UsageRecord, UsageSummary } from '../types';
import { requestJson, shouldUseMockApi } from './client';

export const usageApi = {
  async getRecords(filter: { projectId?: string; providerId?: string; mode?: string; status?: string }): Promise<UsageRecord[]> {
    if (shouldUseMockApi()) return [];
    const query = new URLSearchParams(filter as Record<string, string>).toString();
    return requestJson<UsageRecord[]>(`/api/usage?${query}`);
  },

  async getSummary(filter: { projectId?: string; providerId?: string; mode?: string }): Promise<UsageSummary> {
    if (shouldUseMockApi()) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        totalAssets: 0,
        totalImages: 0,
        totalVideos: 0,
        byProvider: [],
        byMode: [],
        byProject: [],
      };
    }
    const query = new URLSearchParams(filter as Record<string, string>).toString();
    return requestJson<UsageSummary>(`/api/usage/summary?${query}`);
  },

  async getCostRules(): Promise<CostRule[]> {
    if (shouldUseMockApi()) return [];
    return requestJson<CostRule[]>('/api/usage/cost-rules');
  },

  async createCostRule(rule: Partial<CostRule>): Promise<CostRule> {
    if (shouldUseMockApi()) throw new Error('Mock mode not supported');
    return requestJson<CostRule>('/api/usage/cost-rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
  },

  async updateCostRule(id: string, patch: Partial<CostRule>): Promise<CostRule> {
    if (shouldUseMockApi()) throw new Error('Mock mode not supported');
    return requestJson<CostRule>(`/api/usage/cost-rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  async deleteCostRule(id: string): Promise<void> {
    if (shouldUseMockApi()) throw new Error('Mock mode not supported');
    await requestJson<void>(`/api/usage/cost-rules/${id}`, { method: 'DELETE' });
  },
};
