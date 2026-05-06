import type { ViewId } from '../../types';
import { Icon } from '../common/Icon';

export const navItems: { id: ViewId; label: string; icon: string }[] = [
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

export function Sidebar({ view, onNavigate }: { view: ViewId; onNavigate: (view: ViewId) => void }) {
  return (
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
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
              view === item.id
                ? 'border-r-2 border-primary-fixed-dim bg-primary-container/10 font-bold text-primary-fixed-dim'
                : 'text-on-surface-variant hover:bg-white/5 hover:text-primary-fixed'
            }`}
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
  );
}
