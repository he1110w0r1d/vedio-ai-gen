import type { QualityStatus } from '../../types';

const statusConfig: Record<QualityStatus, { label: string; color: string }> = {
  excellent: { label: '优秀', color: 'bg-success/20 text-success' },
  usable: { label: '可用', color: 'bg-primary-fixed-dim/20 text-primary-fixed-dim' },
  needs_fix: { label: '需要修复', color: 'bg-warning/20 text-warning' },
  unusable: { label: '不可用', color: 'bg-error/20 text-error' },
};

export function QualityStatusBadge({ status }: { status?: QualityStatus }) {
  if (!status) return <span className="chip text-xs bg-surface-container text-on-surface-variant">未评价</span>;
  const config = statusConfig[status];
  return <span className={`chip text-xs ${config.color}`}>{config.label}</span>;
}
