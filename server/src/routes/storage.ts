import express from 'express';
import { readDb, updateDb } from '../services/storageService.js';
import { encryptSecret, maskSecret, decryptSecret } from '../services/encryptionService.js';
import { createObjectStorageAdapter } from '../storage/objectStorageAdapter.js';
import { validationError, HttpError } from '../utils/errors.js';
import { nowIso } from '../utils/time.js';

export const storageRouter = express.Router();

storageRouter.get('/config', async (_req, res, next) => {
  try {
    const db = await readDb();
    const config = db.storageConfig;
    // Do not return encrypted secrets
    const { accessKeyIdEncrypted, accessKeySecretEncrypted, ...safeConfig } = config;
    res.json({ data: safeConfig });
  } catch (error) {
    next(error);
  }
});

storageRouter.patch('/config', async (req, res, next) => {
  try {
    const {
      activeProvider,
      objectProvider,
      bucket,
      region,
      endpoint,
      publicBaseUrl,
      accessKeyId,
      accessKeySecret,
      usePathStyle,
      folderPrefix,
      deleteLocalAfterUpload,
      accessMode,
      presignedUrlExpiresInSeconds,
      providerInputUrlExpiresInSeconds,
    } = req.body;

    let safeConfig;

    await updateDb((db) => {
      const config = { ...db.storageConfig };
      if (activeProvider) config.activeProvider = activeProvider;
      if (objectProvider !== undefined) config.objectProvider = objectProvider;
      if (bucket !== undefined) config.bucket = bucket;
      if (region !== undefined) config.region = region;
      if (endpoint !== undefined) config.endpoint = endpoint;
      if (publicBaseUrl !== undefined) config.publicBaseUrl = publicBaseUrl;
      if (usePathStyle !== undefined) config.usePathStyle = usePathStyle;
      if (folderPrefix !== undefined) config.folderPrefix = folderPrefix;
      if (deleteLocalAfterUpload !== undefined) config.deleteLocalAfterUpload = deleteLocalAfterUpload;
      if (accessMode !== undefined) config.accessMode = accessMode;
      if (presignedUrlExpiresInSeconds !== undefined) config.presignedUrlExpiresInSeconds = presignedUrlExpiresInSeconds;
      if (providerInputUrlExpiresInSeconds !== undefined) config.providerInputUrlExpiresInSeconds = providerInputUrlExpiresInSeconds;

      if (accessKeyId) {
        config.accessKeyIdEncrypted = encryptSecret(accessKeyId);
        config.maskedAccessKeyId = maskSecret(accessKeyId);
      }
      if (accessKeySecret) {
        config.accessKeySecretEncrypted = encryptSecret(accessKeySecret);
      }

      config.updatedAt = nowIso();
      db.storageConfig = config;

      const { accessKeyIdEncrypted, accessKeySecretEncrypted, ...safe } = config;
      safeConfig = safe;
    });

    res.json({ data: safeConfig });
  } catch (error) {
    next(error);
  }
});

storageRouter.post('/test', async (req, res, next) => {
  try {
    const db = await readDb();
    const config = db.storageConfig;

    // Use parameters from request if provided (allows testing before saving)
    // Or just use the saved config
    const testConfig = { ...config, ...req.body };
    const akRaw = req.body.accessKeyId || (config.accessKeyIdEncrypted ? decryptSecret(config.accessKeyIdEncrypted) : '');
    const skRaw = req.body.accessKeySecret || (config.accessKeySecretEncrypted ? decryptSecret(config.accessKeySecretEncrypted) : '');

    if (!testConfig.endpoint || !testConfig.bucket || !akRaw || !skRaw) {
      throw validationError('配置不完整，无法测试连接');
    }

    testConfig.activeProvider = 'object';
    const adapter = createObjectStorageAdapter(testConfig, akRaw, skRaw);

    const testBuffer = Buffer.from('test');
    const testFileName = `test-connection-${Date.now()}.txt`;

    const result = await adapter.saveBuffer({
      buffer: testBuffer,
      fileName: testFileName,
      mimeType: 'text/plain',
      folder: 'test',
    });

    if (result.objectKey) {
      await adapter.deleteFile({ objectKey: result.objectKey });
    }

    res.json({ data: { success: true } });
  } catch (error: any) {
    next(new HttpError(500, { code: 'INTERNAL_ERROR', message: `连接测试失败: ${error.message || '未知错误'}`, retryable: false }));
  }
});

storageRouter.post('/migrate-assets', async (req, res, next) => {
  try {
    const { assetIds, projectId, deleteLocalAfterUpload } = req.body;
    if (!assetIds && !projectId) {
      throw validationError('请指定要迁移的 assetIds 或 projectId');
    }

    const db = await readDb();
    const config = db.storageConfig;
    if (config.activeProvider !== 'object' || !config.accessKeyIdEncrypted || !config.accessKeySecretEncrypted) {
      throw validationError('尚未配置或启用对象存储');
    }

    const akRaw = decryptSecret(config.accessKeyIdEncrypted);
    const skRaw = decryptSecret(config.accessKeySecretEncrypted);
    const adapter = createObjectStorageAdapter(config, akRaw, skRaw);

    let targetAssets = db.assets.filter(a => a.storageType === 'local' && a.localPath);
    if (assetIds) {
      const ids = new Set(assetIds);
      targetAssets = targetAssets.filter(a => ids.has(a.id));
    } else if (projectId) {
      targetAssets = targetAssets.filter(a => a.projectId === projectId);
    }

    let successCount = 0;
    let failedCount = 0;
    const warnings: string[] = [];

    // Migrate synchronously for simplicity, can be improved to batched async if many assets
    for (const asset of targetAssets) {
      try {
        const { readLocalAssetFile, deleteLocalFile } = await import('../services/fileStorageService.js');
        const localFile = await readLocalAssetFile(asset.localPath);
        if (!localFile) {
          failedCount++;
          warnings.push(`资产 ${asset.id} 的本地文件读取失败`);
          continue;
        }

        const extension = asset.localPath?.match(/\.([a-zA-Z0-9]+)$/)?.[1] ?? 'bin';
        const result = await adapter.saveBuffer({
          buffer: localFile.buffer,
          fileName: `${asset.id}.${extension}`,
          mimeType: asset.mimeType ?? 'application/octet-stream',
        });

        await updateDb(innerDb => {
          const a = innerDb.assets.find(item => item.id === asset.id);
          if (a) {
            a.storageType = 'object';
            a.objectKey = result.objectKey;
            
            const isPrivate = config.accessMode === 'private-presigned';
            a.url = isPrivate ? '' : (result.publicUrl ?? result.url);
            a.publicUrl = isPrivate ? undefined : result.publicUrl;
          }
        });

        if (deleteLocalAfterUpload ?? config.deleteLocalAfterUpload) {
          await deleteLocalFile({ localPath: asset.localPath });
          await updateDb(innerDb => {
            const a = innerDb.assets.find(item => item.id === asset.id);
            if (a) a.localPath = undefined;
          });
        }

        successCount++;
      } catch (err: any) {
        failedCount++;
        warnings.push(`资产 ${asset.id} 迁移失败: ${err.message}`);
      }
    }

    res.json({ data: { successCount, failedCount, warnings } });
  } catch (error) {
    next(error);
  }
});

storageRouter.post('/presign', async (req, res, next) => {
  try {
    const { objectKey, expiresInSeconds } = req.body;
    if (!objectKey) {
      throw validationError('缺少 objectKey 参数');
    }

    const db = await readDb();
    const config = db.storageConfig;
    if (config.activeProvider !== 'object') {
      throw validationError('尚未启用对象存储');
    }

    if (config.accessMode === 'public') {
      const akRaw = config.accessKeyIdEncrypted ? decryptSecret(config.accessKeyIdEncrypted) : '';
      const skRaw = config.accessKeySecretEncrypted ? decryptSecret(config.accessKeySecretEncrypted) : '';
      const adapter = createObjectStorageAdapter(config, akRaw, skRaw);
      const publicUrl = adapter.getPublicUrl({ objectKey });
      res.json({ data: { accessType: 'public', url: publicUrl } });
      return;
    }

    const { createPresignedUrl } = await import('../services/fileStorageService.js');
    const url = await createPresignedUrl({
      objectKey,
      expiresInSeconds: expiresInSeconds ?? config.presignedUrlExpiresInSeconds ?? 900,
    });
    
    res.json({
      data: {
        accessType: 'presigned',
        url,
        expiresAt: new Date(Date.now() + (expiresInSeconds ?? config.presignedUrlExpiresInSeconds ?? 900) * 1000).toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});
