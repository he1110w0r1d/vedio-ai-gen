import { Router } from 'express';
import { getWorkspace, updateWorkspace } from '../services/workspaceService.js';
import { asyncHandler } from '../utils/errors.js';

export const workspaceRouter = Router();

workspaceRouter.get('/', asyncHandler(async (_req, res) => {
  res.json({ data: await getWorkspace() });
}));

workspaceRouter.patch('/', asyncHandler(async (req, res) => {
  res.json({ data: await updateWorkspace(req.body) });
}));
