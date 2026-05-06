import { useApp } from '../context/AppContext';
import type { ViewId } from '../types';
import { Icon } from './ui';

const nav: { id: ViewId; label: string; icon: string }[] = [
  { id: 'dashboard', label: '总览', icon: 'dashboard' },
  { id: 'projects', label: '项目', icon: 'folder_open' },
  { id: 'image-studio', label: '图片生成', icon: 'image' },
  { id: 'video-studio', label: '视频生成', icon: 'movie' },
  { id: 'assets', label: '资产库', icon: 'inventory_2' },
  { id: 'tasks', label: '任务中心', icon: 'task' },
  { id: 'providers', label: '供应商与 API', icon: 'api' },
  { id: 'templates', label: '模板库', icon: 'description' },
  { id: 'settings', label: '设置', icon: 'settings' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { view, setView, projects, currentProject, setCurrentProjectId, globalSearch, setGlobalSearch, providers, toasts } = useApp();
  const connected = providers.filter((provider) => provider.status === 'connected').length;

  return (
    <div className="min-h-screen bg-black text-on-surface">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[280px] flex-col border-r border-outline-variant/30 bg-surface-dim px-4 py-6 backdrop-blur-xl lg:flex">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary-container/30 bg-primary-container/15">
            <Icon name="auto_awesome" className="text-primary-fixed-dim" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary-container">API Asset Studio</h1>
            <p className="text-xs text-on-surface-variant">BYOK 创作工作台</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${view === item.id ? 'border-r-2 border-primary-fixed-dim bg-primary-container/10 font-bold text-primary-fixed-dim' : 'text-on-surface-variant hover:bg-white/5 hover:text-primary-fixed'}`}
            >
              <Icon name={item.icon} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="card p-4 text-center">
          <Icon name="account_balance_wallet" className="mb-2 block text-3xl text-primary-fixed-dim" />
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">BYOK 成本提示</p>
          <p className="mt-1 text-xs text-on-surface-variant">调用费用由用户自己的供应商账户承担。</p>
        </div>
      </aside>
      <header className="sticky top-0 z-30 border-b border-outline-variant/30 bg-surface/85 px-4 py-3 backdrop-blur-xl lg:ml-[280px] lg:px-8">
        <div className="mx-auto flex max-w-studio flex-wrap items-center gap-3">
          <select value={currentProject.id} onChange={(event) => setCurrentProjectId(event.target.value)} className="field w-52">
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <div className="relative min-w-[240px] flex-1">
            <Icon name="search" className="pointer-events-none absolute left-3 top-2.5 text-on-surface-variant" />
            <input className="field pl-10" value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="全局搜索资产、任务、模板..." />
          </div>
          <div className="flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container px-3 py-2 text-xs text-on-surface-variant">
            <span className="h-2 w-2 rounded-full bg-[#00ff9d]" />
            API 已连接 {connected}
          </div>
          <button className="btn-ghost px-3"><Icon name="notifications" /></button>
          <div className="h-9 w-9 overflow-hidden rounded-full border border-outline-variant/60 bg-gradient-to-br from-primary-fixed-dim to-secondary-container" />
        </div>
      </header>
      <main className="lg:ml-[280px]">
        <div className="mx-auto max-w-studio px-4 py-6 lg:px-8">{children}</div>
      </main>
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div key={toast.id} className={`rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl ${toast.tone === 'success' ? 'border-[#00ff9d]/30 bg-[#07130d] text-[#b8ffd9]' : toast.tone === 'error' ? 'border-error/30 bg-error-container/70 text-error' : 'border-primary-fixed-dim/30 bg-surface-container text-on-surface'}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
