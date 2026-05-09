export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    connected: '已连接',
    failed: '失败',
    unconfigured: '未配置',
    testing: '测试中',
    queued: '排队中',
    running: '生成中',
    polling: '轮询中',
    completed: '已完成',
    canceled: '已取消',
    timeout: '已超时',
  };
  const tone =
    status === 'connected' || status === 'completed'
      ? 'text-[#00ff9d] bg-[#00ff9d]/10 border-[#00ff9d]/30'
      : status === 'failed' || status === 'timeout'
        ? 'text-error bg-error-container/30 border-error/30'
        : status === 'running' || status === 'testing' || status === 'polling'
          ? 'text-primary-fixed bg-primary-fixed-dim/10 border-primary-fixed-dim/30'
          : 'text-on-surface-variant bg-surface-container border-outline-variant/40';

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{map[status] ?? status}</span>;
}
