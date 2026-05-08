import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadServerBootstrapData } from '../api/appBootstrapApi';
import { assetApi } from '../api/assetApi';
import { API_MODE, shouldUseMockApi } from '../api/client';
import { providerApi } from '../api/providerApi';
import { projectApi } from '../api/projectApi';
import { promptTemplateApi } from '../api/promptTemplateApi';
import { taskApi } from '../api/taskApi';
import { workspaceApi } from '../api/workspaceApi';
import { createVideoAsset } from '../services/mockService';
import { defaultWorkspace, loadAppState, loadUiState, saveAppState, saveUiState } from '../services/storageService';
import { getCompletedVideoTasksNeedingAssets, markVideoAssetsCreated } from '../services/taskService';
import type { Asset, GenerationTask, PendingPromptInput, Project, PromptTemplate, Provider, ProviderCapability, VideoSeed, ViewId, WorkspaceProfile } from '../types';
import { resolveHashView } from '../utils/navigation';

type Toast = { id: string; tone: 'success' | 'error' | 'info'; message: string };

type AppContextValue = {
  view: ViewId;
  setView: (view: ViewId) => void;
  projects: Project[];
  currentProject: Project;
  setCurrentProjectId: (id: string) => void;
  workspace: WorkspaceProfile;
  updateWorkspace: (input: Partial<WorkspaceProfile>) => Promise<void>;
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
  pendingPromptInput?: PendingPromptInput;
  setPendingPromptInput: (input?: PendingPromptInput) => void;
  consumePendingPromptInput: () => PendingPromptInput | undefined;
  toasts: Toast[];
  isBootstrapping: boolean;
  bootstrapError?: string;
  refreshFromServer: () => Promise<void>;
  showToast: (message: string, tone?: Toast['tone']) => void;
  addAssets: (items: Asset[]) => void;
  toggleFavorite: (assetId: string) => void;
  deleteAsset: (assetId: string) => void;
  downloadAsset: (assetId: string) => void;
  sendImageToVideo: (assetId: string, usage: VideoSeed['usage']) => void;
  addTask: (task: GenerationTask) => void;
  updateTask: (taskId: string, patch: Partial<GenerationTask>) => void;
  retryTask: (taskId: string) => void;
  cancelTask: (taskId: string) => void;
  upsertProvider: (provider: Provider) => void;
  deleteProviderKey: (providerId: string) => void;
  deleteProvider: (providerId: string) => void;
  testProvider: (providerId: string) => void;
  setDefaultProvider: (providerId: string) => void;
  addCustomProvider: (input: { name: string; providerType?: string; baseUrl: string; defaultModel: string; apiKey: string; capabilities: ProviderCapability[] }) => void;
  createProject: (input: Partial<Project>) => void;
  updateProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
  archiveProject: (projectId: string) => void;
  favoriteProject: (projectId: string) => void;
  moveProjectAssets: (sourceProjectId: string, targetProjectId: string, assetIds?: string[]) => Promise<void>;
  exportProjectArchive: (projectId: string, options: { includeFiles: boolean; includeTasks: boolean; includeTemplates: boolean }) => Promise<void>;
  addTemplate: (template: PromptTemplate) => void;
  updateTemplate: (template: PromptTemplate) => void;
  deleteTemplate: (templateId: string) => void;
  duplicateTemplate: (templateId: string) => void;
  usePromptTemplate: (templateId: string) => Promise<void>;
  resetHistory: () => void;
  deleteAllKeys: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [initialState] = useState(loadAppState);
  const [initialUiState] = useState(loadUiState);
  const isMockMode = shouldUseMockApi();
  const [view, setViewState] = useState<ViewId>(() => resolveHashView());
  const [projects, setProjects] = useState(initialState.projects);
  const [currentProjectId, setCurrentProjectId] = useState(isMockMode ? initialState.currentProjectId : initialUiState.currentProjectId);
  const [workspace, setWorkspace] = useState<WorkspaceProfile>(isMockMode ? initialState.workspace ?? defaultWorkspace : initialUiState.workspace ?? defaultWorkspace);
  const [providers, setProviders] = useState(isMockMode ? initialState.providers : []);
  const [assets, setAssets] = useState<Asset[]>(isMockMode ? initialState.assets : []);
  const [tasks, setTasks] = useState<GenerationTask[]>(isMockMode ? initialState.tasks : []);
  const [templates, setTemplates] = useState(initialState.promptTemplates);
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const [videoSeed, setVideoSeed] = useState<VideoSeed | undefined>(isMockMode ? initialState.selectedVideoInput : initialUiState.selectedVideoInput);
  const [pendingPromptInput, setPendingPromptInputState] = useState<PendingPromptInput | undefined>(undefined);
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
      setProjects(data.projects);
      setTemplates(data.promptTemplates);
      setWorkspace(data.workspace);
      const validProject = data.projects.find((project) => project.id === currentProjectId);
      if (!validProject && data.projects[0]) setCurrentProjectId(data.projects[0].id);
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
      workspace,
    });
  }, [isMockMode, providers, assets, tasks, templates, projects, currentProjectId, videoSeed, workspace]);

  useEffect(() => {
    if (isMockMode) return;
    saveUiState({
      version: 1,
      currentProjectId,
      selectedVideoInput: videoSeed,
      workspace,
    });
  }, [isMockMode, currentProjectId, videoSeed, workspace]);

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
      workspace,
      updateWorkspace: async (input) => {
        try {
          const updated = await workspaceApi.updateWorkspace(input, workspace);
          setWorkspace(updated);
          if (updated.defaultProjectId) setCurrentProjectId(updated.defaultProjectId);
          showToast('本地工作区已更新', 'success');
        } catch (error) {
          showToast(error instanceof Error ? error.message : '工作区更新失败', 'error');
        }
      },
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
      pendingPromptInput,
      setPendingPromptInput: setPendingPromptInputState,
      consumePendingPromptInput: () => {
        const input = pendingPromptInput;
        setPendingPromptInputState(undefined);
        return input;
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
        }).catch(() => showToast('资产删除失败', 'error'));
      },
      downloadAsset: (assetId) => {
        const target = assets.find((asset) => asset.id === assetId);
        if (!target) return;
        assetApi.downloadAsset(target).then(() => {
          showToast(isMockMode ? '下载为 Mock 操作' : '下载已开始', 'success');
        }).catch(() => showToast('下载失败，请确认文件存在且后端服务已启动', 'error'));
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
          showToast('API Key 已删除', 'success');
        });
      },
      deleteProvider: (providerId) => {
        providerApi.deleteProvider(providerId).then(() => {
          setProviders((items) => items.filter((item) => item.id !== providerId));
          showToast('供应商已删除', 'success');
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
      createProject: (input) => {
        projectApi.createProject(input).then((project) => {
          setProjects((items) => [project, ...items]);
          setCurrentProjectId(project.id);
          showToast('项目已创建', 'success');
        }).catch((error) => showToast(error instanceof Error ? error.message : '项目创建失败', 'error'));
      },
      updateProject: (project) => {
        projectApi.updateProject(project).then((updated) => {
          setProjects((items) => items.map((item) => (item.id === updated.id ? updated : item)));
          showToast('项目已更新', 'success');
        }).catch(() => showToast('项目更新失败', 'error'));
      },
      deleteProject: (projectId) => {
        projectApi.deleteProject(projectId).then(() => {
          setProjects((items) => {
            const next = items.filter((item) => item.id !== projectId);
            if (currentProjectId === projectId && next[0]) setCurrentProjectId(next[0].id);
            return next;
          });
          showToast('项目已删除', 'success');
        }).catch((error) => showToast(error instanceof Error ? error.message : '项目删除失败', 'error'));
      },
      archiveProject: (projectId) => {
        const target = projects.find((project) => project.id === projectId);
        if (!target) return;
        projectApi.archiveProject(target).then((updated) => {
          setProjects((items) => items.map((item) => (item.id === updated.id ? updated : item)));
          showToast('项目已归档', 'success');
        });
      },
      favoriteProject: (projectId) => {
        const target = projects.find((project) => project.id === projectId);
        if (!target) return;
        projectApi.favoriteProject(target).then((updated) => {
          setProjects((items) => items.map((item) => (item.id === updated.id ? updated : item)));
        });
      },
      moveProjectAssets: async (sourceProjectId, targetProjectId, assetIds) => {
        if (sourceProjectId === targetProjectId) {
          showToast('不能迁移到当前项目', 'error');
          return;
        }
        if (isMockMode) {
          const targetProject = projects.find((project) => project.id === targetProjectId);
          if (!targetProject) {
            showToast('目标项目不存在', 'error');
            return;
          }
          const idSet = assetIds?.length ? new Set(assetIds) : undefined;
          const movedCount = assets.filter((asset) => asset.projectId === sourceProjectId && (!idSet || idSet.has(asset.id))).length;
          setAssets((items) => items.map((asset) => {
            if (asset.projectId !== sourceProjectId) return asset;
            if (idSet && !idSet.has(asset.id)) return asset;
            return { ...asset, projectId: targetProjectId };
          }));
          setProjects((items) => items.map((project) => (
            project.id === sourceProjectId || project.id === targetProjectId
              ? { ...project, updatedAt: new Date().toISOString() }
              : project
          )));
          showToast(`已迁移 ${movedCount} 个资产`, 'success');
          return;
        }
        try {
          const result = await projectApi.moveAssets(sourceProjectId, targetProjectId, assetIds);
          await refreshFromServer();
          showToast(`已迁移 ${result.movedCount} 个资产`, 'success');
        } catch (error) {
          showToast(error instanceof Error ? error.message : '资产迁移失败', 'error');
        }
      },
      exportProjectArchive: async (projectId, options) => {
        const project = projects.find((item) => item.id === projectId);
        if (!project) {
          showToast('项目不存在', 'error');
          return;
        }
        if (isMockMode) {
          showToast('Mock 模式暂不支持真实归档下载，请切换 real mode 后导出', 'info');
          return;
        }
        try {
          await projectApi.exportProject(project, options);
          showToast('项目归档包已开始下载', 'success');
        } catch {
          showToast('项目归档包导出失败', 'error');
        }
      },
      addTemplate: (template) => {
        promptTemplateApi.createTemplate(template).then((created) => {
          setTemplates((items) => [created, ...items]);
          showToast('模板已创建', 'success');
        });
      },
      updateTemplate: (template) => {
        promptTemplateApi.updateTemplate(template).then((updated) => {
          setTemplates((items) => items.map((item) => (item.id === updated.id ? updated : item)));
          showToast('模板已更新', 'success');
        });
      },
      deleteTemplate: (templateId) => {
        promptTemplateApi.deleteTemplate(templateId).then(() => {
          setTemplates((items) => items.filter((item) => item.id !== templateId));
          showToast('模板已删除', 'success');
        });
      },
      duplicateTemplate: (templateId) => {
        const source = templates.find((template) => template.id === templateId);
        if (!source) return;
        if (isMockMode) {
          setTemplates((items) => [{ ...source, id: `tpl_${Date.now()}`, title: `${source.title} 副本`, favorite: false }, ...items]);
          showToast('模板已复制', 'success');
          return;
        }
        promptTemplateApi.duplicateTemplate(templateId).then((template) => {
          setTemplates((items) => [template, ...items]);
          showToast('模板已复制', 'success');
        });
      },
      usePromptTemplate: async (templateId) => {
        const target = templates.find((template) => template.id === templateId);
        if (!target) return;
        try {
          const updated = await promptTemplateApi.useTemplate(target);
          setTemplates((items) => items.map((template) => (template.id === updated.id ? updated : template)));
        } catch {
          if (isMockMode) {
            setTemplates((items) => items.map((template) => (
              template.id === templateId
                ? { ...template, usageCount: (template.usageCount ?? 0) + 1, updatedAt: new Date().toISOString() }
                : template
            )));
          }
        }
      },
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
    [view, projects, currentProject, workspace, providers, assets, tasks, templates, globalSearch, selectedAsset, videoSeed, pendingPromptInput, toasts, isBootstrapping, bootstrapError],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
