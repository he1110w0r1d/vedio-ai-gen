import { Router } from 'express';
import { archiveProject, createProject, deleteProject, favoriteProject, getProject, listProjects, moveProjectAssets, updateProject } from '../services/projectService.js';
import { exportProjectArchive } from '../services/projectExportService.js';
import { asyncHandler } from '../utils/errors.js';

export const projectsRouter = Router();

projectsRouter.get('/', asyncHandler(async (_req, res) => {
  res.json({ data: await listProjects() });
}));

projectsRouter.get('/:id', asyncHandler(async (req, res) => {
  res.json({ data: await getProject(String(req.params.id)) });
}));

projectsRouter.post('/', asyncHandler(async (req, res) => {
  res.status(201).json({ data: await createProject(req.body) });
}));

projectsRouter.patch('/:id', asyncHandler(async (req, res) => {
  res.json({ data: await updateProject(String(req.params.id), req.body) });
}));

projectsRouter.delete('/:id', asyncHandler(async (req, res) => {
  res.json({ data: await deleteProject(String(req.params.id)) });
}));

projectsRouter.post('/:id/archive', asyncHandler(async (req, res) => {
  res.json({ data: await archiveProject(String(req.params.id)) });
}));

projectsRouter.post('/:id/favorite', asyncHandler(async (req, res) => {
  res.json({ data: await favoriteProject(String(req.params.id), req.body?.favorite) });
}));

projectsRouter.post('/:id/move-assets', asyncHandler(async (req, res) => {
  res.json({ data: await moveProjectAssets(String(req.params.id), req.body) });
}));

projectsRouter.get('/:id/export', asyncHandler(async (req, res) => {
  const archive = await exportProjectArchive(String(req.params.id), {
    includeFiles: req.query.includeFiles !== 'false',
    includeTasks: req.query.includeTasks !== 'false',
    includeTemplates: req.query.includeTemplates !== 'false',
  });
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(archive.fileName)}`);
  res.send(archive.buffer);
}));
