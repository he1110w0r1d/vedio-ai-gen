import { createId } from './id.js';
import zlib from 'node:zlib';

// Pre-computed minimal 1x1 pixel PNG files in various colors.
// These are valid PNG files that can be used as seed reference images.
// Generated using: a valid PNG IHDR + IDAT (deflated raw pixel data) + IEND structure.

function createSolidColorPng(r: number, g: number, b: number, size = 256): Buffer {
  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk: width=size, height=size, bit_depth=8, color_type=2 (RGB)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); // width
  ihdrData.writeUInt32BE(size, 4); // height
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type: RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = createPngChunk('IHDR', ihdrData);

  // IDAT Chunk: raw pixel data with filter byte 0 per row, then deflate
  const rawData = Buffer.alloc(size * (1 + 3 * size)); // filter byte + RGB per row
  for (let y = 0; y < size; y++) {
    const rowOffset = y * (1 + 3 * size);
    rawData[rowOffset] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const px = rowOffset + 1 + x * 3;
      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
    }
  }
  const compressed = zlib.deflateSync(rawData);
  const idat = createPngChunk('IDAT', compressed);

  // IEND Chunk
  const iend = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createPngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcInput);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 implementation for PNG chunks
function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export type SeedImageDef = {
  id: string;
  title: string;
  color: [number, number, number]; // RGB
  description: string;
};

export const SEED_IMAGE_DEFS: SeedImageDef[] = [
  {
    id: 'asset_seed_waterdrop',
    title: '水滴 Logo 种子图',
    color: [70, 130, 200], // Steel blue - water theme
    description: '水滴 Logo 种子参考图片，用于 I2V / R2V 基准测试',
  },
  {
    id: 'asset_seed_bottle',
    title: '产品瓶 种子图',
    color: [100, 180, 140], // Soft green - product/bottle theme
    description: '产品瓶种子参考图片，用于 I2V / R2V 基准测试',
  },
  {
    id: 'asset_seed_dashboard',
    title: '仪表盘 UI 种子图',
    color: [30, 50, 100], // Dark navy - dashboard/tech theme
    description: '仪表盘 UI 种子参考图片，用于 I2V / R2V 基准测试',
  },
];

/**
 * Generate a seed PNG buffer for each definition.
 * Returns a map of assetId → Buffer.
 */
export function generateSeedPngBuffers(): Map<string, Buffer> {
  const map = new Map<string, Buffer>();
  for (const def of SEED_IMAGE_DEFS) {
    const [r, g, b] = def.color;
    map.set(def.id, createSolidColorPng(r, g, b));
  }
  return map;
}
