export type ProviderStatus = 'connected' | 'failed' | 'not_configured';

export type ProviderCapability =
  | 'image'
  | 't2v'
  | 'i2v'
  | 'r2v'
  | 'firstFrame'
  | 'lastFrame'
  | 'multiReference'
  | 'negativePrompt'
  | 'seed'
  | 'asyncTask'
  | 'callback'
  | 'polling'
  | 'audio'
  | 'watermarkControl'
  | string;

export type ProviderRecord = {
  id: string;
  name: string;
  providerType: string;
  baseUrl?: string;
  encryptedApiKey: string;
  maskedApiKey: string;
  defaultModel?: string;
  capabilities: ProviderCapability[];
  status: ProviderStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProviderPublic = Omit<ProviderRecord, 'encryptedApiKey'>;

export type ProviderCreateInput = {
  name: string;
  providerType: string;
  baseUrl?: string;
  apiKey: string;
  defaultModel?: string;
  capabilities: ProviderCapability[];
};

export type ProviderUpdateInput = Partial<Omit<ProviderCreateInput, 'apiKey'>> & {
  apiKey?: string;
  status?: ProviderStatus;
};
