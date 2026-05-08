import type { PromptTemplate } from '../types';
import { requestJson, shouldUseMockApi } from './client';

type ServerPromptTemplate = {
  id: string;
  name: string;
  category: string;
  description?: string;
  content: string;
  variables: string[];
  tags?: string[];
  favorite?: boolean;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
};

const categoryToServer: Record<string, string> = {
  图片提示词: 'image',
  视频提示词: 'video',
  镜头语言: 'camera',
  角色一致性: 'character',
  广告片: 'advertising',
  赛博朋克: 'cyberpunk',
  产品展示: 'product',
};

const categoryToClient = Object.fromEntries(Object.entries(categoryToServer).map(([key, value]) => [value, key]));

function toTemplate(input: ServerPromptTemplate): PromptTemplate {
  return {
    id: input.id,
    title: input.name,
    category: categoryToClient[input.category] ?? '图片提示词',
    body: input.content,
    variables: input.variables,
    favorite: input.favorite,
    description: input.description,
    tags: input.tags,
    usageCount: input.usageCount,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

function toServer(input: PromptTemplate) {
  return {
    name: input.title,
    category: categoryToServer[input.category] ?? 'custom',
    description: input.description,
    content: input.body,
    variables: input.variables,
    tags: input.tags,
    favorite: input.favorite,
  };
}

export const promptTemplateApi = {
  async listTemplates(templates: PromptTemplate[]) {
    if (!shouldUseMockApi()) return (await requestJson<ServerPromptTemplate[]>('/api/prompt-templates')).map(toTemplate);
    return templates;
  },

  async createTemplate(template: PromptTemplate) {
    if (!shouldUseMockApi()) {
      return toTemplate(await requestJson<ServerPromptTemplate>('/api/prompt-templates', {
        method: 'POST',
        body: JSON.stringify(toServer(template)),
      }));
    }
    return template;
  },

  async updateTemplate(template: PromptTemplate) {
    if (!shouldUseMockApi()) {
      return toTemplate(await requestJson<ServerPromptTemplate>(`/api/prompt-templates/${template.id}`, {
        method: 'PATCH',
        body: JSON.stringify(toServer(template)),
      }));
    }
    return template;
  },

  async deleteTemplate(templateId: string) {
    if (!shouldUseMockApi()) return requestJson<{ id: string; deleted: true }>(`/api/prompt-templates/${templateId}`, { method: 'DELETE' });
    return { id: templateId, deleted: true };
  },

  async duplicateTemplate(templateId: string) {
    if (!shouldUseMockApi()) return toTemplate(await requestJson<ServerPromptTemplate>(`/api/prompt-templates/${templateId}/duplicate`, { method: 'POST' }));
    throw new Error('mock duplicate handled by page');
  },

  async useTemplate(template: PromptTemplate) {
    if (!shouldUseMockApi()) return toTemplate(await requestJson<ServerPromptTemplate>(`/api/prompt-templates/${template.id}/use`, { method: 'POST' }));
    return { ...template, usageCount: (template.usageCount ?? 0) + 1, updatedAt: new Date().toISOString() };
  },
};
