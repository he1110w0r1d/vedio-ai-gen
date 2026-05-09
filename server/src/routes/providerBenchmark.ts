import { Router } from 'express';
import { getProviderBenchmarkSummary } from '../services/providerBenchmarkService.js';
import { asyncHandler } from '../utils/errors.js';
import type { ProviderBenchmarkFilters } from '../types/providerBenchmark.js';

export const providerBenchmarkRouter = Router();

providerBenchmarkRouter.get('/summary', asyncHandler(async (req, res) => {
  const filters: ProviderBenchmarkFilters = {
    projectId: req.query.projectId as string | undefined,
    providerId: req.query.providerId as string | undefined,
    providerType: req.query.providerType as string | undefined,
    mode: req.query.mode as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  };
  const summary = await getProviderBenchmarkSummary(filters);
  res.json({ data: summary });
}));

providerBenchmarkRouter.get('/providers', asyncHandler(async (req, res) => {
  const filters: ProviderBenchmarkFilters = {
    projectId: req.query.projectId as string | undefined,
    providerId: req.query.providerId as string | undefined,
    providerType: req.query.providerType as string | undefined,
    mode: req.query.mode as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  };
  const summary = await getProviderBenchmarkSummary(filters);
  res.json({ data: summary.byProvider });
}));

providerBenchmarkRouter.get('/models', asyncHandler(async (req, res) => {
  const filters: ProviderBenchmarkFilters = {
    projectId: req.query.projectId as string | undefined,
    providerId: req.query.providerId as string | undefined,
    providerType: req.query.providerType as string | undefined,
    mode: req.query.mode as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  };
  const summary = await getProviderBenchmarkSummary(filters);
  res.json({ data: summary.byModel });
}));
