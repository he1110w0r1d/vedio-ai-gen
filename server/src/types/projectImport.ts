export type ProjectImportManifest = {
  exportVersion: string;
  exportedAt: string;
  appName: string;
  projectId: string;
  projectName: string;
  assetCount: number;
  taskCount: number;
  templateCount: number;
  includeFiles: boolean;
  warnings?: string[];
};

export type ProjectImportValidationResult = {
  valid: boolean;
  manifest?: ProjectImportManifest;
  summary?: {
    projectName: string;
    assetCount: number;
    taskCount: number;
    templateCount: number;
    fileCount: number;
  };
  warnings: string[];
  errors: string[];
};
