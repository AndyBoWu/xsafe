# XSafe - Technical Architecture

## 1. System Overview

### 1.1 Architecture Principles

- **Privacy-First**: All processing happens locally, zero external requests
- **Performance-Optimized**: Lightweight with 1-second scanning and granular media targeting
- **Memory-Conscious**: Automatic cleanup with limits to prevent browser crashes
- **Content-Preserving**: Granular filtering that hides media while preserving post structure
- **Modular Design**: Clean separation of concerns
- **Manifest V3 Compliant**: Latest Chrome extension standards
- **Twitter/X Focused**: Specialized for X.com and Twitter.com content filtering

### 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                 XSafe Extension                     │
├─────────────────────────────────────────────────────┤
│  Background Service Worker                          │
│  ├── Settings Manager                               │
│  ├── Filter Engine Controller                      │
│  └── Message Router                                │
├─────────────────────────────────────────────────────┤
│  Content Scripts (Granular Filtering)              │
│  ├── Smart DOM Scanner (1s interval + cooldown)    │
│  ├── Granular Media Filter (images/videos only)    │
│  ├── Content Preservation Engine                   │
│  ├── UI Element Detector (Cached)                  │
│  └── Memory Manager (Cleanup + Limits)             │
├─────────────────────────────────────────────────────┤
│  UI Components                                      │
│  ├── Simplified Popup (Safe Mode Toggle)           │
│  ├── Options Page                                  │
│  └── Direct Content Hiding (No Placeholders)       │
├─────────────────────────────────────────────────────┤
│  Storage Layer                                      │
│  ├── Local Storage (Settings)                      │
│  └── Session Cache (UI Detection)                  │
└─────────────────────────────────────────────────────┘
```

## 2. Performance Architecture

### 2.1 Granular Content Detection

**Key Performance Improvements**:

- **Granular Targeting**: Precise media element targeting while preserving post content
- **Smart Scanning**: 1-second periodic scanning with 2-second cooldown protection
- **Memory Limits**: Max 200 filtered elements, 500 cached UI detections
- **Content Preservation**: Only hides media elements, maintaining post readability
- **Efficient Debouncing**: 1-second debounce on mutation detection

### 2.2 Memory Management

```javascript
// Automatic cleanup implementation
class XSafeContentFilter {
  constructor() {
    this.maxFilteredElements = 200; // Prevent memory leaks
    this.uiElementCache = new Map(); // UI detection cache
    this.scanCooldown = 2000; // Minimum time between scans
  }

  limitFilteredElements() {
    if (this.filteredElements.size > this.maxFilteredElements) {
      // Remove oldest elements - no placeholders to clean up
      const elementsToRemove =
        this.filteredElements.size - this.maxFilteredElements;
      // ... cleanup logic
    }
  }
}
```

### 2.3 Granular Media Selectors

**Granular Media Targeting (Preserves Post Content)**:

```javascript
// Targets only media elements, not containers
const mediaSelectors = [
  // Individual images in tweets
  '[data-testid="tweetPhoto"] img',
  '[data-testid="media"] img:not([alt*="avatar"]):not([alt*="profile"])',

  // Video elements
  '[data-testid="videoPlayer"] video',
  "video",

  // Card media (but not entire cards)
  '[data-testid="card.layoutLarge.media"] img',

  // Background image divs within media contexts
  '[data-testid="media"] div[style*="background-image"]',

  // iframe embeds
  'iframe[src*="youtube"]',
  'iframe[src*="vimeo"]',
];
```

## 3. Component Architecture

### 3.1 Background Service Worker (`background.js`)

**Purpose**: Lightweight coordination and settings management

**Responsibilities**:

- Manage user preferences and settings
- Handle communication between popup and content scripts
- Extension lifecycle events

**Key Functions**:

```javascript
// Simplified settings management
settingsManager.get(key);
settingsManager.set(key, value);
settingsManager.handleMessage(message, sender, sendResponse);
```

### 3.2 Content Scripts (`content/content.js`)

**Purpose**: High-performance DOM manipulation and content filtering

#### 3.2.1 Smart DOM Scanner

- **Optimized Frequency**: 1-second scanning with cooldown protection
- **Granular Detection**: Targets only media elements, preserving post content
- **Memory Conscious**: Limited processing (max 50 elements per scan)
- **Cache Utilization**: UI element detection caching

#### 3.2.2 Granular Content Filter

- **Safe Mode Toggle**: Single toggle for complete protection
- **Media-Only Filtering**: Hides images/videos while preserving post text and structure
- **Profile Protection**: Smart filtering that excludes avatars and UI elements
- **Content Preservation**: Maintains post readability and engagement functionality

#### 3.2.3 Direct Content Hiding

- **No Placeholders**: Filtered content disappears completely for cleaner experience
- **Layout Preservation**: Post structure remains intact
- **Performance Optimized**: No DOM manipulation for placeholder creation

#### 3.2.4 Memory Manager

- **Automatic Cleanup**: Regular cleanup of filtered elements
- **Cache Limits**: UI detection cache capped at 500 entries
- **Proper Disposal**: All intervals and observers properly cleaned up

### 3.3 User Interface Components

#### 3.3.1 Simplified Popup (`popup/`)

- **Safe Mode Toggle**: Single switch (Normal/Safe Mode)
- **Visual Feedback**: Green background when Safe Mode active
- **GitHub Link**: Direct access to source code
- **Compact Design**: 260px width for better proportions

#### 3.3.2 Options Page (`options/`)

- Detailed filter configuration
- Domain management
- Statistics and reports
- Advanced settings

#### 3.3.3 Twitter-Native Placeholders

- **Compact Size**: Maximum 150px height, minimum 80px
- **Twitter Styling**: Uses Twitter blue (#1d9bf0) and rounded corners
- **Non-Disruptive**: Maintains timeline flow
- **Branded**: Clear XSafe identification

## 4. Data Flow Architecture

### 4.1 Granular Content Detection Flow

```
Page Load → Smart Scanner → Granular Selectors → Filter Engine → Direct Hiding
    ↓           ↓              ↓                   ↓               ↓
Cooldown    Cache Check    Media-Only DOM        Processing      Content Removal
Protection  (UI Elements)  Access (preserve      Decision        (Hide elements)
                          post structure)
```

### 4.2 Settings Management Flow

```
Safe Mode Toggle → Validation → Background Worker → Storage → Immediate Content Update
```

### 4.3 Communication Architecture

```javascript
// Popup ↔ Background (Simplified)
chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
chrome.runtime.sendMessage({ type: "UPDATE_SETTING", key, value });

// Background ↔ Content Script (Optimized)
chrome.tabs.sendMessage(tabId, {
  type: "UPDATE_FILTERS",
  settings: { enabled: true, filterMode: "both" },
});

// Reduced Event Reporting (Performance)
// Only critical events reported to background
```

## 5. Technical Implementation Details

### 5.1 Manifest V3 Configuration (Optimized)

```json
{
  "manifest_version": 3,
  "name": "XSafe - Twitter/X Content Filter",
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": ["*://x.com/*", "*://twitter.com/*"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["*://x.com/*", "*://twitter.com/*"],
      "js": ["content.js"],
      "run_at": "document_start"
    }
  ]
}
```

### 5.2 Performance Optimization Techniques

#### 5.2.1 Scanning Optimization

```javascript
// Cooldown protection
canScan() {
  const now = Date.now();
  if (now - this.lastScanTime < this.scanCooldown) {
    return false; // Too soon since last scan
  }
  return true;
}

// Limited processing
scanNewContent() {
  const addedNodes = document.querySelectorAll('*:not([data-xsafe-scanned])');
  let scannedCount = 0;

  addedNodes.forEach(node => {
    if (scannedCount < 50) { // Limit processing to prevent overload
      this.scanElement(node);
      scannedCount++;
    }
  });
}
```

#### 5.2.2 UI Element Detection with Caching

```javascript
isUIElement(element) {
  // Use cache to avoid repeated expensive checks
  const cacheKey = element.src || element.outerHTML.substring(0, 100);
  if (this.uiElementCache.has(cacheKey)) {
    return this.uiElementCache.get(cacheKey);
  }

  let isUI = false;
  // Quick checks for common UI elements
  if (element.getAttribute('data-testid')?.includes('avatar') ||
      element.getAttribute('alt')?.toLowerCase().includes('avatar')) {
    isUI = true;
  }

  // Cache the result with size limit
  this.uiElementCache.set(cacheKey, isUI);
  if (this.uiElementCache.size > 500) {
    const firstKey = this.uiElementCache.keys().next().value;
    this.uiElementCache.delete(firstKey);
  }

  return isUI;
}
```

## 6. Browser Crash Prevention

### 6.1 Memory Leak Prevention

- **Filtered Elements Limit**: Maximum 200 filtered elements in memory
- **Cache Size Limits**: UI detection cache capped at 500 entries
- **Proper Cleanup**: All intervals and observers properly disposed
- **No Performance Tracking**: Removed memory-intensive performance monitoring

### 6.2 CPU Usage Optimization

- **Query Reduction**: 93% fewer DOM queries (27 → 2)
- **Scanning Frequency**: Balanced 2-second interval with cooldown
- **Observer Optimization**: Targeted mutation observer scope
- **Processing Limits**: Maximum 50 elements processed per scan

### 6.3 Resource Management

```javascript
cleanup() {
  // Clear caches and sets to prevent memory leaks
  this.filteredElements.clear();
  this.uiElementCache.clear();
}

stopFiltering() {
  this.isFiltering = false;

  // Properly clean up all resources
  if (this.observer) {
    this.observer.disconnect();
    this.observer = null;
  }
  if (this.mutationObserver) {
    this.mutationObserver.disconnect();
    this.mutationObserver = null;
  }
  if (this.periodicScanInterval) {
    clearInterval(this.periodicScanInterval);
    this.periodicScanInterval = null;
  }

  this.cleanup();
}
```

## 7. Privacy Architecture

### 7.1 Local Processing Only

- **Zero External Requests**: All content analysis happens locally
- **No Analytics**: No tracking or telemetry
- **Local Storage Only**: Settings stored in browser storage
- **No Performance Reporting**: Removed external performance metrics

### 7.2 Minimal Permissions

```json
"permissions": [
  "storage",     // Local settings only
  "activeTab",   // Current tab only
  "scripting"    // DOM manipulation only
]
```

### 7.3 Content Security Policy

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

This architecture ensures XSafe provides fast, reliable content filtering while maintaining user privacy and browser stability.

## 8. Testing Strategy

### 8.1 Unit Testing

- **Framework**: Jest
- **Coverage**: >90% code coverage
- **Focus**: Core filtering logic, settings management, utilities

### 8.2 Integration Testing

- **Framework**: Playwright
- **Scope**: Content script + background worker interaction
- **Scenarios**: Real website testing, performance validation

### 8.3 Performance Testing

- **Metrics**: Memory usage, CPU impact, page load time
- **Tools**: Chrome DevTools, Lighthouse
- **Benchmarks**: <5% performance impact target

### 8.4 Security Testing

- **Static Analysis**: ESLint security rules
- **Manual Review**: Code review for privacy compliance
- **Third-party Audit**: Regular security assessments

## 9. Build & Development Workflow

### 9.1 Build System (Webpack)

```javascript
// webpack.config.js structure
module.exports = {
  entry: {
    background: "./src/background/index.js",
    content: "./src/content/index.js",
    popup: "./src/popup/index.js",
    options: "./src/options/index.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
};
```

### 9.2 Development Tools

- **Hot Reload**: Extension auto-reload during development
- **Source Maps**: Debug support
- **Linting**: ESLint + Prettier
- **Type Checking**: JSDoc with TypeScript checking

### 9.3 Release Process

1. **Version Bump**: Update manifest version
2. **Build**: Create production bundle
3. **Test**: Run full test suite
4. **Package**: Create .crx and .zip files
5. **Publish**: Submit to Chrome Web Store

## 10. Monitoring & Analytics

### 10.1 Performance Monitoring (Local Only)

```javascript
// Local performance tracking
const performanceTracker = {
  scanTime: [],
  filterTime: [],
  replaceTime: [],
  memoryUsage: [],

  record(metric, value) {
    this[metric].push(value);
    this.cleanup(); // Keep only recent data
  },

  getAverages() {
    return {
      avgScanTime: average(this.scanTime),
      avgFilterTime: average(this.filterTime),
      avgReplaceTime: average(this.replaceTime),
      avgMemoryUsage: average(this.memoryUsage),
    };
  },
};
```

### 10.2 Error Handling

```javascript
// Comprehensive error handling
const errorHandler = {
  log(error, context) {
    console.error("[XSafe]", error, context);
    // Store locally for user debugging (no external sending)
    this.storeError(error, context);
  },

  storeError(error, context) {
    // Local storage only for debugging
    const errorLog = {
      timestamp: Date.now(),
      error: error.message,
      stack: error.stack,
      context,
    };
    // Store in local storage with size limits
  },
};
```

## 11. Deployment Architecture

### 11.1 Development Environment

- **Hot reload**: Instant extension updates
- **Debug mode**: Enhanced logging and metrics
- **Test data**: Sample filtering scenarios

### 11.2 Production Build

- **Minification**: Reduced bundle size
- **Optimization**: Performance tuning
- **Validation**: Automated testing pipeline

### 11.3 Distribution

- **Chrome Web Store**: Primary distribution
- **GitHub Releases**: Open source distribution
- **Manual Installation**: For advanced users

---

**Document Version**: 1.0
**Last Updated**: [Current Date]
**Next Review**: [Date + 1 week]
