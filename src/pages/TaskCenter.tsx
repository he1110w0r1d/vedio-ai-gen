import { useMemo, useState } from 'react';
import { EmptyState, SectionHeader } from '../components/ui';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskStatusTabs } from '../components/tasks/TaskStatusTabs';
import { useApp } from '../context/AppContext';
import type { GenerationTask, TaskStatus } from '../types';

export function TaskCenter() {
  const { tasks, retryTask, cancelTask, showToast } = useApp();
  const [status, setStatus] = useState<'all' | TaskStatus>('all');
  const filtered = useMemo(() => tasks.filter((task) => status === 'all' || task.status === status), [tasks, status]);
  const copyParams = (task: GenerationTask) => {
    navigator.clipboard?.writeText(JSON.stringify(task.params));
    showToast('参数已复制', 'success');
  };

  return (
    <div>
      <SectionHeader title="任务中心 Task Center" subtitle="查看图片与视频生成任务，包含排队、进度、失败原因与重试操作。" />
      <TaskStatusTabs tasks={tasks} status={status} onStatusChange={setStatus} />
      {filtered.length ? <div className="space-y-4">
        {filtered.map((task) => (
          <TaskCard key={task.id} task={task} onRetry={retryTask} onCancel={cancelTask} onCopyParams={copyParams} />
        ))}
      </div> : <EmptyState icon="task" title="暂无任务" text="从图片生成或视频生成页面创建 Mock 任务后，这里会展示进度。" />}
      <section className="card mt-5">
        <h3 className="mb-2 font-bold">Mock 错误类型</h3>
        <div className="flex flex-wrap gap-2">{['API Key 无效', '余额不足', '供应商限流', '内容审核未通过', '模型暂不可用', '任务超时'].map((item) => <span key={item} className="chip">{item}</span>)}</div>
      </section>
    </div>
  );
}
