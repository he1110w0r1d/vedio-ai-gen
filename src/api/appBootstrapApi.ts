import type { Asset, GenerationTask, Provider } from '../types';
import { assetApi } from './assetApi';
import { providerApi } from './providerApi';
import { taskApi } from './taskApi';

export type BootstrapData = {
  providers: Provider[];
  assets: Asset[];
  tasks: GenerationTask[];
};

export async function loadServerBootstrapData(): Promise<BootstrapData> {
  const [providers, assets, tasks] = await Promise.all([
    providerApi.listProviders([]),
    assetApi.listAssets([]),
    taskApi.listTasks([]),
  ]);

  return { providers, assets, tasks };
}
