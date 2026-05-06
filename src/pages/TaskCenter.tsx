import { useMemo, useState } from 'react';
import { EmptyState, Icon, SectionHeader, StatusBadge } from '../components/ui';
import { useApp } from '../context/AppContext';
import type { TaskStatus } from '../types';

const statusTabs: ('all' | TaskStatus)[] = ['all', 'queued', 'running', 'completed', 'failed', 'canceled'];
const statusLabels: Record<string, string> = { all: '全部', queued: '排队中', running: '生成中', completed: '已完成', failed: '失败', canceled: '已取消' };

export function TaskCenter() {
  const { tasks, retryTask, cancelTask, showToast } = useApp();
  const [status, setStatus] = useState<'all' | TaskStatus>('all');
  const filtered = useMemo(() => tasks.filter((task) => status === 'all' || task.status === status), [tasks, status]);

  return (
    <div>
      <SectionHeader title="任务中心 Task Center" subtitle="查看图片与视频生成任务，包含排队、进度、失败原因与重试操作。" />
      <div className="mb-5 flex flex-wrap gap-2 border-b border-outline-variant/30 pb-3">
        {statusTabs.map((tab) => <button key={tab} className={`btn-ghost ${status === tab ? 'border-primary-fixed-dim text-primary-fixed' : ''}`} onClick={() => setStatus(tab)}>{statusLabels[tab]} ({tab === 'all' ? tasks.length : tasks.filter((task) => task.status === tab).length})</button>)}
      </div>
      {filtered.length ? <div className="space-y-4">
        {filtered.map((task) => (
          <article key={task.id} className="card">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2"><span className="chip">{task.type === 'image' ? '图片任务' : `${task.mode} 视频任务`}</span><StatusBadge status={task.status} /></div>
                <h3 className="text-lg font-bold">{task.title}</h3>
                <p className="mt-1 text-sm text-on-surface-variant">{task.prompt}</p>
                <p className="mt-2 text-xs text-on-surface-variant">{task.providerName} · {task.model} · {task.projectName} · {task.createdAt}</p>
                {task.errorReason ? <p className="mt-2 rounded-lg border border-error/30 bg-error-container/30 p-2 text-sm text-error">错误原因：{task.errorReason}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-ghost" onClick={() => retryTask(task.id)}><Icon name="replay" />重试</button>
                <button className="btn-ghost" onClick={() => cancelTask(task.id)}><Icon name="cancel" />取消</button>
                <button className="btn-ghost" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(task.params)); showToast('参数已复制', 'success'); }}><Icon name="content_copy" />复制参数</button>
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-surface-container-high"><div className="h-full rounded-full bg-primary-fixed-dim transition-all" style={{ width: `${task.progress}%` }} /></div>
          </article>
        ))}
      </div> : <EmptyState icon="task" title="暂无任务" text="从图片生成或视频生成页面创建 Mock 任务后，这里会展示进度。" />}
      <section className="card mt-5">
        <h3 className="mb-2 font-bold">Mock 错误类型</h3>
        <div className="flex flex-wrap gap-2">{['API Key 无效', '余额不足', '供应商限流', '内容审核未通过', '模型暂不可用', '任务超时'].map((item) => <span key={item} className="chip">{item}</span>)}</div>
      </section>
    </div>
  );
}
