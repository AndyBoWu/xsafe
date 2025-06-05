/**
 * Popup Script Unit Tests
 * Tests for XSafePopup UI interactions and settings management
 */

// Mock DOM elements
const mockElement = (id, type = 'div', properties = {}) => ({
  id,
  type,
  tagName: type.toUpperCase(),
  value: properties.value || '',
  checked: properties.checked || false,
  textContent: properties.textContent || '',
  innerHTML: properties.innerHTML || '',
  className: properties.className || '',
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    toggle: jest.fn(),
    contains: jest.fn(() => false)
  },
  style: {},
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  ...properties
});

// Mock document API
global.document = {
  getElementById: jest.fn((id) => {
    const elements = {
      'mainToggle': mockElement('mainToggle', 'input', { type: 'checkbox' }),
      'statusDot': mockElement('statusDot', 'span'),
      'statusText': mockElement('statusText', 'span'),
      'intensitySlider': mockElement('intensitySlider', 'input', { type: 'range', value: '1' }),
      'videosFiltered': mockElement('videosFiltered', 'span'),
      'imagesFiltered': mockElement('imagesFiltered', 'span'),
      'whitelistBtn': mockElement('whitelistBtn', 'button'),
      'optionsBtn': mockElement('optionsBtn', 'button')
    };
    return elements[id] || null;
  }),
  querySelectorAll: jest.fn((selector) => {
    if (selector === 'input[name="filterMode"]') {
      return [
        mockElement('filterMode1', 'input', { type: 'radio', value: 'videos' }),
        mockElement('filterMode2', 'input', { type: 'radio', value: 'images' }),
        mockElement('filterMode3', 'input', { type: 'radio', value: 'both' })
      ];
    }
    if (selector === '.intensity-label') {
      return [
        mockElement('label1', 'div', { getAttribute: () => '0' }),
        mockElement('label2', 'div', { getAttribute: () => '1' }),
        mockElement('label3', 'div', { getAttribute: () => '2' })
      ];
    }
    return [];
  }),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

// Mock Chrome APIs
global.chrome = {
  tabs: {
    query: jest.fn()
  },
  runtime: {
    sendMessage: jest.fn(),
    openOptionsPage: jest.fn()
  }
};

describe('XSafePopup', () => {
  let XSafePopup;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the popup class
    XSafePopup = class XSafePopup {
      constructor() {
        this.settings = null;
        this.currentStats = null;
        this.currentDomain = null;
      }

      async init() {
        await this.getCurrentDomain();
        await this.loadSettings();
        await this.loadStats();
        this.setupEventListeners();
        this.updateUI();
      }

      async getCurrentDomain() {
        return new Promise((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.url) {
              try {
                const url = new URL(tabs[0].url);
                this.currentDomain = url.hostname;
              } catch (error) {
                this.currentDomain = null;
              }
            }
            resolve();
          });
        });
      }

      async loadSettings() {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
            if (response?.success) {
              this.settings = response.data;
            }
            resolve();
          });
        });
      }

      async loadStats() {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'GET_STATS' }, (response) => {
            if (response?.success) {
              this.currentStats = response.data;
            }
            resolve();
          });
        });
      }

      setupEventListeners() {
        const mainToggle = document.getElementById('mainToggle');
        if (mainToggle) {
          mainToggle.addEventListener('change', this.handleMainToggle.bind(this));
        }

        const filterModeInputs = document.querySelectorAll('input[name="filterMode"]');
        filterModeInputs.forEach(input => {
          input.addEventListener('change', this.handleFilterModeChange.bind(this));
        });

        const intensitySlider = document.getElementById('intensitySlider');
        if (intensitySlider) {
          intensitySlider.addEventListener('input', this.handleIntensityChange.bind(this));
        }

        const whitelistBtn = document.getElementById('whitelistBtn');
        if (whitelistBtn) {
          whitelistBtn.addEventListener('click', this.handleWhitelistToggle.bind(this));
        }

        const optionsBtn = document.getElementById('optionsBtn');
        if (optionsBtn) {
          optionsBtn.addEventListener('click', this.handleOptionsClick.bind(this));
        }
      }

      updateUI() {
        this.updateStatus();
        this.updateMainToggle();
        this.updateFilterMode();
        this.updateIntensitySlider();
        this.updateStats();
        this.updateWhitelistButton();
      }

      updateStatus() {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');

        if (!statusDot || !statusText) return;

        if (!this.settings) {
          statusDot.className = 'status-dot loading';
          statusText.textContent = 'Loading...';
          return;
        }

        if (this.settings.enabled) {
          statusDot.className = 'status-dot';
          statusText.textContent = 'Active';
        } else {
          statusDot.className = 'status-dot disabled';
          statusText.textContent = 'Disabled';
        }
      }

      updateMainToggle() {
        const mainToggle = document.getElementById('mainToggle');
        if (mainToggle && this.settings) {
          mainToggle.checked = this.settings.enabled;
        }
      }

      updateFilterMode() {
        if (!this.settings) return;

        const filterModeInputs = document.querySelectorAll('input[name="filterMode"]');
        filterModeInputs.forEach(input => {
          input.checked = input.value === this.settings.filterMode;
        });
      }

      updateIntensitySlider() {
        const intensitySlider = document.getElementById('intensitySlider');
        const intensityLabels = document.querySelectorAll('.intensity-label');

        if (!intensitySlider || !this.settings) return;

        const intensityMap = {
          'permissive': 0,
          'moderate': 1,
          'strict': 2
        };

        const currentValue = intensityMap[this.settings.intensityLevel] || 1;
        intensitySlider.value = currentValue;

        intensityLabels.forEach(label => {
          const labelValue = parseInt(label.getAttribute('data-value'));
          label.classList.toggle('active', labelValue === currentValue);
        });
      }

      updateStats() {
        if (!this.currentStats) return;

        const videosFiltered = document.getElementById('videosFiltered');
        const imagesFiltered = document.getElementById('imagesFiltered');

        if (videosFiltered) {
          videosFiltered.textContent = this.formatNumber(this.currentStats.videosFiltered);
        }

        if (imagesFiltered) {
          imagesFiltered.textContent = this.formatNumber(this.currentStats.imagesFiltered);
        }
      }

      updateWhitelistButton() {
        const whitelistBtn = document.getElementById('whitelistBtn');
        if (!whitelistBtn || !this.settings || !this.currentDomain) return;

        const isWhitelisted = this.settings.whitelistedDomains.includes(this.currentDomain);

        if (isWhitelisted) {
          whitelistBtn.classList.add('whitelisted');
          whitelistBtn.innerHTML = '<span class="btn-icon">✅</span>Whitelisted';
        } else {
          whitelistBtn.classList.remove('whitelisted');
          whitelistBtn.innerHTML = '<span class="btn-icon">✅</span>Whitelist Site';
        }
      }

      async handleMainToggle(event) {
        const enabled = event.target.checked;
        await this.updateSetting('enabled', enabled);
        this.updateStatus();
      }

      async handleFilterModeChange(event) {
        const filterMode = event.target.value;
        await this.updateSetting('filterMode', filterMode);
      }

      async handleIntensityChange(event) {
        const value = parseInt(event.target.value);
        const intensityMap = ['permissive', 'moderate', 'strict'];
        const intensityLevel = intensityMap[value];

        await this.updateSetting('intensityLevel', intensityLevel);
        this.updateIntensitySlider();
      }

      async handleWhitelistToggle() {
        if (!this.currentDomain || !this.settings) return;

        const whitelistedDomains = [...this.settings.whitelistedDomains];
        const isWhitelisted = whitelistedDomains.includes(this.currentDomain);

        if (isWhitelisted) {
          const index = whitelistedDomains.indexOf(this.currentDomain);
          whitelistedDomains.splice(index, 1);
        } else {
          whitelistedDomains.push(this.currentDomain);
        }

        await this.updateSetting('whitelistedDomains', whitelistedDomains);
        this.updateWhitelistButton();
      }

      handleOptionsClick() {
        chrome.runtime.openOptionsPage();
      }

      async updateSetting(key, value) {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({
            type: 'UPDATE_SETTING',
            key: key,
            value: value
          }, (response) => {
            if (response?.success) {
              this.settings[key] = value;
            }
            resolve(response?.success || false);
          });
        });
      }

      formatNumber(num) {
        if (num >= 1000000) {
          return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
          return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
      }

      showError(message) {
        const statusText = document.getElementById('statusText');
        if (statusText) {
          const originalText = statusText.textContent;
          statusText.textContent = 'Error';
          statusText.style.color = '#f56565';

          setTimeout(() => {
            statusText.textContent = originalText;
            statusText.style.color = '';
          }, 2000);
        }
      }

      showSuccess(message) {
        const statusText = document.getElementById('statusText');
        if (statusText) {
          const originalText = statusText.textContent;
          statusText.textContent = 'Updated';
          statusText.style.color = '#48bb78';

          setTimeout(() => {
            statusText.textContent = originalText;
            statusText.style.color = '';
          }, 1000);
        }
      }
    };
  });

  describe('Initialization', () => {
    it('should initialize with null values', () => {
      const popup = new XSafePopup();

      expect(popup.settings).toBe(null);
      expect(popup.currentStats).toBe(null);
      expect(popup.currentDomain).toBe(null);
    });

    it('should setup event listeners during init', async () => {
      const popup = new XSafePopup();
      popup.getCurrentDomain = jest.fn().mockResolvedValue();
      popup.loadSettings = jest.fn().mockResolvedValue();
      popup.loadStats = jest.fn().mockResolvedValue();
      popup.setupEventListeners = jest.fn();
      popup.updateUI = jest.fn();

      await popup.init();

      expect(popup.setupEventListeners).toHaveBeenCalled();
      expect(popup.updateUI).toHaveBeenCalled();
    });
  });

  describe('Domain Detection', () => {
    it('should extract domain from current tab', async () => {
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ url: 'https://example.com/page' }]);
      });

      const popup = new XSafePopup();
      await popup.getCurrentDomain();

      expect(popup.currentDomain).toBe('example.com');
    });

    it('should handle invalid URLs gracefully', async () => {
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ url: 'invalid-url' }]);
      });

      const popup = new XSafePopup();
      await popup.getCurrentDomain();

      expect(popup.currentDomain).toBe(null);
    });

    it('should handle missing tab data', async () => {
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([]);
      });

      const popup = new XSafePopup();
      await popup.getCurrentDomain();

      expect(popup.currentDomain).toBe(null);
    });
  });

  describe('Settings Loading', () => {
    it('should load settings from background script', async () => {
      const mockSettings = {
        enabled: true,
        filterMode: 'both',
        intensityLevel: 'moderate'
      };

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'GET_SETTINGS') {
          callback({ success: true, data: mockSettings });
        }
      });

      const popup = new XSafePopup();
      await popup.loadSettings();

      expect(popup.settings).toEqual(mockSettings);
    });

    it('should handle settings loading failure', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'GET_SETTINGS') {
          callback({ success: false, error: 'Failed to load' });
        }
      });

      const popup = new XSafePopup();
      await popup.loadSettings();

      expect(popup.settings).toBe(null);
    });
  });

  describe('Stats Loading', () => {
    it('should load statistics from background script', async () => {
      const mockStats = {
        videosFiltered: 42,
        imagesFiltered: 123
      };

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'GET_STATS') {
          callback({ success: true, data: mockStats });
        }
      });

      const popup = new XSafePopup();
      await popup.loadStats();

      expect(popup.currentStats).toEqual(mockStats);
    });
  });

  describe('UI Updates', () => {
    it('should update status based on settings', () => {
      const popup = new XSafePopup();
      popup.settings = { enabled: true };

      const statusDot = document.getElementById('statusDot');
      const statusText = document.getElementById('statusText');

      popup.updateStatus();

      expect(statusDot.className).toBe('status-dot');
      expect(statusText.textContent).toBe('Active');
    });

    it('should show loading status when settings not loaded', () => {
      const popup = new XSafePopup();
      popup.settings = null;

      const statusDot = document.getElementById('statusDot');
      const statusText = document.getElementById('statusText');

      popup.updateStatus();

      expect(statusDot.className).toBe('status-dot loading');
      expect(statusText.textContent).toBe('Loading...');
    });

    it('should update main toggle based on settings', () => {
      const popup = new XSafePopup();
      popup.settings = { enabled: false };

      const mainToggle = document.getElementById('mainToggle');
      popup.updateMainToggle();

      expect(mainToggle.checked).toBe(false);
    });

    it('should update filter mode radio buttons', () => {
      const popup = new XSafePopup();
      popup.settings = { filterMode: 'videos' };

      const filterModeInputs = document.querySelectorAll('input[name="filterMode"]');
      popup.updateFilterMode();

      // First input should be checked (videos)
      expect(filterModeInputs[0].checked).toBe(true);
      expect(filterModeInputs[1].checked).toBe(false);
      expect(filterModeInputs[2].checked).toBe(false);
    });

    it('should update intensity slider value', () => {
      const popup = new XSafePopup();
      popup.settings = { intensityLevel: 'strict' };

      const intensitySlider = document.getElementById('intensitySlider');
      popup.updateIntensitySlider();

      expect(intensitySlider.value).toBe('2'); // strict = 2
    });
  });

  describe('Event Handlers', () => {
    it('should handle main toggle change', async () => {
      const popup = new XSafePopup();
      popup.updateSetting = jest.fn().mockResolvedValue(true);
      popup.updateStatus = jest.fn();

      const event = { target: { checked: false } };
      await popup.handleMainToggle(event);

      expect(popup.updateSetting).toHaveBeenCalledWith('enabled', false);
      expect(popup.updateStatus).toHaveBeenCalled();
    });

    it('should handle filter mode change', async () => {
      const popup = new XSafePopup();
      popup.updateSetting = jest.fn().mockResolvedValue(true);

      const event = { target: { value: 'images' } };
      await popup.handleFilterModeChange(event);

      expect(popup.updateSetting).toHaveBeenCalledWith('filterMode', 'images');
    });

    it('should handle intensity slider change', async () => {
      const popup = new XSafePopup();
      popup.updateSetting = jest.fn().mockResolvedValue(true);
      popup.updateIntensitySlider = jest.fn();

      const event = { target: { value: '0' } };
      await popup.handleIntensityChange(event);

      expect(popup.updateSetting).toHaveBeenCalledWith('intensityLevel', 'permissive');
      expect(popup.updateIntensitySlider).toHaveBeenCalled();
    });

    it('should handle whitelist toggle', async () => {
      const popup = new XSafePopup();
      popup.currentDomain = 'example.com';
      popup.settings = { whitelistedDomains: [] };
      popup.updateSetting = jest.fn().mockResolvedValue(true);
      popup.updateWhitelistButton = jest.fn();

      await popup.handleWhitelistToggle();

      expect(popup.updateSetting).toHaveBeenCalledWith('whitelistedDomains', ['example.com']);
      expect(popup.updateWhitelistButton).toHaveBeenCalled();
    });

    it('should remove domain from whitelist if already whitelisted', async () => {
      const popup = new XSafePopup();
      popup.currentDomain = 'example.com';
      popup.settings = { whitelistedDomains: ['example.com', 'other.com'] };
      popup.updateSetting = jest.fn().mockResolvedValue(true);
      popup.updateWhitelistButton = jest.fn();

      await popup.handleWhitelistToggle();

      expect(popup.updateSetting).toHaveBeenCalledWith('whitelistedDomains', ['other.com']);
    });

    it('should handle options button click', () => {
      const popup = new XSafePopup();
      popup.handleOptionsClick();

      expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
    });
  });

  describe('Utility Functions', () => {
    it('should format numbers correctly', () => {
      const popup = new XSafePopup();

      expect(popup.formatNumber(42)).toBe('42');
      expect(popup.formatNumber(1500)).toBe('1.5K');
      expect(popup.formatNumber(1500000)).toBe('1.5M');
    });

    it('should update settings via background script', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'UPDATE_SETTING') {
          callback({ success: true });
        }
      });

      const popup = new XSafePopup();
      popup.settings = { enabled: true };

      const result = await popup.updateSetting('enabled', false);

      expect(result).toBe(true);
      expect(popup.settings.enabled).toBe(false);
    });

    it('should handle setting update failure', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'UPDATE_SETTING') {
          callback({ success: false, error: 'Update failed' });
        }
      });

      const popup = new XSafePopup();
      popup.settings = { enabled: true };

      const result = await popup.updateSetting('enabled', false);

      expect(result).toBe(false);
      expect(popup.settings.enabled).toBe(true); // Should remain unchanged
    });
  });

  describe('Error and Success Messages', () => {
    it('should show error message temporarily', () => {
      const popup = new XSafePopup();
      const statusText = document.getElementById('statusText');
      statusText.textContent = 'Active';

      popup.showError('Test error');

      expect(statusText.textContent).toBe('Error');
      expect(statusText.style.color).toBe('#f56565');
    });

    it('should show success message temporarily', () => {
      const popup = new XSafePopup();
      const statusText = document.getElementById('statusText');
      statusText.textContent = 'Active';

      popup.showSuccess('Test success');

      expect(statusText.textContent).toBe('Updated');
      expect(statusText.style.color).toBe('#48bb78');
    });
  });

  describe('Whitelist Button Updates', () => {
    it('should show whitelist button for non-whitelisted domain', () => {
      const popup = new XSafePopup();
      popup.currentDomain = 'example.com';
      popup.settings = { whitelistedDomains: [] };

      const whitelistBtn = document.getElementById('whitelistBtn');
      popup.updateWhitelistButton();

      expect(whitelistBtn.classList.remove).toHaveBeenCalledWith('whitelisted');
      expect(whitelistBtn.innerHTML).toBe('<span class="btn-icon">✅</span>Whitelist Site');
    });

    it('should show whitelisted button for whitelisted domain', () => {
      const popup = new XSafePopup();
      popup.currentDomain = 'example.com';
      popup.settings = { whitelistedDomains: ['example.com'] };

      const whitelistBtn = document.getElementById('whitelistBtn');
      popup.updateWhitelistButton();

      expect(whitelistBtn.classList.add).toHaveBeenCalledWith('whitelisted');
      expect(whitelistBtn.innerHTML).toBe('<span class="btn-icon">✅</span>Whitelisted');
    });
  });
});
