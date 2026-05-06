import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createId } from '../utils/id.js';

export type LocalFileRecord = {
  storageType: 'local' | 'mock';
  localPath?: string;
  publicUrl: string;
  mimeType?: string;
  sizeBytes?: number;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_ROOT = path.resolve(__dirname, '../../storage');
const ASSET_ROOT = path.join(STORAGE_ROOT, 'assets');
const TEMP_ROOT = path.join(STORAGE_ROOT, 'temp');

export async function saveRemoteFileToLocal(input: { remoteUrl: string; fileName?: string; mimeType?: string }): Promise<LocalFileRecord> {
  const fileName = input.fileName ?? `${createId('remote')}.mock`;
  return {
    storageType: 'mock',
    publicUrl: input.remoteUrl,
    localPath: path.join(ASSET_ROOT, fileName),
    mimeType: input.mimeType,
  };
}

export async function saveBufferToLocal(input: { buffer: Buffer; fileName: string; mimeType?: string }): Promise<LocalFileRecord> {
  await fs.mkdir(ASSET_ROOT, { recursive: true });
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const localPath = path.join(ASSET_ROOT, safeName);
  await fs.writeFile(localPath, input.buffer);
  return {
    storageType: 'local',
    localPath,
    publicUrl: getPublicAssetUrl({ localPath }),
    mimeType: input.mimeType,
    sizeBytes: input.buffer.byteLength,
  };
}

export function getPublicAssetUrl(input: { localPath: string }) {
  const relativePath = path.relative(ASSET_ROOT, input.localPath).split(path.sep).join('/');
  return `/storage/assets/${relativePath}`;
}

export async function deleteLocalFile(input: { localPath: string }) {
  try {
    await fs.unlink(input.localPath);
    return { deleted: true };
  } catch {
    return { deleted: false };
  }
}

export async function ensureStorageDirs() {
  await fs.mkdir(ASSET_ROOT, { recursive: true });
  await fs.mkdir(TEMP_ROOT, { recursive: true });
}
