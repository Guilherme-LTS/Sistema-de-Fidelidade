import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputLogo = path.join(__dirname, '../public/logo-principal.png');
const appDir = path.join(__dirname, '../src/app');
const publicDir = path.join(__dirname, '../public');

async function generateIcons() {
  console.log('Generating icons...');
  
  if (!fs.existsSync(appDir)) {
    fs.mkdirSync(appDir, { recursive: true });
  }
  
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  try {
    // 1. Generate icon.png (32x32) for App Router default
    await sharp(inputLogo)
      .resize(32, 32)
      .toFile(path.join(appDir, 'icon.png'));
    console.log('Created app/icon.png (32x32)');

    // 2. Generate apple-icon.png (180x180)
    await sharp(inputLogo)
      .resize(180, 180)
      .toFile(path.join(appDir, 'apple-icon.png'));
    console.log('Created app/apple-icon.png (180x180)');

    // 3. Generate android-chrome-192x192.png and android-chrome-512x512.png for PWA in public/
    await sharp(inputLogo)
      .resize(192, 192)
      .toFile(path.join(publicDir, 'android-chrome-192x192.png'));
    console.log('Created public/android-chrome-192x192.png');

    await sharp(inputLogo)
      .resize(512, 512)
      .toFile(path.join(publicDir, 'android-chrome-512x512.png'));
    console.log('Created public/android-chrome-512x512.png');

    // 4. Generate multi-resolution favicon.ico
    // Generate temp pngs for ico
    const temp16 = path.join(__dirname, 'temp-16.png');
    const temp32 = path.join(__dirname, 'temp-32.png');
    const temp48 = path.join(__dirname, 'temp-48.png');

    await sharp(inputLogo).resize(16, 16).toFile(temp16);
    await sharp(inputLogo).resize(32, 32).toFile(temp32);
    await sharp(inputLogo).resize(48, 48).toFile(temp48);

    const buf = await pngToIco([temp16, temp32, temp48]);
    fs.writeFileSync(path.join(appDir, 'favicon.ico'), buf);
    console.log('Created app/favicon.ico (16x16, 32x32, 48x48)');

    // Cleanup temp files
    fs.unlinkSync(temp16);
    fs.unlinkSync(temp32);
    fs.unlinkSync(temp48);

    console.log('All icons generated successfully!');
  } catch (err) {
    console.error('Error generating icons:', err);
  }
}

generateIcons();
