import { useState } from 'react';
import type { Asset } from '../../types';
import { Icon } from '../common/Icon';

export function AssetPreview({ asset, className = 'aspect-[4/3] w-full object-cover', large }: { asset: Asset; className?: string; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const url = asset.thumbnailUrl ?? asset.url ?? asset.thumbnail;

  if (failed) {
    return (
      <div className={`flex ${large ? 'aspect-video' : 'aspect-[4/3]'} w-full flex-col items-center justify-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 text-center text-xs text-on-surface-variant`}>
        <Icon name="broken_image" className="text-3xl text-error" />
        <p>图片预览加载失败{asset.storageType === 'local' ? '，请确认后端服务已启动。' : '。'}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button className="btn-ghost px-2 py-1" onClick={() => navigator.clipboard?.writeText(asset.url ?? url)}>复制 URL</button>
          <button className="btn-ghost px-2 py-1" onClick={() => { setReloadKey((value) => value + 1); setFailed(false); }}>重新加载</button>
        </div>
      </div>
    );
  }

  return <img key={reloadKey} src={url} alt={asset.title} className={className} onError={() => setFailed(true)} />;
}
