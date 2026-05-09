import type { Provider, VideoMode } from '../../types';
import { Icon } from '../common/Icon';

export function VideoGeneratePanel({
  providers,
  providerId,
  model,
  mode,
  duration,
  aspect,
  resolution,
  style,
  motion,
  referenceWeight,
  onProviderChange,
  onDurationChange,
  onAspectChange,
  onResolutionChange,
  onStyleChange,
  onMotionChange,
  onReferenceWeightChange,
  onGenerate,
  realT2V,
  realI2V,
  realR2V,
}: {
  providers: Provider[];
  providerId: string;
  model: string;
  mode: VideoMode;
  duration: number;
  aspect: string;
  resolution: string;
  style: string;
  motion: number;
  referenceWeight: number;
  onProviderChange: (providerId: string) => void;
  onDurationChange: (value: number) => void;
  onAspectChange: (value: string) => void;
  onResolutionChange: (value: string) => void;
  onStyleChange: (value: string) => void;
  onMotionChange: (value: number) => void;
  onReferenceWeightChange: (value: number) => void;
  onGenerate: () => void;
  realT2V?: boolean;
  realI2V?: boolean;
  realR2V?: boolean;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="mb-1 block text-on-surface-variant">供应商</span>
          <select className="field" value={providerId} onChange={(event) => onProviderChange(event.target.value)}>
            {providers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-on-surface-variant">模型</span>
          <input className="field" value={model} readOnly />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="mb-1 block text-on-surface-variant">时长</span>
          <select className="field" value={duration} onChange={(event) => onDurationChange(Number(event.target.value))}>
            <option value={4}>4 秒</option>
            <option value={6}>6 秒</option>
            <option value={8}>8 秒</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-on-surface-variant">画幅</span>
          <select className="field" value={aspect} onChange={(event) => onAspectChange(event.target.value)}>
            <option>16:9</option>
            <option>9:16</option>
            <option>1:1</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-on-surface-variant">分辨率</span>
          <select className="field" value={resolution} onChange={(event) => onResolutionChange(event.target.value)}>
            <option>720p</option>
            <option>1080p</option>
            <option>2K</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-on-surface-variant">风格</span>
          <select className="field" value={style} onChange={(event) => onStyleChange(event.target.value)}>
            <option>电影广告</option>
            <option>纪录片</option>
            <option>产品展示</option>
            <option>赛博朋克</option>
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-on-surface-variant">{mode === 'R2V' ? '参考权重' : '运动强度'}：{mode === 'R2V' ? referenceWeight : motion}</span>
        <input
          className="w-full accent-primary-fixed-dim"
          type="range"
          min={0}
          max={100}
          value={mode === 'R2V' ? referenceWeight : motion}
          onChange={(event) => (mode === 'R2V' ? onReferenceWeightChange(Number(event.target.value)) : onMotionChange(Number(event.target.value)))}
        />
      </label>
      <div className="rounded-xl border border-outline-variant/40 bg-surface-container p-3 text-xs leading-5 text-on-surface-variant">
        {realT2V
          ? '真实 T2V 将调用用户自己的百炼 API Key，可能产生费用。视频生成耗时较长，请在任务中心查看进度。'
          : realI2V
            ? '真实 I2V 将调用用户自己的百炼 API Key，可能产生费用。图片输入需满足供应商访问要求，生成耗时较长，请在任务中心查看进度。'
            : realR2V
              ? '真实 R2V 将调用用户自己的百炼 API Key，可能产生费用。请在提示词中使用 character1 引用参考角色。'
              : '视频生成调用、内容审核、版权归属和商用授权均以所选第三方供应商条款为准；当前仅创建 Mock 异步任务。'}
      </div>
      <button className="btn-primary w-full py-3" onClick={onGenerate}>
        <Icon name="movie" />
        {realT2V ? '创建真实 T2V 任务' : realI2V ? '创建真实 I2V 任务' : realR2V ? '创建真实 R2V 任务' : '生成视频 Mock 任务'}
      </button>
    </>
  );
}
