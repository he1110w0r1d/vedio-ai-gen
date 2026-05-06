import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createVideoAsset, maskKey } from '../services/mockService';
import { loadAppState, saveAppState } from '../services/storageService';
import { getCompletedVideoTasksNeedingAssets, markVideoAssetsCreated } from '../services/taskService';
import type { Asset, GenerationTask, Project, PromptTemplate, Provider, ProviderCapability, VideoSeed, ViewId } from '../types';
import { resolveHashView } from '../utils/navigation';

type Toast = { id: string; tone: 'success' | 'error' | 'info'; message: string };

type AppContextValue = {
  view: ViewId;
  setView: (view: ViewId) => void;
  projects: Project[];
  currentProject: Project;
  setCurrentProjectId: (id: string) => void;
  providers: Provider[];
  assets: Asset[];
  tasks: GenerationTask[];
  templates: PromptTemplate[];
  globalSearch: string;
  setGlobalSearch: (value: string) => void;
  selectedAsset?: Asset;
  setSelectedAsset: (asset?: Asset) => void;
  videoSeed?: VideoSeed;
  consumeVideoSeed: () => VideoSeed | undefined;
  toasts: Toast[];
  showToast: (message: string, tone?: Toast['tone']) => void;
  addAssets: (items: Asset[]) => void;
  toggleFavorite: (assetId: string) => void;
  deleteAsset: (assetId: string) => void;
  sendImageToVideo: (assetId: string, usage: VideoSeed['usage']) => void;
  addTask: (task: GenerationTask) => void;
  updateTask: (taskId: string, patch: Partial<GenerationTask>) => void;
  retryTask: (taskId: string) => void;
  cancelTask: (taskId: string) => void;
  upsertProvider: (provider: Provider) => void;
  deleteProviderKey: (providerId: string) => void;
  testProvider: (providerId: string) => void;
  setDefaultProvider: (providerId: string) => void;
  addCustomProvider: (input: { name: string; baseUrl: string; defaultModel: string; apiKey: string; capabilities: ProviderCapability[] }) => void;
  addTemplate: (template: PromptTemplate) => void;
  updateTemplate: (template: PromptTemplate) => void;
  deleteTemplate: (templateId: string) => void;
  resetHistory: () => void;
  deleteAllKeys: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [initialState] = useState(loadAppState);
  const [view, setViewState] = useState<ViewId>(() => resolveHashView());
  const [projects] = useState(initialState.projects);
  const [currentProjectId, setCurrentProjectId] = useState(initialState.currentProjectId);
  const [providers, setProviders] = useState(initialState.providers);
  const [assets, setAssets] = useState(initialState.assets);
  const [tasks, setTasks] = useState(initialState.tasks);
  const [templates, setTemplates] = useState(initialState.promptTemplates);
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const [videoSeed, setVideoSeed] = useState<VideoSeed | undefined>(initialState.selectedVideoInput);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const currentProject = projects.find((project) => project.id === currentProjectId) ?? projects[0] ?? initialState.projects[0];

  const setView = (next: ViewId) => {
    setViewState(next);
    if (window.location.hash !== `#${next}`) window.location.hash = next;
  };

  const showToast = (message: string, tone: Toast['tone'] = 'info') => {
    const toast = { id: Math.random().toString(36).slice(2), tone, message };
    setToasts((items) => [...items, toast]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== toast.id)), 2600);
  };

  useEffect(() => {
    const syncViewFromHash = () => setViewState(resolveHashView());
    syncViewFromHash();
    window.addEventListener('hashchange', syncViewFromHash);
    return () => window.removeEventListener('hashchange', syncViewFromHash);
  }, []);

  useEffect(() => {
    saveAppState({
      version: 1,
      providers,
      assets,
      tasks,
      promptTemplates: templates,
      projects,
      currentProjectId,
      selectedVideoInput: videoSeed,
    });
  }, [providers, assets, tasks, templates, projects, currentProjectId, videoSeed]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTasks((items) =>
        items.map((task) => {
          if (task.status === 'queued') return { ...task, status: 'running', progress: 8 };
          if (task.status !== 'running') return task;
          const nextProgress = Math.min(100, task.progress + 12 + Math.round(Math.random() * 14));
          return { ...task, progress: nextProgress, status: nextProgress >= 100 ? 'completed' : 'running' };
        }),
      );
    }, 1200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const completedVideoTasks = getCompletedVideoTasksNeedingAssets(tasks, assets);
    if (!completedVideoTasks.length) return;

    let createdCount = 0;
    setAssets((items) => {
      const newAssets = completedVideoTasks
        .filter((task) => !items.some((asset) => asset.type === 'video' && asset.taskId === task.id))
        .map((task) => {
          createdCount += 1;
          return createVideoAsset(task);
        });
      return newAssets.length ? [...newAssets, ...items] : items;
    });
    setTasks((items) => markVideoAssetsCreated(items, completedVideoTasks));
    if (createdCount) showToast('视频 Mock 任务已完成，资产已加入资产库', 'success');
  }, [tasks, assets]);

  const value = useMemo<AppContextValue>(
    () => ({
      view,
      setView,
      projects,
      currentProject,
      setCurrentProjectId,
      providers,
      assets,
      tasks,
      templates,
      globalSearch,
      setGlobalSearch,
      selectedAsset,
      setSelectedAsset,
      videoSeed,
      consumeVideoSeed: () => {
        const seed = videoSeed;
        setVideoSeed(undefined);
        return seed;
      },
      toasts,
      showToast,
      addAssets: (items) => {
        setAssets((existing) => [...items, ...existing]);
        setSelectedAsset(items[0]);
      },
      toggleFavorite: (assetId) => setAssets((items) => items.map((asset) => (asset.id === assetId ? { ...asset, favorite: !asset.favorite } : asset))),
      deleteAsset: (assetId) => {
        setAssets((items) => items.filter((asset) => asset.id !== assetId));
        setSelectedAsset(undefined);
        showToast('资产已删除', 'success');
      },
      sendImageToVideo: (assetId, usage) => {
        setVideoSeed({ assetId, usage });
        setView('video-studio');
        showToast('素材已带入视频生成工作台', 'success');
      },
      addTask: (task) => {
        setTasks((items) => [task, ...items]);
        showToast('Mock 生成任务已创建', 'success');
      },
      updateTask: (taskId, patch) => setTasks((items) => items.map((task) => (task.id === taskId ? { ...task, ...patch } : task))),
      retryTask: (taskId) => {
        setTasks((items) => items.map((task) => (task.id === taskId ? { ...task, status: 'queued', progress: 0, errorReason: undefined } : task)));
        showToast('任务已重新排队', 'success');
      },
      cancelTask: (taskId) => {
        setTasks((items) => items.map((task) => (task.id === taskId ? { ...task, status: 'canceled', progress: 0 } : task)));
        showToast('任务已取消', 'info');
      },
      upsertProvider: (provider) => setProviders((items) => items.map((item) => (item.id === provider.id ? provider : item))),
      deleteProviderKey: (providerId) => {
        setProviders((items) => items.map((item) => (item.id === providerId ? { ...item, apiKeyMasked: undefined, status: 'unconfigured' } : item)));
        showToast('API Key 已删除，仅清除了前端模拟数据', 'success');
      },
      testProvider: (providerId) => {
        setProviders((items) => items.map((item) => (item.id === providerId ? { ...item, status: 'testing' } : item)));
        window.setTimeout(() => {
          setProviders((items) => items.map((item) => (item.id === providerId ? { ...item, status: item.apiKeyMasked ? 'connected' : 'failed' } : item)));
          showToast('连接测试完成：这是 Mock 结果', 'success');
        }, 800);
      },
      setDefaultProvider: (providerId) => {
        setProviders((items) => items.map((item) => ({ ...item, isDefault: item.id === providerId })));
        showToast('默认供应商已更新', 'success');
      },
      addCustomProvider: (input) => {
        setProviders((items) => [
          {
            id: `custom_${Date.now()}`,
            name: input.name,
            baseUrl: input.baseUrl,
            defaultModel: input.defaultModel,
            apiKeyMasked: maskKey(input.apiKey),
            capabilities: input.capabilities,
            status: input.apiKey ? 'connected' : 'unconfigured',
          },
          ...items,
        ]);
        showToast('自定义供应商已添加', 'success');
      },
      addTemplate: (template) => setTemplates((items) => [template, ...items]),
      updateTemplate: (template) => setTemplates((items) => items.map((item) => (item.id === template.id ? template : item))),
      deleteTemplate: (templateId) => setTemplates((items) => items.filter((item) => item.id !== templateId)),
      resetHistory: () => {
        setTasks([]);
        setAssets([]);
        setSelectedAsset(undefined);
        showToast('生成历史已清空', 'success');
      },
      deleteAllKeys: () => {
        setProviders((items) => items.map((item) => ({ ...item, apiKeyMasked: undefined, status: 'unconfigured', isDefault: false })));
        showToast('所有 API Key 已从前端模拟状态中删除', 'success');
      },
    }),
    [view, projects, currentProject, providers, assets, tasks, templates, globalSearch, selectedAsset, videoSeed, toasts],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
