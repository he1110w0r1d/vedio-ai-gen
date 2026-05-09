import { useState, useEffect } from 'react';
import type { Asset } from '../../types';
import { Icon } from '../common/Icon';
import { assetApi } from '../../api/assetApi';

export function AssetPreview({ asset, className = 'aspect-[4/3] w-full object-cover', large }: { asset: Asset; className?: string; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  
  const isVideo = asset.type === 'video';
  const rawUrl = asset.url ?? asset.publicUrl ?? asset.thumbnailUrl ?? asset.thumbnail;
  
  useEffect(() => {
    let active = true;
    if (asset.storageType === 'object' && (!asset.url || asset.url === '')) {
      assetApi.getAssetAccessUrl(asset.id).then((res) => {
        if (active && res.url) {
          setResolvedUrl(res.url);
        }
      }).catch(() => {
        if (active) setFailed(true);
      });
    } else {
      setResolvedUrl(rawUrl || null);
    }
    return () => { active = false; };
  }, [asset.id, asset.storageType, asset.url, rawUrl, reloadKey]);

  const videoUrl = resolvedUrl ?? undefined;
  const imageUrl = resolvedUrl ?? undefined;

  if (failed) {
    return (
      <div className={`flex ${large ? 'aspect-video' : 'aspect-[4/3]'} w-full flex-col items-center justify-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 text-center text-xs text-on-surface-variant`}>
        <Icon name={isVideo ? 'videocam_off' : 'broken_image'} className="text-3xl text-error" />
        <p>{isVideo ? '视频预览加载失败' : '图片预览加载失败'}{asset.storageType === 'local' ? '，请确认后端服务已启动。' : '。'}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button className="btn-ghost px-2 py-1" onClick={() => navigator.clipboard?.writeText(videoUrl ?? imageUrl ?? '')}>复制 URL</button>
          <button className="btn-ghost px-2 py-1" onClick={() => { setReloadKey((value) => value + 1); setFailed(false); }}>重新加载</button>
        </div>
      </div>
    );
  }

  // Video: large mode (detail drawer) uses <video> with controls
  if (isVideo && large && videoUrl && !videoUrl.startsWith('mock://')) {
    return (
      <video
        key={reloadKey}
        src={videoUrl}
        className={className}
        controls
        loop
        preload="metadata"
        onError={() => setFailed(true)}
      />
    );
  }

  // Video: card/list mode shows a poster placeholder with play icon overlay
  if (isVideo && !large) {
    const isMockVideo = !videoUrl || videoUrl.startsWith('mock://');
    const posterUrl = isMockVideo ? (asset.thumbnail ?? asset.thumbnailUrl) : undefined;
    if (isMockVideo || !videoUrl) {
      // Mock video or no URL — use thumbnail image
      return (
        <div className="relative">
          <img key={reloadKey} src={posterUrl ?? 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'} alt={asset.title} className={className} onError={() => setFailed(true)} />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/50">
              <Icon name="play_arrow" className="text-xl text-white" />
            </span>
          </div>
        </div>
      );
    }
    // Real video — use video tag as poster with no controls
    return (
      <div className="relative">
        <video key={reloadKey} src={videoUrl} className={className} preload="metadata" muted onError={() => setFailed(true)} />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/50">
            <Icon name="play_arrow" className="text-xl text-white" />
          </span>
        </div>
      </div>
    );
  }

  return <img key={reloadKey} src={imageUrl} alt={asset.title} className={className} onError={() => setFailed(true)} />;
}
