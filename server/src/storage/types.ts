export type StorageProviderType = 'local' | 'object';

export type StoredFile = {
  storageType: StorageProviderType;
  url: string;
  publicUrl?: string;
  localPath?: string;
  objectKey?: string;
  bucket?: string;
  endpoint?: string;
  mimeType?: string;
  sizeBytes?: number;
};

export interface StorageAdapter {
  type: StorageProviderType;
  saveBuffer(input: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    folder?: string;
  }): Promise<StoredFile>;

  saveRemoteFile(input: {
    remoteUrl: string;
    fileName: string;
    mimeTypeHint?: string;
    folder?: string;
    maxBytes?: number;
    timeoutMs?: number;
  }): Promise<StoredFile>;

  deleteFile(input: {
    localPath?: string;
    objectKey?: string;
    url?: string;
  }): Promise<void>;

  getPublicUrl(input: {
    localPath?: string;
    objectKey?: string;
    url?: string;
  }): string;

  createPresignedReadUrl(input: {
    objectKey: string;
    expiresInSeconds?: number;
    responseContentDisposition?: string;
  }): Promise<string>;
}
