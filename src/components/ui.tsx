export { Icon } from './common/Icon';
export { SectionHeader } from './common/SectionHeader';
export { EmptyState } from './common/EmptyState';
export { StatusBadge } from './common/StatusBadge';
export { SearchInput } from './common/SearchInput';
import { Icon } from './common/Icon';

export function LoadingBlock({ text = '正在加载 Mock 数据...' }: { text?: string }) {
  return (
    <div className="card flex min-h-40 items-center justify-center gap-3 text-on-surface-variant">
      <Icon name="refresh" className="animate-spin text-primary-fixed-dim" />
      {text}
    </div>
  );
}
