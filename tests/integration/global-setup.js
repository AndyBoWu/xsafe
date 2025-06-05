/**
 * Playwright Global Setup
 * Prepares XSafe extension for integration testing
 */

import { chromium } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function globalSetup() {
  console.log('🔧 Setting up XSafe extension for testing...');

  // Build the extension for testing
  console.log('📦 Building extension...');
  try {
    execSync('npm run build:dev', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Failed to build extension:', error.message);
    throw error;
  }

  // Verify build output
  const distPath = path.resolve('./dist');
  const requiredFiles = [
    'manifest.json',
    'background.js',
    'content.js',
    'popup.html',
    'popup.js',
    'options.html',
    'options.js'
  ];

  console.log('🔍 Verifying build output...');
  for (const file of requiredFiles) {
    const filePath = path.join(distPath, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Required file missing: ${file}`);
    }
  }

  // Validate manifest.json
  console.log('📋 Validating manifest...');
  const manifestPath = path.join(distPath, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  if (!manifest.manifest_version || !manifest.name || !manifest.version) {
    throw new Error('Invalid manifest.json structure');
  }

  // Test browser launch with extension
  console.log('🌐 Testing browser launch with extension...');
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      `--load-extension=${distPath}`,
      `--disable-extensions-except=${distPath}`
    ]
  });

  // Get extension ID from background page
  const contexts = browser.contexts();
  let extensionId = null;

  for (const context of contexts) {
    const pages = context.pages();
    for (const page of pages) {
      const url = page.url();
      if (url.startsWith('chrome-extension://')) {
        extensionId = url.split('/')[2];
        break;
      }
    }
  }

  await browser.close();

  if (extensionId) {
    // Store extension ID for tests
    process.env.XSAFE_EXTENSION_ID = extensionId;
    console.log(`✅ Extension loaded successfully (ID: ${extensionId})`);
  } else {
    console.warn('⚠️  Could not determine extension ID');
  }

  console.log('✅ Setup completed successfully!');
}

export default globalSetup;
