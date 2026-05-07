export function TaskErrorMessage({ errorCode, errorReason }: { errorCode?: string; errorReason?: string }) {
  if (!errorReason && !errorCode) return null;

  return (
    <p className="mt-2 rounded-lg border border-error/30 bg-error-container/30 p-2 text-sm text-error">
      错误原因：{errorCode ? `${errorCode}：` : ''}{errorReason ?? '任务失败'}。可检查供应商配置后重试。
    </p>
  );
}
