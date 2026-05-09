import { Router } from 'express';
import {
  listBenchmarkSets,
  getBenchmarkSet,
  createBenchmarkSet,
  updateBenchmarkSet,
  deleteBenchmarkSet,
  listBenchmarkRuns,
  getBenchmarkRun,
  createBenchmarkRun,
  getBenchmarkRunSummary,
} from '../services/benchmarkService.js';
import {
  startBenchmarkRun,
  cancelBenchmarkRun,
} from '../services/benchmarkRunnerService.js';
import { asyncHandler } from '../utils/errors.js';

export const benchmarkRouter = Router();

// ── Benchmark Sets ──

benchmarkRouter.get('/sets', asyncHandler(async (_req, res) => {
  const sets = await listBenchmarkSets();
  res.json({ data: sets });
}));

benchmarkRouter.get('/sets/:id', asyncHandler(async (req, res) => {
  const set = await getBenchmarkSet(req.params.id as string);
  res.json({ data: set });
}));

benchmarkRouter.post('/sets', asyncHandler(async (req, res) => {
  const set = await createBenchmarkSet(req.body);
  res.status(201).json({ data: set });
}));

benchmarkRouter.patch('/sets/:id', asyncHandler(async (req, res) => {
  const set = await updateBenchmarkSet(req.params.id as string, req.body);
  res.json({ data: set });
}));

benchmarkRouter.delete('/sets/:id', asyncHandler(async (req, res) => {
  await deleteBenchmarkSet(req.params.id as string);
  res.status(204).end();
}));

// ── Benchmark Runs ──

benchmarkRouter.get('/runs', asyncHandler(async (_req, res) => {
  const runs = await listBenchmarkRuns();
  res.json({ data: runs });
}));

benchmarkRouter.get('/runs/:id', asyncHandler(async (req, res) => {
  const { run, items } = await getBenchmarkRun(req.params.id as string);
  res.json({ data: { run, items } });
}));

benchmarkRouter.post('/runs', asyncHandler(async (req, res) => {
  const run = await createBenchmarkRun(req.body);
  res.status(201).json({ data: run });
}));

benchmarkRouter.post('/runs/:id/start', asyncHandler(async (req, res) => {
  const confirmLiveRun = req.body?.confirmLiveRun === true;
  const { run, items, warning } = await startBenchmarkRun(req.params.id as string, confirmLiveRun);
  const statusCode = warning ? 202 : 200;
  res.status(statusCode).json({ data: { run, items }, warning });
}));

benchmarkRouter.post('/runs/:id/cancel', asyncHandler(async (req, res) => {
  const run = await cancelBenchmarkRun(req.params.id as string);
  res.json({ data: run });
}));

benchmarkRouter.get('/runs/:id/summary', asyncHandler(async (req, res) => {
  const summary = await getBenchmarkRunSummary(req.params.id as string);
  res.json({ data: summary });
}));
