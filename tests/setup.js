/**
 * Jest Setup File
 * Configures the testing environment for Chrome extension testing
 */

// Mock Chrome APIs globally
global.chrome = {
  runtime: {
    sendMessage: jest.fn(() => Promise.resolve({ success: true })),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn(() => false)
    },
    getURL: jest.fn((path) => `chrome-extension://test-id/${path}`),
    getManifest: jest.fn(() => ({
      version: '1.0.0',
      name: 'XSafe',
      manifest_version: 3
    })),
    openOptionsPage: jest.fn(),
    id: 'test-extension-id'
  },

  storage: {
    local: {
      get: jest.fn(() => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve()),
      remove: jest.fn(() => Promise.resolve()),
      clear: jest.fn(() => Promise.resolve())
    },
    sync: {
      get: jest.fn(() => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve()),
      remove: jest.fn(() => Promise.resolve()),
      clear: jest.fn(() => Promise.resolve())
    }
  },

  tabs: {
    query: jest.fn(() => Promise.resolve([{
      id: 1,
      url: 'https://example.com',
      active: true,
      windowId: 1
    }])),
    get: jest.fn(() => Promise.resolve({
      id: 1,
      url: 'https://example.com'
    })),
    create: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve())
  },

  action: {
    setBadgeText: jest.fn(() => Promise.resolve()),
    setBadgeBackgroundColor: jest.fn(() => Promise.resolve()),
    setIcon: jest.fn(() => Promise.resolve()),
    getBadgeText: jest.fn(() => Promise.resolve('')),
    getBadgeBackgroundColor: jest.fn(() => Promise.resolve('#000000'))
  },

  permissions: {
    contains: jest.fn(() => Promise.resolve(true)),
    request: jest.fn(() => Promise.resolve(true))
  }
};

// Mock DOM methods
global.document.getElementById = jest.fn();
global.document.querySelector = jest.fn();
global.document.querySelectorAll = jest.fn(() => []);
global.document.addEventListener = jest.fn();
global.document.removeEventListener = jest.fn();
global.document.createElement = jest.fn(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  appendChild: jest.fn(),
  removeChild: jest.fn(),
  setAttribute: jest.fn(),
  getAttribute: jest.fn(),
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    toggle: jest.fn(),
    contains: jest.fn(() => false)
  },
  style: {},
  innerHTML: '',
  textContent: ''
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.sessionStorage = sessionStorageMock;

// Mock URL constructor
global.URL = jest.fn().mockImplementation((url) => ({
  hostname: new URL(url).hostname,
  pathname: new URL(url).pathname,
  search: new URL(url).search,
  hash: new URL(url).hash,
  href: url
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('')
  })
);

// Mock setTimeout and setInterval
jest.useFakeTimers();

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();

  // Reset Chrome API mocks to default behavior
  chrome.runtime.sendMessage.mockResolvedValue({ success: true });
  chrome.storage.local.get.mockResolvedValue({});
  chrome.storage.local.set.mockResolvedValue();
  chrome.tabs.query.mockResolvedValue([{
    id: 1,
    url: 'https://example.com',
    active: true,
    windowId: 1
  }]);
});

// Clean up after each test
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.clearAllTimers();
});
