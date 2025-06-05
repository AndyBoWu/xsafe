# XSafe Testing Documentation

## Overview

XSafe uses a comprehensive testing strategy with both unit tests and integration tests to ensure reliability and functionality.

## Testing Stack

### **Unit Testing - Jest**

- **Framework**: Jest with JSDOM environment
- **Coverage**: Code coverage tracking with threshold enforcement
- **Mocking**: Chrome extension API mocking for isolated testing
- **Location**: `src/**/*.test.js`

### **Integration Testing - Playwright**

- **Framework**: Playwright for end-to-end browser testing
- **Browser**: Chrome with extension loaded
- **Scope**: Real browser environment testing
- **Location**: `tests/integration/*.spec.js`

## Test Scripts

```bash
# Unit Tests
npm test                    # Run all Jest unit tests
npm run test:unit          # Run only unit tests
npm run test:watch         # Watch mode for development

# Integration Tests
npm run test:integration   # Run Playwright integration tests
npm run playwright:install # Install Playwright browsers

# All Tests
npm run test:all          # Run both unit and integration tests
```

## Test Structure

### **Unit Tests**

#### **Background Script Tests** (`src/background/background.test.js`)

- **SettingsManager**: Settings loading, saving, updating, and resetting
- **FilterController**: Content filtering logic and intensity thresholds
- **StatsTracker**: Statistics tracking and performance metrics
- **Message Handler**: Chrome extension message handling

#### **Content Script Tests** (`src/content/content.test.js`)

- **XSafeContentFilter**: DOM manipulation and content filtering
- **Element Detection**: Image and video element identification
- **Whitelist Handling**: Domain-based filtering exceptions
- **Performance**: Efficient content processing
- **Error Handling**: Graceful failure handling

#### **Popup Tests** (`src/popup/popup.test.js`)

- **UI Interactions**: Toggle controls, sliders, buttons
- **Settings Management**: Loading and updating extension settings
- **Domain Detection**: Current tab domain extraction
- **Chrome API Communication**: Background script messaging

### **Integration Tests**

#### **Basic Functionality** (`tests/integration/extension-basic.spec.js`)

- **Extension Loading**: Verify extension loads successfully
- **Popup Interface**: Test popup UI functionality
- **Options Page**: Test settings page functionality
- **Content Filtering**: Verify filtering works on test pages
- **Navigation**: Test extension behavior during page navigation
- **Performance**: Page load and memory usage testing

## Test Configuration

### **Jest Configuration** (`jest.config.js`)

```javascript
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  collectCoverageFrom: ["src/**/*.js", "!src/**/*.test.js"],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### **Playwright Configuration** (`playwright.config.js`)

```javascript
export default defineConfig({
  testDir: "./tests/integration",
  projects: [
    {
      name: "chrome-extension",
      use: {
        channel: "chrome",
        launchOptions: {
          headless: false,
          args: [
            "--load-extension=./dist",
            "--disable-extensions-except=./dist",
          ],
        },
      },
    },
  ],
});
```

## Chrome Extension API Mocking

### **Setup File** (`tests/setup.js`)

Provides comprehensive Chrome API mocks:

- `chrome.runtime` - Message passing and extension lifecycle
- `chrome.storage` - Local and sync storage APIs
- `chrome.tabs` - Tab management and querying
- `chrome.action` - Extension action (popup, badge)

### **Mock Features**

- **Automatic Reset**: Mocks reset between tests
- **Realistic Behavior**: Mocks simulate real Chrome API behavior
- **Error Scenarios**: Support for testing error conditions
- **Async Operations**: Promise-based mock implementations

## Test Categories

### **Unit Test Categories**

1. **Functionality Tests**

   - Core feature behavior
   - Settings management
   - Content filtering logic
   - Statistics tracking

2. **UI Tests**

   - Component rendering
   - User interactions
   - State management
   - Event handling

3. **Integration Tests**

   - Chrome API communication
   - Cross-component interactions
   - Data flow validation

4. **Error Handling Tests**
   - Invalid input handling
   - Network failure scenarios
   - Browser compatibility issues

### **Integration Test Categories**

1. **Extension Lifecycle**

   - Installation and loading
   - Update scenarios
   - Uninstall cleanup

2. **Real-World Usage**

   - Content filtering on live sites
   - Settings persistence
   - Performance impact

3. **Browser Compatibility**
   - Chrome version compatibility
   - Extension manifest validation

## Coverage Requirements

### **Minimum Coverage Thresholds**

- **Statements**: 70%
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%

### **Coverage Exclusions**

- Test files (`*.test.js`, `*.spec.js`)
- Node modules
- Build artifacts

## Running Tests

### **Development Workflow**

1. **Start Development Server**

   ```bash
   npm run dev
   ```

2. **Run Tests in Watch Mode**

   ```bash
   npm run test:watch
   ```

3. **Build for Testing**

   ```bash
   npm run build:dev
   ```

4. **Run Integration Tests**
   ```bash
   npm run test:integration
   ```

### **CI/CD Workflow**

1. **Install Dependencies**

   ```bash
   npm install
   npm run playwright:install
   ```

2. **Run Linting**

   ```bash
   npm run lint
   ```

3. **Build Extension**

   ```bash
   npm run build
   ```

4. **Run All Tests**
   ```bash
   npm run test:all
   ```

## Test Data and Fixtures

### **Test Page Template**

Integration tests use a standardized test page with:

- Sample images (via Picsum)
- Video elements
- YouTube embeds
- Background images
- Various HTML structures

### **Mock Data**

Unit tests use realistic mock data:

- Extension settings objects
- Statistics data structures
- Chrome API responses
- DOM element mocks

## Debugging Tests

### **Unit Test Debugging**

```bash
# Debug specific test file
npm test -- --testNamePattern="SettingsManager"

# Debug with verbose output
npm test -- --verbose

# Debug with coverage details
npm test -- --coverage --verbose
```

### **Integration Test Debugging**

```bash
# Run tests in headed mode (visible browser)
npm run test:integration -- --headed

# Debug specific test
npm run test:integration -- --grep "popup opens"

# Generate detailed reports
npm run test:integration -- --reporter=html
```

### **Common Issues**

1. **Chrome API Mock Conflicts**

   - Ensure proper mock setup in test files
   - Check for global mock pollution

2. **DOM Element Mocking**

   - Verify element properties are properly mocked
   - Test method availability on mock objects

3. **Async Operation Timing**
   - Use proper await/Promise handling
   - Add sufficient timeouts for real browser operations

## Test Performance

### **Unit Test Performance**

- **Target**: < 10 seconds for full unit test suite
- **Optimization**: Parallel test execution
- **Caching**: Jest cache for faster subsequent runs

### **Integration Test Performance**

- **Target**: < 2 minutes for full integration suite
- **Optimization**: Reuse browser instances where possible
- **Parallelization**: Run independent tests in parallel

## Continuous Integration

### **GitHub Actions Configuration**

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "16"
      - run: npm install
      - run: npm run playwright:install
      - run: npm run lint
      - run: npm run build
      - run: npm run test:all
```

## Test Reporting

### **Coverage Reports**

- **HTML Report**: `coverage/lcov-report/index.html`
- **Terminal Output**: Real-time coverage feedback
- **CI Integration**: Coverage status in pull requests

### **Integration Test Reports**

- **HTML Report**: `playwright-report/index.html`
- **Screenshots**: Failure screenshots automatically captured
- **Videos**: Test execution videos for debugging

## Best Practices

### **Unit Testing Best Practices**

1. **Test Isolation**: Each test should be independent
2. **Clear Naming**: Descriptive test names explain expected behavior
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Mock Appropriately**: Mock external dependencies, not internal logic

### **Integration Testing Best Practices**

1. **Real Scenarios**: Test actual user workflows
2. **Performance Aware**: Monitor test execution time
3. **Cleanup**: Ensure tests don't interfere with each other
4. **Error Scenarios**: Test both success and failure paths

### **General Testing Best Practices**

1. **Version Control**: Commit test files with feature code
2. **Documentation**: Document complex test scenarios
3. **Maintenance**: Update tests when functionality changes
4. **Review**: Include test review in code review process

## Troubleshooting

### **Common Test Failures**

1. **Extension Not Loading**

   - Verify build completed successfully
   - Check manifest.json validity
   - Ensure all required files present

2. **Chrome API Errors**

   - Update mock implementations
   - Check Chrome version compatibility
   - Verify extension permissions

3. **Timing Issues**
   - Add appropriate waits in integration tests
   - Use Jest fake timers for unit tests
   - Account for async operations

### **Performance Issues**

1. **Slow Test Execution**

   - Optimize test setup/teardown
   - Use test.concurrent for independent tests
   - Profile test execution times

2. **Memory Issues**
   - Close browser contexts properly
   - Clear mocks between tests
   - Monitor memory usage in CI

## Future Enhancements

### **Planned Testing Improvements**

1. **Visual Regression Testing**

   - Screenshot comparison for UI consistency
   - Automated visual diff detection

2. **Performance Testing**

   - Lighthouse integration for performance metrics
   - Memory leak detection
   - Load testing for high-content pages

3. **Cross-Browser Testing**

   - Firefox extension testing
   - Edge compatibility verification

4. **Accessibility Testing**
   - Automated a11y testing with axe-core
   - Screen reader compatibility testing

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/)
- [Chrome Extension Testing Guide](https://developer.chrome.com/docs/extensions/mv3/tut_debugging/)
- [JSDOM Documentation](https://github.com/jsdom/jsdom)

---

For questions about testing or to report test-related issues, please [open an issue](https://github.com/AndyBoWu/xsafe/issues) on GitHub.
