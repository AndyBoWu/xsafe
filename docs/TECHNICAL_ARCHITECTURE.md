# XSafe - Technical Architecture

## 1. System Overview

### 1.1 Architecture Principles

- **Privacy-First**: All processing happens locally, zero external requests
- **Performance-Optimized**: Minimal impact on browsing experience
- **Modular Design**: Clean separation of concerns
- **Manifest V3 Compliant**: Latest Chrome extension standards

### 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                 XSafe Extension                     │
├─────────────────────────────────────────────────────┤
│  Background Service Worker                          │
│  ├── Settings Manager                               │
│  ├── Filter Engine Controller                      │
│  └── Statistics Tracker                            │
├─────────────────────────────────────────────────────┤
│  Content Scripts                                    │
│  ├── DOM Scanner                                    │
│  ├── Content Filter                                │
│  ├── Element Replacer                              │
│  └── Performance Monitor                           │
├─────────────────────────────────────────────────────┤
│  UI Components                                      │
│  ├── Extension Popup                               │
│  ├── Options Page                                  │
│  └── Filter Indicators                             │
├─────────────────────────────────────────────────────┤
│  Storage Layer                                      │
│  ├── Local Storage (Settings)                      │
│  ├── Session Storage (Temp Data)                   │
│  └── IndexedDB (Statistics)                        │
└─────────────────────────────────────────────────────┘
```

## 2. Component Architecture

### 2.1 Background Service Worker (`background.js`)

**Purpose**: Central coordination and settings management

**Responsibilities**:

- Manage user preferences and settings
- Coordinate between content scripts and UI
- Handle extension lifecycle events
- Monitor performance metrics
- Manage filter rules and configurations

**Key Functions**:

```javascript
// Settings management
settingsManager.get(key);
settingsManager.set(key, value);
settingsManager.reset();

// Filter coordination
filterController.updateRules(rules);
filterController.getActiveFilters();

// Statistics
statsTracker.recordEvent(event);
statsTracker.getStats();
```

### 2.2 Content Scripts (`content/`)

**Purpose**: DOM manipulation and content filtering

#### 2.2.1 DOM Scanner (`content/scanner.js`)

- Detect video and image elements
- Monitor dynamic content loading
- Identify content types and sources
- Performance-optimized scanning with throttling

#### 2.2.2 Content Filter (`content/filter.js`)

- Apply filtering rules to detected content
- Handle different filter modes (videos, images, both)
- Manage whitelist/blacklist logic
- Process intensity levels (strict, moderate, permissive)

#### 2.2.3 Element Replacer (`content/replacer.js`)

- Replace filtered content with placeholders
- Provide "show content" options
- Maintain original element properties
- Handle responsive design considerations

#### 2.2.4 Performance Monitor (`content/monitor.js`)

- Track filtering performance
- Monitor page load impact
- Report metrics to background script
- Optimize scanning frequency

### 2.3 User Interface Components

#### 2.3.1 Extension Popup (`popup/`)

- Quick toggle on/off
- Current page filtering status
- Quick settings access
- Performance indicators

#### 2.3.2 Options Page (`options/`)

- Detailed filter configuration
- Whitelist/blacklist management
- Statistics and reports
- Import/export settings

#### 2.3.3 Filter Indicators

- Visual feedback when content is filtered
- Non-intrusive notifications
- Click-to-reveal functionality

## 3. Data Flow Architecture

### 3.1 Content Detection Flow

```
Page Load → DOM Scanner → Content Detection → Filter Engine → Element Replacement
    ↓           ↓              ↓                ↓               ↓
Performance  Element       Filter Rules     Processing      User Feedback
Monitoring   Classification   Application     Decision        & Statistics
```

### 3.2 Settings Management Flow

```
UI Input → Validation → Background Worker → Storage → Content Script Update
    ↓         ↓             ↓                 ↓           ↓
User       Data Check    Settings Sync    Persistence   Live Filter Update
Action     & Sanitize    Coordination     (Local)       (All Tabs)
```

### 3.3 Communication Architecture

```javascript
// Popup ↔ Background
chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
chrome.runtime.sendMessage({ type: "UPDATE_SETTING", key, value });

// Background ↔ Content Script
chrome.tabs.sendMessage(tabId, { type: "UPDATE_FILTERS", filters });
chrome.runtime.onMessage.addListener((message, sender, sendResponse));

// Content Script → Background (Events)
chrome.runtime.sendMessage({ type: "CONTENT_FILTERED", count, performance });
```

## 4. Technical Implementation Details

### 4.1 Manifest V3 Configuration

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": ["http://*/*", "https://*/*"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/main.js"],
      "run_at": "document_start"
    }
  ]
}
```

### 4.2 Content Detection Algorithms

#### 4.2.1 Video Detection

```javascript
// Detect multiple video types
const videoSelectors = [
  "video", // HTML5 video
  'iframe[src*="youtube"]', // YouTube embeds
  'iframe[src*="vimeo"]', // Vimeo embeds
  'iframe[src*="twitch"]', // Twitch embeds
  "[data-video-id]", // Custom video players
  ".video-player", // Common CSS classes
  '[class*="video"]', // Video-related classes
];
```

#### 4.2.2 Image Detection

```javascript
// Comprehensive image detection
const imageSelectors = [
  "img", // Standard images
  '[style*="background-image"]', // CSS background images
  "picture source", // Responsive images
  "svg image", // SVG images
  "[data-src]", // Lazy-loaded images
  ".image-container img", // Container-based images
];
```

### 4.3 Performance Optimization

#### 4.3.1 Efficient DOM Scanning

```javascript
// Throttled scanning with IntersectionObserver
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        scanElement(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);

// Debounced mutation observer
const debouncedScan = debounce(scanNewContent, 100);
const mutationObserver = new MutationObserver(debouncedScan);
```

#### 4.3.2 Memory Management

```javascript
// Cleanup strategy
const cleanup = () => {
  observer.disconnect();
  mutationObserver.disconnect();
  replacedElements.clear();
  performanceMetrics.reset();
};
```

### 4.4 Storage Strategy

#### 4.4.1 Settings Storage (chrome.storage.sync)

```javascript
// Sync across devices (if user opts in)
const defaultSettings = {
  filterMode: "both", // 'videos', 'images', 'both', 'off'
  intensityLevel: "moderate", // 'strict', 'moderate', 'permissive'
  showPlaceholders: true,
  whitelistedDomains: [],
  blacklistedDomains: [],
  customRules: [],
};
```

#### 4.4.2 Statistics Storage (chrome.storage.local)

```javascript
// Local-only statistics
const statsSchema = {
  totalContentFiltered: 0,
  videosFiltered: 0,
  imagesFiltered: 0,
  performanceMetrics: {
    avgProcessingTime: 0,
    pageLoadImpact: 0,
    memoryUsage: 0,
  },
  dailyStats: {}, // Date-keyed statistics
  domainStats: {}, // Per-domain filtering stats
};
```

## 5. Security & Privacy Implementation

### 5.1 Content Security Policy

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### 5.2 Privacy Safeguards

- **No external requests**: All processing happens locally
- **No data transmission**: Zero telemetry or analytics
- **Local storage only**: Settings stored in browser only
- **No tracking**: No user identification or behavior tracking
- **Minimal permissions**: Only essential permissions requested

### 5.3 Data Sanitization

```javascript
// Sanitize all user inputs
const sanitizeInput = (input) => {
  return input.replace(/[<>'"&]/g, (char) => {
    const entities = {
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "&": "&amp;",
    };
    return entities[char];
  });
};
```

## 6. Testing Strategy

### 6.1 Unit Testing

- **Framework**: Jest
- **Coverage**: >90% code coverage
- **Focus**: Core filtering logic, settings management, utilities

### 6.2 Integration Testing

- **Framework**: Playwright
- **Scope**: Content script + background worker interaction
- **Scenarios**: Real website testing, performance validation

### 6.3 Performance Testing

- **Metrics**: Memory usage, CPU impact, page load time
- **Tools**: Chrome DevTools, Lighthouse
- **Benchmarks**: <5% performance impact target

### 6.4 Security Testing

- **Static Analysis**: ESLint security rules
- **Manual Review**: Code review for privacy compliance
- **Third-party Audit**: Regular security assessments

## 7. Build & Development Workflow

### 7.1 Build System (Webpack)

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

### 7.2 Development Tools

- **Hot Reload**: Extension auto-reload during development
- **Source Maps**: Debug support
- **Linting**: ESLint + Prettier
- **Type Checking**: JSDoc with TypeScript checking

### 7.3 Release Process

1. **Version Bump**: Update manifest version
2. **Build**: Create production bundle
3. **Test**: Run full test suite
4. **Package**: Create .crx and .zip files
5. **Publish**: Submit to Chrome Web Store

## 8. Monitoring & Analytics

### 8.1 Performance Monitoring (Local Only)

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

### 8.2 Error Handling

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

## 9. Deployment Architecture

### 9.1 Development Environment

- **Hot reload**: Instant extension updates
- **Debug mode**: Enhanced logging and metrics
- **Test data**: Sample filtering scenarios

### 9.2 Production Build

- **Minification**: Reduced bundle size
- **Optimization**: Performance tuning
- **Validation**: Automated testing pipeline

### 9.3 Distribution

- **Chrome Web Store**: Primary distribution
- **GitHub Releases**: Open source distribution
- **Manual Installation**: For advanced users

---

**Document Version**: 1.0
**Last Updated**: [Current Date]
**Next Review**: [Date + 1 week]
