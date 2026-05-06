import type { GenerationTask, TaskStatus } from '../../types';

const statusTabs: ('all' | TaskStatus)[] = ['all', 'queued', 'running', 'completed', 'failed', 'canceled'];
const statusLabels: Record<string, string> = { all: '全部', queued: '排队中', running: '生成中', completed: '已完成', failed: '失败', canceled: '已取消' };

export function TaskStatusTabs({
  tasks,
  status,
  onStatusChange,
}: {
  tasks: GenerationTask[];
  status: 'all' | TaskStatus;
  onStatusChange: (status: 'all' | TaskStatus) => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-2 border-b border-outline-variant/30 pb-3">
      {statusTabs.map((tab) => (
        <button key={tab} className={`btn-ghost ${status === tab ? 'border-primary-fixed-dim text-primary-fixed' : ''}`} onClick={() => onStatusChange(tab)}>
          {statusLabels[tab]} ({tab === 'all' ? tasks.length : tasks.filter((task) => task.status === tab).length})
        </button>
      ))}
    </div>
  );
}
