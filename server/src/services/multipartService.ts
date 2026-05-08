import { validationError } from '../utils/errors.js';

export function extractMultipartFile(input: { contentType?: string; body: Buffer; fieldName?: string; maxBytes?: number }) {
  const boundaryMatch = input.contentType?.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = boundaryMatch?.[1] ?? boundaryMatch?.[2];
  if (!boundary) throw validationError('缺少 multipart boundary');
  if (input.maxBytes && input.body.byteLength > input.maxBytes) throw validationError('上传文件过大');

  const marker = `--${boundary}`;
  const raw = input.body.toString('binary');
  const parts = raw.split(marker).slice(1, -1);
  for (const part of parts) {
    const clean = part.startsWith('\r\n') ? part.slice(2) : part;
    const splitIndex = clean.indexOf('\r\n\r\n');
    if (splitIndex < 0) continue;
    const headerText = clean.slice(0, splitIndex);
    const bodyText = clean.slice(splitIndex + 4).replace(/\r\n$/, '');
    const name = headerText.match(/name="([^"]+)"/)?.[1];
    const fileName = headerText.match(/filename="([^"]*)"/)?.[1];
    if (name !== (input.fieldName ?? 'file') || !fileName) continue;
    if (!fileName.toLowerCase().endsWith('.zip')) throw validationError('只支持 zip 归档包');
    return {
      fileName,
      buffer: Buffer.from(bodyText, 'binary'),
    };
  }

  throw validationError('未找到上传文件字段 file');
}
