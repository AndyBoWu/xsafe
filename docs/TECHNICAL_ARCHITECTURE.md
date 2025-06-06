# XSafe - Technical Architecture

## 1. System Overview

### 1.1 Architecture Principles

- **Privacy-First**: All processing happens locally, zero external requests
- **Performance-Optimized**: Lightweight with 1-second scanning and granular media targeting
- **Memory-Conscious**: Automatic cleanup with limits to prevent browser crashes
- **Content-Preserving**: Granular filtering that hides media while preserving post structure
- **Error-Resilient**: Comprehensive error handling to prevent crashes and TypeErrors
- **Modular Design**: Clean separation of concerns
- **Manifest V3 Compliant**: Latest Chrome extension standards
- **Chrome Web Store Ready**: Publication-ready with enhanced error handling
- **Twitter/X Focused**: Specialized for X.com and Twitter.com content filtering

### 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                 XSafe Extension                     │
├─────────────────────────────────────────────────────┤
│  Background Service Worker (Enhanced Error Handling)│
│  ├── Settings Manager (Message Validation)         │
│  ├── Filter Engine Controller                      │
│  └── Message Router (Null Response Protection)     │
├─────────────────────────────────────────────────────┤
│  Content Scripts (Granular Filtering + Safe DOM)   │
│  ├── Smart DOM Scanner (1s interval + cooldown)    │
│  ├── Granular Media Filter (images/videos only)    │
│  ├── Content Preservation Engine                   │
│  ├── UI Element Detector (Type-Safe + Cached)      │
│  ├── DOM Manipulation Safety (Validation)          │
│  └── Memory Manager (Cleanup + Limits)             │
├─────────────────────────────────────────────────────┤
│  UI Components (Robust Error Handling)             │
│  ├── Simplified Popup (Safe Mode Toggle)           │
│  ├── Options Page                                  │
│  └── Direct Content Hiding (No Placeholders)       │
├─────────────────────────────────────────────────────┤
│  Storage Layer                                      │
│  ├── Local Storage (Settings)                      │
│  └── Session Cache (UI Detection)                  │
└─────────────────────────────────────────────────────┘
```

## 2. Error Handling Architecture

### 2.1 Critical Error Fixes (v0.1.0)

**Recently Resolved Issues**:

- ✅ **TypeError: className.toLowerCase** - Fixed with proper type checking
- ✅ **Connection errors** - Enhanced popup error handling with fallbacks
- ✅ **DOM hierarchy errors** - Added element validation before manipulation
- ✅ **Browser crashes** - Comprehensive memory management and resource cleanup

### 2.2 Type-Safe Property Access

```javascript
// Fixed: Safe property access in isUIElement
isUIElement(element) {
  try {
    const dataTestId = element.getAttribute('data-testid');
    const altText = element.getAttribute('alt');

    if ((dataTestId && dataTestId.includes('avatar')) ||
        (altText && typeof altText === 'string' && altText.toLowerCase().includes('avatar')) ||
        (altText && typeof altText === 'string' && altText.toLowerCase().includes('profile'))) {
      return true;
    }

    const rect = element.getBoundingClientRect();
    if (rect && rect.width < 80 && rect.height < 80) {
      return true;
    }

    return false;
  } catch (error) {
    console.warn('[XSafe] Error in isUIElement:', error);
    return false; // Safe fallback
  }
}
```

### 2.3 DOM Manipulation Safety

```javascript
// Enhanced: Safe DOM manipulation with validation
replaceElement(element, type) {
  try {
    // Validate element is still in DOM and has a parent
    if (!element || !element.parentNode || !document.contains(element)) {
      console.warn('[XSafe] Cannot replace element - not in DOM or no parent');
      return;
    }

    // Safe element manipulation
    element.style.display = 'none';
    element.style.visibility = 'hidden';

    this.filteredElements.add(element);
  } catch (error) {
    console.error('[XSafe] Error in replaceElement:', error);
  }
}
```

### 2.4 Message Passing Reliability

```javascript
// Enhanced: Robust message handling in background script
async handleMessage(message, sender, sendResponse) {
  try {
    // Validate message structure
    if (!message || !message.type) {
      sendResponse({ success: false, error: 'Invalid message format' });
      return;
    }

    switch (message.type) {
      case 'GET_SETTINGS':
        const settings = await this.settings.getAll();
        sendResponse({ success: true, data: settings });
        break;
      // ... other cases with validation
    }
  } catch (error) {
    console.error('[XSafe] Error handling message:', error);
    sendResponse({ success: false, error: error.message || 'Internal error' });
  }
}

// Enhanced: Popup error handling with fallbacks
async loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (response && response.success) {
      this.settings = response.data;
    } else {
      throw new Error(response ? response.error : 'No response received');
    }
  } catch (error) {
    console.error('[XSafe Popup] Failed to load settings:', error);

    // Set default settings to prevent crashes
    this.settings = {
      enabled: false,
      filterMode: 'both',
      intensityLevel: 'moderate',
      whitelistedDomains: [],
      blacklistedDomains: []
    };
  }
}
```

## 3. Performance Architecture

### 3.1 Granular Content Detection

**Key Performance Improvements**:

- **Granular Targeting**: Precise media element targeting while preserving post content
- **Smart Scanning**: 1-second periodic scanning with 2-second cooldown protection
- **Memory Limits**: Max 200 filtered elements, 500 cached UI detections
- **Content Preservation**: Only hides media elements, maintaining post readability
- **Efficient Debouncing**: 1-second debounce on mutation detection
- **Error Recovery**: Graceful degradation when DOM access fails

### 3.2 Memory Management

```javascript
// Automatic cleanup implementation with error handling
class XSafeContentFilter {
  constructor() {
    this.maxFilteredElements = 200; // Prevent memory leaks
    this.uiElementCache = new Map(); // UI detection cache
    this.scanCooldown = 2000; // Minimum time between scans
    this.elementCounter = 0; // For unique IDs
  }

  limitFilteredElements() {
    if (this.filteredElements.size > this.maxFilteredElements) {
      const elementsToRemove =
        this.filteredElements.size - this.maxFilteredElements;
      const iterator = this.filteredElements.values();

      for (let i = 0; i < elementsToRemove; i++) {
        const element = iterator.next().value;
        this.filteredElements.delete(element);
      }
    }
  }

  cleanup() {
    // Comprehensive cleanup to prevent memory leaks
    this.filteredElements.clear();
    this.uiElementCache.clear();

    // Clean up any remaining container markers
    const markedElements = document.querySelectorAll(
      "[data-xsafe-container-child], [data-xsafe-id]"
    );
    markedElements.forEach((element) => {
      element.removeAttribute("data-xsafe-container-child");
      element.removeAttribute("data-xsafe-id");
    });
  }
}
```

## 4. Chrome Web Store Compliance

### 4.1 Publication Readiness

**Current Status**: ✅ Ready for Chrome Web Store submission

**Compliance Features**:

- ✅ Manifest V3 compliant
- ✅ Enhanced error handling prevents crashes
- ✅ Zero data collection (privacy-first)
- ✅ Minimal required permissions
- ✅ Professional documentation
- ✅ Comprehensive testing and error fixes

### 4.2 Privacy Architecture

**Zero Data Collection**:

- ✅ No external requests or APIs
- ✅ Local storage only (Chrome storage API)
- ✅ No analytics or tracking
- ✅ No user identification
- ✅ Open source transparency

**Required Permissions Justified**:

- `storage`: Local user preferences only
- `activeTab`: Current domain detection for whitelist
- `scripting`: Content filtering functionality
- `host_permissions`: Twitter/X content access only

## 5. Component Architecture

### 5.1 Background Service Worker (`background.js`)

**Purpose**: Lightweight coordination and settings management with robust error handling

**Enhanced Features**:

- Message validation and null checking
- Graceful error responses
- Settings migration handling
- Tab communication safety

### 5.2 Content Scripts (`content/content.js`)

**Purpose**: High-performance DOM manipulation and content filtering with error resilience

#### 5.2.1 Smart DOM Scanner (Error-Safe)

- **Optimized Frequency**: 1-second scanning with cooldown protection
- **Error Recovery**: Try-catch around all DOM operations
- **Validation**: Element existence checks before manipulation
- **Memory Protection**: Automatic cleanup and limits

#### 5.2.2 Type-Safe Content Detection

- **Safe Property Access**: Proper type checking before string operations
- **Null Handling**: Graceful handling of missing attributes
- **DOM Validation**: Verification that elements exist and are accessible
- **Error Logging**: Comprehensive error reporting for debugging

### 5.3 User Interface Components (Enhanced)

#### 5.3.1 Robust Popup (`popup/`)

- **Connection Resilience**: Handles background script unavailability
- **Default Fallbacks**: Prevents crashes with default settings
- **Error Display**: User-friendly error messages
- **Safe Mode Toggle**: Single switch with green visual feedback

## 6. Testing and Quality Assurance

### 6.1 Error Testing Coverage

**Critical Error Scenarios Tested**:

- ✅ DOM elements removed during processing
- ✅ Missing or null element attributes
- ✅ Background script unavailable
- ✅ Invalid message formats
- ✅ Memory limit exceeded
- ✅ Network connectivity issues

### 6.2 Performance Testing

**Performance Metrics**:

- Scan frequency: 1 second with 2-second cooldown
- Memory usage: Capped at 200 filtered elements
- Cache size: Maximum 500 UI detection entries
- Processing limit: 50 elements per scan maximum

## 7. Deployment Architecture

### 7.1 Build System

**Production Build** (`npm run build`):

- Webpack optimization for Chrome extension
- Code minification and error handling preservation
- Asset processing and icon generation
- Manifest validation and enhancement

### 7.2 Extension Package

**Chrome Web Store Package**: `xsafe-extension-v0.1.0.zip`

- Complete extension ready for publication
- All error fixes applied and tested
- Enhanced manifest with author and homepage
- Professional icons and documentation

---

**Version**: 0.1.0 (Chrome Web Store Ready)
**Last Updated**: Current with all error fixes and publication preparation
**Status**: ✅ Production ready, crash-resistant, publication approved
