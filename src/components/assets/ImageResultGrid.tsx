import type { Asset } from '../../types';
import { AssetCard } from '../AssetCard';
import { EmptyState } from '../common/EmptyState';

export function ImageResultGrid({
  status,
  results,
  selectedAssetId,
  onSelect,
  onFavorite,
  onSendToVideo,
}: {
  status: 'empty' | 'loading' | 'success' | 'failed';
  results: Asset[];
  selectedAssetId?: string;
  onSelect: (asset: Asset) => void;
  onFavorite: (id: string) => void;
  onSendToVideo: (id: string) => void;
}) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-bold">生成结果</h3>
        <span className="text-sm text-on-surface-variant">{status === 'loading' ? '加载中' : status === 'failed' ? '失败状态' : status === 'success' ? '成功状态' : '空状态'}</span>
      </div>
      {status === 'empty' ? <EmptyState icon="image" title="暂无生成结果" text="输入提示词后点击生成，结果会以 Mock 图片卡片展示。" /> : null}
      {status === 'loading' ? <EmptyState icon="refresh" title="正在生成图片" text="Mock 任务正在模拟供应商响应，请稍候。" /> : null}
      {status === 'failed' ? <EmptyState icon="error" title="生成失败" text="请检查供应商与提示词。这里展示的是前端失败态。" /> : null}
      {results.length ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {results.map((asset) => (
            <AssetCard key={asset.id} asset={asset} selected={selectedAssetId === asset.id} onSelect={onSelect} onFavorite={onFavorite} onSendToVideo={onSendToVideo} />
          ))}
        </div>
      ) : null}
    </>
  );
}
