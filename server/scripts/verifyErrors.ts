import express from 'express';
import {
  HttpError,
  errorMiddleware,
  internalError,
  invalidApiKey,
  modelNotSupported,
  notFound,
  unknownProviderError,
  validationError,
} from '../src/utils/errors.js';

const app = express();
app.use(express.json());
app.get('/validation', () => { throw validationError('字段无效', { field: 'prompt' }); });
app.get('/not-found', () => { throw notFound('资源不存在'); });
app.get('/invalid-key', () => { throw invalidApiKey('API Key 无效'); });
app.get('/model-not-supported', () => { throw modelNotSupported('mock', '能力不支持'); });
app.get('/unknown-provider', () => { throw unknownProviderError('mock', 'E_MOCK'); });
app.get('/internal', () => { throw internalError('内部错误'); });
app.get('/unexpected', () => { throw new Error('unexpected stack should not leak'); });
app.use(errorMiddleware);

type Expected = {
  path: string;
  code: string;
};

const expected: Expected[] = [
  { path: '/validation', code: 'VALIDATION_ERROR' },
  { path: '/not-found', code: 'NOT_FOUND' },
  { path: '/invalid-key', code: 'INVALID_API_KEY' },
  { path: '/model-not-supported', code: 'MODEL_NOT_SUPPORTED' },
  { path: '/unknown-provider', code: 'UNKNOWN_PROVIDER_ERROR' },
  { path: '/internal', code: 'INTERNAL_ERROR' },
  { path: '/unexpected', code: 'INTERNAL_ERROR' },
];

function listen(port: number) {
  return new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const server = app.listen(port, () => resolve(server));
  });
}

function assertErrorShape(value: unknown): asserts value is { code: string; message: string; retryable: boolean } {
  if (!value || typeof value !== 'object') throw new Error('错误响应不是对象');
  const item = value as Record<string, unknown>;
  if (typeof item.code !== 'string' || typeof item.message !== 'string' || typeof item.retryable !== 'boolean') {
    throw new Error(`错误响应格式不正确：${JSON.stringify(value)}`);
  }
  if ('stack' in item) throw new Error('错误响应泄露 stack');
}

const server = await listen(0);
try {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('无法获取测试端口');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  for (const item of expected) {
    const response = await fetch(`${baseUrl}${item.path}`);
    const body = await response.json();
    assertErrorShape(body);
    if (body.code !== item.code) throw new Error(`${item.path} 期望 ${item.code}，实际 ${body.code}`);
  }

  const direct = new HttpError(418, { code: 'UNKNOWN_PROVIDER_ERROR', message: 'direct', retryable: false });
  if (direct.apiError.code !== 'UNKNOWN_PROVIDER_ERROR') throw new Error('HttpError 结构异常');

  console.log('verifyErrors passed');
} finally {
  server.close();
}
