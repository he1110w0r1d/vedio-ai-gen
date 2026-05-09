import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { env } from './config/env.js';
import { assetsRouter } from './routes/assets.js';
import { generationsRouter } from './routes/generations.js';
import { providersRouter } from './routes/providers.js';
import { projectsRouter } from './routes/projects.js';
import { projectImportsRouter } from './routes/projectImports.js';
import { promptTemplatesRouter } from './routes/promptTemplates.js';
import { tasksRouter } from './routes/tasks.js';
import { usageRouter } from './routes/usage.js';
import { qualityRouter } from './routes/quality.js';
import { storageRouter } from './routes/storage.js';
import { workspaceRouter } from './routes/workspace.js';
import { providerBenchmarkRouter } from './routes/providerBenchmark.js';
import { advanceMockTasks } from './services/taskService.js';
import { ensureStorageDirs } from './services/fileStorageService.js';
import { readDb } from './services/storageService.js';
import { errorMiddleware } from './utils/errors.js';
import { APP_STAGE, APP_VERSION } from './version.js';

export function createApp() {
  const app = express();

  const allowedOrigins = (env.corsOrigin || 'http://127.0.0.1:5173').split(',').map((o) => o.trim());
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.some((allowed) => origin === allowed || allowed === '*')) {
        callback(null, true);
      } else {
        callback(null, true); // 本地开发不做严格限制
      }
    },
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use('/storage', express.static(path.resolve(process.cwd(), 'storage')));
  ensureStorageDirs().catch(() => undefined);

  app.get('/health', async (_req, res) => {
    let storageReady = false;
    let dbReady = false;
    try {
      await ensureStorageDirs();
      storageReady = true;
    } catch {
      storageReady = false;
    }
    try {
      await readDb();
      dbReady = true;
    } catch {
      dbReady = false;
    }
    res.json({
      data: {
        status: storageReady && dbReady ? 'ok' : 'degraded',
        version: APP_VERSION,
        stage: APP_STAGE,
        storageReady,
        dbReady,
        providerMode: 'wanwuhuanxin-images+aliyun-wanxiang-t2v',
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.use('/api/providers', providersRouter);
  app.use('/api/workspace', workspaceRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/project-imports', projectImportsRouter);
  app.use('/api/prompt-templates', promptTemplatesRouter);
  app.use('/api/generations', generationsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/assets', assetsRouter);
  app.use('/api/usage', usageRouter);
  app.use('/api/quality', qualityRouter);
  app.use('/api/storage', storageRouter);
  app.use('/api/provider-benchmark', providerBenchmarkRouter);
  app.use(errorMiddleware);

  windowlessSetInterval(() => {
    advanceMockTasks().catch(() => undefined);
  }, 1200);

  return app;
}

function windowlessSetInterval(callback: () => void, ms: number) {
  return globalThis.setInterval(callback, ms);
}
