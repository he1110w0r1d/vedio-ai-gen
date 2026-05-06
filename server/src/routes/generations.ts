import { Router } from 'express';
import { generateImage, generateVideo } from '../services/generationService.js';
import { asyncHandler } from '../utils/errors.js';

export const generationsRouter = Router();

generationsRouter.post('/image', asyncHandler(async (req, res) => {
  res.status(201).json({ data: await generateImage(req.body) });
}));

generationsRouter.post('/video/t2v', asyncHandler(async (req, res) => {
  res.status(201).json({ data: await generateVideo({ ...req.body, mode: 'T2V' }) });
}));

generationsRouter.post('/video/i2v', asyncHandler(async (req, res) => {
  res.status(201).json({ data: await generateVideo({ ...req.body, mode: 'I2V' }) });
}));

generationsRouter.post('/video/r2v', asyncHandler(async (req, res) => {
  res.status(201).json({ data: await generateVideo({ ...req.body, mode: 'R2V' }) });
}));
