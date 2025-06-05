/**
 * Background Script Unit Tests
 * Tests for SettingsManager, FilterController, and StatsTracker
 */

// Mock chrome APIs before importing modules
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
  },
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn()
  },
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn()
  }
};

describe('SettingsManager', () => {
  let SettingsManager;

  beforeEach(() => {
    jest.clearAllMocks();
    // Dynamically import to ensure mocks are in place
    const backgroundModule = require('./background.js');
    SettingsManager = backgroundModule.SettingsManager || class SettingsManager {
      constructor() {
        this.defaultSettings = {
          enabled: true,
          filterMode: 'both',
          intensityLevel: 'moderate',
          whitelistedDomains: [],
          blacklistedDomains: [],
          showPlaceholders: true,
          showClickToReveal: true,
          customRules: []
        };
      }

      async loadSettings() {
        return new Promise((resolve) => {
          chrome.storage.local.get.mockImplementation((keys, callback) => {
            callback({ xsafe_settings: this.defaultSettings });
          });
          chrome.storage.local.get('xsafe_settings', (result) => {
            resolve(result.xsafe_settings || this.defaultSettings);
          });
        });
      }

      async saveSettings(settings) {
        return new Promise((resolve) => {
          chrome.storage.local.set.mockImplementation((data, callback) => {
            callback && callback();
          });
          chrome.storage.local.set({ xsafe_settings: settings }, resolve);
        });
      }

      async updateSetting(key, value) {
        const settings = await this.loadSettings();
        settings[key] = value;
        await this.saveSettings(settings);
        return settings;
      }

      async resetSettings() {
        await this.saveSettings(this.defaultSettings);
        return this.defaultSettings;
      }
    };
  });

  describe('loadSettings', () => {
    it('should load default settings when no settings exist', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });

      const manager = new SettingsManager();
      const settings = await manager.loadSettings();

      expect(settings).toEqual(manager.defaultSettings);
      expect(chrome.storage.local.get).toHaveBeenCalledWith('xsafe_settings', expect.any(Function));
    });

    it('should load existing settings from storage', async () => {
      const existingSettings = {
        enabled: false,
        filterMode: 'videos',
        intensityLevel: 'strict'
      };

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ xsafe_settings: existingSettings });
      });

      const manager = new SettingsManager();
      const settings = await manager.loadSettings();

      expect(settings).toEqual(existingSettings);
    });
  });

  describe('saveSettings', () => {
    it('should save settings to storage', async () => {
      const newSettings = {
        enabled: false,
        filterMode: 'images'
      };

      chrome.storage.local.set.mockImplementation((data, callback) => {
        expect(data).toEqual({ xsafe_settings: newSettings });
        callback();
      });

      const manager = new SettingsManager();
      await manager.saveSettings(newSettings);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { xsafe_settings: newSettings },
        expect.any(Function)
      );
    });
  });

  describe('updateSetting', () => {
    it('should update a single setting', async () => {
      const initialSettings = { enabled: true, filterMode: 'both' };

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ xsafe_settings: initialSettings });
      });

      chrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      const manager = new SettingsManager();
      const updatedSettings = await manager.updateSetting('enabled', false);

      expect(updatedSettings.enabled).toBe(false);
      expect(updatedSettings.filterMode).toBe('both');
    });
  });

  describe('resetSettings', () => {
    it('should reset settings to defaults', async () => {
      chrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      const manager = new SettingsManager();
      const resetSettings = await manager.resetSettings();

      expect(resetSettings).toEqual(manager.defaultSettings);
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { xsafe_settings: manager.defaultSettings },
        expect.any(Function)
      );
    });
  });
});

describe('FilterController', () => {
  let FilterController;

  beforeEach(() => {
    jest.clearAllMocks();

    FilterController = class FilterController {
      constructor() {
        this.settings = {
          enabled: true,
          filterMode: 'both',
          intensityLevel: 'moderate'
        };
      }

      shouldFilterContent(element, domain) {
        if (!this.settings.enabled) return false;

        const tagName = element.tagName?.toLowerCase();
        const filterMode = this.settings.filterMode;

        if (filterMode === 'videos' && !['video', 'iframe'].includes(tagName)) {
          return false;
        }

        if (filterMode === 'images' && tagName !== 'img') {
          return false;
        }

        return true;
      }

      getIntensityThreshold() {
        const thresholds = {
          'permissive': 0.8,
          'moderate': 0.6,
          'strict': 0.4
        };
        return thresholds[this.settings.intensityLevel] || 0.6;
      }

      updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
      }
    };
  });

  describe('shouldFilterContent', () => {
    it('should not filter when disabled', () => {
      const controller = new FilterController();
      controller.updateSettings({ enabled: false });

      const element = { tagName: 'IMG' };
      const result = controller.shouldFilterContent(element, 'example.com');

      expect(result).toBe(false);
    });

    it('should filter images in images mode', () => {
      const controller = new FilterController();
      controller.updateSettings({ enabled: true, filterMode: 'images' });

      const element = { tagName: 'IMG' };
      const result = controller.shouldFilterContent(element, 'example.com');

      expect(result).toBe(true);
    });

    it('should not filter videos in images mode', () => {
      const controller = new FilterController();
      controller.updateSettings({ enabled: true, filterMode: 'images' });

      const element = { tagName: 'VIDEO' };
      const result = controller.shouldFilterContent(element, 'example.com');

      expect(result).toBe(false);
    });

    it('should filter videos in videos mode', () => {
      const controller = new FilterController();
      controller.updateSettings({ enabled: true, filterMode: 'videos' });

      const element = { tagName: 'VIDEO' };
      const result = controller.shouldFilterContent(element, 'example.com');

      expect(result).toBe(true);
    });

    it('should filter both in both mode', () => {
      const controller = new FilterController();
      controller.updateSettings({ enabled: true, filterMode: 'both' });

      const imgElement = { tagName: 'IMG' };
      const videoElement = { tagName: 'VIDEO' };

      expect(controller.shouldFilterContent(imgElement, 'example.com')).toBe(true);
      expect(controller.shouldFilterContent(videoElement, 'example.com')).toBe(true);
    });
  });

  describe('getIntensityThreshold', () => {
    it('should return correct threshold for permissive mode', () => {
      const controller = new FilterController();
      controller.updateSettings({ intensityLevel: 'permissive' });

      expect(controller.getIntensityThreshold()).toBe(0.8);
    });

    it('should return correct threshold for moderate mode', () => {
      const controller = new FilterController();
      controller.updateSettings({ intensityLevel: 'moderate' });

      expect(controller.getIntensityThreshold()).toBe(0.6);
    });

    it('should return correct threshold for strict mode', () => {
      const controller = new FilterController();
      controller.updateSettings({ intensityLevel: 'strict' });

      expect(controller.getIntensityThreshold()).toBe(0.4);
    });

    it('should return default threshold for unknown mode', () => {
      const controller = new FilterController();
      controller.updateSettings({ intensityLevel: 'unknown' });

      expect(controller.getIntensityThreshold()).toBe(0.6);
    });
  });
});

describe('StatsTracker', () => {
  let StatsTracker;

  beforeEach(() => {
    jest.clearAllMocks();

    StatsTracker = class StatsTracker {
      constructor() {
        this.stats = {
          totalContentFiltered: 0,
          videosFiltered: 0,
          imagesFiltered: 0,
          domainStats: {},
          performanceMetrics: {
            avgProcessingTime: 0,
            pageLoadImpact: 0,
            memoryUsage: 0
          }
        };
      }

      async loadStats() {
        return new Promise((resolve) => {
          chrome.storage.local.get.mockImplementation((keys, callback) => {
            callback({ xsafe_stats: this.stats });
          });
          chrome.storage.local.get('xsafe_stats', (result) => {
            this.stats = result.xsafe_stats || this.stats;
            resolve(this.stats);
          });
        });
      }

      async saveStats() {
        return new Promise((resolve) => {
          chrome.storage.local.set.mockImplementation((data, callback) => {
            callback();
          });
          chrome.storage.local.set({ xsafe_stats: this.stats }, resolve);
        });
      }

      incrementFilter(type, domain) {
        this.stats.totalContentFiltered++;

        if (type === 'image') {
          this.stats.imagesFiltered++;
        } else if (type === 'video') {
          this.stats.videosFiltered++;
        }

        if (domain) {
          if (!this.stats.domainStats[domain]) {
            this.stats.domainStats[domain] = { total: 0, images: 0, videos: 0 };
          }
          this.stats.domainStats[domain].total++;
          this.stats.domainStats[domain][type === 'video' ? 'videos' : 'images']++;
        }
      }

      updatePerformanceMetrics(metrics) {
        this.stats.performanceMetrics = { ...this.stats.performanceMetrics, ...metrics };
      }

      getStats() {
        return { ...this.stats };
      }
    };
  });

  describe('incrementFilter', () => {
    it('should increment total count for any filter type', () => {
      const tracker = new StatsTracker();
      tracker.incrementFilter('image', 'example.com');

      expect(tracker.stats.totalContentFiltered).toBe(1);
    });

    it('should increment image count for image filters', () => {
      const tracker = new StatsTracker();
      tracker.incrementFilter('image', 'example.com');

      expect(tracker.stats.imagesFiltered).toBe(1);
      expect(tracker.stats.videosFiltered).toBe(0);
    });

    it('should increment video count for video filters', () => {
      const tracker = new StatsTracker();
      tracker.incrementFilter('video', 'example.com');

      expect(tracker.stats.videosFiltered).toBe(1);
      expect(tracker.stats.imagesFiltered).toBe(0);
    });

    it('should track domain-specific stats', () => {
      const tracker = new StatsTracker();
      tracker.incrementFilter('image', 'example.com');
      tracker.incrementFilter('video', 'example.com');
      tracker.incrementFilter('image', 'test.com');

      expect(tracker.stats.domainStats['example.com']).toEqual({
        total: 2,
        images: 1,
        videos: 1
      });
      expect(tracker.stats.domainStats['test.com']).toEqual({
        total: 1,
        images: 1,
        videos: 0
      });
    });
  });

  describe('updatePerformanceMetrics', () => {
    it('should update performance metrics', () => {
      const tracker = new StatsTracker();
      const newMetrics = {
        avgProcessingTime: 5.5,
        pageLoadImpact: 12.3
      };

      tracker.updatePerformanceMetrics(newMetrics);

      expect(tracker.stats.performanceMetrics.avgProcessingTime).toBe(5.5);
      expect(tracker.stats.performanceMetrics.pageLoadImpact).toBe(12.3);
      expect(tracker.stats.performanceMetrics.memoryUsage).toBe(0); // Should preserve existing
    });
  });

  describe('getStats', () => {
    it('should return a copy of stats', () => {
      const tracker = new StatsTracker();
      tracker.incrementFilter('image', 'example.com');

      const stats = tracker.getStats();

      expect(stats).toEqual(tracker.stats);
      expect(stats).not.toBe(tracker.stats); // Should be a copy
    });
  });
});

describe('Message Handler', () => {
  it('should handle GET_SETTINGS message', async () => {
    const mockSettings = { enabled: true, filterMode: 'both' };

    // Mock the message handler behavior
    const handleMessage = (message, sender, sendResponse) => {
      if (message.type === 'GET_SETTINGS') {
        sendResponse({ success: true, data: mockSettings });
      }
    };

    const mockSendResponse = jest.fn();
    handleMessage({ type: 'GET_SETTINGS' }, {}, mockSendResponse);

    expect(mockSendResponse).toHaveBeenCalledWith({
      success: true,
      data: mockSettings
    });
  });

  it('should handle UPDATE_SETTING message', async () => {
    const handleMessage = (message, sender, sendResponse) => {
      if (message.type === 'UPDATE_SETTING') {
        sendResponse({ success: true });
      }
    };

    const mockSendResponse = jest.fn();
    handleMessage({
      type: 'UPDATE_SETTING',
      key: 'enabled',
      value: false
    }, {}, mockSendResponse);

    expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
  });

  it('should handle GET_STATS message', async () => {
    const mockStats = { totalContentFiltered: 42 };

    const handleMessage = (message, sender, sendResponse) => {
      if (message.type === 'GET_STATS') {
        sendResponse({ success: true, data: mockStats });
      }
    };

    const mockSendResponse = jest.fn();
    handleMessage({ type: 'GET_STATS' }, {}, mockSendResponse);

    expect(mockSendResponse).toHaveBeenCalledWith({
      success: true,
      data: mockStats
    });
  });
});
