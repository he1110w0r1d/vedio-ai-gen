import type { NextFunction, Request, Response } from 'express';
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

type Expected = {
  name: string;
  error: unknown;
  code: string;
};

type CapturedResponse = {
  statusCode?: number;
  body?: unknown;
};

const expected: Expected[] = [
  { name: 'validation', error: validationError('字段无效', { field: 'prompt' }), code: 'VALIDATION_ERROR' },
  { name: 'not-found', error: notFound('资源不存在'), code: 'NOT_FOUND' },
  { name: 'invalid-key', error: invalidApiKey('API Key 无效'), code: 'INVALID_API_KEY' },
  { name: 'model-not-supported', error: modelNotSupported('mock', '能力不支持'), code: 'MODEL_NOT_SUPPORTED' },
  { name: 'unknown-provider', error: unknownProviderError('mock', 'E_MOCK'), code: 'UNKNOWN_PROVIDER_ERROR' },
  { name: 'internal', error: internalError('内部错误'), code: 'INTERNAL_ERROR' },
  { name: 'unexpected', error: new Error('unexpected stack should not leak'), code: 'INTERNAL_ERROR' },
];

function capture(error: unknown) {
  const captured: CapturedResponse = {};
  const response = {
    status(code: number) {
      captured.statusCode = code;
      return this;
    },
    json(body: unknown) {
      captured.body = body;
      return this;
    },
  } as Response;

  errorMiddleware(error, {} as Request, response, (() => undefined) as NextFunction);
  return captured;
}

function assertErrorShape(value: unknown): asserts value is { code: string; message: string; retryable: boolean } {
  if (!value || typeof value !== 'object') throw new Error('错误响应不是对象');
  const item = value as Record<string, unknown>;
  if (typeof item.code !== 'string' || typeof item.message !== 'string' || typeof item.retryable !== 'boolean') {
    throw new Error(`错误响应格式不正确：${JSON.stringify(value)}`);
  }
  if ('stack' in item) throw new Error('错误响应泄露 stack');
}

for (const item of expected) {
  const response = capture(item.error);
  assertErrorShape(response.body);
  if (response.body.code !== item.code) {
    throw new Error(`${item.name} 期望 ${item.code}，实际 ${response.body.code}`);
  }
}

const direct = new HttpError(418, { code: 'UNKNOWN_PROVIDER_ERROR', message: 'direct', retryable: false });
if (direct.apiError.code !== 'UNKNOWN_PROVIDER_ERROR') throw new Error('HttpError 结构异常');

console.log('verifyErrors passed');
