import type { Asset } from '../types';
import { Icon } from './ui';

function assetTypeLabel(asset: Asset) {
  if (asset.type === 'video') return '视频';
  if (asset.type === 'reference') return '参考';
  return '图片';
}

export function AssetCard({
  asset,
  selected,
  checked,
  onCheckedChange,
  onSelect,
  onFavorite,
  onSendToVideo,
  onViewTask,
}: {
  asset: Asset;
  selected?: boolean;
  checked?: boolean;
  onCheckedChange?: (assetId: string, checked: boolean) => void;
  onSelect: (asset: Asset) => void;
  onFavorite: (id: string) => void;
  onSendToVideo?: (id: string) => void;
  onViewTask?: (taskId: string) => void;
}) {
  return (
    <article className={`group relative overflow-hidden rounded-2xl border bg-surface-container-low transition hover:border-primary-fixed-dim/60 ${selected ? 'border-primary-fixed-dim shadow-neon' : 'border-outline-variant/40'}`}>
      {onCheckedChange ? (
        <label className="absolute z-10 m-3 rounded-full bg-black/75 p-2">
          <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onCheckedChange(asset.id, event.target.checked)} />
        </label>
      ) : null}
      <button className="block w-full text-left" onClick={() => onSelect(asset)}>
        <div className="relative aspect-[4/3] overflow-hidden bg-black">
          <img src={asset.thumbnail} alt={asset.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          <div className="absolute left-3 top-3 flex gap-2">
            <span className="chip bg-black/70 text-primary-fixed">{assetTypeLabel(asset)}</span>
            {asset.favorite ? <span className="chip bg-black/70 text-secondary">收藏</span> : null}
          </div>
          {asset.type === 'video' ? <span className="chip absolute bottom-3 right-3 bg-black/70">{asset.duration}s</span> : null}
        </div>
      </button>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="truncate text-sm font-semibold text-on-surface">{asset.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">{asset.prompt}</p>
        </div>
        <div className="flex items-center justify-between text-xs text-on-surface-variant">
          <span className="truncate">{asset.providerName} · {asset.model}</span>
          <span>{asset.createdAt.slice(5, 16)}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <button className="btn-ghost px-2 py-1.5" onClick={() => onFavorite(asset.id)}>
            <Icon name={asset.favorite ? 'star' : 'star'} className="text-base" />
          </button>
          <button className="btn-ghost px-2 py-1.5" onClick={() => navigator.clipboard?.writeText(asset.prompt)}>
            <Icon name="content_copy" className="text-base" />
          </button>
          <button className="btn-ghost px-2 py-1.5" onClick={() => onSendToVideo?.(asset.id)}>
            <Icon name="movie" className="text-base" />
          </button>
          <button className="btn-ghost px-2 py-1.5" onClick={() => (asset.taskId && onViewTask ? onViewTask(asset.taskId) : onSelect(asset))}>
            <Icon name={asset.type === 'video' ? 'task' : 'more_horiz'} className="text-base" />
          </button>
        </div>
      </div>
    </article>
  );
}
