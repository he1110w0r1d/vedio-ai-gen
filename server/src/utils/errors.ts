import type { NextFunction, Request, Response } from 'express';
import type { ApiError } from '../types/api.js';

export class HttpError extends Error {
  status: number;
  apiError: ApiError;

  constructor(status: number, apiError: ApiError) {
    super(apiError.message);
    this.name = 'HttpError';
    this.status = status;
    this.apiError = apiError;
  }
}

export function validationError(message: string, detail?: unknown) {
  return new HttpError(400, { code: 'VALIDATION_ERROR', message, retryable: false, detail });
}

export function invalidApiKey(message = 'API Key 无效') {
  return new HttpError(401, { code: 'INVALID_API_KEY', message, retryable: true });
}

export function modelNotSupported(provider: string, message = '当前供应商不支持该模型或能力') {
  return new HttpError(400, { code: 'MODEL_NOT_SUPPORTED', message, provider, retryable: false });
}

export function insufficientBalance(provider: string, message = '供应商账户余额或额度不足') {
  return new HttpError(402, { code: 'INSUFFICIENT_BALANCE', message, provider, retryable: false });
}

export function rateLimited(provider: string, providerCode?: string) {
  return new HttpError(429, { code: 'RATE_LIMITED', message: '供应商限流，请稍后重试', provider, providerCode, retryable: true });
}

export function contentRejected(provider: string, providerCode?: string) {
  return new HttpError(400, { code: 'CONTENT_REJECTED', message: '内容审核未通过，请调整提示词', provider, providerCode, retryable: false });
}

export function providerUnavailable(provider: string, providerCode?: string) {
  return new HttpError(503, { code: 'PROVIDER_UNAVAILABLE', message: '供应商服务暂不可用', provider, providerCode, retryable: true });
}

export function unknownProviderError(provider: string, providerCode?: string, detail?: unknown) {
  return new HttpError(502, {
    code: 'UNKNOWN_PROVIDER_ERROR',
    message: '供应商返回了未识别错误',
    provider,
    providerCode,
    retryable: true,
    detail,
  });
}

export function notFound(message: string) {
  return new HttpError(404, { code: 'NOT_FOUND', message, retryable: false });
}

export function internalError(message = '服务内部错误', detail?: unknown) {
  return new HttpError(500, { code: 'INTERNAL_ERROR', message, retryable: true, detail });
}

export function asyncHandler<T extends Request>(handler: (req: T, res: Response, next: NextFunction) => Promise<void>) {
  return (req: T, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

export function errorMiddleware(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    res.status(error.status).json(error.apiError);
    return;
  }

  if (process.env.NODE_ENV === 'development' && error instanceof Error) {
    console.error(error.message);
  }

  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: '服务内部错误',
    retryable: true,
  });
}
