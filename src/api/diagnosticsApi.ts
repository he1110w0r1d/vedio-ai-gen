import { API_BASE_URL, shouldUseMockApi } from './client';
import { APP_STAGE, APP_VERSION } from '../version';

export type HealthDiagnostics = {
  status: string;
  version: string;
  stage: string;
  storageReady: boolean;
  dbReady: boolean;
  providerMode: string;
  timestamp: string;
};

export const diagnosticsApi = {
  async getHealth(): Promise<HealthDiagnostics> {
    if (shouldUseMockApi()) {
      return {
        status: 'mock',
        version: APP_VERSION,
        stage: APP_STAGE,
        storageReady: true,
        dbReady: true,
        providerMode: 'frontend-mock-mode',
        timestamp: new Date().toISOString(),
      };
    }
    const response = await fetch(`${API_BASE_URL}/health`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error('后端健康检查失败');
    return payload.data as HealthDiagnostics;
  },
};
