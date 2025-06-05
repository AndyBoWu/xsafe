#!/usr/bin/env node

/**
 * Custom Build Script for XSafe Chrome Extension
 * Handles webpack build and post-processing tasks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DIST_DIR = path.resolve(__dirname, '../dist');
const SRC_DIR = path.resolve(__dirname, '../src');

class XSafeBuildTool {
  constructor() {
    this.mode = process.argv.includes('--production') ? 'production' : 'development';
    this.watch = process.argv.includes('--watch');
    this.analyze = process.argv.includes('--analyze');
  }

  async build() {
    console.log(`🚀 Building XSafe in ${this.mode} mode...`);

    try {
      // Clean dist directory
      this.cleanDist();

      // Run webpack build
      await this.runWebpack();

      // Post-process files
      await this.postProcess();

      // Validate build
      this.validateBuild();

      console.log('✅ Build completed successfully!');

      if (this.mode === 'production') {
        this.showBuildStats();
      }

    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
  }

  cleanDist() {
    console.log('🧹 Cleaning dist directory...');

    if (fs.existsSync(DIST_DIR)) {
      fs.rmSync(DIST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  async runWebpack() {
    console.log('📦 Running webpack...');

    const webpackCmd = [
      'npx webpack',
      `--mode=${this.mode}`,
      this.watch ? '--watch' : '',
      this.analyze ? '--env analyze' : ''
    ].filter(Boolean).join(' ');

    try {
      execSync(webpackCmd, {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..')
      });
    } catch (error) {
      throw new Error(`Webpack build failed: ${error.message}`);
    }
  }

  async postProcess() {
    console.log('🔧 Post-processing files...');

    // Update manifest.json with correct paths
    this.updateManifest();

    // Copy additional assets
    this.copyAssets();

    // Validate file sizes
    this.validateFileSizes();
  }

  updateManifest() {
    const manifestPath = path.join(DIST_DIR, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      throw new Error('manifest.json not found in dist directory');
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // Update paths based on webpack output
    const updates = {
      background: {
        service_worker: 'background.js'
      },
      content_scripts: [{
        matches: ['<all_urls>'],
        js: ['content.js'],
        run_at: 'document_end'
      }],
      action: {
        default_popup: 'popup.html'
      },
      options_page: 'options.html'
    };

    Object.assign(manifest, updates);

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('  ✓ Updated manifest.json');
  }

  copyAssets() {
    // Copy icons if they exist
    const iconsDir = path.resolve(__dirname, '../icons');
    if (fs.existsSync(iconsDir)) {
      const distIconsDir = path.join(DIST_DIR, 'icons');
      fs.mkdirSync(distIconsDir, { recursive: true });

      const iconFiles = fs.readdirSync(iconsDir);
      iconFiles.forEach(file => {
        fs.copyFileSync(
          path.join(iconsDir, file),
          path.join(distIconsDir, file)
        );
      });
      console.log('  ✓ Copied icons');
    }

    // Copy any additional static files
    const staticFiles = ['_locales', 'images'];
    staticFiles.forEach(dir => {
      const srcPath = path.resolve(__dirname, '..', dir);
      if (fs.existsSync(srcPath)) {
        const destPath = path.join(DIST_DIR, dir);
        this.copyDir(srcPath, destPath);
        console.log(`  ✓ Copied ${dir}`);
      }
    });
  }

  copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const files = fs.readdirSync(src);

    files.forEach(file => {
      const srcFile = path.join(src, file);
      const destFile = path.join(dest, file);

      if (fs.statSync(srcFile).isDirectory()) {
        this.copyDir(srcFile, destFile);
      } else {
        fs.copyFileSync(srcFile, destFile);
      }
    });
  }

  validateFileSizes() {
    const maxSizes = {
      'background.js': 1024 * 1024, // 1MB
      'content.js': 1024 * 1024,    // 1MB
      'popup.js': 512 * 1024,       // 512KB
      'options.js': 512 * 1024      // 512KB
    };

    Object.entries(maxSizes).forEach(([file, maxSize]) => {
      const filePath = path.join(DIST_DIR, file);
      if (fs.existsSync(filePath)) {
        const size = fs.statSync(filePath).size;
        if (size > maxSize) {
          console.warn(`⚠️  ${file} is ${(size / 1024).toFixed(1)}KB (max recommended: ${(maxSize / 1024).toFixed(1)}KB)`);
        }
      }
    });
  }

  validateBuild() {
    console.log('🔍 Validating build...');

    const requiredFiles = [
      'manifest.json',
      'background.js',
      'content.js',
      'popup.html',
      'popup.js',
      'popup.css',
      'options.html',
      'options.js',
      'options.css'
    ];

    const missingFiles = requiredFiles.filter(file =>
      !fs.existsSync(path.join(DIST_DIR, file))
    );

    if (missingFiles.length > 0) {
      throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
    }

    // Validate manifest.json
    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(DIST_DIR, 'manifest.json'), 'utf8'));
      if (!manifest.manifest_version || !manifest.name || !manifest.version) {
        throw new Error('Invalid manifest.json structure');
      }
    } catch (error) {
      throw new Error(`Invalid manifest.json: ${error.message}`);
    }

    console.log('  ✓ All required files present');
    console.log('  ✓ Manifest.json is valid');
  }

  showBuildStats() {
    console.log('\n📊 Build Statistics:');

    const files = fs.readdirSync(DIST_DIR);
    let totalSize = 0;

    files.forEach(file => {
      const filePath = path.join(DIST_DIR, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile()) {
        const size = stats.size;
        totalSize += size;

        console.log(`  ${file.padEnd(20)} ${this.formatBytes(size)}`);
      }
    });

    console.log(`  ${'Total'.padEnd(20)} ${this.formatBytes(totalSize)}`);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

// Run build if called directly
if (require.main === module) {
  const buildTool = new XSafeBuildTool();
  buildTool.build().catch(error => {
    console.error('Build failed:', error);
    process.exit(1);
  });
}

module.exports = XSafeBuildTool;
