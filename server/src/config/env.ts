import 'dotenv/config';

export type ServerEnv = {
  port: number;
  nodeEnv: 'development' | 'test' | 'production';
  encryptionKey: string;
  corsOrigin: string;
};

function readPort(value: string | undefined) {
  const port = Number(value ?? 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT 必须是 1 到 65535 之间的整数');
  }
  return port;
}

function readNodeEnv(value: string | undefined): ServerEnv['nodeEnv'] {
  if (value === 'production' || value === 'test' || value === 'development') return value;
  return 'development';
}

function readEncryptionKey(value: string | undefined) {
  if (!value) {
    throw new Error('缺少 APP_ENCRYPTION_KEY，无法启动后端代理服务');
  }

  const byteLength = Buffer.byteLength(value, 'utf8');
  if (byteLength < 32) {
    throw new Error('APP_ENCRYPTION_KEY 至少需要 32 字节，用于 AES-256-GCM 密钥派生');
  }

  return value;
}

export const env: ServerEnv = {
  port: readPort(process.env.PORT),
  nodeEnv: readNodeEnv(process.env.NODE_ENV),
  encryptionKey: readEncryptionKey(process.env.APP_ENCRYPTION_KEY),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://127.0.0.1:5173',
};
