export type ApiError = {
  code:
    | 'INVALID_API_KEY'
    | 'INSUFFICIENT_BALANCE'
    | 'RATE_LIMITED'
    | 'CONTENT_REJECTED'
    | 'PROVIDER_UNAVAILABLE'
    | 'MODEL_NOT_SUPPORTED'
    | 'TASK_TIMEOUT'
    | 'FILE_TOO_LARGE'
    | 'UNSUPPORTED_FILE_TYPE'
    | 'UNKNOWN_PROVIDER_ERROR'
    | 'INVALID_SOURCE_IMAGE'
    | 'SOURCE_IMAGE_NOT_ACCESSIBLE'
    | 'SOURCE_IMAGE_TOO_LARGE'
    | 'INVALID_REFERENCE_ASSET'
    | 'REFERENCE_ASSET_NOT_ACCESSIBLE'
    | 'REFERENCE_ASSET_TOO_LARGE'
    | 'REFERENCE_ASSET_UNSUPPORTED_TYPE'
    | 'MISSING_CHARACTER_REFERENCE'
    | 'VIDEO_TASK_FAILED'
    | 'VIDEO_RESULT_NOT_FOUND'
    | 'VIDEO_DOWNLOAD_FAILED'
    | 'VALIDATION_ERROR'
    | 'NOT_FOUND'
    | 'INTERNAL_ERROR';
  message: string;
  provider?: string;
  providerCode?: string;
  retryable: boolean;
  detail?: unknown;
};

export type ApiResponse<T> = {
  data: T;
};
