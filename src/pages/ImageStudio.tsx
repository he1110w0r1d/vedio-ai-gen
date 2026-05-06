import { useMemo, useState } from 'react';
import { AssetDetailDrawer } from '../components/assets/AssetDetailDrawer';
import { ImageResultGrid } from '../components/assets/ImageResultGrid';
import { Icon, SectionHeader } from '../components/ui';
import { ParameterPanel } from '../components/studio/ParameterPanel';
import { PromptEditor } from '../components/studio/PromptEditor';
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
          <ParameterPanel
            providers={imageProviders}
            providerId={providerId}
            model={model}
            style={style}
            aspectRatio={aspectRatio}
            count={count}
            seed={seed}
            onProviderChange={setProviderId}
            onStyleChange={setStyle}
            onAspectRatioChange={setAspectRatio}
            onCountChange={setCount}
            onSeedChange={setSeed}
          />
          <PromptEditor prompt={prompt} negativePrompt={negativePrompt} onPromptChange={setPrompt} onNegativePromptChange={setNegativePrompt} />
          <div className="rounded-xl border border-outline-variant/40 bg-surface-container p-3 text-xs leading-5 text-on-surface-variant">
            预估消耗：由供应商账户计费，本工作台仅做前端 Mock。生成内容的版权归属、商用授权和使用限制以对应第三方供应商服务条款为准。
          </div>
          <button className="btn-primary w-full py-3" onClick={generate}><Icon name="auto_awesome" />生成图片</button>
        </aside>
        <section>
          <ImageResultGrid
            status={status}
            results={results}
            selectedAssetId={selected?.id}
            onSelect={setSelectedAsset}
            onFavorite={toggleFavorite}
            onSendToVideo={(id) => sendImageToVideo(id, 'i2v-first')}
          />
        </section>
        <AssetDetailDrawer asset={selected} onFavorite={toggleFavorite} onRegenerate={generate} onSendToVideo={sendImageToVideo} />
      </div>
    </div>
  );
}
