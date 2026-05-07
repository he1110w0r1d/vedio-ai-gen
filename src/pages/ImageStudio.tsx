import { useMemo, useState } from 'react';
import { AssetDetailDrawer } from '../components/assets/AssetDetailDrawer';
import { ImageResultGrid } from '../components/assets/ImageResultGrid';
import { Icon, SectionHeader } from '../components/ui';
import { ParameterPanel } from '../components/studio/ParameterPanel';
import { PromptEditor } from '../components/studio/PromptEditor';
import { useApp } from '../context/AppContext';
import { generationApi } from '../api/generationApi';
import { ApiClientError, API_MODE } from '../api/client';
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
  const [quality, setQuality] = useState('供应商默认');
  const [outputFormat, setOutputFormat] = useState('供应商返回格式');
  const [background, setBackground] = useState('供应商默认');
  const [results, setResults] = useState<Asset[]>([]);
  const [status, setStatus] = useState<'empty' | 'loading' | 'success' | 'failed'>('empty');
  const [errorMessage, setErrorMessage] = useState('');
  const model = provider?.defaultModel.split('/')[0].trim() || 'Mock Image';
  const isWanwuRealProvider = API_MODE === 'real' && provider?.providerType === 'openai-images';
  const selected = useMemo(() => selectedAsset && selectedAsset.type !== 'video' ? selectedAsset : results[0], [selectedAsset, results]);

  const generate = async () => {
    if (!provider || !prompt.trim()) {
      setStatus('failed');
      showToast('请选择供应商并输入提示词', 'error');
      return;
    }
    setStatus('loading');
    setErrorMessage('');
    try {
      const { task, assets: items } = await generationApi.generateImage({
        prompt,
        negativePrompt,
        count,
        provider,
        project: currentProject,
        model,
        aspectRatio,
        style,
        seed,
        quality,
        outputFormat,
        background,
      });
      addTask(task);
      const finish = () => {
        addAssets(items);
        setResults(items);
        setSelectedAsset(items[0]);
        setStatus('success');
        showToast(isWanwuRealProvider ? `万物焕新已生成 ${items.length} 张图片` : '图片 Mock 生成完成', 'success');
      };
      if (isWanwuRealProvider) finish();
      else window.setTimeout(finish, 900);
    } catch (error) {
      setStatus('failed');
      const message = getFriendlyGenerationError(error);
      setErrorMessage(message);
      showToast(message, 'error');
    }
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
            quality={quality}
            outputFormat={outputFormat}
            background={background}
            onProviderChange={setProviderId}
            onStyleChange={setStyle}
            onAspectRatioChange={setAspectRatio}
            onCountChange={setCount}
            onSeedChange={setSeed}
            onQualityChange={setQuality}
            onOutputFormatChange={setOutputFormat}
            onBackgroundChange={setBackground}
          />
          <PromptEditor prompt={prompt} negativePrompt={negativePrompt} onPromptChange={setPrompt} onNegativePromptChange={setNegativePrompt} />
          <div className="rounded-xl border border-outline-variant/40 bg-surface-container p-3 text-xs leading-5 text-on-surface-variant">
            预估消耗：由供应商账户计费，本工作台仅做前端 Mock。生成内容的版权归属、商用授权和使用限制以对应第三方供应商服务条款为准。
            {isWanwuRealProvider ? (
              <span className="mt-2 block text-primary-fixed">
                真实生成会调用用户自己的万物焕新 API Key，并可能产生费用。生成速度、审核结果、模型权限以万物焕新账户状态为准。
              </span>
            ) : null}
          </div>
          {errorMessage ? (
            <div className="rounded-xl border border-error/30 bg-error-container/30 p-3 text-xs leading-5 text-error">
              {errorMessage}
            </div>
          ) : null}
          <button className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-60" onClick={generate} disabled={status === 'loading'}>
            <Icon name={status === 'loading' ? 'hourglass_empty' : 'auto_awesome'} />
            {status === 'loading' ? '生成中...' : '生成图片'}
          </button>
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

function getFriendlyGenerationError(error: unknown) {
  if (!(error instanceof ApiClientError)) return '图片生成请求失败，请稍后重试。';
  const map: Record<string, string> = {
    INVALID_API_KEY: 'API Key 无效，请到 Provider 页面检查或重新填写。',
    INSUFFICIENT_BALANCE: '账户余额或额度不足，请检查供应商账户状态。',
    RATE_LIMITED: '请求过于频繁，请稍后重试。',
    CONTENT_REJECTED: '当前提示词未通过内容审核，请调整后重试。',
    MODEL_NOT_SUPPORTED: '当前模型不可用，可能与账户权限、组织验证或模型支持情况有关。',
    TASK_TIMEOUT: '生成超时，请稍后重试或简化提示词。',
    PROVIDER_UNAVAILABLE: '供应商服务暂时不可用，请稍后重试。',
    UNKNOWN_PROVIDER_ERROR: '生成失败，请查看后端日志或稍后再试。',
  };
  return map[error.error.code] ?? error.error.message;
}
