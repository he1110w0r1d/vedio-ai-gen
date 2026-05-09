import type { AssetRecord } from '../types/asset.js';
import type { GenerationTaskRecord } from '../types/task.js';
import type { UsageRecord } from '../types/usage.js';
import type { QualityFeedback } from '../types/quality.js';
import type { BenchmarkRun, BenchmarkRunItem } from '../types/benchmark.js';

/**
 * Common presigned URL signature parameter names found in cloud provider URLs.
 * These indicate the URL contains temporary credentials that expire.
 */
const PRESIGNED_PARAMS = [
  'Expires',
  'Signature',
  'OSSAccessKeyId',
  'X-Amz-Signature',
  'X-Amz-Credential',
  'X-Amz-Expires',
  'X-Amz-Date',
  'X-Amz-Algorithm',
  'X-Amz-SignedHeaders',
  'X-Amz-Security-Token',
  'security-token',
  'x-oss-signature',
  'x-oss-credential',
  'x-oss-expires',
  'x-oss-date',
  'x-oss-security-token',
  'AWSAccessKeyId',
  'aws-access-key-id',
];

/**
 * Check if a URL contains cloud provider presigned signature parameters.
 * Detects: OSS (Aliyun), S3 (AWS), and general presigned patterns.
 */
export function isPresignedUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    const searchParams = parsed.searchParams;
    for (const param of PRESIGNED_PARAMS) {
      if (searchParams.has(param)) return true;
    }
    // Also check lowercase variants
    const lowerSearch = parsed.search.toLowerCase();
    for (const param of PRESIGNED_PARAMS) {
      if (lowerSearch.includes(param.toLowerCase())) return true;
    }
    return false;
  } catch {
    // Not a valid URL — check raw string for signature patterns
    const lower = url.toLowerCase();
    return PRESIGNED_PARAMS.some(p => lower.includes(p.toLowerCase()));
  }
}

/**
 * Sanitize an external URL for storage.
 * Returns metadata about the URL without storing the full presigned URL.
 */
export function sanitizeExternalUrlForStorage(url: string): {
  host?: string;
  safeUrl?: string;
  containsSignature: boolean;
} {
  if (!url || typeof url !== 'string') return { containsSignature: false };

  const containsSignature = isPresignedUrl(url);

  try {
    const parsed = new URL(url);
    if (containsSignature) {
      // Only store host info, not the full presigned URL
      return { host: parsed.host, containsSignature: true };
    }
    // For local URLs (127.0.0.1 / localhost), keep them as-is
    if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
      return { host: parsed.host, safeUrl: url, containsSignature: false };
    }
    // For public non-presigned URLs, keep the URL
    return { host: parsed.host, safeUrl: url, containsSignature: false };
  } catch {
    return { containsSignature };
  }
}

/**
 * Assert that no presigned URL exists in critical DB fields.
 * Throws with details if any are found.
 */
export function assertNoPresignedUrlInDb(db: {
  assets?: AssetRecord[];
  tasks?: GenerationTaskRecord[];
  usageRecords?: UsageRecord[];
  qualityFeedback?: QualityFeedback[];
  benchmarkRuns?: BenchmarkRun[];
  benchmarkRunItems?: BenchmarkRunItem[];
}): { clean: boolean; violations: string[] } {
  const violations: string[] = [];

  // Check assets
  for (const asset of db.assets ?? []) {
    for (const field of ['url', 'publicUrl', 'fileUrl', 'thumbnail', 'thumbnailUrl'] as const) {
      const val = asset[field] as string | undefined;
      if (val && isPresignedUrl(val)) {
        violations.push(`asset.${asset.id}.${field} contains presigned URL`);
      }
    }
    // Check asset.parameters
    if (asset.parameters) {
      const paramsStr = JSON.stringify(asset.parameters);
      const paramsLower = paramsStr.toLowerCase();
      for (const param of PRESIGNED_PARAMS) {
        if (paramsLower.includes(param.toLowerCase())) {
          violations.push(`asset.${asset.id}.parameters contains signature parameter "${param}"`);
          break;
        }
      }
    }
    // Check asset.params
    if (asset.params) {
      const paramsStr = JSON.stringify(asset.params);
      const paramsLower = paramsStr.toLowerCase();
      for (const param of PRESIGNED_PARAMS) {
        if (paramsLower.includes(param.toLowerCase())) {
          violations.push(`asset.${asset.id}.params contains signature parameter "${param}"`);
          break;
        }
      }
    }
  }

  // Check tasks.parameters
  for (const task of db.tasks ?? []) {
    if (task.params) {
      const paramsStr = JSON.stringify(task.params);
      const paramsLower = paramsStr.toLowerCase();
      for (const param of PRESIGNED_PARAMS) {
        if (paramsLower.includes(param.toLowerCase())) {
          violations.push(`task.${task.id}.params contains signature parameter "${param}"`);
          break;
        }
      }
    }
  }

  // Check usageRecords (recorded cost/usage data)
  for (const record of db.usageRecords ?? []) {
    const recordStr = JSON.stringify(record);
    const recordLower = recordStr.toLowerCase();
    for (const param of PRESIGNED_PARAMS) {
      if (recordLower.includes(param.toLowerCase())) {
        violations.push(`usageRecord.${record.id} contains signature parameter "${param}"`);
        break;
      }
    }
  }

  // Check qualityFeedback
  for (const fb of db.qualityFeedback ?? []) {
    const fbStr = JSON.stringify(fb);
    const fbLower = fbStr.toLowerCase();
    for (const param of PRESIGNED_PARAMS) {
      if (fbLower.includes(param.toLowerCase())) {
        violations.push(`qualityFeedback.${fb.id} contains signature parameter "${param}"`);
        break;
      }
    }
  }

  // Check benchmarkRuns
  for (const run of db.benchmarkRuns ?? []) {
    const runStr = JSON.stringify(run);
    const runLower = runStr.toLowerCase();
    for (const param of PRESIGNED_PARAMS) {
      if (runLower.includes(param.toLowerCase())) {
        violations.push(`benchmarkRun.${run.id} contains signature parameter "${param}"`);
        break;
      }
    }
  }

  // Check benchmarkRunItems
  for (const item of db.benchmarkRunItems ?? []) {
    const itemStr = JSON.stringify(item);
    const itemLower = itemStr.toLowerCase();
    for (const param of PRESIGNED_PARAMS) {
      if (itemLower.includes(param.toLowerCase())) {
        violations.push(`benchmarkRunItem.${item.id} contains signature parameter "${param}"`);
        break;
      }
    }
  }

  return { clean: violations.length === 0, violations };
}
