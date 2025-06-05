import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for XSafe Chrome Extension
 * Includes Chrome extension testing setup and integration tests
 */

export default defineConfig({
  // Test directory
  testDir: './tests/integration',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: 'html',

  // Shared settings for all the projects below
  use: {
    // Base URL for the application
    baseURL: 'https://example.com',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'retain-on-failure'
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chrome-extension',
      use: {
        ...devices['Desktop Chrome'],
        // Chrome-specific extension testing
        channel: 'chrome',
        launchOptions: {
          headless: false, // Extensions require non-headless mode
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--load-extension=./dist',
            '--disable-extensions-except=./dist'
          ]
        }
      }
    }
  ],

  // Global setup for extension
  globalSetup: './tests/integration/global-setup.js',

  // Global teardown
  globalTeardown: './tests/integration/global-teardown.js',

  // Test timeout
  timeout: 30000,

  // Expect timeout
  expect: {
    timeout: 5000
  },

  // Output directory
  outputDir: 'tests/results/',

  // Web server configuration (if needed for testing pages)
  webServer: {
    command: 'npm run build:dev',
    port: 3000,
    reuseExistingServer: !process.env.CI
  }
});
