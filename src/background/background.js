/**
 * XSafe Background Service Worker
 * Handles settings, coordination between components, and extension lifecycle
 */

class XSafeBackground {
  constructor() {
    this.settings = new SettingsManager();
    this.filterController = new FilterController();
    this.statsTracker = new StatsTracker();

    this.init();
  }

  async init() {
    // Initialize default settings
    await this.settings.init();

    // Set up message listeners
    this.setupMessageListeners();

    // Set up extension lifecycle listeners
    this.setupLifecycleListeners();

    console.log('[XSafe] Background service worker initialized');
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });
  }

  setupLifecycleListeners() {
    // Handle extension install/update
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstall(details);
    });

    // Handle tab updates to apply filters
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'loading' && tab.url) {
        this.handleTabUpdate(tabId, tab);
      }
    });
  }

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

      case 'UPDATE_SETTING':
        if (!message.key) {
          sendResponse({ success: false, error: 'Missing setting key' });
          return;
        }
        await this.settings.set(message.key, message.value);
        await this.updateAllTabs();
        sendResponse({ success: true });
        break;

      case 'RESET_SETTINGS':
        await this.settings.reset();
        await this.updateAllTabs();
        sendResponse({ success: true });
        break;

      case 'GET_STATS':
        const stats = await this.statsTracker.getStats();
        sendResponse({ success: true, data: stats });
        break;

      case 'CONTENT_FILTERED':
        if (message.data) {
          await this.statsTracker.recordFiltering(message.data);
        }
        sendResponse({ success: true });
        break;

      case 'PERFORMANCE_DATA':
        if (message.data) {
          await this.statsTracker.recordPerformance(message.data);
        }
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown message type: ' + message.type });
      }
    } catch (error) {
      console.error('[XSafe] Error handling message:', error);
      sendResponse({ success: false, error: error.message || 'Internal error' });
    }
  }

  async handleInstall(details) {
    if (details.reason === 'install') {
      // First-time install
      await this.settings.init();
      console.log('[XSafe] Extension installed');
    } else if (details.reason === 'update') {
      // Extension updated
      await this.settings.migrate();
      console.log('[XSafe] Extension updated');
    }
  }

  async handleTabUpdate(tabId, tab) {
    const settings = await this.settings.getAll();

    if (settings.enabled) {
      // Send current filter settings to the tab
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: 'UPDATE_FILTERS',
          settings: settings
        });
      } catch (error) {
        // Tab might not be ready yet, ignore
      }
    }
  }

  async updateAllTabs() {
    const settings = await this.settings.getAll();
    const tabs = await chrome.tabs.query({});

    for (const tab of tabs) {
      if (tab.url && !tab.url.startsWith('chrome://')) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'UPDATE_FILTERS',
            settings: settings
          });
        } catch (error) {
          // Ignore tabs that can't receive messages
        }
      }
    }
  }
}

/**
 * Settings Manager
 * Handles all user preferences and settings
 */
class SettingsManager {
  constructor() {
    this.defaultSettings = {
      enabled: true,
      filterMode: 'both', // 'videos', 'images', 'both'
      intensityLevel: 'moderate', // 'strict', 'moderate', 'permissive'
      showPlaceholders: true,
      showClickToReveal: true,
      whitelistedDomains: [],
      blacklistedDomains: [],
      customRules: [],
      version: '0.1.0'
    };
  }

  async init() {
    const stored = await chrome.storage.sync.get(this.defaultSettings);

    // Merge with defaults in case new settings were added
    const settings = { ...this.defaultSettings, ...stored };

    await chrome.storage.sync.set(settings);
    return settings;
  }

  async get(key) {
    const result = await chrome.storage.sync.get(key);
    return result[key];
  }

  async set(key, value) {
    await chrome.storage.sync.set({ [key]: value });
  }

  async getAll() {
    return await chrome.storage.sync.get(this.defaultSettings);
  }

  async reset() {
    await chrome.storage.sync.clear();
    return await this.init();
  }

  async migrate() {
    // Handle settings migration for updates
    const stored = await chrome.storage.sync.get();
    const currentVersion = stored.version || '0.0.0';

    if (currentVersion !== this.defaultSettings.version) {
      // Perform any necessary migrations
      await this.init();
    }
  }
}

/**
 * Filter Controller
 * Manages filter rules and coordination
 */
class FilterController {
  constructor() {
    this.activeFilters = new Map();
  }

  async updateRules(settings) {
    // Build filter rules based on settings
    const rules = {
      enabled: settings.enabled,
      filterVideos: ['videos', 'both'].includes(settings.filterMode),
      filterImages: ['images', 'both'].includes(settings.filterMode),
      intensity: settings.intensityLevel,
      showPlaceholders: settings.showPlaceholders,
      showClickToReveal: settings.showClickToReveal,
      whitelistedDomains: settings.whitelistedDomains,
      blacklistedDomains: settings.blacklistedDomains,
      customRules: settings.customRules
    };

    return rules;
  }

  getActiveFilters() {
    return Array.from(this.activeFilters.entries());
  }
}

/**
 * Statistics Tracker
 * Handles local-only performance and usage statistics
 */
class StatsTracker {
  constructor() {
    this.statsKey = 'xsafe_stats';
  }

  async getStats() {
    const result = await chrome.storage.local.get(this.statsKey);
    return result[this.statsKey] || this.getDefaultStats();
  }

  async recordFiltering(data) {
    const stats = await this.getStats();

    stats.totalContentFiltered += data.count || 1;
    if (data.type === 'video') {stats.videosFiltered += data.count || 1;}
    if (data.type === 'image') {stats.imagesFiltered += data.count || 1;}

    // Update daily stats
    const today = new Date().toISOString().split('T')[0];
    if (!stats.dailyStats[today]) {
      stats.dailyStats[today] = { videos: 0, images: 0, total: 0 };
    }
    stats.dailyStats[today].total += data.count || 1;
    if (data.type === 'video') {stats.dailyStats[today].videos += data.count || 1;}
    if (data.type === 'image') {stats.dailyStats[today].images += data.count || 1;}

    // Update domain stats
    if (data.domain) {
      if (!stats.domainStats[data.domain]) {
        stats.domainStats[data.domain] = { videos: 0, images: 0, total: 0 };
      }
      stats.domainStats[data.domain].total += data.count || 1;
      if (data.type === 'video') {stats.domainStats[data.domain].videos += data.count || 1;}
      if (data.type === 'image') {stats.domainStats[data.domain].images += data.count || 1;}
    }

    stats.lastUpdated = Date.now();
    await chrome.storage.local.set({ [this.statsKey]: stats });
  }

  async recordPerformance(data) {
    const stats = await this.getStats();

    // Update performance metrics with moving average
    const metrics = stats.performanceMetrics;
    metrics.avgProcessingTime = this.updateAverage(metrics.avgProcessingTime, data.processingTime);
    metrics.pageLoadImpact = this.updateAverage(metrics.pageLoadImpact, data.loadImpact);
    metrics.memoryUsage = this.updateAverage(metrics.memoryUsage, data.memoryUsage);

    await chrome.storage.local.set({ [this.statsKey]: stats });
  }

  updateAverage(currentAvg, newValue, weight = 0.1) {
    return currentAvg * (1 - weight) + newValue * weight;
  }

  getDefaultStats() {
    return {
      totalContentFiltered: 0,
      videosFiltered: 0,
      imagesFiltered: 0,
      performanceMetrics: {
        avgProcessingTime: 0,
        pageLoadImpact: 0,
        memoryUsage: 0
      },
      dailyStats: {},
      domainStats: {},
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };
  }
}

// Initialize the background service worker
new XSafeBackground();
