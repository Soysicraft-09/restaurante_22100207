import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const imagesDir = path.resolve('public', 'img');
const maxWidth = 1200;
const quality = 72;

const entries = await fs.readdir(imagesDir, { withFileTypes: true });
const files = entries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => /\.(png|jpe?g)$/i.test(name));

let optimizedCount = 0;

for (const fileName of files) {
  const inputPath = path.join(imagesDir, fileName);
  const parsed = path.parse(fileName);
  const outputName = `${parsed.name}.webp`;
  const outputPath = path.join(imagesDir, outputName);

  const image = sharp(inputPath, { failOn: 'none' });
  const metadata = await image.metadata();

  const resizeWidth = metadata.width && metadata.width > maxWidth ? maxWidth : metadata.width;

  await image
    .resize({ width: resizeWidth, withoutEnlargement: true })
    .webp({ quality, effort: 6 })
    .toFile(outputPath);

  optimizedCount += 1;
}

console.log(`Optimized ${optimizedCount} images to WebP in ${imagesDir}`);
console.log('Source files were kept to avoid lock issues while development servers are running.');
