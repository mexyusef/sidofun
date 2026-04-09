import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { NormalizedScreenConfig } from '../../config/constants.js';
import type { ScreenshotResult } from '../windows-nutjs.js';

export async function normalizeScreenshotResult(
  screenshot: ScreenshotResult,
  target: NormalizedScreenConfig,
  options: {
    format?: string;
    filename?: string;
    returnBase64?: boolean;
  } = {}
): Promise<ScreenshotResult> {
  if (!screenshot.filepath) {
    throw new Error('Screenshot filepath is required for normalization');
  }

  const format = options.format || screenshot.format || 'png';
  const outputPath = options.filename
    ? path.resolve(process.cwd(), options.filename)
    : screenshot.filepath;

  const buffer = await sharp(screenshot.filepath)
    .resize(target.width, target.height, { fit: 'fill' })
    .toFormat(format === 'jpg' ? 'jpeg' : 'png')
    .toBuffer();

  await fs.writeFile(outputPath, buffer);

  if (outputPath !== screenshot.filepath) {
    await fs.unlink(screenshot.filepath).catch(() => undefined);
  }

  const result: ScreenshotResult = {
    filepath: outputPath,
    width: target.width,
    height: target.height,
    format
  };

  if (options.returnBase64) {
    const outputBuffer = await fs.readFile(outputPath);
    result.data = `data:image/${format};base64,${outputBuffer.toString('base64')}`;
  }

  return result;
}
