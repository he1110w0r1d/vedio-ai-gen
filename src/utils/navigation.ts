import type { ViewId } from '../types';

const viewIds: ViewId[] = ['dashboard', 'projects', 'image-studio', 'video-studio', 'assets', 'tasks', 'providers', 'templates', 'settings'];

const viewAliases: Record<string, ViewId> = {
  dashboard: 'dashboard',
  projects: 'projects',
  project: 'projects',
  image: 'image-studio',
  'image-studio': 'image-studio',
  video: 'video-studio',
  'video-studio': 'video-studio',
  assets: 'assets',
  'asset-library': 'assets',
  tasks: 'tasks',
  'task-center': 'tasks',
  providers: 'providers',
  provider: 'providers',
  api: 'providers',
  templates: 'templates',
  'prompt-templates': 'templates',
  settings: 'settings',
};

export function resolveHashView(hash = window.location.hash): ViewId {
  const key = hash.replace(/^#\/?/, '').trim();
  if (!key) return 'dashboard';
  return viewAliases[key] ?? (viewIds.includes(key as ViewId) ? (key as ViewId) : 'dashboard');
}
