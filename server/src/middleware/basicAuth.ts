// 最小 Basic Auth 中间件，用于预发访问控制。
// 仅在 APP_ACCESS_CONTROL=basic 时启用。
// 不持久化 session、不实现用户管理、不提供多用户权限。
import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

interface AuthConfig {
  accessControl: 'off' | 'basic';
  username: string;
  passwordHash: string; // 格式: scrypt:hash:base64Salt
}

function readConfig(): AuthConfig {
  const accessControl = process.env.APP_ACCESS_CONTROL === 'basic' ? 'basic' : 'off';
  return {
    accessControl,
    username: process.env.APP_BASIC_AUTH_USERNAME || 'admin',
    passwordHash: process.env.APP_BASIC_AUTH_PASSWORD_HASH || '',
  };
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash || !password) return false;

  // 支持明文密码（仅开发阶段，生产不允许）
  if (!hash.includes(':')) {
    return password === hash;
  }

  const [algo, hashHex, saltBase64] = hash.split(':');
  if (algo !== 'scrypt') return false;

  try {
    const salt = Buffer.from(saltBase64, 'base64');
    const expectedHash = Buffer.from(hashHex, 'hex');
    return new Promise<boolean>((resolve) => {
      crypto.scrypt(password, salt, expectedHash.length, (err, derivedKey) => {
        if (err) { resolve(false); return; }
        resolve(crypto.timingSafeEqual(derivedKey, expectedHash));
      });
    });
  } catch {
    return false;
  }
}

// 跳过 Basic Auth 的路径
const PUBLIC_PATHS = ['/health'];

export function basicAuth() {
  const config = readConfig();

  return async (req: Request, res: Response, next: NextFunction) => {
    // off 模式直接放行
    if (config.accessControl !== 'basic') {
      return next();
    }

    // 公开路径放行
    if (PUBLIC_PATHS.some((p) => req.path.startsWith(p))) {
      return next();
    }

    // 未配置 passwordHash 时拒绝所有请求
    if (!config.passwordHash) {
      res.setHeader('WWW-Authenticate', 'Basic realm="API Asset Studio"');
      return res.status(401).json({
        code: 'AUTH_REQUIRED',
        message: '访问控制已启用但未配置密码。请设置 APP_BASIC_AUTH_PASSWORD_HASH。',
        retryable: false,
      });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="API Asset Studio"');
      return res.status(401).json({
        code: 'AUTH_REQUIRED',
        message: '需要认证',
        retryable: false,
      });
    }

    try {
      const base64Credentials = authHeader.slice(6);
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
      const [username, password] = credentials.split(':');

      if (username !== config.username) {
        res.setHeader('WWW-Authenticate', 'Basic realm="API Asset Studio"');
        return res.status(401).json({
          code: 'AUTH_INVALID',
          message: '用户名或密码错误',
          retryable: false,
        });
      }

      const valid = await verifyPassword(password, config.passwordHash);
      if (!valid) {
        res.setHeader('WWW-Authenticate', 'Basic realm="API Asset Studio"');
        return res.status(401).json({
          code: 'AUTH_INVALID',
          message: '用户名或密码错误',
          retryable: false,
        });
      }

      // 认证通过，不记录任何身份信息到 request（最小化）
      return next();
    } catch {
      res.setHeader('WWW-Authenticate', 'Basic realm="API Asset Studio"');
      return res.status(401).json({
        code: 'AUTH_ERROR',
        message: '认证处理错误',
        retryable: false,
      });
    }
  };
}
