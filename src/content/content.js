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
    this.elementCounter = 0; // For unique IDs

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

    // No more placeholder CSS injection needed
    console.log('[XSafe] Using direct hiding approach - no placeholder setup needed');

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

    // Clean up any remaining container markers
    const markedElements = document.querySelectorAll('[data-xsafe-container-child], [data-xsafe-id]');
    markedElements.forEach(element => {
      element.removeAttribute('data-xsafe-container-child');
      element.removeAttribute('data-xsafe-id');
    });
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
        // No more placeholders to remove - elements are just hidden
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
    console.log('[XSafe] Starting granular image scan - targeting only media, preserving post content...');

    // Focus on individual media elements, not entire containers
    // This preserves post text while hiding only images/videos
    this.scanForIndividualMedia(container);

    console.log('[XSafe] Scan complete. Filtered elements:', this.filteredElements.size);
  }

  scanForIndividualMedia(container = document) {
    // Target specific media elements only, not their containers
    const mediaSelectors = [
      // Individual images in tweets - be very specific
      '[data-testid="tweetPhoto"] img',
      '[data-testid="media"] img:not([alt*="avatar"]):not([alt*="profile"])',

      // Video elements
      '[data-testid="videoPlayer"] video',
      '[data-testid="videoComponent"] video',
      'video',

      // Card media images (but not the entire card)
      '[data-testid="card.layoutLarge.media"] img',
      '[data-testid="card.layoutSmall.media"] img',

      // Photo grid images specifically
      '[data-testid="photoGrid"] img',

      // Media container images (but not the container itself)
      '[data-testid="mediaContainer"] img',
      '[data-testid="photoViewer"] img',

      // Tweet images with Twitter domains
      'article img[src*="pbs.twimg.com"]:not([alt*="avatar"]):not([alt*="profile"])',
      'article img[src*="ton.twimg.com"]:not([alt*="avatar"]):not([alt*="profile"])',
      'article img[src*="video.twimg.com"]',

      // Background image divs within media contexts
      '[data-testid="media"] div[style*="background-image"]',
      '[data-testid="tweetPhoto"] div[style*="background-image"]',

      // iframe embeds (videos, external content)
      'iframe[src*="youtube"]',
      'iframe[src*="vimeo"]',
      'iframe[src*="twimg"]'
    ];

    mediaSelectors.forEach(selector => {
      try {
        const elements = container.querySelectorAll(selector);
        console.log(`[XSafe] Found ${elements.length} elements for selector: ${selector}`);

        elements.forEach(element => {
          // Double-check this isn't a UI element (avatar, etc.)
          if (!this.isUIElement(element) && !this.isInsideFilteredContainer(element)) {
            console.log('[XSafe] Filtering individual media element:', element.tagName, element.src || 'no-src');

            if (element.tagName === 'IMG') {
              this.filterImage(element);
            } else if (element.tagName === 'VIDEO' || element.tagName === 'IFRAME') {
              this.filterVideo(element);
            } else if (element.tagName === 'DIV' && element.style.backgroundImage) {
              this.filterBackgroundImage(element);
            }
          }
        });
      } catch (error) {
        console.warn('[XSafe] Error with media selector:', selector, error);
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

    // Filter individual images only - preserve post structure
    if (this.shouldFilter(element, 'image')) {
      console.log('[XSafe] Hiding individual image element, preserving post content');
      this.replaceElement(element, 'image');
    }
  }

  filterBackgroundImage(element) {
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
    try {
      // Validate element is still in DOM and has a parent
      if (!element || !element.parentNode || !document.contains(element)) {
        console.warn('[XSafe] Cannot replace element - not in DOM or no parent');
        return;
      }

      // Generate unique ID for this element for potential restoration
      const elementId = `xsafe-${++this.elementCounter}`;
      element.setAttribute('data-xsafe-id', elementId);

      // Store original element data for potential restoration
      const originalData = {
        element: element,
        type: type,
        originalDisplay: element.style.display,
        originalVisibility: element.style.visibility,
        originalParent: element.parentNode,
        originalNextSibling: element.nextSibling,
        elementId: elementId
      };

      console.log('[XSafe] Hiding', type, 'element completely:', elementId);

      // Simply hide the element completely - no placeholder
      element.style.display = 'none';
      element.style.visibility = 'hidden';

      // Store for potential restoration
      this.filteredElements.add(element);
      element._xsafeData = originalData;

      // No placeholder needed - element is just hidden
      element._xsafePlaceholder = null;
    } catch (error) {
      console.error('[XSafe] Error in replaceElement:', error);
    }
  }

  revealElement(element) {
    console.log('[XSafe] Revealing hidden element:', element);

    // If this was a container, clean up child markers
    const childElements = element.querySelectorAll('[data-xsafe-container-child]');
    if (childElements.length > 0) {
      console.log('[XSafe] Removing container child markers from', childElements.length, 'elements');
      childElements.forEach(child => {
        child.removeAttribute('data-xsafe-container-child');
      });
    }

    // Restore original element visibility
    if (element._xsafeData) {
      console.log('[XSafe] Restoring original element properties');
      element.style.display = element._xsafeData.originalDisplay || '';
      element.style.visibility = element._xsafeData.originalVisibility || '';
    } else {
      // Fallback if data is missing
      console.log('[XSafe] Using fallback restoration (no saved data)');
      element.style.display = '';
      element.style.visibility = '';
    }

    // Clean up element attributes
    element.removeAttribute('data-xsafe-id');

    // Remove from filtered set
    this.filteredElements.delete(element);

    console.log('[XSafe] Element revealed successfully');
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
    // No longer needed - we're not using placeholders
    console.log('[XSafe] Placeholder CSS injection skipped - using direct hiding approach');
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

    try {
      // Quick checks for common UI elements with safe property access
      const dataTestId = element.getAttribute('data-testid');
      const altText = element.getAttribute('alt');

      if ((dataTestId && dataTestId.includes('avatar')) ||
          (altText && typeof altText === 'string' && altText.toLowerCase().includes('avatar')) ||
          (altText && typeof altText === 'string' && altText.toLowerCase().includes('profile'))) {
        isUI = true;
      }

      // Size-based check - very small images are likely UI (with error handling)
      else {
        const rect = element.getBoundingClientRect();
        if (rect && rect.width < 80 && rect.height < 80) {
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
    } catch (error) {
      console.warn('[XSafe] Error in isUIElement:', error);
      return false; // Default to not UI element if error occurs
    }
  }

  isInsideFilteredContainer(element) {
    // Check if element is inside a container that we've already filtered
    let parent = element.parentElement;
    while (parent) {
      if (this.filteredElements.has(parent)) {
        return true;
      }
      // Also check for our container markers
      if (parent.hasAttribute('data-xsafe-id')) {
        return true;
      }
      parent = parent.parentElement;
    }
    return false;
  }

  filterContainer(containerElement) {
    if (this.isWhitelisted(containerElement) || this.filteredElements.has(containerElement)) {
      return;
    }

    if (this.shouldFilter(containerElement, 'image')) {
      // Mark all child elements so they won't be processed individually
      const childElements = containerElement.querySelectorAll('img, div, video, iframe');
      childElements.forEach(child => {
        child.setAttribute('data-xsafe-container-child', 'true');
      });

      console.log('[XSafe] Filtering entire container with', childElements.length, 'child elements');
      this.replaceElement(containerElement, 'image');
    }
  }

  shouldFilterContainer(containerElement) {
    // More sophisticated container filtering logic
    const rect = containerElement.getBoundingClientRect();

    // Skip very small or invisible containers
    if (rect.width < 50 || rect.height < 50) {
      return false;
    }

    // Skip containers that are primarily text
    const textLength = containerElement.textContent?.length || 0;
    const imageCount = containerElement.querySelectorAll('img, [style*="background-image"]').length;

    // If it's mostly text and few images, might not be a media container
    if (textLength > 500 && imageCount === 0) {
      return false;
    }

    // Skip navigation and UI containers
    if (containerElement.closest('[role="navigation"], [data-testid="sidebarColumn"], header, nav')) {
      return false;
    }

    return true;
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
