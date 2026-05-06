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

export default function App() {
  const { view } = useApp();
  const pages = {
    dashboard: <Dashboard />,
    projects: <Projects />,
    'image-studio': <ImageStudio />,
    'video-studio': <VideoStudio />,
    assets: <AssetLibrary />,
    tasks: <TaskCenter />,
    providers: <Providers />,
    templates: <Templates />,
    settings: <Settings />,
  };

  return <Layout>{pages[view]}</Layout>;
}
