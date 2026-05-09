import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { createId } from '../utils/id.js';
import type { StorageAdapter, StoredFile } from './types.js';

const STORAGE_ROOT = path.resolve(process.cwd(), 'storage');
const ASSET_ROOT = path.join(STORAGE_ROOT, 'assets');

export const localStorageAdapter: StorageAdapter = {
  type: 'local',

  async saveBuffer(input) {
    await fs.mkdir(ASSET_ROOT, { recursive: true });
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const localPath = path.join(ASSET_ROOT, safeName);
    await fs.writeFile(localPath, input.buffer);
    return {
      storageType: 'local',
      localPath,
      publicUrl: this.getPublicUrl({ localPath }),
      mimeType: input.mimeType,
      sizeBytes: input.buffer.byteLength,
      url: this.getPublicUrl({ localPath }),
    };
  },

  async saveRemoteFile(input) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 60000);
    try {
      const response = await fetch(input.remoteUrl, { signal: controller.signal });
      if (!response.ok) throw new Error(`下载远程文件失败：${response.status}`);
      const contentType = input.mimeTypeHint ?? response.headers.get('content-type') ?? 'application/octet-stream';
      const contentLength = Number(response.headers.get('content-length') ?? 0);
      const maxBytes = input.maxBytes ?? 300 * 1024 * 1024;
      if (contentLength > maxBytes) throw new Error('远程文件超过大小限制');
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength > maxBytes) throw new Error('远程文件超过大小限制');
      return this.saveBuffer({
        buffer,
        fileName: input.fileName,
        mimeType: contentType,
        folder: input.folder,
      });
    } finally {
      clearTimeout(timeout);
    }
  },

  async deleteFile(input) {
    if (!input.localPath) return;
    const resolved = path.resolve(input.localPath);
    const root = `${path.resolve(ASSET_ROOT)}${path.sep}`;
    if (!resolved.startsWith(root)) return;
    try {
      await fs.unlink(resolved);
    } catch {
      // ignore
    }
  },

  getPublicUrl(input) {
    if (!input.localPath) return '';
    const relativePath = path.relative(ASSET_ROOT, input.localPath).split(path.sep).join('/');
    return `http://127.0.0.1:${env.port}/storage/assets/${relativePath}`;
  },

  async createPresignedReadUrl() {
    throw new Error('本地存储不支持预签名 URL');
  },
};
