import express, { Router } from 'express';
import { extractMultipartFile } from '../services/multipartService.js';
import { importProjectArchive, validateProjectImport } from '../services/projectImportService.js';
import { asyncHandler } from '../utils/errors.js';

export const projectImportsRouter = Router();
const upload = express.raw({ type: 'multipart/form-data', limit: '100mb' });

projectImportsRouter.post('/validate', upload, asyncHandler(async (req, res) => {
  const file = extractMultipartFile({ contentType: req.headers['content-type'], body: req.body, maxBytes: 100 * 1024 * 1024 });
  res.json({ data: await validateProjectImport(file.buffer) });
}));

projectImportsRouter.post('/', upload, asyncHandler(async (req, res) => {
  const file = extractMultipartFile({ contentType: req.headers['content-type'], body: req.body, maxBytes: 100 * 1024 * 1024 });
  res.status(201).json({
    data: await importProjectArchive(file.buffer, {
      importFiles: req.query.importFiles !== 'false',
      importTasks: req.query.importTasks !== 'false',
      importTemplates: req.query.importTemplates !== 'false',
    }),
  });
}));
