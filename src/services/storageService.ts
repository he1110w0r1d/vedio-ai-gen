import { mockAssets, mockProjects, mockProviders, mockPromptTemplates, mockTasks } from '../data/mockData';
import type { AppStateSnapshot } from '../types';

const STORAGE_KEY = 'api-asset-studio:app-state';
const UI_STORAGE_KEY = 'api-asset-studio:ui-state';
const STORAGE_VERSION = 1;

export type AppUiState = {
  version: number;
  currentProjectId: string;
  selectedVideoInput?: AppStateSnapshot['selectedVideoInput'];
};

export function resetToMockData(): AppStateSnapshot {
  return {
    version: STORAGE_VERSION,
    providers: mockProviders,
    assets: mockAssets,
    tasks: mockTasks,
    promptTemplates: mockPromptTemplates,
    projects: mockProjects,
    currentProjectId: mockProjects[0]?.id ?? '',
    selectedVideoInput: undefined,
  };
}

function isAppStateSnapshot(value: unknown): value is AppStateSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AppStateSnapshot>;
  return (
    candidate.version === STORAGE_VERSION &&
    Array.isArray(candidate.providers) &&
    Array.isArray(candidate.assets) &&
    Array.isArray(candidate.tasks) &&
    Array.isArray(candidate.promptTemplates) &&
    Array.isArray(candidate.projects) &&
    typeof candidate.currentProjectId === 'string'
  );
}

export function loadAppState(): AppStateSnapshot {
  if (typeof window === 'undefined') return resetToMockData();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return resetToMockData();
    const parsed = JSON.parse(raw);
    return isAppStateSnapshot(parsed) ? parsed : resetToMockData();
  } catch {
    return resetToMockData();
  }
}

export function saveAppState(state: AppStateSnapshot) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, version: STORAGE_VERSION }));
  } catch {
    // localStorage can be unavailable or full; Mock state should keep working in memory.
  }
}

export function clearAppState() {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures in the frontend-only MVP.
  }
}

export function loadUiState(): AppUiState {
  if (typeof window === 'undefined') {
    return { version: STORAGE_VERSION, currentProjectId: mockProjects[0]?.id ?? '' };
  }

  try {
    const raw = window.localStorage.getItem(UI_STORAGE_KEY);
    if (!raw) return { version: STORAGE_VERSION, currentProjectId: mockProjects[0]?.id ?? '' };
    const parsed = JSON.parse(raw) as Partial<AppUiState>;
    return {
      version: STORAGE_VERSION,
      currentProjectId: typeof parsed.currentProjectId === 'string' ? parsed.currentProjectId : mockProjects[0]?.id ?? '',
      selectedVideoInput: parsed.selectedVideoInput,
    };
  } catch {
    return { version: STORAGE_VERSION, currentProjectId: mockProjects[0]?.id ?? '' };
  }
}

export function saveUiState(state: AppUiState) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({ ...state, version: STORAGE_VERSION }));
  } catch {
    // UI preferences are non-critical.
  }
}
