import { useMemo, useState } from 'react';
import { EmptyState, SectionHeader } from '../components/ui';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskStatusTabs } from '../components/tasks/TaskStatusTabs';
import { useApp } from '../context/AppContext';
import { generationApi } from '../api/generationApi';
import type { GenerationTask, TaskStatus } from '../types';

export function TaskCenter() {
  const { tasks, providers, projects, addTask, addAssets, retryTask, cancelTask, setView, showToast } = useApp();
  const [status, setStatus] = useState<'all' | TaskStatus>('all');
  const filtered = useMemo(() => tasks.filter((task) => status === 'all' || task.status === status), [tasks, status]);
  const copyParams = (task: GenerationTask) => {
    navigator.clipboard?.writeText(JSON.stringify(task.params));
    showToast('参数已复制', 'success');
  };
  const regenerate = async (task: GenerationTask) => {
    const provider = providers.find((item) => item.id === task.providerId);
    const project = projects.find((item) => item.id === task.projectId) ?? projects[0];
    if (!provider || !project) {
      showToast('原供应商或项目不存在，无法再次生成', 'error');
      return;
    }
    try {
      const { task: nextTask, assets } = await generationApi.generateImage({
        prompt: task.prompt,
        negativePrompt: String(task.params.negativePrompt ?? ''),
        count: Number(task.params.count ?? 1),
        provider,
        project,
        model: task.model,
        aspectRatio: String(task.params.requestedAspectRatio ?? task.params.aspectRatio ?? '1:1'),
        style: String(task.params.style ?? ''),
        seed: String(task.params.seed ?? ''),
        quality: String(task.params.quality ?? '供应商默认'),
        outputFormat: String(task.params.outputFormat ?? '供应商返回格式'),
        background: String(task.params.background ?? '供应商默认'),
      });
      addTask(nextTask);
      addAssets(assets);
      showToast('已按任务参数再次生成', 'success');
    } catch {
      showToast('再次生成失败，请检查供应商配置', 'error');
    }
  };

  return (
    <div>
      <SectionHeader title="任务中心 Task Center" subtitle="查看图片与视频生成任务，包含排队、进度、失败原因与重试操作。" />
      <TaskStatusTabs tasks={tasks} status={status} onStatusChange={setStatus} />
      {filtered.length ? <div className="space-y-4">
        {filtered.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onRetry={retryTask}
            onCancel={cancelTask}
            onCopyParams={copyParams}
            onRegenerate={regenerate}
            onViewAssets={() => setView('assets')}
          />
        ))}
      </div> : <EmptyState icon="task" title="暂无任务" text="从图片生成或视频生成页面创建 Mock 任务后，这里会展示进度。" />}
      <section className="card mt-5">
        <h3 className="mb-2 font-bold">Mock 错误类型</h3>
        <div className="flex flex-wrap gap-2">{['API Key 无效', '余额不足', '供应商限流', '内容审核未通过', '模型暂不可用', '任务超时'].map((item) => <span key={item} className="chip">{item}</span>)}</div>
      </section>
    </div>
  );
}
