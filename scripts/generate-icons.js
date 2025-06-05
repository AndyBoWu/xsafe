#!/usr/bin/env node

/**
 * Generate Chrome Extension Icons
 * Converts SVG master icon to required PNG sizes
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available, if not provide instructions
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.log('📦 Installing sharp for icon generation...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install sharp --save-dev', { stdio: 'inherit' });
    sharp = require('sharp');
    console.log('✅ Sharp installed successfully!');
  } catch (installError) {
    console.error('❌ Failed to install sharp. Please run: npm install sharp --save-dev');
    process.exit(1);
  }
}

const ICON_SIZES = [16, 48, 128];
const SVG_PATH = path.join(__dirname, '../icons/icon.svg');
const ICONS_DIR = path.join(__dirname, '../icons');

async function generateIcons() {
  console.log('🎨 Generating XSafe extension icons...');

  // Ensure icons directory exists
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  // Check if SVG exists
  if (!fs.existsSync(SVG_PATH)) {
    console.error('❌ SVG icon not found at:', SVG_PATH);
    process.exit(1);
  }

  try {
    // Read SVG file
    const svgBuffer = fs.readFileSync(SVG_PATH);

    // Generate PNG icons for each required size
    const promises = ICON_SIZES.map(async (size) => {
      const outputPath = path.join(ICONS_DIR, `icon-${size}.png`);

      await sharp(svgBuffer)
        .resize(size, size)
        .png({
          quality: 100,
          compressionLevel: 9,
          adaptiveFiltering: true
        })
        .toFile(outputPath);

      console.log(`✅ Generated ${size}x${size} icon: icon-${size}.png`);
      return { size, path: outputPath };
    });

    await Promise.all(promises);

    // Generate favicon.ico for web use
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(ICONS_DIR, 'favicon.png'));

    console.log('✅ Generated favicon.png (32x32)');

    // Copy SVG to dist folder for manifest
    const distIconsDir = path.join(__dirname, '../dist/icons');
    if (!fs.existsSync(distIconsDir)) {
      fs.mkdirSync(distIconsDir, { recursive: true });
    }

    // Copy all generated icons to dist
    ICON_SIZES.forEach(size => {
      const sourcePath = path.join(ICONS_DIR, `icon-${size}.png`);
      const destPath = path.join(distIconsDir, `icon-${size}.png`);
      fs.copyFileSync(sourcePath, destPath);
    });

    console.log('✅ Copied icons to dist folder');

    // Update manifest.json with icon paths
    updateManifest();

    console.log('🎉 All icons generated successfully!');
    console.log('\n📁 Generated files:');
    ICON_SIZES.forEach(size => {
      console.log(`   icons/icon-${size}.png`);
    });
    console.log('   icons/favicon.png');

  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

function updateManifest() {
  const manifestPath = path.join(__dirname, '../dist/manifest.json');

  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      // Update icons section
      manifest.icons = {
        "16": "icons/icon-16.png",
        "48": "icons/icon-48.png",
        "128": "icons/icon-128.png"
      };

      // Update action icon
      if (manifest.action) {
        manifest.action.default_icon = {
          "16": "icons/icon-16.png",
          "48": "icons/icon-48.png",
          "128": "icons/icon-128.png"
        };
      }

      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log('✅ Updated manifest.json with icon paths');
    } catch (error) {
      console.warn('⚠️  Could not update manifest.json:', error.message);
    }
  }
}

// Show icon preview information
function showIconInfo() {
  console.log('\n📋 Icon Usage:');
  console.log('   16x16  - Browser toolbar, context menus');
  console.log('   48x48  - Extensions management page');
  console.log('   128x128 - Chrome Web Store, installation');
  console.log('\n🎨 Design Features:');
  console.log('   • Shield motif for protection/security');
  console.log('   • Clean "X" typography for XSafe branding');
  console.log('   • Privacy-focused blue gradient');
  console.log('   • Scalable vector design');
  console.log('   • Professional appearance');
}

if (require.main === module) {
  generateIcons()
    .then(() => {
      showIconInfo();
    })
    .catch(error => {
      console.error('❌ Failed to generate icons:', error);
      process.exit(1);
    });
}

module.exports = { generateIcons };
