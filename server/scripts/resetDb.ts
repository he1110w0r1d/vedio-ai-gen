import { resetDb } from '../src/services/storageService.js';

const db = await resetDb();
console.log(`db:reset 完成：providers=${db.providers.length}, projects=${db.projects.length}, assets=${db.assets.length}, tasks=${db.tasks.length}, promptTemplates=${db.promptTemplates.length}`);
