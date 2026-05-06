import type { Asset } from '../../types';
import { Icon } from '../common/Icon';

export function I2VPanel({
  imageAssets,
  firstFrameId,
  lastFrameId,
  prompt,
  keepComposition,
  onFirstFrameChange,
  onLastFrameChange,
  onPromptChange,
  onKeepCompositionChange,
}: {
  imageAssets: Asset[];
  firstFrameId: string;
  lastFrameId: string;
  prompt: string;
  keepComposition: boolean;
  onFirstFrameChange: (assetId: string) => void;
  onLastFrameChange: (assetId: string) => void;
  onPromptChange: (value: string) => void;
  onKeepCompositionChange: (value: boolean) => void;
}) {
  return (
    <>
      <div className="rounded-xl border border-outline-variant/40 bg-surface-container p-3 text-sm">
        <p className="font-semibold">从资产库选择图片</p>
        <p className="text-xs text-on-surface-variant">也可以使用上传图片入口，当前上传仅 Mock。</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <select className="field" value={firstFrameId} onChange={(event) => onFirstFrameChange(event.target.value)}>
          <option value="">设置为首帧</option>
          {imageAssets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.title}
            </option>
          ))}
        </select>
        <select className="field" value={lastFrameId} onChange={(event) => onLastFrameChange(event.target.value)}>
          <option value="">设置为尾帧</option>
          {imageAssets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.title}
            </option>
          ))}
        </select>
      </div>
      <button className="btn-ghost w-full">
        <Icon name="upload" />
        上传图片（Mock）
      </button>
      <label className="block text-sm">
        <span className="mb-1 block text-on-surface-variant">运动提示词</span>
        <textarea className="field min-h-24" value={prompt} onChange={(event) => onPromptChange(event.target.value)} />
      </label>
      <label className="flex items-center justify-between rounded-xl bg-surface-container p-3 text-sm">
        <span>保持构图</span>
        <input type="checkbox" checked={keepComposition} onChange={(event) => onKeepCompositionChange(event.target.checked)} />
      </label>
    </>
  );
}
