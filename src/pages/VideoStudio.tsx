import { useEffect, useMemo, useState } from 'react';
import { AssetCard } from '../components/AssetCard';
import { EmptyState, SectionHeader } from '../components/ui';
import { I2VPanel } from '../components/video/I2VPanel';
import { R2VPanel } from '../components/video/R2VPanel';
import { T2VPanel } from '../components/video/T2VPanel';
import { VideoGeneratePanel } from '../components/video/VideoGeneratePanel';
import { VideoModeTabs } from '../components/video/VideoModeTabs';
import { useApp } from '../context/AppContext';
import { createTask } from '../services/mockService';
import type { Asset, VideoMode } from '../types';

export function VideoStudio() {
  const { providers, assets, currentProject, addTask, setView, consumeVideoSeed, showToast, setSelectedAsset, toggleFavorite, sendImageToVideo } = useApp();
  const videoProviders = providers.filter((provider) => provider.capabilities.some((capability) => ['T2V', 'I2V', 'R2V'].includes(capability)));
  const imageAssets = assets.filter((asset) => asset.type !== 'video');
  const [mode, setMode] = useState<VideoMode>('T2V');
  const [providerId, setProviderId] = useState(videoProviders[0]?.id ?? '');
  const provider = videoProviders.find((item) => item.id === providerId) ?? videoProviders[0];
  const model = provider?.defaultModel.split('/').at(-1)?.trim() || 'Mock Video';
  const [prompt, setPrompt] = useState('镜头缓慢推进，霓虹光在主体表面流动，电影级质感');
  const [camera, setCamera] = useState('缓慢推进');
  const [duration, setDuration] = useState(6);
  const [aspect, setAspect] = useState('16:9');
  const [resolution, setResolution] = useState('1080p');
  const [motion, setMotion] = useState(50);
  const [style, setStyle] = useState('电影广告');
  const [keepComposition, setKeepComposition] = useState(true);
  const [i2vFirst, setI2vFirst] = useState<string>('');
  const [i2vLast, setI2vLast] = useState<string>('');
  const [refs, setRefs] = useState<Record<string, string>>({ character: '', style: '', scene: '', action: '', video: '' });
  const [referenceWeight, setReferenceWeight] = useState(70);

  useEffect(() => {
    const seed = consumeVideoSeed();
    if (!seed) return;
    if (seed.usage === 'i2v-first') {
      setMode('I2V');
      setI2vFirst(seed.assetId);
    }
    if (seed.usage === 'i2v-last') {
      setMode('I2V');
      setI2vLast(seed.assetId);
    }
    if (seed.usage === 'r2v-character') {
      setMode('R2V');
      setRefs((item) => ({ ...item, character: seed.assetId }));
    }
    if (seed.usage === 'r2v-style') {
      setMode('R2V');
      setRefs((item) => ({ ...item, style: seed.assetId }));
    }
  }, [consumeVideoSeed]);

  const selectedAssets = useMemo(
    () => [i2vFirst, i2vLast, ...Object.values(refs)].filter(Boolean).map((assetId) => assets.find((asset) => asset.id === assetId)).filter(Boolean) as Asset[],
    [assets, i2vFirst, i2vLast, refs],
  );

  const generate = () => {
    if (!provider) {
      showToast('请先配置视频供应商', 'error');
      return;
    }
    const task = createTask({
      type: 'video',
      mode,
      title: `${mode} 视频生成`,
      prompt,
      provider,
      project: currentProject,
      model,
      params: { camera, duration, aspect, resolution, motion, style, keepComposition, referenceWeight },
    });
    addTask(task);
    setView('tasks');
  };

  const assetSelect = (target: 'first' | 'last' | 'character' | 'style' | 'scene' | 'action' | 'video', assetId: string) => {
    if (target === 'first') setI2vFirst(assetId);
    else if (target === 'last') setI2vLast(assetId);
    else setRefs((item) => ({ ...item, [target]: assetId }));
    showToast('参考素材已选择', 'success');
  };

  return (
    <div>
      <SectionHeader title="视频生成 Video Studio" subtitle="T2V、I2V、R2V 三种模式均为 Mock 异步任务。" />
      <VideoModeTabs mode={mode} onModeChange={setMode} />
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <section className="card space-y-4">
          {mode === 'T2V' ? (
            <T2VPanel prompt={prompt} camera={camera} onPromptChange={setPrompt} onCameraChange={setCamera} />
          ) : null}
          {mode === 'I2V' ? (
            <I2VPanel
              imageAssets={imageAssets}
              firstFrameId={i2vFirst}
              lastFrameId={i2vLast}
              prompt={prompt}
              keepComposition={keepComposition}
              onFirstFrameChange={setI2vFirst}
              onLastFrameChange={setI2vLast}
              onPromptChange={setPrompt}
              onKeepCompositionChange={setKeepComposition}
            />
          ) : null}
          {mode === 'R2V' ? (
            <R2VPanel assets={assets} refs={refs} prompt={prompt} onRefChange={(key, assetId) => setRefs((item) => ({ ...item, [key]: assetId }))} onPromptChange={setPrompt} />
          ) : null}
          <VideoGeneratePanel
            providers={videoProviders}
            providerId={providerId}
            model={model}
            mode={mode}
            duration={duration}
            aspect={aspect}
            resolution={resolution}
            style={style}
            motion={motion}
            referenceWeight={referenceWeight}
            onProviderChange={setProviderId}
            onDurationChange={setDuration}
            onAspectChange={setAspect}
            onResolutionChange={setResolution}
            onStyleChange={setStyle}
            onMotionChange={setMotion}
            onReferenceWeightChange={setReferenceWeight}
            onGenerate={generate}
          />
        </section>
        <section>
          <h3 className="mb-4 text-xl font-bold">素材与预览</h3>
          {selectedAssets.length ? <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{selectedAssets.map((asset) => <AssetCard key={asset.id} asset={asset} onSelect={setSelectedAsset} onFavorite={toggleFavorite} onSendToVideo={(id) => sendImageToVideo(id, 'i2v-first')} />)}</div> : <EmptyState icon="movie" title="暂无参考素材" text="T2V 可直接生成；I2V/R2V 可以从下方资产库选择素材卡槽。" />}
          <h3 className="mb-4 text-xl font-bold">从资产库快速选择</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {imageAssets.slice(0, 8).map((asset) => (
              <div key={asset.id} className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-2">
                <img src={asset.thumbnail} alt={asset.title} className="aspect-[4/3] rounded-xl object-cover" />
                <p className="mt-2 truncate text-sm font-semibold">{asset.title}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <button className="btn-ghost px-2 py-1" onClick={() => assetSelect(mode === 'R2V' ? 'character' : 'first', asset.id)}>{mode === 'R2V' ? '角色' : '首帧'}</button>
                  <button className="btn-ghost px-2 py-1" onClick={() => assetSelect(mode === 'R2V' ? 'style' : 'last', asset.id)}>{mode === 'R2V' ? '风格' : '尾帧'}</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
