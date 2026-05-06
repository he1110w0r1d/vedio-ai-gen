import type { Project } from '../../types';
import { Icon } from '../common/Icon';
import { SearchInput } from '../common/SearchInput';

export function TopHeader({
  projects,
  currentProject,
  onProjectChange,
  globalSearch,
  onGlobalSearchChange,
  connectedProviderCount,
  onOpenMobileNav,
}: {
  projects: Project[];
  currentProject: Project;
  onProjectChange: (projectId: string) => void;
  globalSearch: string;
  onGlobalSearchChange: (value: string) => void;
  connectedProviderCount: number;
  onOpenMobileNav: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-outline-variant/30 bg-surface/85 px-4 py-3 backdrop-blur-xl lg:ml-[280px] lg:px-8">
      <div className="mx-auto flex max-w-studio flex-wrap items-center gap-3">
        <button className="btn-ghost px-3 lg:hidden" onClick={onOpenMobileNav} aria-label="打开移动端导航">
          <Icon name="menu" />
        </button>
        <select value={currentProject.id} onChange={(event) => onProjectChange(event.target.value)} className="field w-full min-w-0 flex-1 sm:w-52 sm:flex-none">
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <div className="order-last w-full md:order-none md:min-w-[260px] md:flex-1">
          <SearchInput value={globalSearch} onChange={onGlobalSearchChange} placeholder="全局搜索资产、任务、模板..." />
        </div>
        <div className="flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container px-3 py-2 text-xs text-on-surface-variant">
          <span className="h-2 w-2 rounded-full bg-[#00ff9d]" />
          API 已连接 {connectedProviderCount}
        </div>
        <button className="btn-ghost px-3">
          <Icon name="notifications" />
        </button>
        <div className="h-9 w-9 overflow-hidden rounded-full border border-outline-variant/60 bg-gradient-to-br from-primary-fixed-dim to-secondary-container" />
      </div>
    </header>
  );
}
