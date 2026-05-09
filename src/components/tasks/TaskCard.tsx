import type { GenerationTask } from '../../types';
import { Icon } from '../common/Icon';
import { StatusBadge } from '../common/StatusBadge';
import { TaskErrorMessage } from './TaskErrorMessage';
import { TaskProgress } from './TaskProgress';
import { useEffect, useState } from 'react';
import { usageApi } from '../../api/usageApi';
import { qualityApi } from '../../api/qualityApi';
import type { UsageRecord, QualityFeedback } from '../../types';
import { useApp } from '../../context/AppContext';
import { QualityStatusBadge } from '../quality/QualityStatusBadge';
import { QualityFeedbackForm } from '../quality/QualityFeedbackForm';

function shortProviderTaskId(value?: string) {
  if (!value) return undefined;
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

export function TaskCard({
  task,
  onRetry,
  onCancel,
  onCopyParams,
  onRegenerate,
  onViewAssets,
}: {
  task: GenerationTask;
  onRetry: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onCopyParams: (task: GenerationTask) => void;
  onRegenerate?: (task: GenerationTask) => void;
  onViewAssets?: (taskId: string) => void;
}) {
  const { setView } = useApp();
  const [usageRecord, setUsageRecord] = useState<UsageRecord | null>(null);
  const [feedback, setFeedback] = useState<QualityFeedback | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task.status === 'completed' || task.status === 'failed') {
      usageApi.getRecords({}).then(records => {
        const record = records.find(r => r.taskId === task.id);
        if (record) setUsageRecord(record);
      }).catch(() => undefined);
      qualityApi.getTaskFeedback(task.id).then(setFeedback).catch(() => undefined);
    }
  }, [task.id, task.status]);

  const saveFeedback = async (data: Partial<QualityFeedback>) => {
    setSaving(true);
    try {
      const result = await qualityApi.upsertTaskFeedback(task.id, {
        ...data,
        projectId: task.projectId,
        providerId: task.providerId,
        providerName: task.providerName,
        model: task.model,
        mode: task.type === 'video' ? (task.mode?.toLowerCase() as any) : 'image',
      });
      setFeedback(result);
      setShowForm(false);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const clearFeedback = async () => {
    if (!feedback) return;
    setSaving(true);
    try {
      await qualityApi.deleteFeedback(feedback.id);
      setFeedback(null);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const isVideo = task.type === 'video';
  const isRealVideo = isVideo && Boolean(task.params.providerTaskId || task.params.resolvedDuration);
  const providerTaskIdShort = shortProviderTaskId(String(task.params.providerTaskId ?? ''));

  return (
    <article className="card">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="chip">{task.type === 'image' ? '图片任务' : `${task.mode} 视频任务`}</span>
            <StatusBadge status={task.status} />
            {isRealVideo ? <span className="chip text-primary-fixed">真实任务</span> : null}
            <QualityStatusBadge status={feedback?.qualityStatus} />
          </div>
          <h3 className="text-lg font-bold">{task.title}</h3>
          <p className="mt-1 text-sm text-on-surface-variant">{task.prompt}</p>
          <p className="mt-2 text-xs text-on-surface-variant">
            {task.providerName} · {task.model} · {task.projectName} · {task.createdAt}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">
            任务 ID：{task.id}
            {isVideo ? ` · 时长：${String(task.params.resolvedDuration ?? task.params.duration ?? '默认')}s` : ` · 数量：${String(task.params.count ?? 1)}`}
            {' · '}画幅：{String(task.params.requestedAspectRatio ?? task.params.aspectRatio ?? task.params.aspect ?? '默认')}
            {providerTaskIdShort ? ` · 供应商任务：${providerTaskIdShort}` : ''}
          </p>
          {task.params.sourceImageAssetId ? (
            <p className="mt-1 text-xs text-on-surface-variant">首帧/源图片资产：{String(task.params.sourceImageAssetId)} {task.params.inputAssetPublicUrlUsed ? '(公网 URL直传)' : (task.params.inputAssetFallbackMode === 'base64' ? '(Base64 兜底)' : '')}</p>
          ) : null}
          {task.params.referenceAssetId ? (
            <p className="mt-1 text-xs text-on-surface-variant">
              参考素材资产：{String(task.params.referenceAssetId)} {task.params.referenceRole ? `(Role: ${String(task.params.referenceRole)})` : ''} {task.params.inputAssetPublicUrlUsed ? '(公网 URL直传)' : (task.params.inputAssetFallbackMode === 'base64' ? '(Base64 兜底)' : '')}
            </p>
          ) : null}
          {usageRecord?.estimatedCost && usageRecord.estimatedCost.confidence !== 'none' ? (
            <p className="mt-1 text-xs text-primary-fixed-dim">估算成本：¥{usageRecord.estimatedCost.amount?.toFixed(2)}</p>
          ) : null}
          <TaskErrorMessage errorCode={task.errorCode} errorReason={task.errorReason} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => onRetry(task.id)}>
            <Icon name="replay" />
            重试
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              if (isRealVideo && ['queued', 'running'].includes(task.status)) {
                alert('百炼视频任务不支持远程取消，如需放弃请等待任务自然超时或完成。');
                return;
              }
              onCancel(task.id);
            }}
          >
            <Icon name="cancel" />
            取消
          </button>
          <button className="btn-ghost" onClick={() => onCopyParams(task)}>
            <Icon name="content_copy" />
            复制参数
          </button>
          {task.status === 'completed' ? (
            <button className="btn-ghost" onClick={() => onViewAssets?.(task.id)}>
              <Icon name={isVideo ? 'movie' : 'image'} />
              查看资产
            </button>
          ) : null}
          {task.type === 'image' ? (
            <button className="btn-ghost" onClick={() => onRegenerate?.(task)}>
              <Icon name="auto_awesome" />
              再次生成
            </button>
          ) : null}
          {task.status === 'completed' && usageRecord ? (
            <button className="btn-ghost" onClick={() => setView('usage')}>
              <Icon name="receipt" />查看账单
            </button>
          ) : null}
          {(task.status === 'completed' || task.status === 'failed') ? (
            <button className="btn-ghost" onClick={() => setShowForm(!showForm)}>
              <Icon name="rate_review" />{feedback ? '修改评价' : '评价任务'}
            </button>
          ) : null}
        </div>
      </div>
      {showForm ? (
        <QualityFeedbackForm feedback={feedback} onSave={saveFeedback} onClear={clearFeedback} saving={saving} />
      ) : null}
      <TaskProgress progress={task.progress} />
    </article>
  );
}
