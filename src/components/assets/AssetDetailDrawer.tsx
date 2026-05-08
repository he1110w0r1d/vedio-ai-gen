import type { Asset, VideoSeed } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { Icon } from '../common/Icon';
import { AssetPreview } from './AssetPreview';
import { UseForVideoActions } from './UseForVideoActions';

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
            {asset.type === 'video' ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/35 bg-black/50">
                  <Icon name="play_arrow" className="text-3xl text-white" />
                </span>
              </div>
            ) : null}
          </div>
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="chip text-primary-fixed">{assetTypeLabel(asset)}</span>
              {asset.favorite ? <span className="chip text-secondary">已收藏</span> : null}
              {asset.type === 'video' ? <span className="chip">{asset.duration}s · {asset.mode}</span> : null}
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
            <span>存储：{asset.storageType ?? 'mock'}</span>
            <span>MIME：{asset.mimeType ?? '未知'}</span>
            <span>大小：{formatBytes(asset.sizeBytes)}</span>
            <span>尺寸：{asset.width && asset.height ? `${asset.width} x ${asset.height}` : '未知'}</span>
          </div>
          {asset.localPath || asset.url ? (
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-3 text-xs leading-5 text-on-surface-variant">
              {asset.localPath ? <p>本地文件：{displayLocalPath(asset)}</p> : null}
              {asset.url ? <p className="break-all">访问 URL：{asset.url}</p> : null}
              {asset.url ? <button className="btn-ghost mt-2 px-2 py-1" onClick={() => navigator.clipboard?.writeText(asset.url ?? '')}>复制 URL</button> : null}
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
