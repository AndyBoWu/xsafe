/**
 * XSafe Options Page Script
 * Handles settings management, navigation, and advanced configuration
 */

class XSafeOptions {
  constructor() {
    this.settings = null;
    this.stats = null;
    this.currentSection = 'general';
    this.unsavedChanges = false;

    this.init();
  }

  async init() {
    console.log('[XSafe Options] Initializing...');

    // Load settings and stats
    await this.loadSettings();
    await this.loadStats();

    // Set up navigation
    this.setupNavigation();

    // Set up event listeners
    this.setupEventListeners();

    // Update UI with current state
    this.updateUI();

    // Set up auto-save
    this.setupAutoSave();

    console.log('[XSafe Options] Initialized successfully');
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
      console.error('[XSafe Options] Failed to load settings:', error);
      this.showToast('Failed to load settings', 'error');
    }
  }

  async loadStats() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
      if (response.success) {
        this.stats = response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('[XSafe Options] Failed to load stats:', error);
    }
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const section = e.currentTarget.getAttribute('data-section');
        this.showSection(section);
      });
    });
  }

  showSection(sectionId) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-section') === sectionId);
    });

    // Update sections
    document.querySelectorAll('.options-section').forEach(section => {
      section.classList.toggle('active', section.id === sectionId);
    });

    this.currentSection = sectionId;

    // Load section-specific data
    if (sectionId === 'statistics') {
      this.updateStatistics();
    }
  }

  setupEventListeners() {
    // General settings
    this.setupGeneralSettings();

    // Content filtering
    this.setupContentFiltering();

    // Domain management
    this.setupDomainManagement();

    // Header actions
    this.setupHeaderActions();

    // Privacy actions
    this.setupPrivacyActions();
  }

  setupGeneralSettings() {
    // Enable/disable filtering
    const enableFiltering = document.getElementById('enableFiltering');
    if (enableFiltering) {
      enableFiltering.addEventListener('change', (e) => {
        this.updateSetting('enabled', e.target.checked);
      });
    }

    // Filter mode
    const filterModeInputs = document.querySelectorAll('input[name="filterMode"]');
    filterModeInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        this.updateSetting('filterMode', e.target.value);
      });
    });

    // Placeholder options
    const showPlaceholders = document.getElementById('showPlaceholders');
    if (showPlaceholders) {
      showPlaceholders.addEventListener('change', (e) => {
        this.updateSetting('showPlaceholders', e.target.checked);
      });
    }

    const showClickToReveal = document.getElementById('showClickToReveal');
    if (showClickToReveal) {
      showClickToReveal.addEventListener('change', (e) => {
        this.updateSetting('showClickToReveal', e.target.checked);
      });
    }
  }

  setupContentFiltering() {
    // Intensity slider
    const intensityRange = document.getElementById('intensityRange');
    if (intensityRange) {
      intensityRange.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        this.updateIntensityUI(value);
      });

      intensityRange.addEventListener('change', (e) => {
        const value = parseInt(e.target.value);
        const intensityMap = ['permissive', 'moderate', 'strict'];
        this.updateSetting('intensityLevel', intensityMap[value]);
      });
    }

    // Intensity option clicks
    const intensityOptions = document.querySelectorAll('.intensity-option');
    intensityOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        const value = parseInt(e.currentTarget.getAttribute('data-value'));
        if (intensityRange) {
          intensityRange.value = value;
          intensityRange.dispatchEvent(new Event('change'));
        }
      });
    });

    // Custom rules
    this.setupCustomRules();
  }

  setupCustomRules() {
    const addRuleBtn = document.getElementById('addRuleBtn');
    if (addRuleBtn) {
      addRuleBtn.addEventListener('click', () => {
        this.addCustomRule();
      });
    }
  }

  setupDomainManagement() {
    // Whitelist management
    const addWhitelistDomainBtn = document.getElementById('addWhitelistDomainBtn');
    const whitelistInput = document.getElementById('whitelistInput');

    if (addWhitelistDomainBtn && whitelistInput) {
      addWhitelistDomainBtn.addEventListener('click', () => {
        this.addDomain('whitelist');
      });

      whitelistInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.addDomain('whitelist');
        }
      });
    }

    // Blacklist management
    const addBlacklistDomainBtn = document.getElementById('addBlacklistDomainBtn');
    const blacklistInput = document.getElementById('blacklistInput');

    if (addBlacklistDomainBtn && blacklistInput) {
      addBlacklistDomainBtn.addEventListener('click', () => {
        this.addDomain('blacklist');
      });

      blacklistInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.addDomain('blacklist');
        }
      });
    }
  }

  setupHeaderActions() {
    // Save button
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveAllSettings();
      });
    }

    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetSettings();
      });
    }
  }

  setupPrivacyActions() {
    // Clear statistics
    const clearStatsBtn = document.getElementById('clearStatsBtn');
    if (clearStatsBtn) {
      clearStatsBtn.addEventListener('click', () => {
        this.clearStatistics();
      });
    }
  }

  setupAutoSave() {
    // Auto-save after changes (debounced)
    this.autoSaveTimeout = null;

    // Listen for form changes
    document.addEventListener('change', (e) => {
      if (e.target.matches('input, select, textarea')) {
        this.markUnsavedChanges();
        this.scheduleAutoSave();
      }
    });
  }

  markUnsavedChanges() {
    this.unsavedChanges = true;
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.textContent = '💾 Save Changes*';
      saveBtn.classList.add('unsaved');
    }
  }

  scheduleAutoSave() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = setTimeout(() => {
      this.saveAllSettings();
    }, 2000); // Auto-save after 2 seconds of inactivity
  }

  updateUI() {
    this.updateGeneralSettings();
    this.updateContentFiltering();
    this.updateDomainLists();
    this.updateStatistics();
  }

  updateGeneralSettings() {
    if (!this.settings) {return;}

    // Enable filtering
    const enableFiltering = document.getElementById('enableFiltering');
    if (enableFiltering) {
      enableFiltering.checked = this.settings.enabled;
    }

    // Filter mode
    const filterModeInputs = document.querySelectorAll('input[name="filterMode"]');
    filterModeInputs.forEach(input => {
      input.checked = input.value === this.settings.filterMode;
    });

    // Placeholder options
    const showPlaceholders = document.getElementById('showPlaceholders');
    if (showPlaceholders) {
      showPlaceholders.checked = this.settings.showPlaceholders;
    }

    const showClickToReveal = document.getElementById('showClickToReveal');
    if (showClickToReveal) {
      showClickToReveal.checked = this.settings.showClickToReveal;
    }
  }

  updateContentFiltering() {
    if (!this.settings) {return;}

    // Intensity slider
    const intensityRange = document.getElementById('intensityRange');
    if (intensityRange) {
      const intensityMap = {
        'permissive': 0,
        'moderate': 1,
        'strict': 2
      };
      const value = intensityMap[this.settings.intensityLevel] || 1;
      intensityRange.value = value;
      this.updateIntensityUI(value);
    }

    // Custom rules
    this.renderCustomRules();
  }

  updateIntensityUI(value) {
    const intensityOptions = document.querySelectorAll('.intensity-option');
    intensityOptions.forEach(option => {
      const optionValue = parseInt(option.getAttribute('data-value'));
      option.classList.toggle('active', optionValue === value);
    });
  }

  renderCustomRules() {
    const container = document.getElementById('customRules');
    if (!container || !this.settings) {return;}

    container.innerHTML = '';

    this.settings.customRules.forEach((rule, index) => {
      const ruleElement = this.createCustomRuleElement(rule, index);
      container.appendChild(ruleElement);
    });

    // Add empty rule for new additions
    if (this.settings.customRules.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-message';
      emptyMessage.style.cssText = 'text-align: center; color: var(--text-muted); padding: 24px;';
      emptyMessage.textContent = 'No custom rules defined. Click "Add Rule" to create one.';
      container.appendChild(emptyMessage);
    }
  }

  createCustomRuleElement(rule, index) {
    const ruleDiv = document.createElement('div');
    ruleDiv.className = 'custom-rule-item';

    ruleDiv.innerHTML = `
      <input type="text" class="rule-input" placeholder="CSS selector (e.g., .ads, #popup)"
             value="${rule.selector || ''}" data-index="${index}" data-field="selector">
      <input type="text" class="rule-description" placeholder="Description"
             value="${rule.description || ''}" data-index="${index}" data-field="description">
      <button class="btn btn-small btn-secondary rule-remove" data-index="${index}">
        <span class="btn-icon">🗑️</span>
      </button>
    `;

    // Add event listeners
    const inputs = ruleDiv.querySelectorAll('input');
    inputs.forEach(input => {
      input.addEventListener('change', (e) => {
        this.updateCustomRule(
          parseInt(e.target.getAttribute('data-index')),
          e.target.getAttribute('data-field'),
          e.target.value
        );
      });
    });

    const removeBtn = ruleDiv.querySelector('.rule-remove');
    removeBtn.addEventListener('click', (e) => {
      this.removeCustomRule(parseInt(e.target.closest('button').getAttribute('data-index')));
    });

    return ruleDiv;
  }

  addCustomRule() {
    if (!this.settings.customRules) {
      this.settings.customRules = [];
    }

    this.settings.customRules.push({
      selector: '',
      description: '',
      enabled: true
    });

    this.renderCustomRules();
    this.markUnsavedChanges();
  }

  updateCustomRule(index, field, value) {
    if (this.settings.customRules[index]) {
      this.settings.customRules[index][field] = value;
      this.markUnsavedChanges();
    }
  }

  removeCustomRule(index) {
    this.settings.customRules.splice(index, 1);
    this.renderCustomRules();
    this.markUnsavedChanges();
  }

  updateDomainLists() {
    this.renderDomainList('whitelist');
    this.renderDomainList('blacklist');
  }

  renderDomainList(type) {
    const container = document.getElementById(`${type}Domains`);
    if (!container || !this.settings) {return;}

    const domains = type === 'whitelist' ?
      this.settings.whitelistedDomains :
      this.settings.blacklistedDomains;

    container.innerHTML = '';

    if (domains.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-message';
      emptyMessage.style.cssText = 'text-align: center; color: var(--text-muted); padding: 16px;';
      emptyMessage.textContent = `No ${type}ed domains`;
      container.appendChild(emptyMessage);
      return;
    }

    domains.forEach(domain => {
      const domainElement = this.createDomainElement(domain, type);
      container.appendChild(domainElement);
    });
  }

  createDomainElement(domain, type) {
    const domainDiv = document.createElement('div');
    domainDiv.className = 'domain-item';

    domainDiv.innerHTML = `
      <span class="domain-name">${domain}</span>
      <button class="domain-remove" data-domain="${domain}" data-type="${type}">
        Remove
      </button>
    `;

    const removeBtn = domainDiv.querySelector('.domain-remove');
    removeBtn.addEventListener('click', (e) => {
      this.removeDomain(
        e.target.getAttribute('data-domain'),
        e.target.getAttribute('data-type')
      );
    });

    return domainDiv;
  }

  addDomain(type) {
    const input = document.getElementById(`${type}Input`);
    if (!input) {return;}

    const domain = input.value.trim().toLowerCase();
    if (!domain) {return;}

    // Validate domain format
    if (!this.isValidDomain(domain)) {
      this.showToast('Please enter a valid domain name', 'error');
      return;
    }

    const domainsKey = type === 'whitelist' ? 'whitelistedDomains' : 'blacklistedDomains';
    const domains = this.settings[domainsKey];

    if (domains.includes(domain)) {
      this.showToast('Domain already exists in the list', 'error');
      return;
    }

    domains.push(domain);
    input.value = '';

    this.renderDomainList(type);
    this.markUnsavedChanges();
    this.showToast(`Domain added to ${type}`, 'success');
  }

  removeDomain(domain, type) {
    const domainsKey = type === 'whitelist' ? 'whitelistedDomains' : 'blacklistedDomains';
    const domains = this.settings[domainsKey];
    const index = domains.indexOf(domain);

    if (index > -1) {
      domains.splice(index, 1);
      this.renderDomainList(type);
      this.markUnsavedChanges();
      this.showToast(`Domain removed from ${type}`, 'success');
    }
  }

  isValidDomain(domain) {
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
    return domainRegex.test(domain);
  }

  updateStatistics() {
    if (!this.stats) {return;}

    // Overall stats
    const totalFiltered = document.getElementById('totalFiltered');
    const videosFilteredStat = document.getElementById('videosFilteredStat');
    const imagesFilteredStat = document.getElementById('imagesFilteredStat');

    if (totalFiltered) {
      totalFiltered.textContent = this.formatNumber(this.stats.totalContentFiltered);
    }
    if (videosFilteredStat) {
      videosFilteredStat.textContent = this.formatNumber(this.stats.videosFiltered);
    }
    if (imagesFilteredStat) {
      imagesFilteredStat.textContent = this.formatNumber(this.stats.imagesFiltered);
    }

    // Performance metrics
    const avgProcessingTime = document.getElementById('avgProcessingTime');
    const pageLoadImpact = document.getElementById('pageLoadImpact');
    const memoryUsage = document.getElementById('memoryUsage');

    if (avgProcessingTime) {
      avgProcessingTime.textContent =
        `${this.stats.performanceMetrics.avgProcessingTime.toFixed(2)  }ms`;
    }
    if (pageLoadImpact) {
      pageLoadImpact.textContent =
        `${this.stats.performanceMetrics.pageLoadImpact.toFixed(2)  }ms`;
    }
    if (memoryUsage) {
      memoryUsage.textContent =
        `${(this.stats.performanceMetrics.memoryUsage / (1024 * 1024)).toFixed(1)  }MB`;
    }

    // Top domains
    this.renderTopDomains();
  }

  renderTopDomains() {
    const container = document.getElementById('topDomains');
    if (!container || !this.stats) {return;}

    const domainStats = this.stats.domainStats || {};
    const sortedDomains = Object.entries(domainStats)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    container.innerHTML = '';

    if (sortedDomains.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.style.cssText = 'text-align: center; color: var(--text-muted); padding: 24px;';
      emptyMessage.textContent = 'No domain statistics available yet';
      container.appendChild(emptyMessage);
      return;
    }

    sortedDomains.forEach(([domain, stats]) => {
      const domainDiv = document.createElement('div');
      domainDiv.className = 'domain-stat-item';

      domainDiv.innerHTML = `
        <span class="domain-stat-name">${domain}</span>
        <span class="domain-stat-count">${this.formatNumber(stats.total)}</span>
      `;

      container.appendChild(domainDiv);
    });
  }

  async updateSetting(key, value) {
    if (!this.settings) {return;}

    this.settings[key] = value;
    this.markUnsavedChanges();

    // Some settings need immediate effect
    if (['enabled', 'filterMode', 'intensityLevel'].includes(key)) {
      this.scheduleAutoSave();
    }
  }

  async saveAllSettings() {
    try {
      // Save each setting
      for (const [key, value] of Object.entries(this.settings)) {
        const response = await chrome.runtime.sendMessage({
          type: 'UPDATE_SETTING',
          key: key,
          value: value
        });

        if (!response.success) {
          throw new Error(`Failed to save ${key}: ${response.error}`);
        }
      }

      this.unsavedChanges = false;
      const saveBtn = document.getElementById('saveBtn');
      if (saveBtn) {
        saveBtn.innerHTML = '<span class="btn-icon">💾</span>Save Changes';
        saveBtn.classList.remove('unsaved');
      }

      this.showToast('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('[XSafe Options] Failed to save settings:', error);
      this.showToast('Failed to save settings', 'error');
    }
  }

  async resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({ type: 'RESET_SETTINGS' });
      if (response.success) {
        await this.loadSettings();
        this.updateUI();
        this.showToast('Settings reset to defaults', 'success');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('[XSafe Options] Failed to reset settings:', error);
      this.showToast('Failed to reset settings', 'error');
    }
  }

  async clearStatistics() {
    if (!confirm('Are you sure you want to clear all statistics? This cannot be undone.')) {
      return;
    }

    try {
      await chrome.storage.local.remove('xsafe_stats');
      await this.loadStats();
      this.updateStatistics();
      this.showToast('Statistics cleared', 'success');
    } catch (error) {
      console.error('[XSafe Options] Failed to clear statistics:', error);
      this.showToast('Failed to clear statistics', 'error');
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

  showToast(message, type = 'success') {
    const toastId = type === 'success' ? 'successToast' : 'errorToast';
    const toast = document.getElementById(toastId);

    if (toast) {
      const messageEl = toast.querySelector('.toast-message');
      if (messageEl) {
        messageEl.textContent = message;
      }

      toast.classList.add('show');

      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }
  }
}

// Initialize options page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new XSafeOptions();
});

// Handle page unload with unsaved changes
window.addEventListener('beforeunload', (e) => {
  if (window.xsafeOptions && window.xsafeOptions.unsavedChanges) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
  }
});

// Export for debugging
window.XSafeOptions = XSafeOptions;
