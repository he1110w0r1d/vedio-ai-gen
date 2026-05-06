import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadServerBootstrapData } from '../api/appBootstrapApi';
import { assetApi } from '../api/assetApi';
import { API_MODE, shouldUseMockApi } from '../api/client';
import { providerApi } from '../api/providerApi';
import { taskApi } from '../api/taskApi';
import { createVideoAsset } from '../services/mockService';
import { loadAppState, loadUiState, saveAppState, saveUiState } from '../services/storageService';
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
  isBootstrapping: boolean;
  bootstrapError?: string;
  refreshFromServer: () => Promise<void>;
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
  addCustomProvider: (input: { name: string; providerType?: string; baseUrl: string; defaultModel: string; apiKey: string; capabilities: ProviderCapability[] }) => void;
  addTemplate: (template: PromptTemplate) => void;
  updateTemplate: (template: PromptTemplate) => void;
  deleteTemplate: (templateId: string) => void;
  resetHistory: () => void;
  deleteAllKeys: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [initialState] = useState(loadAppState);
  const [initialUiState] = useState(loadUiState);
  const isMockMode = shouldUseMockApi();
  const [view, setViewState] = useState<ViewId>(() => resolveHashView());
  const [projects] = useState(initialState.projects);
  const [currentProjectId, setCurrentProjectId] = useState(isMockMode ? initialState.currentProjectId : initialUiState.currentProjectId);
  const [providers, setProviders] = useState(isMockMode ? initialState.providers : []);
  const [assets, setAssets] = useState<Asset[]>(isMockMode ? initialState.assets : []);
  const [tasks, setTasks] = useState<GenerationTask[]>(isMockMode ? initialState.tasks : []);
  const [templates, setTemplates] = useState(initialState.promptTemplates);
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const [videoSeed, setVideoSeed] = useState<VideoSeed | undefined>(isMockMode ? initialState.selectedVideoInput : initialUiState.selectedVideoInput);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(API_MODE === 'real');
  const [bootstrapError, setBootstrapError] = useState<string | undefined>(undefined);

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

  const refreshFromServer = async () => {
    if (isMockMode) return;
    setIsBootstrapping(true);
    setBootstrapError(undefined);
    try {
      const data = await loadServerBootstrapData();
      setProviders(data.providers);
      setAssets(data.assets);
      setTasks(data.tasks);
    } catch (error) {
      const message = error instanceof Error ? error.message : '无法连接本地后端服务';
      setBootstrapError(message);
    } finally {
      setIsBootstrapping(false);
    }
  };

  useEffect(() => {
    const syncViewFromHash = () => setViewState(resolveHashView());
    syncViewFromHash();
    window.addEventListener('hashchange', syncViewFromHash);
    return () => window.removeEventListener('hashchange', syncViewFromHash);
  }, []);

  useEffect(() => {
    if (isMockMode) return;
    refreshFromServer();
  }, []);

  useEffect(() => {
    if (!isMockMode) return;
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
  }, [isMockMode, providers, assets, tasks, templates, projects, currentProjectId, videoSeed]);

  useEffect(() => {
    if (isMockMode) return;
    saveUiState({
      version: 1,
      currentProjectId,
      selectedVideoInput: videoSeed,
    });
  }, [isMockMode, currentProjectId, videoSeed]);

  useEffect(() => {
    if (!isMockMode) return;
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
  }, [isMockMode]);

  useEffect(() => {
    if (!isMockMode) return;
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
  }, [isMockMode, tasks, assets]);

  useEffect(() => {
    if (isMockMode) return;
    const hasActiveTasks = tasks.some((task) => ['queued', 'running'].includes(task.status));
    if (!hasActiveTasks) return;

    const timer = window.setInterval(async () => {
      try {
        const [nextTasks, nextAssets] = await Promise.all([
          taskApi.listTasks([]),
          assetApi.listAssets([]),
        ]);
        setTasks(nextTasks);
        setAssets(nextAssets);
      } catch (error) {
        setBootstrapError(error instanceof Error ? error.message : '任务轮询失败');
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [isMockMode, tasks]);

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
      isBootstrapping,
      bootstrapError,
      refreshFromServer,
      showToast,
      addAssets: (items) => {
        setAssets((existing) => {
          const existingIds = new Set(existing.map((item) => item.id));
          return [...items.filter((item) => !existingIds.has(item.id)), ...existing];
        });
        setSelectedAsset(items[0]);
      },
      toggleFavorite: (assetId) => {
        const target = assets.find((asset) => asset.id === assetId);
        if (!target) return;
        assetApi.favoriteAsset(target).then((updated) => {
          setAssets((items) => items.map((asset) => (asset.id === assetId ? updated : asset)));
        });
      },
      deleteAsset: (assetId) => {
        assetApi.deleteAsset(assetId).then(() => {
          setAssets((items) => items.filter((asset) => asset.id !== assetId));
          setSelectedAsset(undefined);
          showToast('资产已删除', 'success');
        });
      },
      sendImageToVideo: (assetId, usage) => {
        setVideoSeed({ assetId, usage });
        setView('video-studio');
        showToast('素材已带入视频生成工作台', 'success');
      },
      addTask: (task) => {
        setTasks((items) => [task, ...items.filter((item) => item.id !== task.id)]);
        showToast('Mock 生成任务已创建', 'success');
      },
      updateTask: (taskId, patch) => setTasks((items) => items.map((task) => (task.id === taskId ? { ...task, ...patch } : task))),
      retryTask: (taskId) => {
        const target = tasks.find((task) => task.id === taskId);
        if (!target) return;
        taskApi.retryTask(target).then((updated) => {
          setTasks((items) => items.map((task) => (task.id === taskId ? updated : task)));
          showToast('任务已重新排队', 'success');
        });
      },
      cancelTask: (taskId) => {
        const target = tasks.find((task) => task.id === taskId);
        if (!target) return;
        taskApi.cancelTask(target).then((updated) => {
          setTasks((items) => items.map((task) => (task.id === taskId ? updated : task)));
          showToast('任务已取消', 'info');
        });
      },
      upsertProvider: (provider) => {
        providerApi.updateProvider(provider).then((updated) => {
          setProviders((items) => items.map((item) => (item.id === updated.id ? updated : item)));
        });
      },
      deleteProviderKey: (providerId) => {
        const target = providers.find((provider) => provider.id === providerId);
        if (!target) return;
        providerApi.deleteProviderKey(target).then((updated) => {
          setProviders((items) => items.map((item) => (item.id === providerId ? updated : item)));
          showToast('API Key 已删除，仅清除了前端模拟数据', 'success');
        });
      },
      testProvider: (providerId) => {
        setProviders((items) => items.map((item) => (item.id === providerId ? { ...item, status: 'testing' } : item)));
        const target = providers.find((provider) => provider.id === providerId);
        if (!target) return;
        window.setTimeout(() => {
          providerApi.testProvider(target).then((result) => {
            setProviders((items) => items.map((item) => (item.id === providerId ? { ...item, status: result.status } : item)));
          showToast('连接测试完成：这是 Mock 结果', 'success');
          });
        }, 800);
      },
      setDefaultProvider: (providerId) => {
        setProviders((items) => items.map((item) => ({ ...item, isDefault: item.id === providerId })));
        showToast('默认供应商已更新', 'success');
      },
      addCustomProvider: (input) => {
        providerApi.createProvider(input).then((provider) => {
          setProviders((items) => [provider, ...items]);
          showToast('自定义供应商已添加', 'success');
        });
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
    [view, projects, currentProject, providers, assets, tasks, templates, globalSearch, selectedAsset, videoSeed, toasts, isBootstrapping, bootstrapError],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
