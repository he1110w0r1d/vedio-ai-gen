import type { PromptTemplateRecord } from '../types/promptTemplate.js';
import { notFound, validationError } from '../utils/errors.js';
import { createId } from '../utils/id.js';
import { readDb, updateDb } from './storageService.js';

function nowIso() {
  return new Date().toISOString();
}

export function extractVariables(content: string) {
  return Array.from(new Set(Array.from(content.matchAll(/\{\{\s*([\p{L}\p{N}_]+)\s*\}\}/gu)).map((match) => match[1])));
}

export async function listPromptTemplates() {
  const db = await readDb();
  return db.promptTemplates;
}

export async function getPromptTemplate(templateId: string) {
  const db = await readDb();
  const template = db.promptTemplates.find((item) => item.id === templateId);
  if (!template) throw notFound('提示词模板不存在');
  return template;
}

export async function createPromptTemplate(input: Partial<PromptTemplateRecord>) {
  if (!input.name?.trim() || !input.content?.trim()) throw validationError('模板名称和内容为必填字段');
  const now = nowIso();
  const template: PromptTemplateRecord = {
    id: createId('tpl'),
    name: input.name.trim(),
    category: input.category ?? 'custom',
    description: input.description ?? '',
    content: input.content,
    variables: input.variables?.length ? input.variables : extractVariables(input.content),
    tags: input.tags ?? [],
    favorite: Boolean(input.favorite),
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await updateDb((db) => {
    db.promptTemplates.unshift(template);
  });
  return template;
}

export async function updatePromptTemplate(templateId: string, input: Partial<PromptTemplateRecord>) {
  let updated: PromptTemplateRecord | undefined;
  await updateDb((db) => {
    db.promptTemplates = db.promptTemplates.map((template) => {
      if (template.id !== templateId) return template;
      const content = input.content ?? template.content;
      updated = {
        ...template,
        name: input.name ?? template.name,
        category: input.category ?? template.category,
        description: input.description ?? template.description,
        content,
        variables: input.variables?.length ? input.variables : extractVariables(content),
        tags: input.tags ?? template.tags,
        favorite: input.favorite ?? template.favorite,
        updatedAt: nowIso(),
      };
      return updated;
    });
  });
  if (!updated) throw notFound('提示词模板不存在');
  return updated;
}

export async function deletePromptTemplate(templateId: string) {
  let removed = false;
  await updateDb((db) => {
    const before = db.promptTemplates.length;
    db.promptTemplates = db.promptTemplates.filter((template) => template.id !== templateId);
    removed = db.promptTemplates.length !== before;
  });
  if (!removed) throw notFound('提示词模板不存在');
  return { id: templateId, deleted: true };
}

export async function duplicatePromptTemplate(templateId: string) {
  const source = await getPromptTemplate(templateId);
  return createPromptTemplate({
    ...source,
    name: `${source.name} 副本`,
    favorite: false,
  });
}

export async function usePromptTemplate(templateId: string) {
  let updated: PromptTemplateRecord | undefined;
  await updateDb((db) => {
    db.promptTemplates = db.promptTemplates.map((template) => {
      if (template.id !== templateId) return template;
      updated = {
        ...template,
        usageCount: (template.usageCount ?? 0) + 1,
        updatedAt: nowIso(),
      };
      return updated;
    });
  });
  if (!updated) throw notFound('提示词模板不存在');
  return updated;
}
