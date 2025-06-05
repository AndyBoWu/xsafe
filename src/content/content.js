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

  setupGlobalClickHandler() {
    // Use event delegation to handle all reveal button clicks
    document.addEventListener('click', (e) => {
      if (e.target && e.target.classList.contains('xsafe-reveal-btn')) {
        e.preventDefault();
        e.stopPropagation();

        console.log('[XSafe] Reveal button clicked via delegation');

        // Get the element ID from the button
        const elementId = e.target.getAttribute('data-element-id');
        if (elementId) {
          const element = document.querySelector(`[data-xsafe-id="${elementId}"]`);
          if (element) {
            console.log('[XSafe] Found element to reveal:', element);
            this.revealElement(element);
          } else {
            console.error('[XSafe] Could not find element with ID:', elementId);
          }
        } else {
          console.error('[XSafe] Reveal button missing element ID');
        }
      }
    });
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
    console.log('[XSafe] Starting comprehensive image scan...');

    // PHASE 1: Container-level filtering (prioritized)
    // Filter entire content containers first to avoid partial filtering
    this.scanForMediaContainers(container);

    // PHASE 2: Individual image filtering (fallback)
    // Only filter individual images that aren't part of already-filtered containers
    this.scanForIndividualImages(container);

    console.log('[XSafe] Scan complete. Filtered elements:', this.filteredElements.size);
  }

  scanForMediaContainers(container = document) {
    // Target entire media/card containers that should be filtered as complete units
    const containerSelectors = [
      // Entire card containers (highest priority)
      '[data-testid="card.wrapper"]',
      '[data-testid="card.layoutLarge.detail"]',
      '[data-testid="card.layoutSmall.detail"]',

      // Large card containers
      '[data-testid="card.layoutLarge"]',
      '[data-testid="card.layoutSmall"]',

      // Link preview cards
      '[data-testid="card"]',

      // Media containers
      '[data-testid="media"]',
      '[data-testid="mediaContainer"]',

      // Photo and image containers
      '[data-testid="photoGrid"]',
      '[data-testid="photoViewer"]',
      '[data-testid="imageContainer"]',
      '[data-testid="tweetPhoto"]',

      // Generic card and media wrappers
      'div[class*="card"]',
      'div[class*="media"]',

      // External link previews and embeds
      'div[data-testid*="card"]',
      'div[aria-label*="Link"]',

      // Embedded content containers
      'article div[style*="background"]',

      // Tweet inner content that might contain media
      '[data-testid="tweetText"] + div',
      '[data-testid="cellInnerDiv"] > div > div'
    ];

    containerSelectors.forEach(selector => {
      try {
        const containers = container.querySelectorAll(selector);
        containers.forEach(containerElement => {
          // Skip if already processed or is a UI element
          if (this.filteredElements.has(containerElement) || this.isUIElement(containerElement)) {
            return;
          }

          // Check if this container has visual content
          const hasImages = containerElement.querySelector('img, [style*="background-image"]');
          const hasVideoContent = containerElement.querySelector('video, iframe');
          const hasMediaContent = hasImages || hasVideoContent || containerElement.style.backgroundImage;

          // Also check for card-like content with links and previews
          const hasLinkPreview = containerElement.querySelector('a[href^="http"]') &&
            (hasImages || containerElement.textContent.includes('http'));

          if ((hasMediaContent || hasLinkPreview) && this.shouldFilterContainer(containerElement)) {
            console.log('[XSafe] Filtering container:', selector, 'Size:', containerElement.offsetWidth, 'x', containerElement.offsetHeight, containerElement);
            this.filterContainer(containerElement);
          }
        });
      } catch (error) {
        console.warn('[XSafe] Error with container selector:', selector, error);
      }
    });
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

  scanForIndividualImages(container = document) {
    // Only scan for individual images that aren't already part of filtered containers
    const imageSelectors = [
      // Standard individual images (outside of containers)
      'article img[src*="pbs.twimg.com"]:not([data-xsafe-container-child])',
      'article img[src*="ton.twimg.com"]:not([data-xsafe-container-child])',
      'article img[src*="video.twimg.com"]:not([data-xsafe-container-child])',

      // Photo links
      'a[href*="/photo/"] img:not([data-xsafe-container-child])',
      'a[href*="/pic/"] img:not([data-xsafe-container-child])',

      // Less specific but important for catching edge cases
      '[data-testid="cellInnerDiv"] img[src*="twimg.com"]:not([data-xsafe-container-child])',
      'div[aria-label*="Image"] img:not([data-xsafe-container-child])',

      // Background images in divs
      'div[style*="background-image"]:not([data-xsafe-container-child])'
    ];

    // Process each selector
    imageSelectors.forEach(selector => {
      try {
        const elements = container.querySelectorAll(selector);
        elements.forEach(element => {
          // Skip if this element is inside an already filtered container
          if (this.isInsideFilteredContainer(element)) {
            return;
          }

          // Handle background image divs differently
          if (element.tagName === 'DIV' && element.style.backgroundImage) {
            if (!this.isUIElement(element)) {
              this.filterBackgroundImage(element);
            }
          } else if (element.tagName === 'IMG' && !this.isUIElement(element)) {
            this.filterImage(element);
          }
        });
      } catch (error) {
        console.warn('[XSafe] Error with individual image selector:', selector, error);
      }
    });
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

    // Try to find a better parent container to filter instead of just the image
    const betterContainer = this.findBestContainerForElement(element);
    if (betterContainer && betterContainer !== element) {
      console.log('[XSafe] Found better container for image:', betterContainer);
      this.filterContainer(betterContainer);
      return;
    }

    if (this.shouldFilter(element, 'image')) {
      this.replaceElement(element, 'image');
    }
  }

  findBestContainerForElement(element) {
    // Walk up the DOM to find the most appropriate container to filter
    let current = element.parentElement;
    let bestContainer = element;

    while (current && current !== document.body) {
      // Check if this looks like a content container
      const isContentContainer =
        current.getAttribute('data-testid')?.includes('card') ||
        current.getAttribute('data-testid')?.includes('media') ||
        current.getAttribute('data-testid')?.includes('tweet') ||
        current.className?.includes('card') ||
        current.className?.includes('media');

      // Check if it has multiple visual elements (suggests it's a container)
      const visualElements = current.querySelectorAll('img, video, iframe, [style*="background-image"]');
      const hasMultipleVisualElements = visualElements.length > 1;

      // Check size - if significantly larger than the original element, might be container
      const currentRect = current.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const isSignificantlyLarger =
        currentRect.height > elementRect.height * 1.5 ||
        currentRect.width > elementRect.width * 1.2;

      if ((isContentContainer || hasMultipleVisualElements || isSignificantlyLarger) &&
          !this.isUIElement(current) &&
          this.shouldFilterContainer(current)) {
        bestContainer = current;
        console.log('[XSafe] Better container found:', current.tagName, current.getAttribute('data-testid'), currentRect.width + 'x' + currentRect.height);
      }

      // Don't go too far up - stop at article or main content boundaries
      if (current.tagName === 'ARTICLE' ||
          current.getAttribute('data-testid') === 'cellInnerDiv' ||
          current.getAttribute('role') === 'article') {
        break;
      }

      current = current.parentElement;
    }

    return bestContainer;
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
