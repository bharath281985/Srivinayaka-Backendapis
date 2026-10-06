import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const toInt = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const shouldOptimize = (file) => {
  const type = (file?.mimetype || '').toLowerCase();
  if (!type.startsWith('image/')) return false;

  // Avoid breaking animated GIFs and SVGs.
  if (type === 'image/gif' || type === 'image/svg+xml') return false;

  return true;
};

const optimizeImageUpload = async (filePath, opts = {}) => {
  const {
    format = (process.env.UPLOAD_IMAGE_FORMAT || 'webp').toLowerCase(),
    quality = toInt(process.env.UPLOAD_IMAGE_QUALITY, 80),
    maxWidth = toInt(process.env.UPLOAD_IMAGE_MAX_WIDTH, 1600),
    maxHeight = toInt(process.env.UPLOAD_IMAGE_MAX_HEIGHT, 1600),
    keepOriginal = String(process.env.UPLOAD_KEEP_ORIGINAL || 'false').toLowerCase() === 'true',
  } = opts;

  const parsed = path.parse(filePath);
  const outExt = format === 'jpeg' ? '.jpg' : `.${format}`;
  const outPath =
    parsed.ext.toLowerCase() === outExt ? filePath : path.join(parsed.dir, `${parsed.name}${outExt}`);

  await sharp(filePath)
    .rotate()
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toFormat(format, { quality })
    .toFile(outPath);

  if (!keepOriginal && outPath !== filePath) {
    await fs.unlink(filePath).catch(() => {});
  }

  return outPath;
};

export { shouldOptimize, optimizeImageUpload };

