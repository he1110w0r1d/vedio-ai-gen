import { useApp } from '../../context/AppContext';
import { ToastStack } from '../common/Toast';
import { PageContainer } from './PageContainer';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';

export function Layout({ children }: { children: React.ReactNode }) {
  const { view, setView, projects, currentProject, setCurrentProjectId, globalSearch, setGlobalSearch, providers, toasts } = useApp();
  const connected = providers.filter((provider) => provider.status === 'connected').length;

  return (
    <div className="min-h-screen bg-black text-on-surface">
      <Sidebar view={view} onNavigate={setView} />
      <TopHeader
        projects={projects}
        currentProject={currentProject}
        onProjectChange={setCurrentProjectId}
        globalSearch={globalSearch}
        onGlobalSearchChange={setGlobalSearch}
        connectedProviderCount={connected}
      />
      <PageContainer>{children}</PageContainer>
      <ToastStack toasts={toasts} />
    </div>
  );
}
