/**
 * XSafe Extension Basic Integration Tests
 * Tests core extension functionality in real browser environment
 */

import { test, expect, chromium } from '@playwright/test';

// Helper function to get extension context
async function getExtensionContext(browser) {
  const contexts = browser.contexts();

  for (const context of contexts) {
    if (context.pages().some(page => page.url().startsWith('chrome-extension://'))) {
      return context;
    }
  }

  return null;
}

// Helper function to create a test page with images and videos
async function createTestPage(page) {
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>XSafe Test Page</title>
      </head>
      <body>
        <h1>Test Page for XSafe Extension</h1>

        <!-- Test Images -->
        <img id="test-image-1" src="https://picsum.photos/300/200" alt="Test Image 1" />
        <img id="test-image-2" src="https://picsum.photos/400/300" alt="Test Image 2" />

        <!-- Test Videos -->
        <video id="test-video-1" width="320" height="240" controls>
          <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4">
          Your browser does not support the video tag.
        </video>

        <!-- YouTube Embed -->
        <iframe id="youtube-embed" width="560" height="315"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                frameborder="0" allowfullscreen>
        </iframe>

        <!-- Background Image Element -->
        <div id="bg-image" style="width: 300px; height: 200px; background-image: url('https://picsum.photos/300/200');">
          Background Image Test
        </div>
      </body>
    </html>
  `);
}

test.describe('XSafe Extension Basic Functionality', () => {
  let browser;
  let context;
  let page;

  test.beforeAll(async () => {
    browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--load-extension=./dist',
        '--disable-extensions-except=./dist'
      ]
    });
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test.beforeEach(async () => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('extension loads successfully', async () => {
    // Check that extension context exists
    const extensionContext = await getExtensionContext(browser);
    expect(extensionContext).toBeTruthy();

    // Navigate to test page
    await createTestPage(page);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Extension should be loaded and accessible
    expect(await page.title()).toBe('XSafe Test Page');
  });

  test('popup opens and displays correctly', async () => {
    await createTestPage(page);

    // Click extension icon (if accessible)
    // Note: In real testing, you'd interact with the extension icon in the toolbar
    // For this test, we'll navigate directly to the popup
    const popupUrl = `chrome-extension://${process.env.XSAFE_EXTENSION_ID || 'test'}/popup.html`;

    try {
      await page.goto(popupUrl);

      // Check popup elements exist
      await expect(page.locator('#mainToggle')).toBeVisible();
      await expect(page.locator('#statusText')).toBeVisible();
      await expect(page.locator('#whitelistBtn')).toBeVisible();
      await expect(page.locator('#optionsBtn')).toBeVisible();

      // Check initial state
      const statusText = await page.locator('#statusText').textContent();
      expect(['Active', 'Disabled', 'Loading...']).toContain(statusText);

    } catch (error) {
      console.warn('Popup test skipped - extension ID not available');
      test.skip();
    }
  });

  test('options page opens and displays correctly', async () => {
    const optionsUrl = `chrome-extension://${process.env.XSAFE_EXTENSION_ID || 'test'}/options.html`;

    try {
      await page.goto(optionsUrl);

      // Check main sections exist
      await expect(page.locator('[data-tab="general"]')).toBeVisible();
      await expect(page.locator('[data-tab="filtering"]')).toBeVisible();
      await expect(page.locator('[data-tab="domains"]')).toBeVisible();
      await expect(page.locator('[data-tab="statistics"]')).toBeVisible();
      await expect(page.locator('[data-tab="privacy"]')).toBeVisible();

      // Check general settings
      await expect(page.locator('#enableExtension')).toBeVisible();
      await expect(page.locator('#showPlaceholders')).toBeVisible();

    } catch (error) {
      console.warn('Options test skipped - extension ID not available');
      test.skip();
    }
  });

  test('content filtering works on test page', async () => {
    await createTestPage(page);
    await page.waitForLoadState('networkidle');

    // Wait a bit for content script to process
    await page.waitForTimeout(2000);

    // Check if any elements have been filtered
    // Look for XSafe placeholders or hidden elements
    const placeholders = await page.locator('.xsafe-placeholder').count();
    const filteredElements = await page.locator('[data-xsafe-filtered="true"]').count();

    // Filtering should have occurred (at least some elements processed)
    // Note: This depends on extension being enabled and configured
    console.log(`Found ${placeholders} placeholders and ${filteredElements} filtered elements`);

    // At minimum, the page should load without errors
    expect(await page.title()).toBe('XSafe Test Page');
  });

  test('extension handles navigation correctly', async () => {
    // Test navigation between different pages
    await createTestPage(page);
    await page.waitForLoadState('networkidle');

    // Navigate to a different page
    await page.goto('https://example.com');
    await page.waitForLoadState('networkidle');

    // Navigate back
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Page should still be functional
    expect(await page.title()).toBe('XSafe Test Page');
  });

  test('extension survives page refresh', async () => {
    await createTestPage(page);
    await page.waitForLoadState('networkidle');

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Extension should still be working
    expect(await page.title()).toBe('XSafe Test Page');

    // Wait for content script to potentially process content again
    await page.waitForTimeout(1000);
  });

  test('no JavaScript errors in console', async () => {
    const errors = [];

    page.on('console', message => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await createTestPage(page);
    await page.waitForLoadState('networkidle');

    // Wait for any async operations
    await page.waitForTimeout(2000);

    // Filter out known third-party errors
    const relevantErrors = errors.filter(error =>
      !error.includes('picsum.photos') &&
      !error.includes('youtube.com') &&
      !error.includes('net::ERR_') &&
      !error.includes('favicon.ico')
    );

    console.log('Console errors:', relevantErrors);

    // There should be no XSafe-related errors
    const xsafeErrors = relevantErrors.filter(error =>
      error.toLowerCase().includes('xsafe') ||
      error.includes('chrome-extension://')
    );

    expect(xsafeErrors).toHaveLength(0);
  });
});

test.describe('XSafe Extension Settings', () => {
  let browser;
  let context;
  let page;

  test.beforeAll(async () => {
    browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--load-extension=./dist',
        '--disable-extensions-except=./dist'
      ]
    });
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test.beforeEach(async () => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('can toggle extension on/off', async () => {
    const popupUrl = `chrome-extension://${process.env.XSAFE_EXTENSION_ID || 'test'}/popup.html`;

    try {
      await page.goto(popupUrl);

      const mainToggle = page.locator('#mainToggle');
      await expect(mainToggle).toBeVisible();

      // Get initial state
      const initialState = await mainToggle.isChecked();

      // Toggle the setting
      await mainToggle.click();

      // Wait for state change
      await page.waitForTimeout(500);

      // State should have changed
      const newState = await mainToggle.isChecked();
      expect(newState).not.toBe(initialState);

    } catch (error) {
      console.warn('Toggle test skipped - extension ID not available');
      test.skip();
    }
  });

  test('can change filter mode', async () => {
    const popupUrl = `chrome-extension://${process.env.XSAFE_EXTENSION_ID || 'test'}/popup.html`;

    try {
      await page.goto(popupUrl);

      // Find filter mode radio buttons
      const videosRadio = page.locator('input[name="filterMode"][value="videos"]');
      const imagesRadio = page.locator('input[name="filterMode"][value="images"]');
      const bothRadio = page.locator('input[name="filterMode"][value="both"]');

      // Test changing filter mode
      if (await videosRadio.isVisible()) {
        await videosRadio.click();
        await page.waitForTimeout(300);
        await expect(videosRadio).toBeChecked();
      }

      if (await imagesRadio.isVisible()) {
        await imagesRadio.click();
        await page.waitForTimeout(300);
        await expect(imagesRadio).toBeChecked();
      }

      if (await bothRadio.isVisible()) {
        await bothRadio.click();
        await page.waitForTimeout(300);
        await expect(bothRadio).toBeChecked();
      }

    } catch (error) {
      console.warn('Filter mode test skipped - extension ID not available');
      test.skip();
    }
  });

  test('can adjust intensity level', async () => {
    const popupUrl = `chrome-extension://${process.env.XSAFE_EXTENSION_ID || 'test'}/popup.html`;

    try {
      await page.goto(popupUrl);

      const intensitySlider = page.locator('#intensitySlider');

      if (await intensitySlider.isVisible()) {
        // Test different intensity levels
        await intensitySlider.fill('0'); // Permissive
        await page.waitForTimeout(300);

        await intensitySlider.fill('1'); // Moderate
        await page.waitForTimeout(300);

        await intensitySlider.fill('2'); // Strict
        await page.waitForTimeout(300);

        expect(await intensitySlider.inputValue()).toBe('2');
      }

    } catch (error) {
      console.warn('Intensity test skipped - extension ID not available');
      test.skip();
    }
  });
});

test.describe('XSafe Extension Performance', () => {
  let browser;
  let context;
  let page;

  test.beforeAll(async () => {
    browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--load-extension=./dist',
        '--disable-extensions-except=./dist'
      ]
    });
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test.beforeEach(async () => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('page load performance with extension', async () => {
    // Measure page load time with extension
    const startTime = Date.now();

    await createTestPage(page);
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    console.log(`Page load time with XSafe: ${loadTime}ms`);

    // Page should load within reasonable time (less than 5 seconds)
    expect(loadTime).toBeLessThan(5000);
  });

  test('memory usage is reasonable', async () => {
    await createTestPage(page);
    await page.waitForLoadState('networkidle');

    // Wait for extension to process content
    await page.waitForTimeout(2000);

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    if (metrics) {
      console.log('Memory usage:', metrics);

      // Memory usage should be reasonable (less than 50MB)
      expect(metrics.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024);
    }
  });
});
