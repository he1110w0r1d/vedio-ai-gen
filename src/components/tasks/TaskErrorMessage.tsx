const errorMessages: Record<string, string> = {
  INVALID_API_KEY: 'API Key 无效，请检查 Provider 配置。',
  INSUFFICIENT_BALANCE: '账户余额或额度不足。',
  RATE_LIMITED: '请求过于频繁，请稍后重试。',
  CONTENT_REJECTED: '提示词未通过审核，请调整内容。',
  MODEL_NOT_SUPPORTED: '当前模型不可用，可能与账户权限或模型支持有关。',
  TASK_TIMEOUT: '任务超时，请稍后重试。',
  VIDEO_TASK_FAILED: '视频任务失败，请查看任务详情。',
  VIDEO_RESULT_NOT_FOUND: '视频生成结果未找到。',
  VIDEO_DOWNLOAD_FAILED: '视频生成完成但下载失败，可稍后重试。',
  PROVIDER_UNAVAILABLE: '供应商服务暂不可用，请稍后重试。',
  UNKNOWN_PROVIDER_ERROR: '供应商返回未知错误，请查看后端日志。',
  INVALID_SOURCE_IMAGE: '源图片无效，请重新选择图片。',
  SOURCE_IMAGE_NOT_ACCESSIBLE: '供应商无法访问该图片或本地读取失败。',
  SOURCE_IMAGE_TOO_LARGE: '源图片体积过大，请更换较小图片（限制 20MB）。',
  INVALID_REFERENCE_ASSET: '参考素材无效，请重新选择。',
  REFERENCE_ASSET_NOT_ACCESSIBLE: '供应商无法访问该参考素材，请使用公网素材或后续接入对象存储。',
  REFERENCE_ASSET_TOO_LARGE: '参考素材过大，请更换较小素材。',
  REFERENCE_ASSET_UNSUPPORTED_TYPE: '参考素材格式不支持。',
  MISSING_CHARACTER_REFERENCE: '提示词中缺少 character1，请在提示词中引用参考角色。',
};

export function TaskErrorMessage({ errorCode, errorReason }: { errorCode?: string; errorReason?: string }) {
  if (!errorCode && !errorReason) return null;
  const friendlyMessage = errorCode ? errorMessages[errorCode] : undefined;
  return (
    <div className="mt-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
      {friendlyMessage ? <p className="font-semibold">{friendlyMessage}</p> : null}
      {errorReason ? <p className={friendlyMessage ? 'mt-1 opacity-80' : ''}>{errorReason}</p> : null}
      {errorCode && !friendlyMessage ? <p className="opacity-60">错误码：{errorCode}</p> : null}
    </div>
  );
}
