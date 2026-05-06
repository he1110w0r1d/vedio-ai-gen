import { Router } from 'express';
import { cancelTask, getTask, listTasks, retryTask } from '../services/taskService.js';
import { asyncHandler } from '../utils/errors.js';

export const tasksRouter = Router();

tasksRouter.get('/', asyncHandler(async (_req, res) => {
  res.json({ data: await listTasks() });
}));

tasksRouter.get('/:id', asyncHandler(async (req, res) => {
  res.json({ data: await getTask(String(req.params.id)) });
}));

tasksRouter.post('/:id/cancel', asyncHandler(async (req, res) => {
  res.json({ data: await cancelTask(String(req.params.id)) });
}));

tasksRouter.post('/:id/retry', asyncHandler(async (req, res) => {
  res.status(201).json({ data: await retryTask(String(req.params.id)) });
}));
