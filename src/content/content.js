/**
 * XSafe Content Script
 * Handles DOM scanning, content filtering, and element replacement
 */

class XSafeContentFilter {
  constructor() {
    this.settings = null;
    this.observer = null;
    this.mutationObserver = null;
    this.filteredElements = new Set();
    this.performanceTracker = new PerformanceTracker();

    this.init();
  }

  async init() {
    console.log('[XSafe] Content script initializing...');

    // Set up message listener for settings updates
    this.setupMessageListener();

    // Request initial settings
    await this.requestSettings();

    // Start content filtering if enabled
    if (this.settings && this.settings.enabled) {
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
      sendResponse({ success: true });
      break;
    }
  }

  startFiltering() {
    console.log('[XSafe] Starting content filtering...');

    // Initial scan of existing content
    this.scanExistingContent();

    // Set up observers for dynamic content
    this.setupObservers();

    // Inject CSS for placeholders
    this.injectPlaceholderCSS();
  }

  stopFiltering() {
    console.log('[XSafe] Stopping content filtering...');

    // Disconnect observers
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    // Restore filtered elements
    this.restoreAllElements();
  }

  scanExistingContent() {
    const startTime = performance.now();

    // Scan for videos
    if (this.shouldFilterVideos()) {
      this.scanForVideos(document);
    }

    // Scan for images
    if (this.shouldFilterImages()) {
      this.scanForImages(document);
    }

    const processingTime = performance.now() - startTime;
    this.performanceTracker.record('scanTime', processingTime);
  }

  setupObservers() {
    // Intersection Observer for performance-optimized scanning
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.scanElement(entry.target);
        }
      });
    }, { threshold: 0.1 });

    // Mutation Observer for dynamic content
    this.mutationObserver = new MutationObserver(
      this.debounce(() => {
        this.scanNewContent();
      }, 100)
    );

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  scanNewContent() {
    const addedNodes = document.querySelectorAll('*:not([data-xsafe-scanned])');
    addedNodes.forEach(node => {
      this.scanElement(node);
      node.setAttribute('data-xsafe-scanned', 'true');
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
    const videoSelectors = [
      'video',
      'iframe[src*="youtube"]',
      'iframe[src*="youtu.be"]',
      'iframe[src*="vimeo"]',
      'iframe[src*="twitch"]',
      'iframe[src*="tiktok"]',
      '[data-video-id]',
      '.video-player',
      '[class*="video"]',
      '[id*="video"]'
    ];

    videoSelectors.forEach(selector => {
      const elements = container.querySelectorAll(selector);
      elements.forEach(element => this.filterVideo(element));
    });
  }

  scanForImages(container = document) {
    const imageSelectors = [
      'img',
      'picture',
      '[style*="background-image"]',
      'svg image',
      '[data-src]'
    ];

    imageSelectors.forEach(selector => {
      const elements = container.querySelectorAll(selector);
      elements.forEach(element => this.filterImage(element));
    });
  }

  checkForVideo(element) {
    const videoTags = ['VIDEO', 'IFRAME'];
    const videoClasses = ['video', 'player', 'embed'];
    const videoAttributes = ['data-video-id', 'data-player'];

    if (videoTags.includes(element.tagName) ||
        videoClasses.some(cls => element.className.toLowerCase().includes(cls)) ||
        videoAttributes.some(attr => element.hasAttribute(attr)) ||
        (element.tagName === 'IFRAME' && this.isVideoIframe(element))) {
      this.filterVideo(element);
    }
  }

  checkForImage(element) {
    if (element.tagName === 'IMG' ||
        element.tagName === 'PICTURE' ||
        element.style.backgroundImage ||
        element.hasAttribute('data-src')) {
      this.filterImage(element);
    }
  }

  isVideoIframe(iframe) {
    const src = iframe.src || iframe.getAttribute('data-src') || '';
    const videoServices = [
      'youtube.com', 'youtu.be', 'vimeo.com', 'twitch.tv',
      'tiktok.com', 'dailymotion.com', 'streamable.com'
    ];

    return videoServices.some(service => src.includes(service));
  }

  filterVideo(element) {
    if (this.isWhitelisted(element) || this.filteredElements.has(element)) {
      return;
    }

    if (this.shouldFilter(element, 'video')) {
      this.replaceElement(element, 'video');
      this.recordFiltering('video');
    }
  }

  filterImage(element) {
    if (this.isWhitelisted(element) || this.filteredElements.has(element)) {
      return;
    }

    if (this.shouldFilter(element, 'image')) {
      this.replaceElement(element, 'image');
      this.recordFiltering('image');
    }
  }

  shouldFilter(element, type) {
    // Check intensity level
    if (this.settings.intensityLevel === 'permissive') {
      // Only filter explicit content (would need more sophisticated detection)
      return false;
    }

    // Check blacklisted domains
    if (this.isBlacklisted(element)) {
      return true;
    }

    // Default filtering based on mode
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
    const startTime = performance.now();

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

    const processingTime = performance.now() - startTime;
    this.performanceTracker.record('replaceTime', processingTime);
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

  recordFiltering(type) {
    chrome.runtime.sendMessage({
      type: 'CONTENT_FILTERED',
      data: {
        type: type,
        count: 1,
        domain: window.location.hostname,
        url: window.location.href
      }
    });
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
}

/**
 * Performance Tracker
 * Monitors and reports performance metrics
 */
class PerformanceTracker {
  constructor() {
    this.metrics = {
      scanTime: [],
      filterTime: [],
      replaceTime: [],
      memoryUsage: []
    };

    this.startMemoryMonitoring();
  }

  record(metric, value) {
    if (this.metrics[metric]) {
      this.metrics[metric].push(value);

      // Keep only recent measurements
      if (this.metrics[metric].length > 100) {
        this.metrics[metric] = this.metrics[metric].slice(-50);
      }

      // Report to background script periodically
      if (this.metrics[metric].length % 10 === 0) {
        this.reportMetrics();
      }
    }
  }

  startMemoryMonitoring() {
    setInterval(() => {
      if (performance.memory) {
        this.record('memoryUsage', performance.memory.usedJSHeapSize);
      }
    }, 5000);
  }

  reportMetrics() {
    const averages = {};
    Object.keys(this.metrics).forEach(key => {
      const values = this.metrics[key];
      if (values.length > 0) {
        averages[key] = values.reduce((a, b) => a + b, 0) / values.length;
      }
    });

    chrome.runtime.sendMessage({
      type: 'PERFORMANCE_DATA',
      data: {
        processingTime: averages.scanTime || 0,
        loadImpact: averages.filterTime || 0,
        memoryUsage: averages.memoryUsage || 0
      }
    });
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
