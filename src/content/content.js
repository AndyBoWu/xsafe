/**
 * XSafe Content Script - Performance Optimized Version
 * Handles DOM scanning, content filtering, and element replacement
 */

class XSafeContentFilter {
  constructor() {
    this.settings = null;
    this.observer = null;
    this.mutationObserver = null;
    this.filteredElements = new Set();
    this.isFiltering = false;
    this.uiElementCache = new Map(); // Cache UI element detection results
    this.maxFilteredElements = 200; // Prevent memory leaks
    this.lastScanTime = 0;
    this.scanCooldown = 2000; // Minimum 2 seconds between scans

    this.init();
  }

  async init() {
    console.log('[XSafe] Content script initializing on:', window.location.href);

    // Set up message listener for settings updates
    this.setupMessageListener();

    // Request initial settings and start immediately if enabled
    await this.requestSettings();

    // Start immediately if settings are available and enabled
    this.startIfEnabled();

    // Single delayed startup for dynamic content (reduced from multiple attempts)
    setTimeout(() => {
      this.startIfEnabled();
    }, 2000);
  }

  startIfEnabled() {
    // Start content filtering if enabled
    if (this.settings && this.settings.enabled) {
      console.log('[XSafe] Starting filtering...');
      this.startFiltering();
    }
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });
  }

  async requestSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response.success) {
        this.settings = response.data;
      }
    } catch (error) {
      console.error('[XSafe] Failed to get settings:', error);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    switch (message.type) {
    case 'UPDATE_FILTERS':
      this.settings = message.settings;

      if (this.settings.enabled) {
        this.startFiltering();
      } else {
        this.stopFiltering();
      }

      // Single immediate re-scan (removed timeout)
      if (this.settings.enabled) {
        this.scanExistingContent();
      }

      sendResponse({ success: true });
      break;
    }
  }

  startFiltering() {
    // Avoid duplicate setup
    if (this.isFiltering) {
      this.scanExistingContent();
      return;
    }

    this.isFiltering = true;

    // Initial scan of existing content
    this.scanExistingContent();

    // Set up observers for dynamic content (only if not already set up)
    this.setupObservers();

    // Inject CSS for placeholders
    this.injectPlaceholderCSS();

    // Set up much less frequent periodic scanning
    this.setupPeriodicScanning();
  }

  setupPeriodicScanning() {
    // Clear any existing interval to prevent memory leaks
    if (this.periodicScanInterval) {
      clearInterval(this.periodicScanInterval);
      this.periodicScanInterval = null;
    }

    // Scan every 1 second for new content
    this.periodicScanInterval = setInterval(() => {
      if (this.settings && this.settings.enabled && this.canScan()) {
        this.scanExistingContent();
      }
    }, 1000);
  }

  canScan() {
    const now = Date.now();
    if (now - this.lastScanTime < this.scanCooldown) {
      return false; // Too soon since last scan
    }
    return true;
  }

  stopFiltering() {
    console.log('[XSafe] Stopping content filtering...');

    this.isFiltering = false;

    // Disconnect observers
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    // Clear periodic scanning
    if (this.periodicScanInterval) {
      clearInterval(this.periodicScanInterval);
      this.periodicScanInterval = null;
    }

    // Restore filtered elements and clear memory
    this.restoreAllElements();
    this.cleanup();
  }

  cleanup() {
    // Clear caches and sets to prevent memory leaks
    this.filteredElements.clear();
    this.uiElementCache.clear();
  }

  scanExistingContent() {
    const now = Date.now();
    if (now - this.lastScanTime < this.scanCooldown) {
      return; // Skip if too soon
    }

    this.lastScanTime = now;
    const startTime = performance.now();

    // Clean up old filtered elements if too many
    this.limitFilteredElements();

    // Scan for content using optimized selectors
    if (this.shouldFilterVideos()) {
      this.scanForVideos(document);
    }

    if (this.shouldFilterImages()) {
      this.scanForImages(document);
    }

    const processingTime = performance.now() - startTime;
    // Reduced logging - only log slow scans
    if (processingTime > 100) {
      console.log('[XSafe] Slow scan completed in', processingTime, 'ms');
    }
  }

  limitFilteredElements() {
    // Prevent memory leaks by limiting the number of filtered elements
    if (this.filteredElements.size > this.maxFilteredElements) {
      const elementsToRemove = this.filteredElements.size - this.maxFilteredElements;
      const iterator = this.filteredElements.values();

      for (let i = 0; i < elementsToRemove; i++) {
        const element = iterator.next().value;
        if (element && element._xsafePlaceholder) {
          element._xsafePlaceholder.remove();
        }
        this.filteredElements.delete(element);
      }
    }
  }

  setupObservers() {
    // More efficient mutation observer - only watch main content area
    const mainContentArea = document.querySelector('[data-testid="primaryColumn"]') || document.body;

    this.mutationObserver = new MutationObserver(
      this.debounce(() => {
        if (this.canScan()) {
          this.scanNewContent();
        }
      }, 1000) // Increased debounce from 300ms to 1000ms
    );

    this.mutationObserver.observe(mainContentArea, {
      childList: true,
      subtree: true
    });
  }

  scanNewContent() {
    // Only scan new content that hasn't been scanned
    const addedNodes = document.querySelectorAll('*:not([data-xsafe-scanned])');
    let scannedCount = 0;

    addedNodes.forEach(node => {
      if (scannedCount < 50) { // Limit processing to prevent overload
        this.scanElement(node);
        node.setAttribute('data-xsafe-scanned', 'true');
        scannedCount++;
      }
    });
  }

  scanElement(element) {
    if (this.shouldFilterVideos()) {
      this.checkForVideo(element);
    }
    if (this.shouldFilterImages()) {
      this.checkForImage(element);
    }
  }

  scanForVideos(container = document) {
    // Optimized video selectors - combined for efficiency
    const videoSelector = [
      'video',
      '[data-testid="videoPlayer"]',
      '[data-testid="videoComponent"]',
      'iframe[src*="youtube"], iframe[src*="youtu.be"], iframe[src*="vimeo"]'
    ].join(', ');

    const elements = container.querySelectorAll(videoSelector);
    elements.forEach(element => this.filterVideo(element));
  }

  scanForImages(container = document) {
    // Optimized image selectors - combined for efficiency, excluding UI elements
    const imageSelector = [
      '[data-testid="tweetPhoto"] img',
      '[data-testid="media"] img',
      '[data-testid="card.layoutLarge.media"] img',
      '[data-testid="card.layoutSmall.media"] img',
      'article [data-testid="cellInnerDiv"] img[src*="pbs.twimg.com"]',
      'article [data-testid="cellInnerDiv"] img[src*="ton.twimg.com"]',
      'a[href*="/photo/"] img'
    ].join(', ');

    const elements = container.querySelectorAll(imageSelector);
    elements.forEach(element => {
      if (!this.isUIElement(element)) {
        this.filterImage(element);
      }
    });
  }

  checkForVideo(element) {
    const videoTags = ['VIDEO', 'IFRAME'];
    if (videoTags.includes(element.tagName) ||
        element.querySelector('video, iframe[src*="youtube"], iframe[src*="vimeo"]')) {
      this.filterVideo(element);
    }
  }

  checkForImage(element) {
    if (element.tagName === 'IMG' && !this.isUIElement(element)) {
      this.filterImage(element);
    }
  }

  filterVideo(element) {
    if (this.isWhitelisted(element) || this.filteredElements.has(element)) {
      return;
    }

    if (this.shouldFilter(element, 'video')) {
      this.replaceElement(element, 'video');
    }
  }

  filterImage(element) {
    if (this.isWhitelisted(element) || this.filteredElements.has(element)) {
      return;
    }

    if (this.shouldFilter(element, 'image')) {
      this.replaceElement(element, 'image');
    }
  }

  shouldFilter(element, type) {
    // Check intensity level
    if (this.settings.intensityLevel === 'permissive') {
      return false;
    }

    // Check blacklisted domains
    if (this.isBlacklisted(element)) {
      return true;
    }

    return true;
  }

  isWhitelisted(element) {
    const domain = window.location.hostname;
    return this.settings.whitelistedDomains.includes(domain);
  }

  isBlacklisted(element) {
    const domain = window.location.hostname;
    return this.settings.blacklistedDomains.includes(domain);
  }

  replaceElement(element, type) {
    // Store original element data
    const originalData = {
      element: element,
      type: type,
      originalDisplay: element.style.display,
      originalVisibility: element.style.visibility,
      originalParent: element.parentNode,
      originalNextSibling: element.nextSibling
    };

    // Create placeholder
    const placeholder = this.createPlaceholder(element, type);

    // Replace element
    if (this.settings.showPlaceholders) {
      element.parentNode.insertBefore(placeholder, element);
      element.style.display = 'none';
    } else {
      element.style.display = 'none';
    }

    // Store for potential restoration
    this.filteredElements.add(element);
    element._xsafeData = originalData;
    element._xsafePlaceholder = placeholder;
  }

  createPlaceholder(element, type) {
    const placeholder = document.createElement('div');
    placeholder.className = `xsafe-placeholder xsafe-${type}-placeholder`;

    // Get element dimensions
    const rect = element.getBoundingClientRect();
    const width = rect.width || element.offsetWidth || 300;
    const height = rect.height || element.offsetHeight || 200;

    placeholder.style.cssText = `
      width: ${width}px;
      height: ${height}px;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      border: 2px dashed #cbd5e0;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      color: #4a5568;
      text-align: center;
      position: relative;
      box-sizing: border-box;
    `;

    const icon = type === 'video' ? '🎥' : '🖼️';
    const typeText = type === 'video' ? 'Video' : 'Image';

    placeholder.innerHTML = `
      <div style="margin-bottom: 8px; font-size: 24px;">${icon}</div>
      <div style="font-weight: 500; margin-bottom: 4px;">${typeText} Filtered</div>
      <div style="font-size: 12px; opacity: 0.7; margin-bottom: 12px;">Content hidden by XSafe</div>
      ${this.settings.showClickToReveal ? `
        <button class="xsafe-reveal-btn" style="
          background: #4299e1;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s;
        ">Click to Reveal</button>
      ` : ''}
    `;

    // Add click to reveal functionality
    if (this.settings.showClickToReveal) {
      const revealBtn = placeholder.querySelector('.xsafe-reveal-btn');
      revealBtn.addEventListener('click', () => {
        this.revealElement(element);
      });

      revealBtn.addEventListener('mouseenter', () => {
        revealBtn.style.background = '#3182ce';
      });

      revealBtn.addEventListener('mouseleave', () => {
        revealBtn.style.background = '#4299e1';
      });
    }

    return placeholder;
  }

  revealElement(element) {
    if (element._xsafePlaceholder) {
      element._xsafePlaceholder.remove();
    }
    element.style.display = element._xsafeData.originalDisplay;
    this.filteredElements.delete(element);
  }

  restoreAllElements() {
    this.filteredElements.forEach(element => {
      this.revealElement(element);
    });
    this.filteredElements.clear();
  }

  shouldFilterVideos() {
    return ['videos', 'both'].includes(this.settings.filterMode);
  }

  shouldFilterImages() {
    return ['images', 'both'].includes(this.settings.filterMode);
  }

  injectPlaceholderCSS() {
    if (document.getElementById('xsafe-styles')) {return;}

    const styles = document.createElement('style');
    styles.id = 'xsafe-styles';
    styles.textContent = `
      .xsafe-placeholder {
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
      }

      .xsafe-reveal-btn:hover {
        transform: translateY(-1px);
      }

      .xsafe-placeholder.xsafe-video-placeholder {
        min-height: 200px;
      }

      .xsafe-placeholder.xsafe-image-placeholder {
        min-height: 100px;
      }
    `;

    document.head.appendChild(styles);
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  isUIElement(element) {
    // Use cache to avoid repeated expensive checks
    const cacheKey = element.src || element.outerHTML.substring(0, 100);
    if (this.uiElementCache.has(cacheKey)) {
      return this.uiElementCache.get(cacheKey);
    }

    let isUI = false;

    // Quick checks for common UI elements
    if (element.getAttribute('data-testid')?.includes('avatar') ||
        element.getAttribute('alt')?.toLowerCase().includes('avatar') ||
        element.getAttribute('alt')?.toLowerCase().includes('profile')) {
      isUI = true;
    }

    // Size-based check - very small images are likely UI
    else {
      const rect = element.getBoundingClientRect();
      if (rect.width < 80 && rect.height < 80) {
        isUI = true;
      }
    }

    // Cache the result
    this.uiElementCache.set(cacheKey, isUI);

    // Limit cache size to prevent memory leaks
    if (this.uiElementCache.size > 500) {
      const firstKey = this.uiElementCache.keys().next().value;
      this.uiElementCache.delete(firstKey);
    }

    return isUI;
  }
}

// Initialize content filter when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new XSafeContentFilter();
  });
} else {
  new XSafeContentFilter();
}
