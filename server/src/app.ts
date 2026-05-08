import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { env } from './config/env.js';
import { assetsRouter } from './routes/assets.js';
import { generationsRouter } from './routes/generations.js';
import { providersRouter } from './routes/providers.js';
import { projectsRouter } from './routes/projects.js';
import { promptTemplatesRouter } from './routes/promptTemplates.js';
import { tasksRouter } from './routes/tasks.js';
import { workspaceRouter } from './routes/workspace.js';
import { advanceMockTasks } from './services/taskService.js';
import { ensureStorageDirs } from './services/fileStorageService.js';
import { errorMiddleware } from './utils/errors.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: '10mb' }));
  app.use('/storage', express.static(path.resolve(process.cwd(), 'storage')));
  ensureStorageDirs().catch(() => undefined);

  app.get('/health', (_req, res) => {
    res.json({ data: { ok: true, mode: 'mock-provider-adapter' } });
  });

  app.use('/api/providers', providersRouter);
  app.use('/api/workspace', workspaceRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/prompt-templates', promptTemplatesRouter);
  app.use('/api/generations', generationsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/assets', assetsRouter);
  app.use(errorMiddleware);

  windowlessSetInterval(() => {
    advanceMockTasks().catch(() => undefined);
  }, 1200);

  return app;
}

function windowlessSetInterval(callback: () => void, ms: number) {
  return globalThis.setInterval(callback, ms);
}
