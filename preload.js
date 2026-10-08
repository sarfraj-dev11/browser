// Preload script executed in all browser contexts to mask automated web preferences
const { contextBridge, ipcRenderer } = require('electron');

try {
  if (contextBridge && contextBridge.exposeInMainWorld) {
    contextBridge.exposeInMainWorld('electronAPI', {
      send: (channel, data) => ipcRenderer.send(channel, data),
      invoke: (channel, data) => ipcRenderer.invoke(channel, data),
      on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(event, ...args)),
      removeListener: (channel, func) => ipcRenderer.removeListener(channel, func)
    });
  } else {
    window.electronAPI = {
      send: (channel, data) => ipcRenderer.send(channel, data),
      invoke: (channel, data) => ipcRenderer.invoke(channel, data),
      on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(event, ...args)),
      removeListener: (channel, func) => ipcRenderer.removeListener(channel, func)
    };
  }
} catch (e) {
  try {
    window.electronAPI = {
      send: (channel, data) => ipcRenderer.send(channel, data),
      invoke: (channel, data) => ipcRenderer.invoke(channel, data),
      on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(event, ...args)),
      removeListener: (channel, func) => ipcRenderer.removeListener(channel, func)
    };
  } catch (err) {}
}

// Capture submitted credentials into the app vault (for autofill on return visits)
try {
  const captureCredentials = () => {
    try {
      const pw = document.querySelector('input[type="password"]:not([disabled])');
      if (!pw || !pw.value) return;
      const scope = pw.closest('form') || document;
      const userEl = scope.querySelector('input[type="email"], input[name="identifier"], input[autocomplete="username"], input[name*="user" i], input[name*="login" i], input[name*="email" i], input[type="text"]:not([type="hidden"])')
        || document.querySelector('input[type="email"], input[autocomplete="username"]');
      ipcRenderer.send('vault-save-credential', {
        host: location.hostname,
        username: userEl && userEl.value ? userEl.value : '',
        password: pw.value
      });
    } catch (e) {}
  };
  document.addEventListener('submit', captureCredentials, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') setTimeout(captureCredentials, 100);
  }, true);
  document.addEventListener('click', (e) => {
    const t = e.target && e.target.closest && e.target.closest('button, [role="button"], input[type="submit"], a');
    if (t) setTimeout(captureCredentials, 100);
  }, true);
} catch (e) {}

try {
  // 1. Strip automation webdriver property flag
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
    configurable: true
  });

  // 2. Mock languages array to prevent empty profile leaks
  Object.defineProperty(navigator, 'languages', {
    get: () => ['en-US', 'en'],
    configurable: true
  });

  // 3. Mock plugins length to resemble standard chrome profiles
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      const mockPlugins = [
        { name: 'PDF Viewer' },
        { name: 'Chrome PDF Viewer' },
        { name: 'Chromium PDF Viewer' }
      ];
      return mockPlugins;
    },
    configurable: true
  });

  // 4. Override WebGL getParameter queries to return generic GPU drivers
  if (typeof WebGLRenderingContext !== 'undefined') {
    const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (parameter) {
      if (parameter === 37445) return 'Intel Open Source Technology Center';
      if (parameter === 37446) return 'Mesa DRI Intel(R) HD Graphics 520 (Skylake GT2)';
      return originalGetParameter.apply(this, [parameter]);
    };
  }
} catch (e) {
  console.error("Anti-bot fingerprinting overrides failed:", e);
}
