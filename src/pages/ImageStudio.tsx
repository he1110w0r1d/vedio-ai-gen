import { useMemo, useState } from 'react';
import { AssetCard } from '../components/AssetCard';
import { EmptyState, Icon, SectionHeader } from '../components/ui';
import { useApp } from '../context/AppContext';
import { createImageAssets, createTask } from '../services/mockService';
import type { Asset } from '../types';

export function ImageStudio() {
  const { providers, currentProject, addAssets, addTask, selectedAsset, setSelectedAsset, toggleFavorite, sendImageToVideo, showToast } = useApp();
  const imageProviders = providers.filter((provider) => provider.capabilities.includes('图片生成'));
  const [providerId, setProviderId] = useState(imageProviders[0]?.id ?? '');
  const provider = imageProviders.find((item) => item.id === providerId) ?? imageProviders[0];
  const [prompt, setPrompt] = useState('未来感产品发布海报，黑色背景，青色边缘光，电影级构图');
  const [negativePrompt, setNegativePrompt] = useState('低清晰度，畸形文字，过曝');
  const [style, setStyle] = useState('电影感');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [count, setCount] = useState(2);
  const [seed, setSeed] = useState('');
  const [results, setResults] = useState<Asset[]>([]);
  const [status, setStatus] = useState<'empty' | 'loading' | 'success' | 'failed'>('empty');
  const model = provider?.defaultModel.split('/')[0].trim() || 'Mock Image';
  const selected = useMemo(() => selectedAsset && selectedAsset.type !== 'video' ? selectedAsset : results[0], [selectedAsset, results]);

  const generate = () => {
    if (!provider || !prompt.trim()) {
      setStatus('failed');
      showToast('请选择供应商并输入提示词', 'error');
      return;
    }
    setStatus('loading');
    const task = createTask({ type: 'image', title: '图片生成任务', prompt, provider, project: currentProject, model, params: { aspectRatio, count, seed: seed || '随机', negativePrompt } });
    addTask(task);
    window.setTimeout(() => {
      const items = createImageAssets({ prompt, count, provider, project: currentProject, model, aspectRatio, style, seed });
      addAssets(items);
      setResults(items);
      setSelectedAsset(items[0]);
      setStatus('success');
      showToast('图片 Mock 生成完成', 'success');
    }, 900);
  };

  return (
    <div>
      <SectionHeader title="图片生成 Image Studio" subtitle="使用自己的供应商配置生成图片资产，当前为 Mock 闭环。" />
      <div className="grid gap-5 xl:grid-cols-[320px_1fr_360px]">
        <aside className="card space-y-4">
          <h3 className="text-lg font-bold">生成参数</h3>
          <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">供应商</span><select className="field" value={providerId} onChange={(event) => setProviderId(event.target.value)}>{imageProviders.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">模型</span><input className="field" value={model} readOnly /></label>
          <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">正向提示词</span><textarea className="field min-h-28" value={prompt} onChange={(event) => setPrompt(event.target.value)} /></label>
          <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">负面提示词</span><textarea className="field min-h-20" value={negativePrompt} onChange={(event) => setNegativePrompt(event.target.value)} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">风格预设</span><select className="field" value={style} onChange={(event) => setStyle(event.target.value)}><option>电影感</option><option>产品展示</option><option>赛博朋克</option><option>极简商业</option></select></label>
            <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">画幅</span><select className="field" value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}><option>1:1</option><option>16:9</option><option>9:16</option><option>4:3</option></select></label>
            <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">数量</span><input className="field" type="number" min={1} max={4} value={count} onChange={(event) => setCount(Number(event.target.value))} /></label>
            <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">Seed</span><input className="field" value={seed} onChange={(event) => setSeed(event.target.value)} placeholder="随机" /></label>
          </div>
          <div className="rounded-xl border border-outline-variant/40 bg-surface-container p-3 text-xs leading-5 text-on-surface-variant">
            预估消耗：由供应商账户计费，本工作台仅做前端 Mock。生成内容的版权归属、商用授权和使用限制以对应第三方供应商服务条款为准。
          </div>
          <button className="btn-primary w-full py-3" onClick={generate}><Icon name="auto_awesome" />生成图片</button>
        </aside>
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">生成结果</h3>
            <span className="text-sm text-on-surface-variant">{status === 'loading' ? '加载中' : status === 'failed' ? '失败状态' : status === 'success' ? '成功状态' : '空状态'}</span>
          </div>
          {status === 'empty' ? <EmptyState icon="image" title="暂无生成结果" text="输入提示词后点击生成，结果会以 Mock 图片卡片展示。" /> : null}
          {status === 'loading' ? <EmptyState icon="refresh" title="正在生成图片" text="Mock 任务正在模拟供应商响应，请稍候。" /> : null}
          {status === 'failed' ? <EmptyState icon="error" title="生成失败" text="请检查供应商与提示词。这里展示的是前端失败态。" /> : null}
          {results.length ? <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{results.map((asset) => <AssetCard key={asset.id} asset={asset} selected={selected?.id === asset.id} onSelect={setSelectedAsset} onFavorite={toggleFavorite} onSendToVideo={(id) => sendImageToVideo(id, 'i2v-first')} />)}</div> : null}
        </section>
        <aside className="card">
          <h3 className="mb-4 text-lg font-bold">图片详情</h3>
          {selected ? (
            <div className="space-y-4">
              <img src={selected.thumbnail} alt={selected.title} className="aspect-[4/3] w-full rounded-xl object-cover" />
              <div><p className="font-semibold">{selected.title}</p><p className="mt-1 text-sm text-on-surface-variant">{selected.prompt}</p></div>
              <div className="grid grid-cols-2 gap-2 text-xs text-on-surface-variant">
                <span>供应商：{selected.providerName}</span><span>模型：{selected.model}</span><span>创建：{selected.createdAt}</span><span>参数：{Object.values(selected.params).join(' / ')}</span>
              </div>
              <div className="grid grid-cols-3 gap-2"><button className="btn-ghost px-2"><Icon name="download" />下载</button><button className="btn-ghost px-2" onClick={() => toggleFavorite(selected.id)}><Icon name="star" />收藏</button><button className="btn-ghost px-2" onClick={generate}><Icon name="replay" />重生</button></div>
              <div className="rounded-xl border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 p-3">
                <p className="mb-3 font-semibold text-primary">用于视频生成</p>
                <div className="grid gap-2">
                  <button className="btn-ghost justify-start" onClick={() => sendImageToVideo(selected.id, 'i2v-first')}>作为 I2V 首帧</button>
                  <button className="btn-ghost justify-start" onClick={() => sendImageToVideo(selected.id, 'i2v-last')}>作为 I2V 尾帧</button>
                  <button className="btn-ghost justify-start" onClick={() => sendImageToVideo(selected.id, 'r2v-character')}>作为 R2V 角色参考</button>
                  <button className="btn-ghost justify-start" onClick={() => sendImageToVideo(selected.id, 'r2v-style')}>作为 R2V 风格参考</button>
                  <button className="btn-primary">加入项目素材库</button>
                </div>
              </div>
            </div>
          ) : <EmptyState icon="preview" title="未选择图片" text="点击图片结果后查看详情与视频生成入口。" />}
        </aside>
      </div>
    </div>
  );
}
