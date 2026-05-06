import { useMemo, useState } from 'react';
import { AssetCard } from '../components/AssetCard';
import { EmptyState, Icon, SectionHeader } from '../components/ui';
import { useApp } from '../context/AppContext';
import type { AssetType } from '../types';

export function AssetLibrary() {
  const { assets, projects, providers, globalSearch, selectedAsset, setSelectedAsset, toggleFavorite, deleteAsset, sendImageToVideo, showToast } = useApp();
  const [type, setType] = useState<'all' | AssetType | 'favorite'>('all');
  const [projectId, setProjectId] = useState('all');
  const [providerId, setProviderId] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtered = useMemo(() => assets.filter((asset) => {
    const matchType = type === 'all' || (type === 'favorite' ? asset.favorite : asset.type === type);
    const matchProject = projectId === 'all' || asset.projectId === projectId;
    const matchProvider = providerId === 'all' || asset.providerId === providerId;
    const matchSearch = !globalSearch || `${asset.title}${asset.prompt}${asset.model}`.toLowerCase().includes(globalSearch.toLowerCase());
    return matchType && matchProject && matchProvider && matchSearch;
  }), [assets, type, projectId, providerId, globalSearch]);

  return (
    <div>
      <SectionHeader title="资产库 Asset Library" subtitle="统一管理图片、视频、参考素材与收藏资产。" action={<button className="btn-primary"><Icon name="upload" />导入素材（Mock）</button>} />
      <div className="card mb-5">
        <div className="flex flex-wrap gap-2">
          {[
            ['all', '全部'],
            ['image', '图片'],
            ['video', '视频'],
            ['reference', '参考素材'],
            ['favorite', '收藏'],
          ].map(([id, label]) => <button key={id} className={`btn-ghost ${type === id ? 'border-primary-fixed-dim text-primary-fixed' : ''}`} onClick={() => setType(id as typeof type)}>{label}</button>)}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <select className="field" value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="all">全部项目</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
          <select className="field" value={providerId} onChange={(event) => setProviderId(event.target.value)}><option value="all">全部供应商</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select>
          <select className="field"><option>全部模型</option><option>Imagen</option><option>Gen-4</option></select>
          <select className="field"><option>全部时间</option><option>今天</option><option>近 7 天</option></select>
          <div className="grid grid-cols-2 gap-2"><button className="btn-ghost" onClick={() => setViewMode('grid')}>网格</button><button className="btn-ghost" onClick={() => setViewMode('list')}>列表</button></div>
        </div>
        {selectedIds.length ? <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant"><span>已选择 {selectedIds.length} 个</span><button className="btn-ghost">批量下载</button><button className="btn-ghost" onClick={() => { selectedIds.forEach(deleteAsset); setSelectedIds([]); }}>批量删除</button></div> : null}
      </div>
      {filtered.length ? (
        viewMode === 'grid' ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{filtered.map((asset) => <div key={asset.id} className="relative"><label className="absolute right-3 top-3 z-10 rounded-full bg-black/70 p-2"><input type="checkbox" checked={selectedIds.includes(asset.id)} onChange={(event) => setSelectedIds((items) => event.target.checked ? [...items, asset.id] : items.filter((id) => id !== asset.id))} /></label><AssetCard asset={asset} selected={selectedAsset?.id === asset.id} onSelect={setSelectedAsset} onFavorite={toggleFavorite} onSendToVideo={(id) => sendImageToVideo(id, 'i2v-first')} /></div>)}</div>
          : <div className="card overflow-hidden p-0">{filtered.map((asset) => <button key={asset.id} className="flex w-full items-center gap-4 border-b border-outline-variant/30 p-4 text-left hover:bg-white/5" onClick={() => setSelectedAsset(asset)}><img src={asset.thumbnail} alt={asset.title} className="h-16 w-24 rounded-lg object-cover" /><div className="flex-1"><p className="font-semibold">{asset.title}</p><p className="text-sm text-on-surface-variant">{asset.providerName} · {asset.model} · {asset.createdAt}</p></div><span className="chip">{asset.type}</span></button>)}</div>
      ) : <EmptyState icon="inventory_2" title="没有匹配资产" text="调整筛选条件，或在图片/视频工作台创建 Mock 资产。" />}
      {selectedAsset ? (
        <aside className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-md overflow-auto border-l border-outline-variant/40 bg-surface p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-bold">资产详情</h3><button className="btn-ghost px-3" onClick={() => setSelectedAsset(undefined)}><Icon name="close" /></button></div>
          <img src={selectedAsset.thumbnail} alt={selectedAsset.title} className="aspect-video w-full rounded-2xl object-cover" />
          <div className="mt-4 space-y-4">
            <div><h4 className="text-lg font-bold">{selectedAsset.title}</h4><p className="mt-1 text-sm text-on-surface-variant">{selectedAsset.prompt}</p></div>
            <div className="grid grid-cols-2 gap-3 text-sm text-on-surface-variant"><span>供应商：{selectedAsset.providerName}</span><span>模型：{selectedAsset.model}</span><span>项目：{projects.find((project) => project.id === selectedAsset.projectId)?.name}</span><span>创建：{selectedAsset.createdAt}</span><span>任务：{selectedAsset.taskId ?? 'Mock 初始资产'}</span><span>参数：{Object.values(selectedAsset.params).join(' / ')}</span></div>
            <div className="grid grid-cols-2 gap-2"><button className="btn-ghost" onClick={() => toggleFavorite(selectedAsset.id)}>收藏</button><button className="btn-ghost" onClick={() => showToast('下载为 Mock 操作', 'info')}>下载</button><button className="btn-ghost" onClick={() => deleteAsset(selectedAsset.id)}>删除</button><button className="btn-primary" onClick={() => selectedAsset.type === 'video' ? showToast('已 Mock 截取首帧/尾帧', 'success') : sendImageToVideo(selectedAsset.id, 'i2v-first')}>{selectedAsset.type === 'video' ? '截取首帧/尾帧' : '发送到视频生成'}</button></div>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
