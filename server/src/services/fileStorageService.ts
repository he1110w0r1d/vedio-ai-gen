import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { createId } from '../utils/id.js';
import { readDb } from './storageService.js';
import { decryptSecret } from './encryptionService.js';
import { localStorageAdapter } from '../storage/localStorageAdapter.js';
import { createObjectStorageAdapter } from '../storage/objectStorageAdapter.js';
import type { StorageAdapter } from '../storage/types.js';

export type LocalFileRecord = {
  storageType: 'local' | 'mock' | 'object';
  localPath?: string;
  objectKey?: string;
  publicUrl: string;
  url?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
};

const downloadTimeoutMs = 60000;
const videoDownloadTimeoutMs = 300000;
const defaultMaxBytes = 300 * 1024 * 1024;

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

async function getActiveAdapter(): Promise<StorageAdapter> {
  const db = await readDb();
  const config = db.storageConfig;
  if (config.activeProvider === 'object' && config.accessKeySecretEncrypted && config.maskedAccessKeyId) {
    try {
      // In real scenario we might need the decrypted AK too, here we just use the masked one or expect it plain.
      // Wait, earlier we passed config.accessKeyIdEncrypted. Let's assume accessKeyId is stored plain text in accessKeyIdEncrypted.
      // Wait, let's fix that. The user said: "如果传入新的 accessKeyId/accessKeySecret，则加密保存"
      // So both are encrypted.
      const ak = decryptSecret(config.accessKeyIdEncrypted!);
      const sk = decryptSecret(config.accessKeySecretEncrypted!);
      return createObjectStorageAdapter(config, ak, sk);
    } catch (e) {
      console.warn('对象存储适配器初始化失败，回退到本地存储', e);
    }
  }
  return localStorageAdapter;
}

export async function saveRemoteFileToLocal(input: { remoteUrl: string; fileName?: string; mimeType?: string; timeoutMs?: number; maxBytes?: number }): Promise<LocalFileRecord> {
  const adapter = await getActiveAdapter();
  const extension = inferExtension(input.remoteUrl, input.mimeType ?? 'application/octet-stream');
  const fileName = input.fileName ?? `${createId('remote')}.${extension}`;
  
  const result = await adapter.saveRemoteFile({
    remoteUrl: input.remoteUrl,
    fileName,
    mimeTypeHint: input.mimeType,
    timeoutMs: input.timeoutMs ?? downloadTimeoutMs,
    maxBytes: input.maxBytes ?? defaultMaxBytes,
  });

  // Calculate width/height if it's local
  let dimensions;
  if (result.localPath) {
    const buffer = await fs.readFile(result.localPath).catch(() => undefined);
    if (buffer) dimensions = getImageDimensions(buffer);
  }

  const db = await readDb();
  const isPrivate = result.storageType === 'object' && db.storageConfig.accessMode === 'private-presigned';

  return {
    ...result,
    publicUrl: isPrivate ? undefined : (result.publicUrl ?? result.url),
    url: isPrivate ? '' : (result.publicUrl ?? result.url),
    width: dimensions?.width,
    height: dimensions?.height,
  } as LocalFileRecord;
}

export async function saveRemoteVideoToLocal(input: { remoteUrl: string; fileName?: string }): Promise<LocalFileRecord> {
  const extension = inferExtension(input.remoteUrl, 'video/mp4');
  return saveRemoteFileToLocal({
    remoteUrl: input.remoteUrl,
    fileName: input.fileName ?? `${createId('video')}.${extension}`,
    timeoutMs: videoDownloadTimeoutMs,
    maxBytes: defaultMaxBytes,
  });
}

export async function saveBufferToLocal(input: { buffer: Buffer; fileName: string; mimeType?: string }): Promise<LocalFileRecord> {
  const adapter = await getActiveAdapter();
  const result = await adapter.saveBuffer({
    buffer: input.buffer,
    fileName: input.fileName,
    mimeType: input.mimeType ?? 'application/octet-stream',
  });

  const dimensions = getImageDimensions(input.buffer);
  
  const db = await readDb();
  const isPrivate = result.storageType === 'object' && db.storageConfig.accessMode === 'private-presigned';

  return {
    ...result,
    publicUrl: isPrivate ? undefined : (result.publicUrl ?? result.url),
    url: isPrivate ? '' : (result.publicUrl ?? result.url),
    width: dimensions?.width,
    height: dimensions?.height,
  } as LocalFileRecord;
}

export function getPublicAssetUrl(input: { localPath: string }) {
  const relativePath = path.relative(ASSET_ROOT, input.localPath).split(path.sep).join('/');
  return `http://127.0.0.1:${env.port}/storage/assets/${relativePath}`;
}

export async function deleteLocalFile(input: { localPath?: string; objectKey?: string }) {
  if (input.objectKey) {
    try {
      const adapter = await getActiveAdapter();
      if (adapter.type === 'object') {
        await adapter.deleteFile({ objectKey: input.objectKey });
      }
    } catch {
      // ignore
    }
  }
  if (input.localPath) {
    const localPath = resolveAssetLocalPath(input.localPath);
    if (!localPath) return { deleted: false };
    try {
      await fs.unlink(localPath);
      return { deleted: true };
    } catch {
      return { deleted: false };
    }
  }
  return { deleted: true };
}

export async function createPresignedUrl(input: { objectKey: string; expiresInSeconds?: number; responseContentDisposition?: string }): Promise<string> {
  const adapter = await getActiveAdapter();
  if (adapter.type !== 'object') {
    throw new Error('当前存储并非对象存储，无法生成签名 URL');
  }
  return adapter.createPresignedReadUrl(input);
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
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('webm')) return 'webm';
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
