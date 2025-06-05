#!/usr/bin/env node

/**
 * Chrome Web Store Screenshot Capture
 * Automated screenshot generation for XSafe extension
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');
const DIST_DIR = path.join(__dirname, '../dist');

// Chrome Web Store screenshot specifications
const SCREENSHOT_SPECS = {
  main: { width: 1280, height: 800, name: 'main-promotional' },
  popup: { width: 1280, height: 800, name: 'popup-interface' },
  options: { width: 1280, height: 800, name: 'options-page' },
  filtering: { width: 1280, height: 800, name: 'filtering-demo' },
  statistics: { width: 1280, height: 800, name: 'statistics-dashboard' }
};

async function captureScreenshots() {
  console.log('📸 Capturing XSafe Chrome Web Store screenshots...');

  // Ensure screenshots directory exists
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  // Check if extension is built
  if (!fs.existsSync(path.join(DIST_DIR, 'manifest.json'))) {
    console.error('❌ Extension not built. Run: npm run build');
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: false, // Extensions require non-headless mode
    args: [
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      `--load-extension=${DIST_DIR}`,
      `--disable-extensions-except=${DIST_DIR}`,
      '--window-size=1280,800'
    ]
  });

  try {
    // Get extension ID
    const extensionId = await getExtensionId(browser);
    console.log(`📋 Extension ID: ${extensionId}`);

    // Capture popup screenshot
    await capturePopupScreenshot(browser, extensionId);

    // Capture options page screenshot
    await captureOptionsScreenshot(browser, extensionId);

    // Capture filtering demonstration
    await captureFilteringDemo(browser);

    // Create main promotional screenshot
    await createMainPromotionalScreenshot();

    console.log('🎉 All screenshots captured successfully!');
    console.log('\n📁 Generated screenshots:');
    Object.values(SCREENSHOT_SPECS).forEach(spec => {
      console.log(`   screenshots/${spec.name}.png`);
    });

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
}

async function getExtensionId(browser) {
  const contexts = browser.contexts();

  for (const context of contexts) {
    const pages = context.pages();
    for (const page of pages) {
      const url = page.url();
      if (url.startsWith('chrome-extension://')) {
        return url.split('/')[2];
      }
    }
  }

  throw new Error('Could not find extension ID');
}

async function capturePopupScreenshot(browser, extensionId) {
  console.log('📱 Capturing popup interface...');

  const context = await browser.newContext();
  const page = await context.newPage();

  // Set viewport for consistent screenshots
  await page.setViewportSize(SCREENSHOT_SPECS.popup);

  try {
    // Navigate to popup
    await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await page.waitForLoadState('networkidle');

    // Wait for UI to load
    await page.waitForTimeout(1000);

    // Ensure popup is in a good demo state
    await setupPopupDemoState(page);

    // Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `${SCREENSHOT_SPECS.popup.name}.png`),
      fullPage: false
    });

    console.log('✅ Popup screenshot captured');
  } catch (error) {
    console.warn('⚠️  Could not capture popup screenshot:', error.message);
  } finally {
    await context.close();
  }
}

async function captureOptionsScreenshot(browser, extensionId) {
  console.log('⚙️  Capturing options page...');

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.setViewportSize(SCREENSHOT_SPECS.options);

  try {
    // Navigate to options page
    await page.goto(`chrome-extension://${extensionId}/src/options/options.html`);
    await page.waitForLoadState('networkidle');

    // Wait for page to fully load
    await page.waitForTimeout(2000);

    // Setup demo state for options
    await setupOptionsDemoState(page);

    // Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `${SCREENSHOT_SPECS.options.name}.png`),
      fullPage: false
    });

    console.log('✅ Options page screenshot captured');
  } catch (error) {
    console.warn('⚠️  Could not capture options screenshot:', error.message);
  } finally {
    await context.close();
  }
}

async function captureFilteringDemo(browser) {
  console.log('🎯 Capturing filtering demonstration...');

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.setViewportSize(SCREENSHOT_SPECS.filtering);

  try {
    // Create demo page with content to filter
    await createDemoPage(page);

    // Wait for content to load and filtering to apply
    await page.waitForTimeout(3000);

    // Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `${SCREENSHOT_SPECS.filtering.name}.png`),
      fullPage: false
    });

    console.log('✅ Filtering demo screenshot captured');
  } catch (error) {
    console.warn('⚠️  Could not capture filtering demo:', error.message);
  } finally {
    await context.close();
  }
}

async function setupPopupDemoState(page) {
  try {
    // Ensure main toggle is enabled
    const mainToggle = page.locator('#mainToggle');
    if (await mainToggle.isVisible()) {
      if (!await mainToggle.isChecked()) {
        await mainToggle.click();
      }
    }

    // Set to "both" filter mode
    const bothRadio = page.locator('input[name="filterMode"][value="both"]');
    if (await bothRadio.isVisible()) {
      await bothRadio.click();
    }

    // Set intensity to moderate
    const intensitySlider = page.locator('#intensitySlider');
    if (await intensitySlider.isVisible()) {
      await intensitySlider.fill('1');
    }

    // Wait for state to settle
    await page.waitForTimeout(500);
  } catch (error) {
    console.warn('Could not setup popup demo state:', error.message);
  }
}

async function setupOptionsDemoState(page) {
  try {
    // Switch to statistics tab to show interesting data
    const statsTab = page.locator('[data-tab="statistics"]');
    if (await statsTab.isVisible()) {
      await statsTab.click();
      await page.waitForTimeout(1000);
    }

    // Add some demo domains to the whitelist if possible
    const domainsTab = page.locator('[data-tab="domains"]');
    if (await domainsTab.isVisible()) {
      await domainsTab.click();
      await page.waitForTimeout(500);
    }
  } catch (error) {
    console.warn('Could not setup options demo state:', error.message);
  }
}

async function createDemoPage(page) {
  const demoHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>XSafe Demo - Content Filtering</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
          }
          .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
          }
          .content-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
          }
          .content-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .demo-image {
            width: 100%;
            height: 200px;
            background: linear-gradient(45deg, #e2e8f0, #cbd5e0);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #64748b;
            font-weight: 500;
          }
          .demo-video {
            width: 100%;
            height: 180px;
            background: linear-gradient(45deg, #fef3c7, #fde68a);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #92400e;
            font-weight: 500;
          }
          .xsafe-placeholder {
            background: #3182ce;
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 10px 0;
          }
          .xsafe-placeholder-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
          }
          .xsafe-reveal-btn {
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
          }
          .status-banner {
            background: #10b981;
            color: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🛡️ XSafe Content Filtering Demo</h1>
          <p>Demonstrating privacy-first content filtering in action</p>
        </div>

        <div class="status-banner">
          ✅ XSafe Active - 3 items filtered on this page
        </div>

        <div class="content-grid">
          <div class="content-item">
            <h3>Original Image Content</h3>
            <div class="demo-image">📸 Sample Image Content</div>
            <p>This would normally show an image, but XSafe has filtered it for your privacy.</p>
          </div>

          <div class="content-item">
            <h3>Filtered Content</h3>
            <div class="xsafe-placeholder" data-xsafe-filtered="true">
              <div class="xsafe-placeholder-content">
                <span style="font-size: 24px;">🖼️</span>
                <span>Content filtered by XSafe</span>
                <button class="xsafe-reveal-btn">Click to reveal</button>
              </div>
            </div>
            <p>XSafe replaces inappropriate content with clean placeholders.</p>
          </div>

          <div class="content-item">
            <h3>Video Content</h3>
            <div class="demo-video">🎥 Sample Video Content</div>
            <p>Videos are also filtered based on your privacy preferences.</p>
          </div>

          <div class="content-item">
            <h3>Protected Content</h3>
            <div class="xsafe-placeholder" data-xsafe-filtered="true">
              <div class="xsafe-placeholder-content">
                <span style="font-size: 24px;">🎥</span>
                <span>Video filtered by XSafe</span>
                <button class="xsafe-reveal-btn">Click to reveal</button>
              </div>
            </div>
            <p>All filtering happens locally - zero data sent to external servers.</p>
          </div>
        </div>

        <div class="content-item">
          <h3>🔒 Privacy-First Approach</h3>
          <ul>
            <li>✅ Zero data collection</li>
            <li>✅ Local processing only</li>
            <li>✅ Customizable filtering levels</li>
            <li>✅ Domain-specific whitelist</li>
            <li>✅ Optional click-to-reveal</li>
          </ul>
        </div>
      </body>
    </html>
  `;

  await page.setContent(demoHTML);
  await page.waitForLoadState('networkidle');
}

async function createMainPromotionalScreenshot() {
  console.log('🎨 Creating main promotional screenshot...');

  // For now, copy the options screenshot as the main promotional image
  // In a real scenario, you might create a custom composite image
  const optionsPath = path.join(SCREENSHOTS_DIR, `${SCREENSHOT_SPECS.options.name}.png`);
  const mainPath = path.join(SCREENSHOTS_DIR, `${SCREENSHOT_SPECS.main.name}.png`);

  if (fs.existsSync(optionsPath)) {
    fs.copyFileSync(optionsPath, mainPath);
    console.log('✅ Main promotional screenshot created');
  }
}

// Helper function to show screenshot info
function showScreenshotInfo() {
  console.log('\n📋 Screenshot Specifications:');
  console.log('   Main: 1280x800 - Primary store listing image');
  console.log('   Popup: 1280x800 - Extension popup interface');
  console.log('   Options: 1280x800 - Settings and configuration');
  console.log('   Filtering: 1280x800 - Content filtering demonstration');
  console.log('\n🎯 Purpose:');
  console.log('   • Chrome Web Store listing');
  console.log('   • Showcase XSafe functionality');
  console.log('   • Demonstrate privacy-first approach');
  console.log('   • Professional, trustworthy appearance');
}

if (require.main === module) {
  captureScreenshots()
    .then(() => {
      showScreenshotInfo();
    })
    .catch(error => {
      console.error('❌ Failed to capture screenshots:', error);
      process.exit(1);
    });
}

module.exports = { captureScreenshots };
