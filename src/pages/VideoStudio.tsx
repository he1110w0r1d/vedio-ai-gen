import { useEffect, useMemo, useState } from 'react';
import { AssetCard } from '../components/AssetCard';
import { EmptyState, Icon, SectionHeader } from '../components/ui';
import { useApp } from '../context/AppContext';
import { createTask } from '../services/mockService';
import type { Asset, VideoMode } from '../types';

const tabs: { id: VideoMode; label: string }[] = [
  { id: 'T2V', label: 'T2V 文生视频' },
  { id: 'I2V', label: 'I2V 图生视频' },
  { id: 'R2V', label: 'R2V 参考生成视频' },
];

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
      <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-2">
        {tabs.map((tab) => <button key={tab.id} className={`rounded-xl px-5 py-2 text-sm font-bold transition ${mode === tab.id ? 'bg-surface-bright text-primary-fixed-dim shadow-neon' : 'text-on-surface-variant hover:text-on-surface'}`} onClick={() => setMode(tab.id)}>{tab.label}</button>)}
      </div>
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <section className="card space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">供应商</span><select className="field" value={providerId} onChange={(event) => setProviderId(event.target.value)}>{videoProviders.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">模型</span><input className="field" value={model} readOnly /></label>
          </div>
          {mode === 'T2V' ? (
            <>
              <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">视频提示词</span><textarea className="field min-h-28" value={prompt} onChange={(event) => setPrompt(event.target.value)} /></label>
              <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">镜头运动</span><select className="field" value={camera} onChange={(event) => setCamera(event.target.value)}><option>缓慢推进</option><option>环绕运镜</option><option>手持跟拍</option><option>俯冲拉远</option></select></label>
            </>
          ) : null}
          {mode === 'I2V' ? (
            <>
              <div className="rounded-xl border border-outline-variant/40 bg-surface-container p-3 text-sm">
                <p className="font-semibold">从资产库选择图片</p>
                <p className="text-xs text-on-surface-variant">也可以使用上传图片入口，当前上传仅 Mock。</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select className="field" value={i2vFirst} onChange={(event) => setI2vFirst(event.target.value)}><option value="">设置为首帧</option>{imageAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.title}</option>)}</select>
                <select className="field" value={i2vLast} onChange={(event) => setI2vLast(event.target.value)}><option value="">设置为尾帧</option>{imageAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.title}</option>)}</select>
              </div>
              <button className="btn-ghost w-full"><Icon name="upload" />上传图片（Mock）</button>
              <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">运动提示词</span><textarea className="field min-h-24" value={prompt} onChange={(event) => setPrompt(event.target.value)} /></label>
              <label className="flex items-center justify-between rounded-xl bg-surface-container p-3 text-sm"><span>保持构图</span><input type="checkbox" checked={keepComposition} onChange={(event) => setKeepComposition(event.target.checked)} /></label>
            </>
          ) : null}
          {mode === 'R2V' ? (
            <>
              <div className="rounded-xl border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 p-3 text-sm text-primary">R2V 不是简单让图片动起来，而是使用参考素材保持角色、风格、场景或动作一致性。</div>
              {[
                ['character', '角色参考'],
                ['style', '风格参考'],
                ['scene', '场景参考'],
                ['action', '动作参考'],
                ['video', '参考视频'],
              ].map(([key, label]) => (
                <label key={key} className="block text-sm">
                  <span className="mb-1 block text-on-surface-variant">{label}</span>
                  <select className="field" value={refs[key] ?? ''} onChange={(event) => setRefs((item) => ({ ...item, [key]: event.target.value }))}>
                    <option value="">选择素材</option>
                    {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.title}</option>)}
                  </select>
                </label>
              ))}
              <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">新场景提示词</span><textarea className="field min-h-24" value={prompt} onChange={(event) => setPrompt(event.target.value)} /></label>
            </>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">时长</span><select className="field" value={duration} onChange={(event) => setDuration(Number(event.target.value))}><option value={4}>4 秒</option><option value={6}>6 秒</option><option value={8}>8 秒</option></select></label>
            <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">画幅</span><select className="field" value={aspect} onChange={(event) => setAspect(event.target.value)}><option>16:9</option><option>9:16</option><option>1:1</option></select></label>
            <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">分辨率</span><select className="field" value={resolution} onChange={(event) => setResolution(event.target.value)}><option>720p</option><option>1080p</option><option>2K</option></select></label>
            <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">风格</span><select className="field" value={style} onChange={(event) => setStyle(event.target.value)}><option>电影广告</option><option>纪录片</option><option>产品展示</option><option>赛博朋克</option></select></label>
          </div>
          <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">{mode === 'R2V' ? '参考权重' : '运动强度'}：{mode === 'R2V' ? referenceWeight : motion}</span><input className="w-full accent-primary-fixed-dim" type="range" min={0} max={100} value={mode === 'R2V' ? referenceWeight : motion} onChange={(event) => mode === 'R2V' ? setReferenceWeight(Number(event.target.value)) : setMotion(Number(event.target.value))} /></label>
          <div className="rounded-xl border border-outline-variant/40 bg-surface-container p-3 text-xs leading-5 text-on-surface-variant">
            视频生成调用、内容审核、版权归属和商用授权均以所选第三方供应商条款为准；当前仅创建 Mock 异步任务。
          </div>
          <button className="btn-primary w-full py-3" onClick={generate}><Icon name="movie" />生成视频 Mock 任务</button>
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
