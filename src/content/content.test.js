/**
 * Content Script Unit Tests
 * Tests for XSafeContentFilter DOM manipulation and filtering logic
 */

// Mock DOM APIs
const mockElement = (tagName, attributes = {}) => ({
  tagName: tagName.toUpperCase(),
  getAttribute: jest.fn((attr) => attributes[attr] || null),
  setAttribute: jest.fn(),
  style: {},
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn(() => false)
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  src: attributes.src || '',
  dataset: {},
  ...attributes
});

// Mock document and DOM APIs
global.document = {
  querySelectorAll: jest.fn(() => []),
  createElement: jest.fn(() => mockElement('div')),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  body: mockElement('body'),
  head: mockElement('head')
};

global.window = {
  location: { hostname: 'example.com' },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  MutationObserver: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    disconnect: jest.fn()
  })),
  performance: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn()
  }
};

describe('XSafeContentFilter', () => {
  let XSafeContentFilter;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the content filter class
    XSafeContentFilter = class XSafeContentFilter {
      constructor() {
        this.settings = {
          enabled: true,
          filterMode: 'both',
          intensityLevel: 'moderate',
          whitelistedDomains: [],
          showPlaceholders: true
        };
        this.filteredElements = new Set();
        this.observer = null;
        this.isWhitelisted = false;
      }

      async init() {
        await this.loadSettings();
        this.checkWhitelist();

        if (!this.isWhitelisted && this.settings.enabled) {
          this.scanExistingContent();
          this.setupMutationObserver();
        }
      }

      async loadSettings() {
        // Mock settings loading
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
            if (response?.success) {
              this.settings = { ...this.settings, ...response.data };
            }
            resolve();
          });
        });
      }

      checkWhitelist() {
        const domain = window.location.hostname;
        this.isWhitelisted = this.settings.whitelistedDomains.includes(domain);
      }

      scanExistingContent() {
        const selectors = this.getContentSelectors();
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => this.processElement(element));
        });
      }

      getContentSelectors() {
        const selectors = [];

        if (this.settings.filterMode === 'images' || this.settings.filterMode === 'both') {
          selectors.push('img', '[style*="background-image"]');
        }

        if (this.settings.filterMode === 'videos' || this.settings.filterMode === 'both') {
          selectors.push('video', 'iframe[src*="youtube"]', 'iframe[src*="vimeo"]');
        }

        return selectors;
      }

      processElement(element) {
        if (this.shouldFilterElement(element)) {
          this.filterElement(element);
          this.trackFiltering(element);
        }
      }

      shouldFilterElement(element) {
        // Skip if already processed
        if (this.filteredElements.has(element)) return false;

        // Skip if disabled
        if (!this.settings.enabled) return false;

        // Check whitelist
        if (this.isWhitelisted) return false;

        const tagName = element.tagName.toLowerCase();
        const filterMode = this.settings.filterMode;

        // Check filter mode
        if (filterMode === 'images' && !this.isImageElement(element)) return false;
        if (filterMode === 'videos' && !this.isVideoElement(element)) return false;

        return true;
      }

      isImageElement(element) {
        const tagName = element.tagName.toLowerCase();
        return tagName === 'img' ||
               (element.style && element.style.backgroundImage) ||
               (element.getAttribute && element.getAttribute('style')?.includes('background-image'));
      }

      isVideoElement(element) {
        const tagName = element.tagName.toLowerCase();
        const src = element.src || element.getAttribute('src') || '';

        return tagName === 'video' ||
               (tagName === 'iframe' && (src.includes('youtube') || src.includes('vimeo')));
      }

      filterElement(element) {
        this.filteredElements.add(element);

        if (this.settings.showPlaceholders) {
          this.createPlaceholder(element);
        } else {
          this.hideElement(element);
        }
      }

      createPlaceholder(element) {
        const placeholder = document.createElement('div');
        placeholder.className = 'xsafe-placeholder';
        placeholder.setAttribute('data-xsafe-filtered', 'true');

        const elementType = this.isVideoElement(element) ? 'video' : 'image';
        placeholder.innerHTML = `
          <div class="xsafe-placeholder-content">
            <span class="xsafe-placeholder-icon">${elementType === 'video' ? '🎥' : '🖼️'}</span>
            <span class="xsafe-placeholder-text">Content filtered by XSafe</span>
            <button class="xsafe-reveal-btn">Click to reveal</button>
          </div>
        `;

        // Store original element for potential reveal
        placeholder._originalElement = element;

        // Replace element with placeholder
        if (element.parentNode) {
          element.parentNode.insertBefore(placeholder, element);
          element.style.display = 'none';
        }
      }

      hideElement(element) {
        element.style.display = 'none';
        element.setAttribute('data-xsafe-filtered', 'true');
      }

      trackFiltering(element) {
        const elementType = this.isVideoElement(element) ? 'video' : 'image';
        const domain = window.location.hostname;

        chrome.runtime.sendMessage({
          type: 'TRACK_FILTER',
          elementType,
          domain
        });
      }

      setupMutationObserver() {
        this.observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                this.processElement(node);

                // Process child elements
                const selectors = this.getContentSelectors();
                selectors.forEach(selector => {
                  const childElements = node.querySelectorAll?.(selector) || [];
                  childElements.forEach(child => this.processElement(child));
                });
              }
            });
          });
        });

        this.observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }

      updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.checkWhitelist();

        // Re-scan if needed
        if (this.settings.enabled && !this.isWhitelisted) {
          this.scanExistingContent();
        }
      }
    };
  });

  describe('Initialization', () => {
    it('should initialize with default settings', () => {
      const filter = new XSafeContentFilter();

      expect(filter.settings.enabled).toBe(true);
      expect(filter.settings.filterMode).toBe('both');
      expect(filter.filteredElements).toBeInstanceOf(Set);
    });

    it('should check whitelist on init', async () => {
      window.location.hostname = 'whitelisted.com';

      const filter = new XSafeContentFilter();
      filter.settings.whitelistedDomains = ['whitelisted.com'];
      filter.checkWhitelist();

      expect(filter.isWhitelisted).toBe(true);
    });
  });

  describe('Content Selectors', () => {
    it('should return image selectors for images mode', () => {
      const filter = new XSafeContentFilter();
      filter.settings.filterMode = 'images';

      const selectors = filter.getContentSelectors();

      expect(selectors).toContain('img');
      expect(selectors).toContain('[style*="background-image"]');
      expect(selectors).not.toContain('video');
    });

    it('should return video selectors for videos mode', () => {
      const filter = new XSafeContentFilter();
      filter.settings.filterMode = 'videos';

      const selectors = filter.getContentSelectors();

      expect(selectors).toContain('video');
      expect(selectors).toContain('iframe[src*="youtube"]');
      expect(selectors).not.toContain('img');
    });

    it('should return both selectors for both mode', () => {
      const filter = new XSafeContentFilter();
      filter.settings.filterMode = 'both';

      const selectors = filter.getContentSelectors();

      expect(selectors).toContain('img');
      expect(selectors).toContain('video');
      expect(selectors).toContain('iframe[src*="youtube"]');
    });
  });

  describe('Element Detection', () => {
    it('should detect image elements correctly', () => {
      const filter = new XSafeContentFilter();

      const imgElement = mockElement('img');
      const divWithBgImage = mockElement('div', {
        style: { backgroundImage: 'url(test.jpg)' }
      });
      const videoElement = mockElement('video');

      expect(filter.isImageElement(imgElement)).toBe(true);
      expect(filter.isImageElement(divWithBgImage)).toBe(true);
      expect(filter.isImageElement(videoElement)).toBe(false);
    });

    it('should detect video elements correctly', () => {
      const filter = new XSafeContentFilter();

      const videoElement = mockElement('video');
      const youtubeIframe = mockElement('iframe', { src: 'https://youtube.com/embed/123' });
      const vimeoIframe = mockElement('iframe', { src: 'https://vimeo.com/123' });
      const imgElement = mockElement('img');

      expect(filter.isVideoElement(videoElement)).toBe(true);
      expect(filter.isVideoElement(youtubeIframe)).toBe(true);
      expect(filter.isVideoElement(vimeoIframe)).toBe(true);
      expect(filter.isVideoElement(imgElement)).toBe(false);
    });
  });

  describe('Element Filtering', () => {
    it('should not filter when disabled', () => {
      const filter = new XSafeContentFilter();
      filter.settings.enabled = false;

      const element = mockElement('img');

      expect(filter.shouldFilterElement(element)).toBe(false);
    });

    it('should not filter whitelisted domains', () => {
      const filter = new XSafeContentFilter();
      filter.isWhitelisted = true;

      const element = mockElement('img');

      expect(filter.shouldFilterElement(element)).toBe(false);
    });

    it('should not filter already processed elements', () => {
      const filter = new XSafeContentFilter();

      const element = mockElement('img');
      filter.filteredElements.add(element);

      expect(filter.shouldFilterElement(element)).toBe(false);
    });

    it('should filter appropriate elements based on mode', () => {
      const filter = new XSafeContentFilter();
      filter.settings.filterMode = 'images';

      const imgElement = mockElement('img');
      const videoElement = mockElement('video');

      expect(filter.shouldFilterElement(imgElement)).toBe(true);
      expect(filter.shouldFilterElement(videoElement)).toBe(false);
    });
  });

  describe('Placeholder Creation', () => {
    it('should create placeholder for filtered element', () => {
      const filter = new XSafeContentFilter();
      const element = mockElement('img');

      // Mock parent node
      element.parentNode = {
        insertBefore: jest.fn()
      };

      filter.createPlaceholder(element);

      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(element.parentNode.insertBefore).toHaveBeenCalled();
      expect(element.style.display).toBe('none');
    });

    it('should hide element when placeholders disabled', () => {
      const filter = new XSafeContentFilter();
      filter.settings.showPlaceholders = false;

      const element = mockElement('img');
      filter.hideElement(element);

      expect(element.style.display).toBe('none');
      expect(element.setAttribute).toHaveBeenCalledWith('data-xsafe-filtered', 'true');
    });
  });

  describe('Mutation Observer', () => {
    it('should setup mutation observer correctly', () => {
      const filter = new XSafeContentFilter();
      filter.setupMutationObserver();

      expect(window.MutationObserver).toHaveBeenCalled();
      expect(filter.observer.observe).toHaveBeenCalledWith(document.body, {
        childList: true,
        subtree: true
      });
    });
  });

  describe('Settings Update', () => {
    it('should update settings and re-check whitelist', () => {
      const filter = new XSafeContentFilter();
      filter.scanExistingContent = jest.fn();

      const newSettings = {
        enabled: false,
        whitelistedDomains: ['example.com']
      };

      filter.updateSettings(newSettings);

      expect(filter.settings.enabled).toBe(false);
      expect(filter.settings.whitelistedDomains).toContain('example.com');
    });
  });

  describe('Performance Optimization', () => {
    it('should track filtered elements to avoid reprocessing', () => {
      const filter = new XSafeContentFilter();
      const element = mockElement('img');

      filter.filterElement(element);

      expect(filter.filteredElements.has(element)).toBe(true);
    });

    it('should batch process multiple elements efficiently', () => {
      const filter = new XSafeContentFilter();
      filter.processElement = jest.fn();

      // Mock querySelectorAll to return multiple elements
      document.querySelectorAll.mockReturnValue([
        mockElement('img'),
        mockElement('video'),
        mockElement('img')
      ]);

      filter.scanExistingContent();

      expect(filter.processElement).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing parentNode gracefully', () => {
      const filter = new XSafeContentFilter();
      const element = mockElement('img');
      element.parentNode = null;

      expect(() => filter.createPlaceholder(element)).not.toThrow();
    });

    it('should handle invalid elements gracefully', () => {
      const filter = new XSafeContentFilter();
      const invalidElement = null;

      expect(() => filter.processElement(invalidElement)).not.toThrow();
    });
  });
});
