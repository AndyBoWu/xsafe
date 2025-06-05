/**
 * Playwright Global Teardown
 * Cleanup after XSafe extension testing
 */

async function globalTeardown() {
  console.log('🧹 Cleaning up after tests...');

  // Clean up environment variables
  delete process.env.XSAFE_EXTENSION_ID;

  // Additional cleanup if needed
  console.log('✅ Teardown completed successfully!');
}

export default globalTeardown;
