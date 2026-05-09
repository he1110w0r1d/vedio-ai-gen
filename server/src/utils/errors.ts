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

export function taskTimeout(provider: string, message = '供应商任务超时，请稍后重试') {
  return new HttpError(504, { code: 'TASK_TIMEOUT', message, provider, retryable: true });
}

export function videoTaskFailed(provider: string, message = '视频任务失败', providerCode?: string) {
  return new HttpError(502, { code: 'VIDEO_TASK_FAILED', message, provider, providerCode, retryable: true });
}

export function videoResultNotFound(provider: string, message = '视频结果不存在', providerCode?: string) {
  return new HttpError(502, { code: 'VIDEO_RESULT_NOT_FOUND', message, provider, providerCode, retryable: true });
}

export function videoDownloadFailed(provider: string, message = '视频生成完成但下载失败', providerCode?: string) {
  return new HttpError(502, { code: 'VIDEO_DOWNLOAD_FAILED', message, provider, providerCode, retryable: true });
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

export function invalidSourceImage(message = '源图片无效') {
  return new HttpError(400, { code: 'INVALID_SOURCE_IMAGE', message, retryable: false });
}

export function sourceImageNotAccessible(message = '供应商无法访问该图片') {
  return new HttpError(400, { code: 'SOURCE_IMAGE_NOT_ACCESSIBLE', message, retryable: false });
}

export function sourceImageTooLarge(message = '源图片过大') {
  return new HttpError(400, { code: 'SOURCE_IMAGE_TOO_LARGE', message, retryable: false });
}

export function invalidReferenceAsset(message = '参考素材无效') {
  return new HttpError(400, { code: 'INVALID_REFERENCE_ASSET', message, retryable: false });
}

export function referenceAssetNotAccessible(message = '供应商无法访问该参考素材') {
  return new HttpError(400, { code: 'REFERENCE_ASSET_NOT_ACCESSIBLE', message, retryable: false });
}

export function referenceAssetTooLarge(message = '参考素材过大') {
  return new HttpError(400, { code: 'REFERENCE_ASSET_TOO_LARGE', message, retryable: false });
}

export function referenceAssetUnsupportedType(message = '参考素材格式不支持') {
  return new HttpError(400, { code: 'REFERENCE_ASSET_UNSUPPORTED_TYPE', message, retryable: false });
}

export function missingCharacterReference(message = '提示词中缺少角色引用') {
  return new HttpError(400, { code: 'MISSING_CHARACTER_REFERENCE', message, retryable: false });
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
