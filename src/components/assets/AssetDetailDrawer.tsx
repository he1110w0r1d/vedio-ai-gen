import type { Asset, VideoSeed } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { Icon } from '../common/Icon';
import { UseForVideoActions } from './UseForVideoActions';

export function AssetDetailDrawer({
  asset,
  onFavorite,
  onRegenerate,
  onSendToVideo,
}: {
  asset?: Asset;
  onFavorite: (assetId: string) => void;
  onRegenerate: () => void;
  onSendToVideo: (assetId: string, usage: VideoSeed['usage']) => void;
}) {
  return (
    <aside className="card">
      <h3 className="mb-4 text-lg font-bold">图片详情</h3>
      {asset ? (
        <div className="space-y-4">
          <img src={asset.thumbnail} alt={asset.title} className="aspect-[4/3] w-full rounded-xl object-cover" />
          <div>
            <p className="font-semibold">{asset.title}</p>
            <p className="mt-1 text-sm text-on-surface-variant">{asset.prompt}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-on-surface-variant">
            <span>供应商：{asset.providerName}</span>
            <span>模型：{asset.model}</span>
            <span>创建：{asset.createdAt}</span>
            <span>参数：{Object.values(asset.params).join(' / ')}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button className="btn-ghost px-2">
              <Icon name="download" />
              下载
            </button>
            <button className="btn-ghost px-2" onClick={() => onFavorite(asset.id)}>
              <Icon name="star" />
              收藏
            </button>
            <button className="btn-ghost px-2" onClick={onRegenerate}>
              <Icon name="replay" />
              重生
            </button>
          </div>
          <UseForVideoActions assetId={asset.id} onSendToVideo={onSendToVideo} />
        </div>
      ) : (
        <EmptyState icon="preview" title="未选择图片" text="点击图片结果后查看详情与视频生成入口。" />
      )}
    </aside>
  );
}
