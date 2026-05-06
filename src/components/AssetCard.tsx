import type { Asset } from '../types';
import { Icon } from './ui';

export function AssetCard({
  asset,
  selected,
  onSelect,
  onFavorite,
  onSendToVideo,
}: {
  asset: Asset;
  selected?: boolean;
  onSelect: (asset: Asset) => void;
  onFavorite: (id: string) => void;
  onSendToVideo?: (id: string) => void;
}) {
  return (
    <article className={`group overflow-hidden rounded-2xl border bg-surface-container-low transition hover:border-primary-fixed-dim/60 ${selected ? 'border-primary-fixed-dim shadow-neon' : 'border-outline-variant/40'}`}>
      <button className="block w-full text-left" onClick={() => onSelect(asset)}>
        <div className="relative aspect-[4/3] overflow-hidden bg-black">
          <img src={asset.thumbnail} alt={asset.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          <div className="absolute left-3 top-3 flex gap-2">
            <span className="chip bg-black/70 text-primary-fixed">{asset.type === 'video' ? '视频' : asset.type === 'reference' ? '参考' : '图片'}</span>
            {asset.favorite ? <span className="chip bg-black/70 text-secondary">收藏</span> : null}
          </div>
        </div>
      </button>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="truncate text-sm font-semibold text-on-surface">{asset.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">{asset.prompt}</p>
        </div>
        <div className="flex items-center justify-between text-xs text-on-surface-variant">
          <span>{asset.providerName} · {asset.model}</span>
          <span>{asset.createdAt.slice(5, 16)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button className="btn-ghost px-2 py-1.5" onClick={() => onFavorite(asset.id)}>
            <Icon name={asset.favorite ? 'star' : 'star'} className="text-base" />
          </button>
          <button className="btn-ghost px-2 py-1.5" onClick={() => navigator.clipboard?.writeText(asset.prompt)}>
            <Icon name="content_copy" className="text-base" />
          </button>
          <button className="btn-ghost px-2 py-1.5" onClick={() => onSendToVideo?.(asset.id)} disabled={asset.type === 'video'}>
            <Icon name="movie" className="text-base" />
          </button>
        </div>
      </div>
    </article>
  );
}
