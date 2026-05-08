import { validationError } from '../utils/errors.js';

export type ZipReadEntry = {
  path: string;
  data: Buffer;
};

export function readZipEntries(buffer: Buffer): ZipReadEntry[] {
  const entries: ZipReadEntry[] = [];
  let offset = 0;

  while (offset + 30 <= buffer.length) {
    const signature = buffer.readUInt32LE(offset);
    if (signature === 0x02014b50 || signature === 0x06054b50) break;
    if (signature !== 0x04034b50) throw validationError('ZIP 文件结构无效');

    const flags = buffer.readUInt16LE(offset + 6);
    const compression = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buffer.length) throw validationError('ZIP 文件内容不完整');
    if (flags & 0x08) throw validationError('暂不支持 data descriptor ZIP 格式');
    if (compression !== 0) throw validationError('暂不支持压缩格式的 ZIP，请使用本应用导出的归档包');
    if (compressedSize !== uncompressedSize) throw validationError('ZIP 文件大小字段异常');

    const name = buffer.subarray(nameStart, nameStart + nameLength).toString('utf8');
    validateZipPath(name);
    if (!name.endsWith('/')) entries.push({ path: name, data: buffer.subarray(dataStart, dataEnd) });
    offset = dataEnd;
  }

  if (!entries.length) throw validationError('ZIP 中没有可读取的文件');
  return entries;
}

export function validateZipPath(input: string) {
  if (!input.trim()) throw validationError('ZIP 中存在空文件名');
  if (input.startsWith('/') || input.startsWith('\\')) throw validationError('ZIP 中存在绝对路径');
  if (/^[a-zA-Z]:[\\/]/.test(input)) throw validationError('ZIP 中存在 Windows 绝对路径');
  const parts = input.replace(/\\/g, '/').split('/');
  if (parts.some((part) => part === '..' || part === '')) throw validationError('ZIP 中存在不安全路径');
}
