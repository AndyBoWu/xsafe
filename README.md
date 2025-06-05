# XSafe - Privacy-First Content Filter

**Zero data collection • Local processing only • Open source**

XSafe is a privacy-focused Chrome extension that filters visual content (images and videos) without collecting any personal data. All processing happens locally on your device.

## 🚀 Features

- **🛡️ Content Filtering**: Filter images, videos, or both based on your preferences
- **🎯 Smart Detection**: Intelligent content analysis with adjustable sensitivity
- **🌐 Domain Management**: Whitelist/blacklist specific websites
- **📊 Privacy-First Analytics**: Track filtering stats without data collection
- **⚙️ Customizable**: Multiple filter modes and intensity levels
- **🔒 Zero Data Collection**: Everything processed locally

## 🛠️ Development

### Prerequisites

- Node.js 16+
- npm 8+
- Git

### Quick Start

```bash
# Clone the repository
git clone https://github.com/AndyBoWu/xsafe.git
cd xsafe

# Install dependencies
npm install

# Development build with file watching
npm run dev

# Production build
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

### Build System

XSafe uses **Webpack** for building with the following features:

#### **Available Scripts**

```bash
# Development
npm run dev          # Watch mode with source maps
npm run build:dev    # Development build (one-time)

# Production
npm run build        # Optimized production build
npm run package      # Build + create extension zip

# Testing & Quality
npm test             # Run Jest tests
npm test:watch       # Watch mode testing
npm run lint         # ESLint code checking
npm run lint:fix     # Auto-fix linting issues

# Analysis
npm run analyze      # Bundle size analysis
npm run clean        # Clean dist directory
```

#### **Build Features**

✅ **Multi-Entry Points**: Separate bundles for background, content, popup, options
✅ **Code Splitting**: Optimized chunking for better performance
✅ **CSS Processing**: PostCSS with autoprefixing and minification
✅ **Asset Management**: Automatic handling of images, fonts, icons
✅ **Source Maps**: Available in development mode
✅ **Bundle Analysis**: Webpack Bundle Analyzer integration
✅ **File Validation**: Build verification and size checking
✅ **Chrome Extension Optimized**: Manifest handling and extension structure

### Project Structure

```
xsafe/
├── src/
│   ├── background/         # Service worker
│   ├── content/           # Content scripts
│   ├── popup/             # Extension popup
│   ├── options/           # Settings page
│   └── utils/             # Shared utilities
├── dist/                  # Built extension (generated)
├── tests/                 # Test files
├── scripts/               # Build scripts
├── webpack.config.js      # Webpack configuration
├── package.json          # Dependencies & scripts
└── manifest.json         # Extension manifest
```

### Development Workflow

1. **Start Development**:

   ```bash
   npm run dev
   ```

   This starts webpack in watch mode with source maps.

2. **Load Extension**:

   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist/` folder

3. **Make Changes**:

   - Edit source files in `src/`
   - Webpack automatically rebuilds
   - Reload extension in Chrome to test

4. **Production Build**:
   ```bash
   npm run build
   ```
   Creates optimized build in `dist/` folder.

### Testing

XSafe uses **Jest** with Chrome extension API mocking:

```bash
# Run all tests
npm test

# Watch mode (re-run on changes)
npm test:watch

# Coverage report
npm test -- --coverage
```

Test files should be placed alongside source files with `.test.js` or `.spec.js` extensions.

### Code Quality

- **ESLint**: Configured for Chrome extensions with modern JavaScript
- **Prettier**: Code formatting (integrated with ESLint)
- **Babel**: ES6+ transpilation for Chrome compatibility

## 📦 Extension Structure

### Background Script (`background.js`)

- Settings management
- Content filtering logic
- Statistics tracking
- Chrome API interactions

### Content Script (`content.js`)

- DOM manipulation
- Real-time content filtering
- Performance optimization

### Popup (`popup.html/js/css`)

- Quick settings toggle
- Current page statistics
- Domain whitelisting

### Options Page (`options.html/js/css`)

- Advanced configuration
- Domain management
- Statistics dashboard
- Privacy settings

## 🏗️ Build Output

The build process generates:

```
dist/
├── manifest.json          # Updated extension manifest
├── background.js          # Service worker bundle
├── content.js            # Content script bundle
├── popup.html            # Popup page
├── popup.js              # Popup bundle
├── popup.css             # Popup styles
├── options.html          # Options page
├── options.js            # Options bundle
├── options.css           # Options styles
└── icons/                # Extension icons
```

## 🔧 Configuration

### Webpack Configuration

The `webpack.config.js` provides:

- **Multiple Entry Points**: Each extension component has its own bundle
- **Environment-Specific Builds**: Different configs for dev/prod
- **Chrome Extension Optimization**: Specialized plugins and settings
- **Asset Processing**: Images, fonts, CSS handling
- **Code Splitting**: Vendor and common chunk separation

### Babel Configuration

The `.babelrc` configures:

- **Target**: Chrome 88+ for extension compatibility
- **Presets**: Modern JavaScript features with polyfills
- **Environment-Specific**: Different settings for dev/prod/test

## 📊 Bundle Analysis

Analyze bundle sizes and dependencies:

```bash
npm run analyze
```

This opens an interactive bundle analyzer showing:

- Bundle composition
- Module sizes
- Dependency relationships
- Optimization opportunities

## 🚢 Publishing

1. **Create Production Build**:

   ```bash
   npm run package
   ```

   This creates `xsafe-extension.zip` ready for Chrome Web Store.

2. **Upload to Chrome Web Store**:
   - Visit [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
   - Upload the generated zip file
   - Fill out store listing details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Run linting: `npm run lint`
6. Create a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/AndyBoWu/xsafe)
- [Chrome Web Store](https://chrome.google.com/webstore) (coming soon)
- [Report Issues](https://github.com/AndyBoWu/xsafe/issues)

---

**XSafe** - Protecting your privacy while browsing, one filter at a time. 🛡️
