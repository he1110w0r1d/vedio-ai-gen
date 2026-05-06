import { useApp } from '../context/AppContext';
import { SectionHeader, StatusBadge, Icon } from '../components/ui';
import { AssetCard } from '../components/AssetCard';

export function Dashboard() {
  const { assets, tasks, providers, projects, setView, setSelectedAsset, toggleFavorite, sendImageToVideo } = useApp();
  const running = tasks.filter((task) => task.status === 'running' || task.status === 'queued');
  const completed = tasks.filter((task) => task.status === 'completed').length;

  return (
    <div>
      <SectionHeader
        title="总览 Dashboard"
        subtitle="统一查看项目资产、供应商连接、生成任务与最近创作。"
        action={<button className="btn-primary" onClick={() => setView('image-studio')}><Icon name="add_circle" />新建图片任务</button>}
      />
      <div className="mb-5 grid gap-4 md:grid-cols-4">
        {[['项目数', projects.length, 'folder_open'], ['资产数', assets.length, 'inventory_2'], ['运行中任务', running.length, 'pending'], ['已完成任务', completed, 'check_circle']].map(([label, value, icon]) => (
          <div key={label} className="card">
            <Icon name={String(icon)} className="text-primary-fixed-dim" />
            <p className="mt-3 text-sm text-on-surface-variant">{label}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">进行中任务</h3>
            <button className="text-sm text-primary-fixed-dim" onClick={() => setView('tasks')}>查看全部</button>
          </div>
          <div className="space-y-3">
            {running.length ? running.slice(0, 3).map((task) => (
              <div key={task.id} className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{task.title}</p>
                    <p className="text-xs text-on-surface-variant">{task.providerName} · {task.model} · {task.projectName}</p>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
                <div className="mt-3 h-2 rounded-full bg-surface-container-high">
                  <div className="h-full rounded-full bg-primary-fixed-dim" style={{ width: `${task.progress}%` }} />
                </div>
              </div>
            )) : <p className="text-sm text-on-surface-variant">暂无运行中任务，生成图片或视频后会在这里显示。</p>}
          </div>
        </section>
        <section className="card">
          <h3 className="mb-4 text-xl font-bold">API 状态</h3>
          <div className="space-y-3">
            {providers.slice(0, 5).map((provider) => (
              <div key={provider.id} className="flex items-center justify-between rounded-xl bg-surface-container-low p-3">
                <span className="font-semibold">{provider.name}</span>
                <StatusBadge status={provider.status} />
              </div>
            ))}
          </div>
        </section>
      </div>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">最近生成资产</h3>
          <button className="text-sm text-primary-fixed-dim" onClick={() => setView('assets')}>进入资产库</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {assets.slice(0, 4).map((asset) => (
            <AssetCard key={asset.id} asset={asset} onSelect={setSelectedAsset} onFavorite={toggleFavorite} onSendToVideo={(id) => sendImageToVideo(id, 'i2v-first')} />
          ))}
        </div>
      </section>
    </div>
  );
}
