export type ProjectRecord = {
  id: string;
  name: string;
  description?: string;
  coverAssetId?: string;
  defaultProviderId?: string;
  status: 'active' | 'archived';
  favorite?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};
