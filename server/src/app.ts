import cors from 'cors';
import express from 'express';
import { assetsRouter } from './routes/assets.js';
import { generationsRouter } from './routes/generations.js';
import { providersRouter } from './routes/providers.js';
import { tasksRouter } from './routes/tasks.js';
import { advanceMockTasks } from './services/taskService.js';
import { errorMiddleware } from './utils/errors.js';

export function createApp() {
  const app = express();
  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://127.0.0.1:5173';

  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (_req, res) => {
    res.json({ data: { ok: true, mode: 'mock-provider-adapter' } });
  });

  app.use('/api/providers', providersRouter);
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
