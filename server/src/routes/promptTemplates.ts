import { Router } from 'express';
import {
  createPromptTemplate,
  deletePromptTemplate,
  duplicatePromptTemplate,
  getPromptTemplate,
  listPromptTemplates,
  updatePromptTemplate,
  usePromptTemplate,
} from '../services/promptTemplateService.js';
import { asyncHandler } from '../utils/errors.js';

export const promptTemplatesRouter = Router();

promptTemplatesRouter.get('/', asyncHandler(async (_req, res) => {
  res.json({ data: await listPromptTemplates() });
}));

promptTemplatesRouter.get('/:id', asyncHandler(async (req, res) => {
  res.json({ data: await getPromptTemplate(String(req.params.id)) });
}));

promptTemplatesRouter.post('/', asyncHandler(async (req, res) => {
  res.status(201).json({ data: await createPromptTemplate(req.body) });
}));

promptTemplatesRouter.patch('/:id', asyncHandler(async (req, res) => {
  res.json({ data: await updatePromptTemplate(String(req.params.id), req.body) });
}));

promptTemplatesRouter.delete('/:id', asyncHandler(async (req, res) => {
  res.json({ data: await deletePromptTemplate(String(req.params.id)) });
}));

promptTemplatesRouter.post('/:id/duplicate', asyncHandler(async (req, res) => {
  res.status(201).json({ data: await duplicatePromptTemplate(String(req.params.id)) });
}));

promptTemplatesRouter.post('/:id/use', asyncHandler(async (req, res) => {
  res.json({ data: await usePromptTemplate(String(req.params.id)) });
}));
