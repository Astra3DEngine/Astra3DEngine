/**
 * 图标生成脚本
 * 
 * 从 SVG 源文件生成各平台所需的图标格式：
 * - Windows: .ico (包含多种尺寸)
 * - macOS: .icns (需要 iconset 目录)
 * - Linux: PNG 文件 (多种尺寸)
 * 
 * 使用方法: pnpm run icon:generate
 */

import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const ELECTRON_DIR = path.join(ROOT_DIR, 'electron');
const SVG_SOURCE = path.join(ROOT_DIR, 'src', 'icon.svg');

const ICON_SIZES = [16, 32, 48, 64, 128, 256, 512, 1024];

async function generatePngIcons() {
  console.log('Generating PNG icons from SVG...');
  
  const pngBuffers = {};
  
  for (const size of ICON_SIZES) {
    const outputPath = path.join(ELECTRON_DIR, `icon-${size}.png`);
    const buffer = await sharp(SVG_SOURCE)
      .resize(size, size)
      .png()
      .toBuffer();
    
    pngBuffers[size] = buffer;
    await fs.writeFile(outputPath, buffer);
    console.log(`  Created: icon-${size}.png`);
  }
  
  return pngBuffers;
}

async function generateWindowsIco(pngBuffers) {
  console.log('Generating Windows .ico file...');
  
  const icoSizes = [16, 32, 48, 64, 128, 256];
  const pngFiles = icoSizes.map(size => pngBuffers[size]);
  
  const icoBuffer = await pngToIco(pngFiles);
  const outputPath = path.join(ELECTRON_DIR, 'icon.ico');
  
  await fs.writeFile(outputPath, icoBuffer);
  console.log(`  Created: icon.ico`);
}

async function generateMacIconset(pngBuffers) {
  console.log('Generating macOS iconset...');
  
  const iconsetDir = path.join(ELECTRON_DIR, 'icon.iconset');
  await fs.mkdir(iconsetDir, { recursive: true });
  
  const iconsetMappings = [
    { size: 16, name: 'icon_16x16.png' },
    { size: 32, name: 'icon_16x16@2x.png' },
    { size: 32, name: 'icon_32x32.png' },
    { size: 64, name: 'icon_32x32@2x.png' },
    { size: 128, name: 'icon_128x128.png' },
    { size: 256, name: 'icon_128x128@2x.png' },
    { size: 256, name: 'icon_256x256.png' },
    { size: 512, name: 'icon_256x256@2x.png' },
    { size: 512, name: 'icon_512x512.png' },
    { size: 1024, name: 'icon_512x512@2x.png' },
  ];
  
  for (const mapping of iconsetMappings) {
    const outputPath = path.join(iconsetDir, mapping.name);
    await fs.writeFile(outputPath, pngBuffers[mapping.size]);
    console.log(`  Created: ${mapping.name}`);
  }
  
  // 在 macOS 上自动生成 .icns 文件
  if (process.platform === 'darwin') {
    console.log('\n  Converting iconset to .icns using iconutil...');
    const icnsPath = path.join(ELECTRON_DIR, 'icon.icns');
    const { execSync } = require('child_process');
    try {
      execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`);
      console.log(`  Created: icon.icns`);
    } catch (error) {
      console.error('  Warning: Failed to create .icns file:', error.message);
    }
  } else {
    console.log('\n  Note: To create .icns file, run on macOS:');
    console.log('    iconutil -c icns electron/icon.iconset');
    console.log('\n  Or use online tools like:');
    console.log('    https://cloudconvert.com/png-to-icns');
  }
}

async function generateLinuxIcons(pngBuffers) {
  console.log('Generating Linux icons directory...');
  
  const linuxDir = path.join(ELECTRON_DIR, 'icons');
  await fs.mkdir(linuxDir, { recursive: true });
  
  const linuxSizes = [16, 32, 48, 64, 128, 256, 512];
  
  for (const size of linuxSizes) {
    const outputPath = path.join(linuxDir, `${size}x${size}.png`);
    await fs.writeFile(outputPath, pngBuffers[size]);
    console.log(`  Created: ${size}x${size}.png`);
  }
}

async function copyMainIcon(pngBuffers) {
  console.log('Copying main icon.png (256px)...');
  const outputPath = path.join(ELECTRON_DIR, 'icon.png');
  await fs.writeFile(outputPath, pngBuffers[256]);
  console.log(`  Updated: icon.png`);
}

async function main() {
  try {
    console.log('=== Astra 3D Engine Icon Generator ===\n');
    
    const pngBuffers = await generatePngIcons();
    
    await copyMainIcon(pngBuffers);
    await generateWindowsIco(pngBuffers);
    await generateMacIconset(pngBuffers);
    await generateLinuxIcons(pngBuffers);
    
    console.log('\n=== Icon generation complete! ===');
    console.log('\nGenerated files:');
    console.log('  - electron/icon.ico (Windows)');
    console.log('  - electron/icon.iconset/ (macOS - needs conversion to .icns)');
    console.log('  - electron/icons/ (Linux)');
    console.log('  - electron/icon.png (256px main icon)');
    
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

main();