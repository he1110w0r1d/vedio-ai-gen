import { useEffect } from 'react';
import type { ViewId } from '../../types';
import { Icon } from '../common/Icon';
import { navItems } from './Sidebar';

export function MobileNavDrawer({
  open,
  view,
  onNavigate,
  onClose,
}: {
  open: boolean;
  view: ViewId;
  onNavigate: (view: ViewId) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] lg:hidden">
      <button className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-label="关闭移动端导航" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-[min(86vw,320px)] flex-col border-r border-outline-variant/40 bg-surface-dim px-4 py-5 shadow-2xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-container/30 bg-primary-container/15">
              <Icon name="auto_awesome" className="text-primary-fixed-dim" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary-container">API Asset Studio</h2>
              <p className="text-xs text-on-surface-variant">BYOK 创作工作台</p>
            </div>
          </div>
          <button className="btn-ghost px-3" onClick={onClose} aria-label="关闭移动端导航">
            <Icon name="close" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                onClose();
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${
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
        <div className="mt-4 rounded-2xl border border-outline-variant/40 bg-surface-container-low p-4 text-sm text-on-surface-variant">
          <p className="font-semibold text-on-surface">移动端提示</p>
          <p className="mt-1 text-xs">当前版本以桌面工作台为主，小屏可完成浏览、筛选和任务查看。</p>
        </div>
      </aside>
    </div>
  );
}
