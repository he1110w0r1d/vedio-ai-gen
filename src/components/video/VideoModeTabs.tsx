import type { VideoMode } from '../../types';

const tabs: { id: VideoMode; label: string }[] = [
  { id: 'T2V', label: 'T2V 文生视频' },
  { id: 'I2V', label: 'I2V 图生视频' },
  { id: 'R2V', label: 'R2V 参考生成视频' },
];

export function VideoModeTabs({ mode, onModeChange }: { mode: VideoMode; onModeChange: (mode: VideoMode) => void }) {
  return (
    <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`rounded-xl px-5 py-2 text-sm font-bold transition ${mode === tab.id ? 'bg-surface-bright text-primary-fixed-dim shadow-neon' : 'text-on-surface-variant hover:text-on-surface'}`}
          onClick={() => onModeChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
