/**
 * XSafe Popup Script
 * Handles UI interactions and communication with background script
 */

// Import CSS for webpack processing
import './popup.css';

class XSafePopup {
  constructor() {
    this.settings = null;
    this.currentStats = null;
    this.currentDomain = null;

    this.init();
  }

  async init() {
    console.log('[XSafe Popup] Initializing...');

    // Get current tab domain
    await this.getCurrentDomain();

    // Load settings and stats
    await this.loadSettings();
    await this.loadStats();

    // Set up UI event listeners
    this.setupEventListeners();

    // Update UI with current state
    this.updateUI();

    console.log('[XSafe Popup] Initialized successfully');
  }

  async getCurrentDomain() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        const url = new URL(tab.url);
        this.currentDomain = url.hostname;
      }
    } catch (error) {
      console.error('[XSafe Popup] Failed to get current domain:', error);
    }
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response.success) {
        this.settings = response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('[XSafe Popup] Failed to load settings:', error);
      this.showError('Failed to load settings');
    }
  }

  async loadStats() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
      if (response.success) {
        this.currentStats = response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('[XSafe Popup] Failed to load stats:', error);
    }
  }

  setupEventListeners() {
    // Main toggle
    const mainToggle = document.getElementById('mainToggle');
    if (mainToggle) {
      mainToggle.addEventListener('change', this.handleMainToggle.bind(this));
    }

    // Filter mode radio buttons
    const filterModeInputs = document.querySelectorAll('input[name="filterMode"]');
    filterModeInputs.forEach(input => {
      input.addEventListener('change', this.handleFilterModeChange.bind(this));
    });

    // Intensity slider
    const intensitySlider = document.getElementById('intensitySlider');
    if (intensitySlider) {
      intensitySlider.addEventListener('input', this.handleIntensityChange.bind(this));
      intensitySlider.addEventListener('change', this.handleIntensityChange.bind(this));
    }

    // Intensity labels (clickable)
    const intensityLabels = document.querySelectorAll('.intensity-label');
    intensityLabels.forEach(label => {
      label.addEventListener('click', this.handleIntensityLabelClick.bind(this));
    });

    // Whitelist button
    const whitelistBtn = document.getElementById('whitelistBtn');
    if (whitelistBtn) {
      whitelistBtn.addEventListener('click', this.handleWhitelistToggle.bind(this));
    }

    // Options button
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

    if (!statusDot || !statusText) {return;}

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
    if (!this.settings) {return;}

    const filterModeInputs = document.querySelectorAll('input[name="filterMode"]');
    filterModeInputs.forEach(input => {
      input.checked = input.value === this.settings.filterMode;
    });
  }

  updateIntensitySlider() {
    const intensitySlider = document.getElementById('intensitySlider');
    const intensityLabels = document.querySelectorAll('.intensity-label');

    if (!intensitySlider || !this.settings) {return;}

    const intensityMap = {
      'permissive': 0,
      'moderate': 1,
      'strict': 2
    };

    const currentValue = intensityMap[this.settings.intensityLevel] || 1;
    intensitySlider.value = currentValue;

    // Update intensity labels
    intensityLabels.forEach(label => {
      const labelValue = parseInt(label.getAttribute('data-value'));
      label.classList.toggle('active', labelValue === currentValue);
    });
  }

  updateStats() {
    if (!this.currentStats) {return;}

    // Update current page stats (would need tab-specific tracking)
    const videosFiltered = document.getElementById('videosFiltered');
    const imagesFiltered = document.getElementById('imagesFiltered');

    if (videosFiltered) {
      // For now, show total stats. Could be enhanced to show per-tab stats
      videosFiltered.textContent = this.formatNumber(this.currentStats.videosFiltered);
    }

    if (imagesFiltered) {
      imagesFiltered.textContent = this.formatNumber(this.currentStats.imagesFiltered);
    }
  }

  updateWhitelistButton() {
    const whitelistBtn = document.getElementById('whitelistBtn');
    if (!whitelistBtn || !this.settings || !this.currentDomain) {return;}

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
    this.updateIntensitySlider(); // Update UI immediately
  }

  handleIntensityLabelClick(event) {
    const value = parseInt(event.target.getAttribute('data-value'));
    const intensitySlider = document.getElementById('intensitySlider');

    if (intensitySlider) {
      intensitySlider.value = value;
      intensitySlider.dispatchEvent(new Event('change'));
    }
  }

  async handleWhitelistToggle() {
    if (!this.currentDomain || !this.settings) {return;}

    const whitelistedDomains = [...this.settings.whitelistedDomains];
    const isWhitelisted = whitelistedDomains.includes(this.currentDomain);

    if (isWhitelisted) {
      // Remove from whitelist
      const index = whitelistedDomains.indexOf(this.currentDomain);
      whitelistedDomains.splice(index, 1);
    } else {
      // Add to whitelist
      whitelistedDomains.push(this.currentDomain);
    }

    await this.updateSetting('whitelistedDomains', whitelistedDomains);
    this.updateWhitelistButton();
  }

  handleOptionsClick() {
    chrome.runtime.openOptionsPage();
  }

  async updateSetting(key, value) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTING',
        key: key,
        value: value
      });

      if (response.success) {
        // Update local settings
        this.settings[key] = value;
        console.log(`[XSafe Popup] Updated ${key}:`, value);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('[XSafe Popup] Failed to update setting:', error);
      this.showError(`Failed to update ${key}`);
    }
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)  }M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)  }K`;
    }
    return num.toString();
  }

  showError(message) {
    // Simple error display - could be enhanced with a toast system
    console.error('[XSafe Popup] Error:', message);

    // Temporarily show error in status
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
    // Simple success display
    console.log('[XSafe Popup] Success:', message);

    // Temporarily show success in status
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
}

// Utility functions
function debounce(func, wait) {
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

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new XSafePopup();
});

// Handle popup visibility changes
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Popup became visible, refresh data
    const popup = window.xsafePopup;
    if (popup) {
      popup.loadStats();
    }
  }
});

// Export for debugging
window.XSafePopup = XSafePopup;
