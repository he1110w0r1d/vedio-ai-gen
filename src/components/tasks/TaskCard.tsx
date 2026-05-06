import type { GenerationTask } from '../../types';
import { Icon } from '../common/Icon';
import { StatusBadge } from '../common/StatusBadge';
import { TaskErrorMessage } from './TaskErrorMessage';
import { TaskProgress } from './TaskProgress';

export function TaskCard({
  task,
  onRetry,
  onCancel,
  onCopyParams,
}: {
  task: GenerationTask;
  onRetry: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onCopyParams: (task: GenerationTask) => void;
}) {
  return (
    <article className="card">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="chip">{task.type === 'image' ? '图片任务' : `${task.mode} 视频任务`}</span>
            <StatusBadge status={task.status} />
          </div>
          <h3 className="text-lg font-bold">{task.title}</h3>
          <p className="mt-1 text-sm text-on-surface-variant">{task.prompt}</p>
          <p className="mt-2 text-xs text-on-surface-variant">
            {task.providerName} · {task.model} · {task.projectName} · {task.createdAt}
          </p>
          <TaskErrorMessage errorReason={task.errorReason} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => onRetry(task.id)}>
            <Icon name="replay" />
            重试
          </button>
          <button className="btn-ghost" onClick={() => onCancel(task.id)}>
            <Icon name="cancel" />
            取消
          </button>
          <button className="btn-ghost" onClick={() => onCopyParams(task)}>
            <Icon name="content_copy" />
            复制参数
          </button>
        </div>
      </div>
      <TaskProgress progress={task.progress} />
    </article>
  );
}
