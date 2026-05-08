import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { createId } from '../utils/id.js';

export type LocalFileRecord = {
  storageType: 'local' | 'mock';
  localPath?: string;
  publicUrl: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
};

const downloadTimeoutMs = 60000;

const STORAGE_ROOT = path.resolve(process.cwd(), 'storage');
const ASSET_ROOT = path.join(STORAGE_ROOT, 'assets');
const TEMP_ROOT = path.join(STORAGE_ROOT, 'temp');

export function resolveAssetLocalPath(localPath?: string) {
  if (!localPath) return undefined;
  const resolved = path.resolve(localPath);
  const root = `${path.resolve(ASSET_ROOT)}${path.sep}`;
  if (!resolved.startsWith(root)) return undefined;
  return resolved;
}

export async function saveRemoteFileToLocal(input: { remoteUrl: string; fileName?: string; mimeType?: string }): Promise<LocalFileRecord> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), downloadTimeoutMs);
  try {
    const response = await fetch(input.remoteUrl, { signal: controller.signal });
    if (!response.ok) throw new Error(`下载远程文件失败：${response.status}`);
    const contentType = input.mimeType ?? response.headers.get('content-type') ?? 'application/octet-stream';
    const extension = inferExtension(input.remoteUrl, contentType);
    const fileName = input.fileName ?? `${createId('remote')}.${extension}`;
    return saveBufferToLocal({
      buffer: Buffer.from(await response.arrayBuffer()),
      fileName,
      mimeType: contentType,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function saveBufferToLocal(input: { buffer: Buffer; fileName: string; mimeType?: string }): Promise<LocalFileRecord> {
  await fs.mkdir(ASSET_ROOT, { recursive: true });
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const localPath = path.join(ASSET_ROOT, safeName);
  await fs.writeFile(localPath, input.buffer);
  const dimensions = getImageDimensions(input.buffer);
  return {
    storageType: 'local',
    localPath,
    publicUrl: getPublicAssetUrl({ localPath }),
    mimeType: input.mimeType,
    sizeBytes: input.buffer.byteLength,
    width: dimensions?.width,
    height: dimensions?.height,
  };
}

export function getPublicAssetUrl(input: { localPath: string }) {
  const relativePath = path.relative(ASSET_ROOT, input.localPath).split(path.sep).join('/');
  return `http://127.0.0.1:${env.port}/storage/assets/${relativePath}`;
}

export async function deleteLocalFile(input: { localPath: string }) {
  const localPath = resolveAssetLocalPath(input.localPath);
  if (!localPath) return { deleted: false };
  try {
    await fs.unlink(localPath);
    return { deleted: true };
  } catch {
    return { deleted: false };
  }
}

export async function readLocalAssetFile(localPath?: string) {
  const resolved = resolveAssetLocalPath(localPath);
  if (!resolved) return undefined;
  const stat = await fs.stat(resolved).catch(() => undefined);
  if (!stat?.isFile()) return undefined;
  return {
    path: resolved,
    sizeBytes: stat.size,
    buffer: await fs.readFile(resolved),
  };
}

export async function ensureStorageDirs() {
  await fs.mkdir(ASSET_ROOT, { recursive: true });
  await fs.mkdir(TEMP_ROOT, { recursive: true });
}

function inferExtension(remoteUrl: string, mimeType: string) {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  const match = remoteUrl.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  return match?.[1] ?? 'bin';
}

function getImageDimensions(buffer: Buffer): { width: number; height: number } | undefined {
  if (buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) return undefined;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
  }

  return undefined;
}
