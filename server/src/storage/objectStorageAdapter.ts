import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import path from 'node:path';
import type { StorageConfig } from '../types/storage.js';
import type { StorageAdapter, StoredFile } from './types.js';

export function createObjectStorageAdapter(config: StorageConfig, decryptedAccessKeyId: string, decryptedSecret: string): StorageAdapter {
  if (config.activeProvider !== 'object') {
    throw new Error('当前未启用对象存储');
  }
  if (!config.endpoint || !config.bucket || !decryptedAccessKeyId || !decryptedSecret) {
    throw new Error('对象存储配置不完整');
  }

  const s3 = new S3Client({
    region: config.region || 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: decryptedAccessKeyId,
      secretAccessKey: decryptedSecret,
    },
    forcePathStyle: config.usePathStyle,
  });

  const getPublicUrlFn = (objectKey?: string) => {
    if (!objectKey) return '';
    const safeKey = objectKey.split('/').map(encodeURIComponent).join('/');
    if (config.publicBaseUrl) {
      const base = config.publicBaseUrl.replace(/\/+$/, '');
      return `${base}/${safeKey}`;
    }
    const endpoint = config.endpoint!.replace(/\/+$/, '');
    if (config.usePathStyle) {
      return `${endpoint}/${config.bucket}/${safeKey}`;
    }
    const url = new URL(endpoint);
    return `${url.protocol}//${config.bucket}.${url.hostname}${url.pathname === '/' ? '' : url.pathname}/${safeKey}`;
  };

  return {
    type: 'object',

    async saveBuffer(input) {
      const prefix = config.folderPrefix ? `${config.folderPrefix.replace(/\/+$/, '')}/` : '';
      const folder = input.folder ? `${input.folder.replace(/\/+$/, '')}/` : '';
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const objectKey = `${prefix}${folder}${safeName}`;

      const upload = new Upload({
        client: s3,
        params: {
          Bucket: config.bucket,
          Key: objectKey,
          Body: input.buffer,
          ContentType: input.mimeType,
        },
      });

      await upload.done();

      const publicUrl = getPublicUrlFn(objectKey);
      return {
        storageType: 'object',
        objectKey,
        bucket: config.bucket,
        endpoint: config.endpoint,
        publicUrl,
        url: publicUrl,
        mimeType: input.mimeType,
        sizeBytes: input.buffer.byteLength,
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
        
        // Use a stream if possible, but lib-storage supports web streams!
        // We can pass response.body directly to Body if we use Node.js streams or Web Streams.
        // Wait, since we are returning buffer size, it's easier to buffer it first, or use HeadObject after upload.
        // For simplicity, let's buffer it as we don't have huge files yet.
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
      if (!input.objectKey) return;
      // Safety check: ensure we only delete within our prefix
      if (config.folderPrefix && !input.objectKey.startsWith(config.folderPrefix)) {
        throw new Error('跨目录删除限制');
      }
      const command = new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: input.objectKey,
      });
      await s3.send(command);
    },

    getPublicUrl(input) {
      return getPublicUrlFn(input.objectKey);
    },

    async createPresignedReadUrl(input) {
      if (!input.objectKey) {
        throw new Error('无效的 objectKey');
      }
      if (input.objectKey.includes('../') || input.objectKey.startsWith('/')) {
        throw new Error('不安全的 objectKey');
      }
      const command = new GetObjectCommand({
        Bucket: config.bucket,
        Key: input.objectKey,
        ResponseContentDisposition: input.responseContentDisposition,
      });
      return getSignedUrl(s3, command, { expiresIn: input.expiresInSeconds ?? 900 });
    },
  };
}
