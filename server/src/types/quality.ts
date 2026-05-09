export type QualityRating = 1 | 2 | 3 | 4 | 5;

export type QualityStatus = 'excellent' | 'usable' | 'needs_fix' | 'unusable';

export type FailureCategory =
  | 'prompt_issue'
  | 'model_issue'
  | 'provider_error'
  | 'content_rejected'
  | 'technical_error'
  | 'bad_composition'
  | 'bad_motion'
  | 'identity_drift'
  | 'style_mismatch'
  | 'low_resolution'
  | 'artifact'
  | 'other';

export type QualityFeedback = {
  id: string;
  targetType: 'asset' | 'task';
  targetId: string;
  projectId?: string;
  providerId?: string;
  providerName?: string;
  model?: string;
  mode?: 'image' | 't2v' | 'i2v' | 'r2v' | 'mock';
  rating?: QualityRating;
  qualityStatus?: QualityStatus;
  failureCategory?: FailureCategory;
  tags?: string[];
  note?: string;
  worthRetry?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type QualitySummary = {
  totalFeedback: number;
  averageRating?: number;
  excellentCount: number;
  usableCount: number;
  needsFixCount: number;
  unusableCount: number;
  worthRetryCount: number;
  byMode: Array<{
    mode: string;
    averageRating?: number;
    total: number;
    unusableCount: number;
  }>;
  byProvider: Array<{
    providerId?: string;
    providerName?: string;
    averageRating?: number;
    total: number;
    unusableCount: number;
  }>;
  byFailureCategory: Array<{
    category: string;
    count: number;
  }>;
};
