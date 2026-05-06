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
