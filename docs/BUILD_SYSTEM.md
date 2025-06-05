# XSafe Build System

## Overview

XSafe uses **Webpack 5** as its build system, providing modern development tools, optimization, and production-ready builds for the Chrome extension.

## Key Features

### 🚀 **Multi-Entry Point Architecture**

- **Background Script**: `src/background/background.js` → `dist/background.js`
- **Content Script**: `src/content/content.js` → `dist/content.js`
- **Popup**: `src/popup/popup.js` → `dist/popup.js` + `dist/popup.html`
- **Options Page**: `src/options/options.js` → `dist/options.js` + `dist/options.html`

### 📦 **Asset Processing**

- **CSS**: PostCSS with autoprefixing, minification
- **Images**: Automatic optimization and compression
- **HTML**: Template processing with HtmlWebpackPlugin
- **Manifest**: Automatic path updates for extension structure

### 🛠️ **Development Features**

- **Hot Reloading**: Automatic rebuilds during development
- **Source Maps**: Full debugging support in development mode
- **File Watching**: Instant rebuilds on file changes
- **Development Server**: Optimized for Chrome extension development

### 📊 **Production Optimizations**

- **Code Minification**: Terser for JavaScript, CSS minimizer
- **Bundle Splitting**: Vendor libraries separated for better caching
- **Tree Shaking**: Dead code elimination
- **Asset Optimization**: Images, fonts, and other assets compressed

## Available Scripts

### Development

```bash
npm run dev          # Watch mode with hot reloading
npm run build:dev    # One-time development build
```

### Production

```bash
npm run build        # Optimized production build
npm run package      # Build + create Chrome Web Store zip
```

### Quality Assurance

```bash
npm run test         # Run Jest test suite
npm run test:watch   # Watch mode testing
npm run lint         # ESLint code checking
npm run lint:fix     # Auto-fix linting issues
```

### Analysis & Debugging

```bash
npm run analyze      # Bundle size analysis
npm run clean        # Clean dist directory
```

## Configuration Files

### `webpack.config.js`

Main Webpack configuration with:

- Environment-specific builds (dev/prod)
- Multiple entry points for extension components
- Asset processing pipelines
- Optimization settings
- Chrome extension specific plugins

### `.babelrc`

Babel configuration for:

- Modern JavaScript transpilation
- Chrome 88+ compatibility
- Environment-specific presets
- Core-js polyfills

### `jest.config.js`

Jest testing configuration with:

- Chrome extension API mocking
- Code coverage reporting
- Module path resolution
- JSDOM environment setup

### `.eslintrc.js`

ESLint configuration for:

- Chrome extension development
- Modern JavaScript standards
- Code quality enforcement
- Security best practices

## Build Process

### Development Build

1. **Source Processing**: Babel transpilation with source maps
2. **Asset Bundling**: CSS extraction, image processing
3. **HTML Generation**: Template processing for popup/options
4. **Manifest Updates**: Path corrections for extension structure
5. **File Watching**: Continuous rebuilds on changes

### Production Build

1. **Code Minification**: JavaScript and CSS optimization
2. **Bundle Splitting**: Vendor and common chunks separation
3. **Asset Optimization**: Image compression, font subsetting
4. **Dead Code Elimination**: Tree shaking unused imports
5. **Manifest Processing**: Production path updates
6. **Size Validation**: Bundle size warnings and optimization hints

## File Structure

### Source (`src/`)

```
src/
├── background/         # Service worker scripts
├── content/           # Content injection scripts
├── popup/             # Extension popup UI
├── options/           # Settings/options page
└── utils/             # Shared utilities
```

### Output (`dist/`)

```
dist/
├── manifest.json      # Updated extension manifest
├── background.js      # Bundled service worker
├── content.js         # Bundled content script
├── popup.html         # Processed popup page
├── popup.js           # Bundled popup script
├── popup.css          # Extracted popup styles
├── options.html       # Processed options page
├── options.js         # Bundled options script
├── options.css        # Extracted options styles
└── icons/             # Extension icons
```

## Optimization Features

### Code Splitting

- **Vendor Libraries**: External dependencies in separate chunk
- **Common Code**: Shared utilities in common chunk
- **Entry Specific**: Component-specific code in separate bundles

### Asset Processing

- **CSS Extraction**: Separate CSS files for better caching
- **Image Optimization**: Automatic compression and format conversion
- **Font Subsetting**: Include only used glyphs

### Performance

- **Bundle Analysis**: Webpack Bundle Analyzer integration
- **Size Monitoring**: Automatic warnings for oversized bundles
- **Caching**: Optimized for browser and extension caching strategies

## Testing Integration

### Chrome Extension API Mocking

The build system includes comprehensive Chrome API mocks for testing:

- `chrome.runtime` - Message passing, extension lifecycle
- `chrome.storage` - Local and sync storage APIs
- `chrome.tabs` - Tab management and querying
- `chrome.action` - Extension action (popup, badge)

### Test Environment

- **JSDOM**: Browser-like environment for DOM testing
- **Module Aliasing**: Same import paths as production code
- **Coverage Reporting**: Comprehensive code coverage analysis
- **Watch Mode**: Continuous testing during development

## Performance Monitoring

### Bundle Size Analysis

Run `npm run analyze` to open interactive bundle analyzer showing:

- Bundle composition and dependencies
- Module sizes and duplicates
- Optimization opportunities
- Load performance metrics

### Build Validation

Automatic checks during build:

- File size warnings (>500KB for UI, >1MB for scripts)
- Manifest.json validation
- Required file presence verification
- Chrome extension compatibility

## Deployment

### Chrome Web Store Package

```bash
npm run package
```

Creates `xsafe-extension.zip` ready for Chrome Web Store upload with:

- Optimized production build
- Correct manifest paths
- All required assets included
- Proper file structure for Chrome validation

### Development Installation

1. Run `npm run build:dev`
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" → select `dist/` folder

## Troubleshooting

### Common Issues

**Build Fails**

- Check Node.js version (>=16)
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear dist: `npm run clean`

**Extension Doesn't Load**

- Verify manifest.json in dist/
- Check browser console for errors
- Ensure all required files are present

**Hot Reload Not Working**

- Restart `npm run dev`
- Check file permissions
- Verify webpack watch is enabled

### Debug Mode

For detailed build information:

```bash
WEBPACK_DEBUG=true npm run build
```

This provides verbose output for troubleshooting build issues.

## Future Enhancements

### Planned Features

- **TypeScript Support**: Gradual migration to TypeScript
- **CSS Modules**: Scoped styling for components
- **PWA Features**: Service worker enhancements
- **Advanced Testing**: E2E testing with Playwright
- **CI/CD Integration**: Automated builds and deployments

### Extension Considerations

- **Manifest V3 Compliance**: Full compatibility maintained
- **Security Policies**: CSP-compliant build outputs
- **Performance Optimization**: Chrome extension best practices
- **Size Constraints**: Web store size limit compliance
