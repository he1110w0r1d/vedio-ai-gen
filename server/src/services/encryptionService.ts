import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { internalError } from '../utils/errors.js';

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  if (!env.encryptionKey) throw internalError('缺少 APP_ENCRYPTION_KEY，无法加密保存 API Key');
  return crypto.createHash('sha256').update(env.encryptionKey).digest();
}

export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptSecret(cipherText: string): string {
  const [ivText, tagText, encryptedText] = cipherText.split('.');
  if (!ivText || !tagText || !encryptedText) throw internalError('API Key 密文格式无效');

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivText, 'base64'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64')), decipher.final()]);
  return decrypted.toString('utf8');
}

export function maskSecret(plainText: string): string {
  const trimmed = plainText.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}****${trimmed.slice(-2)}`;
  return `${trimmed.slice(0, 4)}****${trimmed.slice(-4)}`;
}
