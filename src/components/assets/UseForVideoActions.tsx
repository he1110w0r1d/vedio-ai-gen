import type { VideoSeed } from '../../types';

export function UseForVideoActions({ assetId, onSendToVideo }: { assetId: string; onSendToVideo: (assetId: string, usage: VideoSeed['usage']) => void }) {
  return (
    <div className="rounded-xl border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 p-3">
      <p className="mb-3 font-semibold text-primary">用于视频生成</p>
      <div className="grid gap-2">
        <button className="btn-ghost justify-start" onClick={() => onSendToVideo(assetId, 'i2v-first')}>
          作为 I2V 首帧
        </button>
        <button className="btn-ghost justify-start" onClick={() => onSendToVideo(assetId, 'i2v-last')}>
          作为 I2V 尾帧
        </button>
        <button className="btn-ghost justify-start" onClick={() => onSendToVideo(assetId, 'r2v-character')}>
          作为 R2V 角色参考
        </button>
        <button className="btn-ghost justify-start" onClick={() => onSendToVideo(assetId, 'r2v-style')}>
          作为 R2V 风格参考
        </button>
        <button className="btn-primary">加入项目素材库</button>
      </div>
    </div>
  );
}
