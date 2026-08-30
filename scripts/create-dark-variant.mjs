import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');

async function createDarkVariant() {
  const filePath = path.join(publicDir, 'logo.png');
  const image = sharp(filePath);
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  
  const { width, height, channels } = info;
  const outBuffer = Buffer.from(data);

  // Turn dark text/elements into crisp white/light for dark backgrounds while keeping red/colored icon
  for (let i = 0; i < outBuffer.length; i += channels) {
    const r = outBuffer[i];
    const g = outBuffer[i + 1];
    const b = outBuffer[i + 2];
    const a = outBuffer[i + 3];

    if (a < 20) continue;

    // Check if pixel is dark text/grey (low saturation, low luminance)
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const diff = maxC - minC;

    // Dark neutral pixel (text)
    if (maxC < 140 && diff < 30) {
      // Invert to white while retaining alpha
      outBuffer[i] = 255;
      outBuffer[i + 1] = 255;
      outBuffer[i + 2] = 255;
    }
  }

  const darkImage = sharp(outBuffer, {
    raw: {
      width,
      height,
      channels
    }
  });

  await darkImage.png({ compressionLevel: 9 }).toFile(path.join(publicDir, 'logo-dark.png'));
  console.log('Successfully created logo-dark.png for dark surfaces');
}

createDarkVariant();
