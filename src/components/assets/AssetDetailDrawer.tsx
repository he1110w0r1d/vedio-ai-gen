import type { Asset, VideoSeed, QualityFeedback } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { Icon } from '../common/Icon';
import { AssetPreview } from './AssetPreview';
import { assetApi } from '../../api/assetApi';
import { UseForVideoActions } from './UseForVideoActions';
import { QualityFeedbackForm } from '../quality/QualityFeedbackForm';
import { QualityStatusBadge } from '../quality/QualityStatusBadge';
import { qualityApi } from '../../api/qualityApi';
import { useState, useEffect } from 'react';

function assetTypeLabel(asset: Asset) {
  if (asset.type === 'video') return '视频资产';
  if (asset.type === 'reference') return '参考素材';
  return '图片资产';
}

function formatBytes(value?: number) {
  if (!value) return '未知';
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function parameterEntries(asset: Asset) {
  return Object.entries(asset.parameters ?? asset.params).filter(([, value]) => value !== undefined && value !== '');
}

function displayLocalPath(asset: Asset) {
  if (!asset.localPath) return undefined;
  return asset.localPath.split('/storage/assets/').at(-1) ?? '本地文件已保存';
}

export function AssetDetailDrawer({
  asset,
  assets,
  projectName,
  variant = 'panel',
  onClose,
  onFavorite,
  onDelete,
  onDownload,
  onRegenerate,
  onMockAction,
  onViewTask,
  onSendToVideo,
}: {
  asset?: Asset;
  assets?: Asset[];
  projectName?: string;
  variant?: 'panel' | 'drawer';
  onClose?: () => void;
  onFavorite: (assetId: string) => void;
  onDelete?: (assetId: string) => void;
  onDownload?: (assetId: string) => void;
  onRegenerate: () => void;
  onMockAction?: (message: string) => void;
  onViewTask?: (taskId: string) => void;
  onSendToVideo: (assetId: string, usage: VideoSeed['usage']) => void;
}) {
  const [feedback, setFeedback] = useState<QualityFeedback | null>(null);
  const [accessUrlInfo, setAccessUrlInfo] = useState<{ accessType: string; url: string; expiresAt?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    if (asset?.storageType === 'object' && (!asset.url || asset.url === '')) {
      assetApi.getAssetAccessUrl(asset.id).then((res) => {
        if (active) setAccessUrlInfo(res);
      }).catch(() => {});
    } else {
      setAccessUrlInfo(null);
    }
    return () => { active = false; };
  }, [asset?.id, asset?.storageType, asset?.url]);

  useEffect(() => {
    if (asset) {
      qualityApi.getAssetFeedback(asset.id).then(setFeedback).catch(() => setFeedback(null));
    } else {
      setFeedback(null);
    }
  }, [asset?.id]);

  const saveFeedback = async (data: Partial<QualityFeedback>) => {
    if (!asset) return;
    setSaving(true);
    try {
      const result = await qualityApi.upsertAssetFeedback(asset.id, {
        ...data,
        projectId: asset.projectId,
        providerId: asset.providerId,
        providerName: asset.providerName,
        model: asset.model,
        mode: asset.type === 'video' ? (asset as any).mode?.toLowerCase() : 'image',
      });
      setFeedback(result);
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

  const content = (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold">{asset ? '资产详情' : '图片详情'}</h3>
        {onClose ? (
          <button className="btn-ghost px-3" onClick={onClose} aria-label="关闭资产详情">
            <Icon name="close" />
          </button>
        ) : null}
      </div>
      {asset ? (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-xl bg-black">
            <AssetPreview asset={asset} className="aspect-video w-full object-cover" large />
          </div>
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="chip text-primary-fixed">{assetTypeLabel(asset)}</span>
              {asset.favorite ? <span className="chip text-secondary">已收藏</span> : null}
              {asset.type === 'video' ? <span className="chip">{asset.duration}s · {asset.mode}</span> : null}
              <QualityStatusBadge status={feedback?.qualityStatus} />
            </div>
            <p className="text-lg font-semibold">{asset.title}</p>
            <p className="mt-1 text-sm text-on-surface-variant">{asset.prompt}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs text-on-surface-variant sm:grid-cols-2">
            <span>资产 ID：{asset.id}</span>
            <span>项目：{projectName ?? asset.projectId}</span>
            <span>类型：{assetTypeLabel(asset)}</span>
            <span>供应商：{asset.providerName}</span>
            <span>模型：{asset.model}</span>
            <span>创建：{asset.createdAt}</span>
            <span>任务：{asset.taskId ?? 'Mock 初始资产'}</span>
            <span>存储：{asset.storageType === 'object' ? '对象存储' : asset.storageType === 'local' ? '本地存储' : 'Mock'}</span>
            <span>MIME：{asset.mimeType ?? '未知'}</span>
            <span>大小：{formatBytes(asset.sizeBytes)}</span>
            <span>尺寸：{asset.width && asset.height ? `${asset.width} x ${asset.height}` : '未知'}</span>
          </div>
          {asset.localPath || asset.url || asset.publicUrl || asset.objectKey ? (
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-3 text-xs leading-5 text-on-surface-variant">
              {asset.localPath ? <p>本地路径：{displayLocalPath(asset)}</p> : null}
              {asset.objectKey ? <p>对象存储 Key：{asset.objectKey} {accessUrlInfo?.accessType === 'presigned' ? '(Private)' : ''}</p> : null}
              {asset.publicUrl ? <p className="break-all">公网 URL：<a href={asset.publicUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">{asset.publicUrl}</a></p> : null}
              {asset.url && !asset.publicUrl ? <p className="break-all">访问 URL：{asset.url}</p> : null}
              
              {accessUrlInfo?.accessType === 'presigned' ? (
                <div className="mt-2 border-t border-outline-variant/20 pt-2">
                  <p className="break-all text-primary">临时签名 URL：<a href={accessUrlInfo.url} target="_blank" rel="noreferrer" className="hover:underline">{accessUrlInfo.url}</a></p>
                  <p className="mt-1 text-error">该链接将于 {new Date(accessUrlInfo.expiresAt!).toLocaleString()} 过期。</p>
                </div>
              ) : null}

              <div className="mt-2 flex gap-2">
                {asset.url ? <button className="btn-ghost px-2 py-1" onClick={() => navigator.clipboard?.writeText(asset.url ?? '')}>复制 URL</button> : null}
                {asset.publicUrl ? <button className="btn-ghost px-2 py-1" onClick={() => navigator.clipboard?.writeText(asset.publicUrl ?? '')}>复制公网 URL</button> : null}
                {accessUrlInfo?.accessType === 'presigned' ? (
                  <>
                    <button className="btn-ghost px-2 py-1" onClick={() => navigator.clipboard?.writeText(accessUrlInfo.url)}>复制临时 URL</button>
                    <button className="btn-ghost px-2 py-1" onClick={() => assetApi.getAssetAccessUrl(asset.id).then(setAccessUrlInfo)}>刷新临时链接</button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-3">
            <p className="mb-2 text-sm font-semibold">生成参数</p>
            <div className="flex flex-wrap gap-2">
              {parameterEntries(asset).map(([key, value]) => (
                <span key={key} className="chip">{key}: {String(value)}</span>
              ))}
            </div>
          </div>
          {asset.params.sourceImageAssetId ? (
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-3">
              <p className="mb-2 text-sm font-semibold">I2V 首帧/源图片</p>
              <p className="mb-2 text-xs text-on-surface-variant break-all">ID: {asset.params.sourceImageAssetId}</p>
              {assets?.find((a) => a.id === asset.params.sourceImageAssetId) ? (
                <div className="w-32 overflow-hidden rounded bg-black">
                  <AssetPreview asset={assets.find((a) => a.id === asset.params.sourceImageAssetId)!} className="aspect-video w-full object-cover" />
                </div>
              ) : (
                <p className="text-xs text-error">源图片已不存在</p>
              )}
            </div>
          ) : null}
          {asset.params.referenceAssetId ? (
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-3">
              <p className="mb-2 text-sm font-semibold">R2V 参考素材</p>
              <p className="mb-2 text-xs text-on-surface-variant break-all">
                ID: {asset.params.referenceAssetId} {asset.params.referenceRole ? `(角色: ${asset.params.referenceRole})` : ''}
              </p>
              {assets?.find((a) => a.id === asset.params.referenceAssetId) ? (
                <div className="w-32 overflow-hidden rounded bg-black">
                  <AssetPreview asset={assets.find((a) => a.id === asset.params.referenceAssetId)!} className="aspect-video w-full object-cover" />
                </div>
              ) : (
                <p className="text-xs text-error">参考素材已不存在</p>
              )}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost px-2" onClick={() => onDownload?.(asset.id)}>
              <Icon name="download" />
              下载
            </button>
            <button className="btn-ghost px-2" onClick={() => onFavorite(asset.id)}>
              <Icon name="star" />
              {asset.favorite ? '取消收藏' : '收藏'}
            </button>
            {asset.type === 'video' ? (
              <>
                <button className="btn-ghost px-2" onClick={() => onMockAction?.('已 Mock 截取首帧')}>
                  <Icon name="first_page" />
                  截取首帧
                </button>
                <button className="btn-ghost px-2" onClick={() => onMockAction?.('已 Mock 截取尾帧')}>
                  <Icon name="last_page" />
                  截取尾帧
                </button>
                <button className="btn-primary" onClick={() => onSendToVideo(asset.id, 'r2v-video')}>
                  <Icon name="movie" />
                  作为 R2V 参考视频
                </button>
                <button className="btn-ghost px-2" onClick={() => (asset.taskId ? onViewTask?.(asset.taskId) : onMockAction?.('这是 Mock 初始资产，暂无关联任务详情'))}>
                  <Icon name="task" />
                  查看关联任务
                </button>
              </>
            ) : (
              <>
                <button className="btn-ghost px-2" onClick={onRegenerate}>
                  <Icon name="replay" />
                  重新生成
                </button>
                <button className="btn-ghost px-2" onClick={() => onMockAction?.('素材类型修改为 Mock 操作')}>
                  <Icon name="category" />
                  修改素材类型
                </button>
              </>
            )}
            {onDelete ? (
              <button className="btn-ghost px-2 text-error" onClick={() => onDelete(asset.id)}>
                <Icon name="delete" />
                删除
              </button>
            ) : null}
          </div>
          {asset.type === 'video' ? null : <UseForVideoActions assetId={asset.id} onSendToVideo={onSendToVideo} />}
          <QualityFeedbackForm feedback={feedback} onSave={saveFeedback} onClear={clearFeedback} saving={saving} />
        </div>
      ) : (
        <EmptyState icon="preview" title="未选择图片" text="点击图片结果后查看详情与视频生成入口。" />
      )}
    </>
  );

  if (variant === 'drawer') {
    return (
      <aside className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-lg overflow-auto border-l border-outline-variant/40 bg-surface p-5 shadow-2xl">
        {content}
      </aside>
    );
  }

  return (
    <aside className="card">
      {content}
    </aside>
  );
}
