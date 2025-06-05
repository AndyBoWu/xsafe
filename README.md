# XSafe - Twitter/X Content Filter

**Block NSFW content on Twitter/X • Zero data collection • Local processing only • Free forever**

XSafe is a privacy-focused Chrome extension that blocks NSFW images and videos on Twitter/X timeline without collecting any personal data. All processing happens locally on your device with optimized performance. **XSafe will always be completely free with no premium features or subscriptions.**

## 🚀 Features

- **🛡️ NSFW Protection**: Block inappropriate images and videos on Twitter/X timeline
- **🎯 Granular Filtering**: Hide only media content while preserving post text, usernames, and engagement buttons
- **📊 Privacy-First**: No data collection, tracking, or external servers
- **⚙️ Simple Toggle**: Easy Safe Mode switch - one toggle for complete protection
- **🔒 Local Processing**: Everything processed on your device only
- **⚡ Optimized Performance**: Lightweight with 1-second scanning for fast content detection
- **🎨 Smart Content Preservation**: Post structure remains intact while filtering visual content
- **🚫 Profile Picture Protection**: Smart filtering that excludes avatars and UI elements
- **🔧 Automatic Content Hiding**: Filtered images and videos disappear completely for cleaner browsing
- **💰 Free Forever**: No premium features, no subscriptions, completely free to use

## 🎯 Perfect For

- **👥 Professional Use**: Safe Twitter/X browsing in workplace environments
- **👨‍👩‍👧‍👦 Family Safety**: Protect family members from NSFW content
- **📚 Educational Settings**: Safe social media access in schools/libraries
- **🏢 Corporate Networks**: Maintain professional browsing standards
- **🔒 Privacy Conscious**: Users who want content filtering without data collection

## 💫 Current Interface

**Simple Safe Mode Toggle:**

- **Normal Mode**: Content displays normally
- **Safe Mode**: Automatically hides images and videos while preserving post text and structure
- **Visual Feedback**: Green background when Safe Mode is active
- **Content Preservation**: Posts remain readable with usernames, text, and engagement buttons visible
- **GitHub Link**: Direct access to source code for transparency

## ⚡ Performance Optimizations

**Recent performance improvements eliminate browser crashes:**

- **🛡 Smart Scanning**: 1-second periodic scanning with cooldown protection for responsive filtering
- **🎯 Granular Media Targeting**: Precise targeting of images/videos while preserving post content
- **🧹 Memory Management**: Automatic cleanup with limits (max 200 filtered elements)
- **📱 Efficient Observers**: Targeted mutation detection with 1-second debouncing
- **💾 Caching**: UI element detection caching to prevent repeated expensive checks
- **🔧 Proper Cleanup**: All intervals, observers, and caches are properly managed
- **🎨 Content Preservation**: Only hides media elements, maintaining post readability and functionality

## 🔒 Privacy Verification - Audit Our Claims

**Don't just trust us - verify our privacy claims yourself!** XSafe is designed to be completely auditable.

### ⚡ 1-Minute Privacy Audit

**Verify ZERO external requests:**

1. **Install XSafe** (or use the development version)
2. **Open Twitter/X** in your browser
3. **Press F12** (Developer Tools)
4. **Click "Network" tab**
5. **Browse Twitter/X for 5 minutes** with XSafe active
6. **Look for XSafe requests** - you'll find **ZERO** external calls

```bash
# What you'll see in Network tab:
# ✅ Twitter/X requests (normal)
# ❌ NO requests from XSafe extension
# ✅ All processing happens locally
```

### 🔍 Source Code Audit

**Verify no data collection in our code:**

1. **Search our codebase** for external requests:

   ```bash
   # Clone the repository
   git clone https://github.com/AndyBoWu/xsafe.git
   cd xsafe

   # Search for any external network calls
   grep -r "fetch\|XMLHttpRequest\|axios\|request" src/
   # Result: No external API calls found!
   ```

2. **Check data storage** - only local Chrome APIs:
   ```bash
   # Search for data storage
   grep -r "chrome.storage" src/
   # Result: Only local and sync storage (no external databases)
   ```

### 🛡️ Technical Privacy Guarantees

| **Privacy Measure**     | **How to Verify**                | **What You'll Find**       |
| ----------------------- | -------------------------------- | -------------------------- |
| **No External APIs**    | Network tab in DevTools          | Zero outgoing requests     |
| **Local Storage Only**  | `chrome://extensions/` → Inspect | Only browser storage used  |
| **Minimal Permissions** | Extension details page           | Only 3 basic permissions   |
| **Open Source**         | This GitHub repository           | Every line of code visible |
| **No Analytics**        | Search codebase for "analytics"  | No tracking code found     |
| **No Telemetry**        | Search codebase for "telemetry"  | No crash reporting found   |

### 📋 Extension Permissions Audit

**We only request 3 minimal permissions:**

```json
"permissions": [
  "storage",     // ✅ Local settings only (no external DB)
  "activeTab",   // ✅ Current tab only (not all tabs)
  "scripting"    // ✅ DOM manipulation only (no network access)
]

"host_permissions": [
  "*://x.com/*",      // ✅ Twitter/X only
  "*://twitter.com/*" // ✅ Twitter redirect support
]
```

**Compare with other extensions** that often request:

- ❌ `tabs` (access to all tabs)
- ❌ `history` (browsing history)
- ❌ `cookies` (tracking data)
- ❌ `identity` (personal information)
- ❌ `http://*/*` (access to all websites)

### 🔐 Content Security Policy

**Our CSP prevents external code injection:**

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

**What this means:**

- ✅ Only our own code can run
- ❌ No external scripts allowed
- ❌ No remote resources loaded
- ❌ No code injection possible

### 📖 Open Source Transparency

**Full source code available:**

- **Repository**: https://github.com/AndyBoWu/xsafe
- **License**: MIT (complete transparency)
- **No hidden builds**: Webpack config is public
- **No obfuscation**: All code is readable

**Community auditing:**

- 🔍 **Security researchers**: Please audit our code
- 🐛 **Bug reports**: Report privacy concerns via [Issues](https://github.com/AndyBoWu/xsafe/issues)
- 🤝 **Contributions**: Help improve privacy through PRs

### 🚨 Red Flags We DON'T Have

✅ **XSafe has NONE of these privacy concerns:**

- ❌ No Google Analytics or tracking pixels
- ❌ No external CDNs or fonts
- ❌ No crash reporting services (Sentry, Bugsnag)
- ❌ No A/B testing platforms
- ❌ No advertising networks
- ❌ No user accounts or registration
- ❌ No cloud storage or syncing
- ❌ No encrypted "anonymous" data collection

### 💡 Privacy Verification Tips

**For privacy advocates:**

```bash
# Advanced verification techniques:
1. Network traffic analysis with Wireshark
2. Static code analysis with ESLint security rules
3. Extension sandboxing with Chrome DevTools
4. Manifest.json permission analysis
```

**For everyday users:**

- Check Network tab (should show 0 XSafe requests)
- Compare our permissions vs other extensions
- Read our source code (it's surprisingly readable!)

---

**🔒 Privacy Promise: If you find ANY external data transmission in XSafe, please [report it immediately](https://github.com/AndyBoWu/xsafe/issues). We're committed to absolute transparency.**

## 🛠️ Installation

### From Source (Recommended for Privacy)

1. **Clone the repository**:

   ```bash
   git clone https://github.com/AndyBoWu/xsafe.git
   cd xsafe
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Build the extension**:

   ```bash
   npm run build
   ```

4. **Load in Chrome**:

   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist/` folder

5. **Verify Installation**:
   - Visit Twitter/X
   - Click the XSafe extension icon
   - Toggle Safe Mode ON (green background)
   - Images and videos should be filtered automatically

### Chrome Web Store (Coming Soon)

The extension will be available on the Chrome Web Store for easier installation.

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
