export type PromptTemplateCategory =
  | 'image'
  | 'video'
  | 'camera'
  | 'character'
  | 'advertising'
  | 'cyberpunk'
  | 'product'
  | 'custom';

export type PromptTemplateRecord = {
  id: string;
  name: string;
  category: PromptTemplateCategory;
  description?: string;
  content: string;
  variables: string[];
  tags?: string[];
  favorite?: boolean;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
};
