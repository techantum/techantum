import sharp from 'sharp';

const MAX_WIDTH = 1920;
const WEBP_QUALITY = 82;

export interface OptimizedImage {
  buffer: Buffer;
  ext: 'webp' | 'png' | 'gif' | 'svg';
  contentType: string;
}

/** Resize and compress raster images on upload. SVG/GIF pass through unchanged. */
export async function optimizeUploadedImage(
  input: Buffer,
  mimeType: string
): Promise<OptimizedImage> {
  if (mimeType === 'image/svg+xml') {
    return { buffer: input, ext: 'svg', contentType: 'image/svg+xml' };
  }

  if (mimeType === 'image/gif') {
    return { buffer: input, ext: 'gif', contentType: 'image/gif' };
  }

  const pipeline = sharp(input, { failOn: 'none' })
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true });

  if (mimeType === 'image/png') {
    const hasAlpha = await sharp(input).metadata().then((m) => m.hasAlpha);
    if (hasAlpha) {
      const buffer = await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer();
      return { buffer, ext: 'png', contentType: 'image/png' };
    }
  }

  const buffer = await pipeline.webp({ quality: WEBP_QUALITY, effort: 4 }).toBuffer();
  return { buffer, ext: 'webp', contentType: 'image/webp' };
}
