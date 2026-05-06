import type { Asset } from '../../types';
import { ReferenceSlot } from './ReferenceSlot';

const slots = [
  ['character', '角色参考'],
  ['style', '风格参考'],
  ['scene', '场景参考'],
  ['action', '动作参考'],
  ['video', '参考视频'],
] as const;

export function R2VPanel({
  assets,
  refs,
  prompt,
  onRefChange,
  onPromptChange,
}: {
  assets: Asset[];
  refs: Record<string, string>;
  prompt: string;
  onRefChange: (key: string, assetId: string) => void;
  onPromptChange: (value: string) => void;
}) {
  return (
    <>
      <div className="rounded-xl border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 p-3 text-sm text-primary">
        R2V 不是简单让图片动起来，而是使用参考素材保持角色、风格、场景或动作一致性。
      </div>
      {slots.map(([key, label]) => (
        <ReferenceSlot key={key} label={label} value={refs[key] ?? ''} assets={assets} onChange={(assetId) => onRefChange(key, assetId)} />
      ))}
      <label className="block text-sm">
        <span className="mb-1 block text-on-surface-variant">新场景提示词</span>
        <textarea className="field min-h-24" value={prompt} onChange={(event) => onPromptChange(event.target.value)} />
      </label>
    </>
  );
}
