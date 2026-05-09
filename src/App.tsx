import { Layout } from './components/Layout';
import { useApp } from './context/AppContext';
import { AssetLibrary } from './pages/AssetLibrary';
import { Dashboard } from './pages/Dashboard';
import { ImageStudio } from './pages/ImageStudio';
import { Projects } from './pages/Projects';
import { Providers } from './pages/Providers';
import { Settings } from './pages/Settings';
import { TaskCenter } from './pages/TaskCenter';
import { Templates } from './pages/Templates';
import { VideoStudio } from './pages/VideoStudio';
import { Usage } from './pages/Usage';
import { ProviderBenchmark } from './pages/ProviderBenchmark';
import { Benchmarks } from './pages/Benchmarks';

export default function App() {
  const { view, isBootstrapping, bootstrapError, refreshFromServer } = useApp();
  const pages = {
    dashboard: <Dashboard />,
    projects: <Projects />,
    'image-studio': <ImageStudio />,
    'video-studio': <VideoStudio />,
    assets: <AssetLibrary />,
    tasks: <TaskCenter />,
    usage: <Usage />,
    'provider-benchmark': <ProviderBenchmark />,
    benchmarks: <Benchmarks />,
    providers: <Providers />,
    templates: <Templates />,
    settings: <Settings />,
  };

  if (isBootstrapping) {
    return (
      <Layout>
        <div className="card flex min-h-64 items-center justify-center text-on-surface-variant">
          正在连接本地后端并同步数据...
        </div>
      </Layout>
    );
  }

  if (bootstrapError) {
    return (
      <Layout>
        <div className="card max-w-2xl">
          <h2 className="text-2xl font-bold text-error">无法连接本地后端服务</h2>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            请确认 server 已启动，并检查 VITE_API_BASE_URL 配置。当前 real mode 需要后端作为 providers、tasks 和 assets 的主要数据源。
          </p>
          <p className="mt-3 rounded-xl border border-outline-variant/40 bg-surface-container p-3 text-xs text-on-surface-variant">
            如需切回 Mock 模式，请使用 VITE_API_MODE=mock 重新启动前端。
          </p>
          <button className="btn-primary mt-5" onClick={refreshFromServer}>重新连接</button>
        </div>
      </Layout>
    );
  }

  return <Layout>{pages[view]}</Layout>;
}
