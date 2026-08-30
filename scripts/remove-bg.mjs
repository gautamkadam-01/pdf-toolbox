import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
const files = [
  'logo.png',
  'logo-transparent.png',
  'logo-bold-tagline.png',
  'logo-bottom.png',
  'logo-enhanced.png',
  'logo-sharp.png',
  'pdf-toolbox-logo.png'
];

async function removeWhiteBackground(filename) {
  const filePath = path.join(publicDir, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  const image = sharp(filePath);
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  
  const { width, height, channels } = info;
  console.log(`Processing ${filename}: ${width}x${height}, channels: ${channels}`);

  // Create a copy of buffer
  const outBuffer = Buffer.from(data);

  // We want to turn white/near-white pixels transparent.
  // Also perform smooth anti-aliased alpha edge transition so there's no halo or jagged edges.
  for (let i = 0; i < outBuffer.length; i += channels) {
    const r = outBuffer[i];
    const g = outBuffer[i + 1];
    const b = outBuffer[i + 2];
    const a = outBuffer[i + 3];

    if (a === 0) continue;

    // Calculate brightness and saturation/whiteness
    // If r, g, b are all high (e.g. > 235) and close to each other (low saturation)
    const minC = Math.min(r, g, b);
    const maxC = Math.max(r, g, b);
    const diff = maxC - minC;

    // Check if pixel is background white / light gray / near-white
    if (minC >= 245 && diff <= 15) {
      outBuffer[i + 3] = 0; // completely transparent
    } else if (minC >= 210 && diff <= 25) {
      // Soft transition falloff for smooth anti-aliased edges
      const factor = (minC - 210) / (245 - 210); // 0 to 1
      const newAlpha = Math.round(a * (1 - factor * factor));
      outBuffer[i + 3] = Math.min(a, newAlpha);
    }
  }

  // Also trim excess transparent borders nicely
  const processedImage = sharp(outBuffer, {
    raw: {
      width,
      height,
      channels
    }
  });

  // Save to temporary file first then overwrite
  const tempPath = path.join(publicDir, `_temp_${filename}`);
  await processedImage.png({ compressionLevel: 9 }).toFile(tempPath);
  fs.renameSync(tempPath, filePath);
  console.log(`Successfully removed white background from ${filename}`);
}

async function run() {
  for (const f of files) {
    try {
      await removeWhiteBackground(f);
    } catch (err) {
      console.error(`Error processing ${f}:`, err);
    }
  }
}

run();
