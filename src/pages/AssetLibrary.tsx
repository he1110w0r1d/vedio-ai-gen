import { useMemo, useState, useEffect } from 'react';
import { AssetCard } from '../components/AssetCard';
import { AssetDetailDrawer } from '../components/assets/AssetDetailDrawer';
import { EmptyState, Icon, SearchInput, SectionHeader } from '../components/ui';
import { useApp } from '../context/AppContext';
import { generationApi } from '../api/generationApi';
import { qualityApi } from '../api/qualityApi';
import { storageApi } from '../api/storageApi';
import type { Asset, AssetType, QualityFeedback } from '../types';

type AssetFilter = 'all' | AssetType | 'favorite';
type SortKey = 'newest' | 'oldest' | 'title';

const typeOptions: { id: AssetFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'image', label: '图片' },
  { id: 'video', label: '视频' },
  { id: 'reference', label: '参考素材' },
  { id: 'favorite', label: '收藏' },
];

function compareCreatedAt(a: Asset, b: Asset) {
  return b.createdAt.localeCompare(a.createdAt);
}

export function AssetLibrary() {
  const {
    assets,
    projects,
    providers,
    globalSearch,
    selectedAsset,
    setSelectedAsset,
    toggleFavorite,
    deleteAsset,
    downloadAsset,
    sendImageToVideo,
    addTask,
    addAssets,
    setView,
    moveProjectAssets,
    showToast,
  } = useApp();
  const [type, setType] = useState<AssetFilter>('all');
  const [projectId, setProjectId] = useState('all');
  const [providerId, setProviderId] = useState('all');
  const [model, setModel] = useState('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchTargetProjectId, setBatchTargetProjectId] = useState('');
  const [qualityFilter, setQualityFilter] = useState('all');
  const [feedbackMap, setFeedbackMap] = useState<Record<string, QualityFeedback>>({});

  useEffect(() => {
    qualityApi.list({ targetType: 'asset' }).then(list => {
      const map: Record<string, QualityFeedback> = {};
      for (const fb of list) map[fb.targetId] = fb;
      setFeedbackMap(map);
    }).catch(() => undefined);
  }, [assets.length]);

  const models = useMemo(() => Array.from(new Set(assets.map((asset) => asset.model))).sort(), [assets]);

  const filtered = useMemo(() => {
    const keyword = `${globalSearch} ${query}`.trim().toLowerCase();
    return assets
      .filter((asset) => {
        const matchType = type === 'all' || (type === 'favorite' ? asset.favorite : asset.type === type);
        const matchProject = projectId === 'all' || asset.projectId === projectId;
        const matchProvider = providerId === 'all' || asset.providerId === providerId;
        const matchModel = model === 'all' || asset.model === model;
        const matchSearch = !keyword || `${asset.title} ${asset.prompt} ${asset.model} ${asset.providerName}`.toLowerCase().includes(keyword);
        return matchType && matchProject && matchProvider && matchModel && matchSearch;
      })
      .filter((asset) => {
        if (qualityFilter === 'all') return true;
        const fb = feedbackMap[asset.id];
        if (qualityFilter === 'unrated') return !fb;
        if (qualityFilter === 'excellent') return fb?.qualityStatus === 'excellent';
        if (qualityFilter === 'usable') return fb?.qualityStatus === 'usable';
        if (qualityFilter === 'needs_fix') return fb?.qualityStatus === 'needs_fix';
        if (qualityFilter === 'unusable') return fb?.qualityStatus === 'unusable';
        if (qualityFilter === 'worth_retry') return fb?.worthRetry === true;
        return true;
      })
      .sort((a, b) => {
        if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt);
        if (sort === 'title') return a.title.localeCompare(b.title, 'zh-CN');
        return compareCreatedAt(a, b);
      });
  }, [assets, globalSearch, query, type, projectId, providerId, model, sort, qualityFilter, feedbackMap]);

  const selectedAssetIds = new Set(selectedIds);
  const selectedAssets = assets.filter((asset) => selectedAssetIds.has(asset.id));
  const selectedProjectName = selectedAsset ? projects.find((project) => project.id === selectedAsset.projectId)?.name : undefined;

  const toggleSelection = (assetId: string, checked: boolean) => {
    setSelectedIds((items) => (checked ? Array.from(new Set([...items, assetId])) : items.filter((id) => id !== assetId)));
  };

  const batchFavorite = () => {
    selectedIds.forEach(toggleFavorite);
    showToast('已批量切换收藏状态', 'success');
  };

  const batchDelete = () => {
    if (!window.confirm(`确认删除选中的 ${selectedIds.length} 个资产？真实本地资产会同步删除文件。`)) return;
    selectedIds.forEach(deleteAsset);
    setSelectedIds([]);
  };

  const [migrating, setMigrating] = useState(false);
  const batchMigrate = async () => {
    if (migrating) return;
    try {
      setMigrating(true);
      const res = await storageApi.migrateAssets({ assetIds: selectedIds });
      showToast(`迁移完成: 成功 ${res.successCount} 个, 失败 ${res.failedCount} 个`, res.failedCount > 0 ? 'info' : 'success');
      if (res.warnings.length > 0) {
        console.warn('迁移警告:', res.warnings);
      }
      setSelectedIds([]);
    } catch (e: any) {
      showToast(`迁移失败: ${e.message}`, 'error');
    } finally {
      setMigrating(false);
    }
  };

  const batchMoveToProject = async () => {
    if (!batchTargetProjectId) {
      showToast('请选择目标项目', 'error');
      return;
    }
    const movableAssets = selectedAssets.filter((asset) => asset.projectId !== batchTargetProjectId);
    if (!movableAssets.length) {
      showToast('所选资产已在目标项目中', 'info');
      return;
    }
    const groups = movableAssets.reduce<Record<string, string[]>>((result, asset) => {
      result[asset.projectId] = [...(result[asset.projectId] ?? []), asset.id];
      return result;
    }, {});
    await Promise.all(Object.entries(groups).map(([sourceProjectId, assetIds]) => moveProjectAssets(sourceProjectId, batchTargetProjectId, assetIds)));
    setSelectedIds([]);
  };

  const handleSendToVideo = (asset: Asset) => {
    if (asset.type === 'video') sendImageToVideo(asset.id, 'r2v-video');
    else sendImageToVideo(asset.id, 'i2v-first');
  };

  const openTask = (taskId: string) => {
    setView('tasks');
    showToast(`已跳转任务中心，关联任务：${taskId}`, 'info');
  };

  const regenerateAsset = async (asset: Asset) => {
    const provider = providers.find((item) => item.id === asset.providerId);
    const project = projects.find((item) => item.id === asset.projectId) ?? projects[0];
    if (!provider || !project) {
      showToast('原供应商或项目不存在，无法重新生成', 'error');
      return;
    }
    try {
      const params = asset.parameters ?? asset.params;
      const { task, assets: newAssets } = await generationApi.generateImage({
        prompt: asset.prompt,
        negativePrompt: String(params.negativePrompt ?? ''),
        count: Number(params.count ?? 1),
        provider,
        project,
        model: asset.model,
        aspectRatio: String(params.requestedAspectRatio ?? ('aspectRatio' in asset ? asset.aspectRatio : '1:1')),
        style: String(params.style ?? ''),
        seed: String(params.seed ?? ''),
        quality: String(params.quality ?? '供应商默认'),
        outputFormat: String(params.outputFormat ?? '供应商返回格式'),
        background: String(params.background ?? '供应商默认'),
      });
      addTask(task);
      addAssets(newAssets);
      showToast('已按原参数重新生成', 'success');
    } catch {
      showToast('重新生成失败，请检查供应商配置', 'error');
    }
  };

  return (
    <div>
      <SectionHeader
        title="资产库 Asset Library"
        subtitle="统一管理图片、视频、参考素材与收藏资产。"
        action={<button className="btn-primary"><Icon name="upload" />导入素材（Mock）</button>}
      />

      <div className="card mb-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((item) => (
            <button key={item.id} className={`btn-ghost ${type === item.id ? 'border-primary-fixed-dim text-primary-fixed' : ''}`} onClick={() => setType(item.id)}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <SearchInput value={query} onChange={setQuery} placeholder="搜索名称、提示词、模型..." />
          <select className="field" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="all">全部项目</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <select className="field" value={providerId} onChange={(event) => setProviderId(event.target.value)}>
            <option value="all">全部供应商</option>
            {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
          </select>
          <select className="field" value={model} onChange={(event) => setModel(event.target.value)}>
            <option value="all">全部模型</option>
            {models.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="field" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            <option value="newest">创建时间：最新</option>
            <option value="oldest">创建时间：最早</option>
            <option value="title">名称排序</option>
          </select>
          <select className="field" value={qualityFilter} onChange={(event) => setQualityFilter(event.target.value)}>
            <option value="all">全部评价</option>
            <option value="unrated">未评价</option>
            <option value="excellent">优秀</option>
            <option value="usable">可用</option>
            <option value="needs_fix">需要修复</option>
            <option value="unusable">不可用</option>
            <option value="worth_retry">值得重试</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <button className={`btn-ghost ${viewMode === 'grid' ? 'border-primary-fixed-dim text-primary-fixed' : ''}`} onClick={() => setViewMode('grid')}>
              <Icon name="grid_view" />网格
            </button>
            <button className={`btn-ghost ${viewMode === 'list' ? 'border-primary-fixed-dim text-primary-fixed' : ''}`} onClick={() => setViewMode('list')}>
              <Icon name="view_list" />列表
            </button>
          </div>
        </div>

        {selectedIds.length ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 p-3 text-sm text-on-surface-variant">
            <span className="font-semibold text-primary">已选择 {selectedIds.length} 个资产</span>
            <select className="field min-w-48" value={batchTargetProjectId} onChange={(event) => setBatchTargetProjectId(event.target.value)}>
              <option value="">选择目标项目</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <button className="btn-ghost" onClick={batchMoveToProject}>批量移动</button>
            <button className="btn-ghost" onClick={batchFavorite}>批量收藏</button>
            <button className="btn-ghost" onClick={batchMigrate} disabled={migrating}>{migrating ? '迁移中...' : '迁移到对象存储'}</button>
            <button className="btn-ghost" onClick={batchDelete}>批量删除</button>
            <button className="btn-ghost" onClick={() => setSelectedIds([])}>取消选择</button>
          </div>
        ) : null}
      </div>

      {filtered.length ? (
        viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filtered.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                selected={selectedAsset?.id === asset.id}
                checked={selectedAssetIds.has(asset.id)}
                onCheckedChange={toggleSelection}
                onSelect={setSelectedAsset}
                onFavorite={toggleFavorite}
                onDownload={downloadAsset}
                onSendToVideo={() => handleSendToVideo(asset)}
                onViewTask={openTask}
              />
            ))}
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            {filtered.map((asset) => (
              <div key={asset.id} className="flex flex-col gap-3 border-b border-outline-variant/30 p-4 hover:bg-white/5 sm:flex-row sm:items-center">
                <input className="self-start" type="checkbox" checked={selectedAssetIds.has(asset.id)} onChange={(event) => toggleSelection(asset.id, event.target.checked)} />
                <button className="flex flex-1 items-center gap-4 text-left" onClick={() => setSelectedAsset(asset)}>
                  <img src={asset.thumbnail} alt={asset.title} className="h-20 w-28 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{asset.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">{asset.prompt}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">{asset.providerName} · {asset.model} · {asset.createdAt}</p>
                  </div>
                </button>
                <div className="flex flex-wrap gap-2">
                  <span className="chip">{asset.type === 'video' ? '视频' : asset.type === 'reference' ? '参考' : '图片'}</span>
                  {asset.type === 'video' ? <span className="chip">{asset.duration}s</span> : null}
                  <button className="btn-ghost px-3" onClick={() => toggleFavorite(asset.id)}><Icon name="star" /></button>
                  <button className="btn-ghost px-3" onClick={() => handleSendToVideo(asset)}><Icon name="movie" /></button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <EmptyState icon="inventory_2" title="没有匹配资产" text="调整筛选条件，或在图片/视频工作台创建 Mock 资产。" />
      )}

      {selectedAsset ? (
        <AssetDetailDrawer
          asset={selectedAsset}
          assets={assets}
          projectName={selectedProjectName}
          variant="drawer"
          onClose={() => setSelectedAsset(undefined)}
          onFavorite={toggleFavorite}
          onDelete={(assetId) => {
            if (!window.confirm('确认删除这个资产？这是前端 Mock 删除。')) return;
            deleteAsset(assetId);
          }}
          onDownload={downloadAsset}
          onRegenerate={() => regenerateAsset(selectedAsset)}
          onMockAction={(message) => showToast(message, 'success')}
          onViewTask={openTask}
          onSendToVideo={sendImageToVideo}
        />
      ) : null}
    </div>
  );
}
