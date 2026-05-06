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
    res.status(error.status).json({ error: error.apiError });
    return;
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : '服务内部错误',
      retryable: true,
    },
  });
}
