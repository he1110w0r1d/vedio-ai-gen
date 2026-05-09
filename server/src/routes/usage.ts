import { Router } from 'express';
import { 
  listUsageRecords, 
  getUsageSummary, 
  listCostRules, 
  createCostRule, 
  updateCostRule, 
  deleteCostRule 
} from '../services/usageService.js';
import { asyncHandler, validationError } from '../utils/errors.js';
import { createId } from '../utils/id.js';

export const usageRouter = Router();

usageRouter.get('/', asyncHandler(async (req, res) => {
  const { projectId, providerId, mode, status } = req.query;
  const records = await listUsageRecords({
    projectId: projectId as string,
    providerId: providerId as string,
    mode: mode as string,
    status: status as string,
  });
  // Sort descending by createdAt
  records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ data: records });
}));

usageRouter.get('/summary', asyncHandler(async (req, res) => {
  const { projectId, providerId, mode } = req.query;
  const summary = await getUsageSummary({
    projectId: projectId as string,
    providerId: providerId as string,
    mode: mode as string,
  });
  res.json({ data: summary });
}));

usageRouter.get('/cost-rules', asyncHandler(async (req, res) => {
  const rules = await listCostRules();
  res.json({ data: rules });
}));

usageRouter.post('/cost-rules', asyncHandler(async (req, res) => {
  const rule = req.body;
  if (!rule.providerType || !rule.mode || !rule.unit || !rule.price || !rule.currency) {
    throw validationError('Missing required fields for cost rule');
  }
  
  const newRule = await createCostRule({
    ...rule,
    id: createId('rule'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  res.status(201).json({ data: newRule });
}));

usageRouter.patch('/cost-rules/:id', asyncHandler(async (req, res) => {
  const updated = await updateCostRule(req.params.id as string, req.body);
  res.json({ data: updated });
}));

usageRouter.delete('/cost-rules/:id', asyncHandler(async (req, res) => {
  await deleteCostRule(req.params.id as string);
  res.status(204).end();
}));
