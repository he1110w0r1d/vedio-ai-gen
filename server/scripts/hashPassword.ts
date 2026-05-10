// 生成 Basic Auth 密码 hash
// 用法: npx tsx server/scripts/hashPassword.ts "your-password"
import crypto from 'node:crypto';

const password = process.argv[2];

if (!password) {
  console.error('用法: npx tsx hashPassword.ts <password>');
  console.error('示例: npx tsx hashPassword.ts "my-secret-password"');
  process.exit(1);
}

if (password.length < 4) {
  console.error('密码至少需要 4 个字符');
  process.exit(1);
}

const salt = crypto.randomBytes(32);
const keyLength = 64; // 512-bit output

crypto.scrypt(password, salt, keyLength, (err, derivedKey) => {
  if (err) {
    console.error('hash 生成失败:', err.message);
    process.exit(1);
  }

  const hashHex = derivedKey.toString('hex');
  const saltBase64 = salt.toString('base64');
  const hash = `scrypt:${hashHex}:${saltBase64}`;

  console.log('========================================');
  console.log('Basic Auth 密码 Hash 已生成');
  console.log('========================================');
  console.log('');
  console.log('将以下内容添加到你的环境变量中:');
  console.log('');
  console.log(`APP_BASIC_AUTH_PASSWORD_HASH=${hash}`);
  console.log('');
  console.log('========================================');
  console.log('⚠️  原始密码不会被保存，请牢记。');
  console.log('⚠️  不要将此 hash 提交到 Git 仓库。');
  console.log('========================================');
});
