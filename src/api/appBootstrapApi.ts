import type { Asset, GenerationTask, Project, PromptTemplate, Provider, WorkspaceProfile } from '../types';
import { assetApi } from './assetApi';
import { providerApi } from './providerApi';
import { projectApi } from './projectApi';
import { promptTemplateApi } from './promptTemplateApi';
import { taskApi } from './taskApi';
import { workspaceApi } from './workspaceApi';

export type BootstrapData = {
  providers: Provider[];
  assets: Asset[];
  tasks: GenerationTask[];
  projects: Project[];
  promptTemplates: PromptTemplate[];
  workspace: WorkspaceProfile;
};

export async function loadServerBootstrapData(): Promise<BootstrapData> {
  const [providers, assets, tasks, projects, promptTemplates, workspace] = await Promise.all([
    providerApi.listProviders([]),
    assetApi.listAssets([]),
    taskApi.listTasks([]),
    projectApi.listProjects([]),
    promptTemplateApi.listTemplates([]),
    workspaceApi.getWorkspace(),
  ]);

  return { providers, assets, tasks, projects, promptTemplates, workspace };
}
