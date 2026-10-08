const { app, BrowserWindow, ipcMain, session, webContents, Menu, MenuItem, clipboard, shell, safeStorage, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const net = require("net");
const { fork } = require("child_process");

let mainWindow = null;
const activeDownloads = new Map();
let embeddedServerProcess = null;
let embeddedServerPort = 0;

// Crash + startup diagnostics: packaged apps can't print to a console,
// so write everything to userData/startup.log instead.
function appLog(msg) {
    try {
        const line = `[${new Date().toISOString()}] ${msg}\n`;
        fs.appendFileSync(path.join(app.getPath("userData"), "startup.log"), line);
    } catch (e) {}
}

process.on("uncaughtException", (e) => {
    appLog(`UNCAUGHT: ${e && e.stack || e}`);
});
process.on("unhandledRejection", (e) => {
    appLog(`UNHANDLED: ${e && e.stack || e}`);
});
// ---- Embedded Next.js server (packaged builds only) ----
// Dev mode keeps loading the external dev server on port 3001.
// Packaged mode forks .next/standalone/server.js as a Node process
// (ELECTRON_RUN_AS_NODE makes the Electron binary act as plain Node).

function seedUserDataDir() {
    appLog("seeding user data dir");
    // Writable copy of the RAG data dir lives in userData; seeded once from
    // the bundled data-seed folder so upgrades don't wipe the user's index.
    const target = path.join(app.getPath("userData"), "data");
    const seed = path.join(process.resourcesPath, "standalone", "data-seed");
    try {
        if (!fs.existsSync(target) && fs.existsSync(seed)) {
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.cpSync(seed, target, { recursive: true });
        }
        fs.mkdirSync(target, { recursive: true });
    } catch (e) {
        console.log("[embedded-server] data seed failed:", e.message);
    }
    return target;
}

function waitForServer(url, timeoutMs = 60000) {
    const deadline = Date.now() + timeoutMs;
    return new Promise((resolve, reject) => {
        const attempt = () => {
            const req = http.get(url, (res) => {
                res.resume();
                resolve();
            });
            req.on("error", () => {
                if (Date.now() > deadline) return reject(new Error("embedded server did not start"));
                setTimeout(attempt, 400);
            });
            req.setTimeout(2000, () => req.destroy(new Error("timeout")));
        };
        attempt();
    });
}

function getFreePort() {
    return new Promise((resolve) => {
        const srv = net.createServer();
        srv.once("error", () => resolve(0));
        srv.listen(0, "127.0.0.1", () => {
            const port = srv.address().port;
            srv.close(() => resolve(port));
        });
    });
}

async function startEmbeddedServer() {
    const standaloneDir = path.join(process.resourcesPath, "standalone");
    const serverJs = path.join(standaloneDir, "server.js");
    if (!fs.existsSync(serverJs)) {
        appLog(`server.js missing at ${serverJs}`);
        return false;
    }
    const dataDir = seedUserDataDir();
    const port = await getFreePort();
    if (!port) {
        appLog("no free port available");
        return false;
    }
    embeddedServerPort = port;
    embeddedServerProcess = fork(serverJs, [], {
        cwd: standaloneDir,
        env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: "1",
            PORT: String(port),
            HOSTNAME: "127.0.0.1",
            BROWSER_DATA_DIR: dataDir
        },
        stdio: ["ignore", "pipe", "pipe", "ipc"]
    });
    if (embeddedServerProcess.stdout) embeddedServerProcess.stdout.on("data", d => appLog(`[server] ${d}`));
    if (embeddedServerProcess.stderr) embeddedServerProcess.stderr.on("data", d => appLog(`[server-err] ${d}`));
    embeddedServerProcess.on("error", (e) => appLog(`fork error: ${e.message}`));
    embeddedServerProcess.on("exit", (code) => {
        appLog(`server exited with code ${code}`);
        embeddedServerProcess = null;
    });
    try {
        await waitForServer(`http://127.0.0.1:${port}`);
        appLog(`server ready on port ${port}`);
        return true;
    } catch (e) {
        appLog(`server failed to start: ${e.message}`);
        embeddedServerPort = 0;
        return false;
    }
}

function stopEmbeddedServer() {
    if (embeddedServerProcess) {
        try { embeddedServerProcess.kill(); } catch (e) {}
        embeddedServerProcess = null;
    }
}

// ---- Auto-updater (GitHub Releases via electron-updater) ----

let updateDownloadedInfo = null;

function sendUpdaterEvent(payload) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("updater-event", payload);
    }
}

function setupAutoUpdater() {
    if (!app.isPackaged) return; // no-op in dev
    let autoUpdater;
    try {
        autoUpdater = require("electron-updater").autoUpdater;
    } catch (e) {
        console.error("[updater] electron-updater unavailable:", e.message);
        return;
    }

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on("checking-for-update", () => sendUpdaterEvent({ status: "checking" }));
    autoUpdater.on("update-available", (info) => sendUpdaterEvent({ status: "available", version: info.version }));
    autoUpdater.on("update-not-available", () => sendUpdaterEvent({ status: "none" }));
    autoUpdater.on("download-progress", (p) => sendUpdaterEvent({ status: "downloading", percent: Math.round(p.percent || 0) }));
    autoUpdater.on("update-downloaded", (info) => {
        updateDownloadedInfo = info;
        sendUpdaterEvent({ status: "downloaded", version: info.version });
    });
    autoUpdater.on("error", (err) => {
        console.error("[updater]", err && err.message);
        sendUpdaterEvent({ status: "error", message: String(err && err.message || err) });
    });

    ipcMain.handle("updater-check", async () => {
        try {
            const r = await autoUpdater.checkForUpdates();
            return { ok: true, version: r && r.updateInfo && r.updateInfo.version };
        } catch (e) {
            return { ok: false, error: String(e && e.message || e) };
        }
    });
    ipcMain.on("updater-install", () => {
        if (updateDownloadedInfo) autoUpdater.quitAndInstall(true, true);
    });

    autoUpdater.checkForUpdates().catch(() => {});
}

function getAppIcon() {
    const iconIco = path.join(__dirname, "public", "icon.ico");
    const iconPng = path.join(__dirname, "public", "icon.png");
    const iconHand = path.join(__dirname, "public", "hand-logo.png");

    if (fs.existsSync(iconIco)) return iconIco;
    if (fs.existsSync(iconPng)) return iconPng;
    if (fs.existsSync(iconHand)) return iconHand;
    return undefined;
}

function createWindow() {
    const appIcon = getAppIcon();

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,                                                                                      
        minHeight: 600,
        icon: appIcon,
        frame: true,
        titleBarStyle: "hidden",
        titleBarOverlay: {
            color: "#eae5d8",
            symbolColor: "#191919",
            height: 38
        },
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true,
            preload: path.join(__dirname, "preload.js")
        }
    });

    if (appIcon && typeof mainWindow.setIcon === "function") {
        mainWindow.setIcon(appIcon);
    }

    // Load the UI: dev mode uses the external dev server; packaged mode uses
    // the embedded Next.js standalone server on its dynamically-assigned port.
    const startUrl = process.env.ELECTRON_START_URL
        || (embeddedServerPort ? `http://127.0.0.1:${embeddedServerPort}` : "http://localhost:3001");
    const loadAppWindow = () => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow.loadURL(startUrl).catch((err) => {
            setTimeout(loadAppWindow, 1000);
        });
    };
    loadAppWindow();

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

function setupDownloadManager() {
    session.defaultSession.on('will-download', (event, item, webContents) => {
        const downloadsPath = app.getPath('downloads');
        const filename = item.getFilename() || "download";
        let finalPath = path.join(downloadsPath, filename);

        let counter = 1;
        const ext = path.extname(filename);
        const name = path.basename(filename, ext);
        while (fs.existsSync(finalPath)) {
            finalPath = path.join(downloadsPath, `${name} (${counter})${ext}`);
            counter++;
        }

        // Force save path automatically to user's Downloads directory without prompting
        item.setSavePath(finalPath);

        const downloadId = 'dl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const downloadData = {
            id: downloadId,
            filename: path.basename(finalPath),
            savePath: finalPath,
            url: item.getURL(),
            totalBytes: item.getTotalBytes() || 0,
            receivedBytes: 0,
            startTime: Date.now(),
            state: 'starting', // Phase 1: starting
            isPaused: false,
            mimeType: item.getMimeType() || ""
        };

        activeDownloads.set(downloadId, { item, data: downloadData });

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-event', { type: 'download-starting', item: downloadData });
        }

        let lastTime = Date.now();
        let lastBytes = 0;

        item.on('updated', (event, state) => {
            const now = Date.now();
            const timeDiff = (now - lastTime) / 1000;
            const bytesDiff = item.getReceivedBytes() - lastBytes;
            if (timeDiff > 0.5) {
                downloadData.speed = Math.round(bytesDiff / timeDiff);
                lastTime = now;
                lastBytes = item.getReceivedBytes();
            }

            downloadData.receivedBytes = item.getReceivedBytes();
            downloadData.totalBytes = item.getTotalBytes() || downloadData.totalBytes;

            if (state === 'interrupted') {
                downloadData.state = 'paused'; // Phase 3: paused
                downloadData.isPaused = true;
            } else if (state === 'progressing') {
                if (item.isPaused()) {
                    downloadData.state = 'paused'; // Phase 3: paused
                    downloadData.isPaused = true;
                } else {
                    downloadData.state = 'downloading'; // Phase 2: downloading
                    downloadData.isPaused = false;
                }
            }

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('download-event', { type: 'download-progress', item: downloadData });
            }
        });

        item.once('done', (event, state) => {
            downloadData.receivedBytes = item.getReceivedBytes();
            downloadData.totalBytes = item.getTotalBytes() || downloadData.receivedBytes;

            if (state === 'completed') {
                downloadData.state = 'completed'; // Phase 4: completed
                downloadData.isPaused = false;
            } else {
                downloadData.state = 'cancelled';
            }

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('download-event', { type: 'download-done', item: downloadData });
            }
        });
    });
}

const originPermissions = new Map(); // domain -> boolean

ipcMain.handle("set-origin-permission", (event, { domain, granted }) => {
    if (domain) originPermissions.set(domain, granted);
    return true;
});

// Hostnames the user explicitly chose to bypass certificate warnings for
const insecureAllowedHosts = new Set();

ipcMain.handle("allow-insecure-host", (event, host) => {
    if (typeof host === "string" && host) {
        insecureAllowedHosts.add(host);
        return true;
    }
    return false;
});

app.on("certificate-error", (event, webContents, url, error, certificate, callback) => {
    try {
        const host = new URL(url).hostname;
        if (insecureAllowedHosts.has(host)) {
            event.preventDefault();
            callback(true);
            return;
        }
    } catch (e) {}
    callback(false);
});

app.whenReady().then(async () => {
    // Handle permission requests per website domain
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
        const requestingUrl = details?.requestingUrl || webContents?.getURL() || "";
        try {
            if (requestingUrl) {
                const urlObj = new URL(requestingUrl);
                const domain = urlObj.hostname;

                // Auto-approve localhost / internal app pages
                if (domain === "localhost" || domain === "127.0.0.1" || requestingUrl.startsWith("file://")) {
                    return callback(true);
                }

                // Check stored domain permission
                if (originPermissions.has(domain)) {
                    return callback(originPermissions.get(domain));
                }

                // Notify renderer UI of website permission request
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send("permission-request", {
                        permission,
                        domain,
                        url: requestingUrl
                    });
                }
            }
        } catch (e) {}

        callback(true);
    });

    session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
        try {
            if (requestingOrigin) {
                const domain = new URL(requestingOrigin).hostname;
                if (domain === "localhost" || domain === "127.0.0.1") return true;
                if (originPermissions.has(domain)) return originPermissions.get(domain);
            }
        } catch (e) {}
        return true;
    });

    setupDownloadManager();

    // Credential-save channel for popup windows without a preload (via console-message)
    app.on("web-contents-created", (e, wc) => {
        if (wc.getType() !== "window") return;
        wc.on("console-message", (ev, level, message) => {
            try {
                if (typeof message === "string" && message.startsWith("__VAULT_SAVE__")) {
                    const body = JSON.parse(message.slice("__VAULT_SAVE__".length));
                    saveVaultCredential(getActiveProfileFolder(), body.host, body.username || "", String(body.password || ""));
                }
            } catch (e) {}
        });
    });

    // Auto-fill Google sign-in pages with the active Chrome profile's email
    const maybeAutofillGoogleSignin = (wc) => {
        try {
            const url = wc.getURL() || "";
            if (!/^https:\/\/accounts\.google\.com\//.test(url)) return;
            const email = getActiveProfileEmail();
            if (!email) return;
            wc.executeJavaScript(`
                (function() {
                    const EMAIL = ${JSON.stringify(email)};
                    const fill = () => {
                        const inp = document.querySelector('input[type="email"], input[name="identifier"], input[autocomplete="username"]');
                        if (inp && !inp.value) {
                            inp.focus();
                            inp.value = EMAIL;
                            inp.dispatchEvent(new Event('input', { bubbles: true }));
                            inp.dispatchEvent(new Event('change', { bubbles: true }));
                            const btn = document.querySelector('#identifierNext button, #identifierNext, [jsname="LgbsSe"]');
                            if (btn) setTimeout(() => btn.click(), 350);
                            return true;
                        }
                        return false;
                    };
                    let tries = 0;
                    const iv = setInterval(() => { if (fill() || ++tries > 20) clearInterval(iv); }, 400);
                })();
            `).catch(() => {});
        } catch (e) {}
    };
    // Auto-fill saved Chrome passwords on matching login pages
    const maybeAutofillCredentials = (wc) => {
        try {
            const url = wc.getURL() || "";
            if (!url.startsWith("http")) return;
            const host = new URL(url).hostname;
            const folder = getActiveProfileFolder();
            const creds = [...readVault(folder), ...getChromeCredentials(folder)];
            const match = creds.find(c => host === c.host || host.endsWith("." + c.host) || c.host.endsWith("." + host));
            if (!match) return;
            wc.executeJavaScript(`
                (function() {
                    if (window.__credAutofilled) return;
                    const USER = ${JSON.stringify(match.username)}, PASS = ${JSON.stringify(match.password)};
                    const set = (el, v) => {
                        el.focus();
                        el.value = v;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    };
                    let tries = 0;
                    const iv = setInterval(() => {
                        const pw = document.querySelector('input[type="password"]:not([disabled])');
                        if (pw && !pw.value) {
                            window.__credAutofilled = true;
                            set(pw, PASS);
                            const scope = pw.closest('form') || document;
                            const userInp = scope.querySelector('input[type="email"], input[name="identifier"], input[autocomplete="username"], input[name*="user" i], input[name*="login" i], input[name*="email" i], input[type="text"]:not([type="hidden"])')
                                || document.querySelector('input[type="email"], input[autocomplete="username"]');
                            if (userInp && !userInp.value) set(userInp, USER);
                            const btn = scope.querySelector('button[type="submit"], input[type="submit"], #passwordNext button, #passwordNext')
                                || document.querySelector('button[type="submit"], #passwordNext button, #passwordNext');
                            if (btn) setTimeout(() => btn.click(), 400);
                            clearInterval(iv);
                        } else if (++tries > 60) clearInterval(iv);
                    }, 400);
                })();
            `).catch(() => {});
        } catch (e) {}
    };
    const injectCredCapture = (wc) => {
        wc.executeJavaScript(`
            if (!window.__credCaptureInstalled) {
                window.__credCaptureInstalled = true;
                const cap = () => {
                    try {
                        const pw = document.querySelector('input[type="password"]:not([disabled])');
                        if (!pw || !pw.value) return;
                        const scope = pw.closest('form') || document;
                        const userEl = scope.querySelector('input[type="email"], input[name="identifier"], input[autocomplete="username"], input[name*="user" i], input[name*="login" i], input[name*="email" i], input[type="text"]:not([type="hidden"])')
                            || document.querySelector('input[type="email"], input[autocomplete="username"]');
                        console.log('__VAULT_SAVE__' + JSON.stringify({ host: location.hostname, username: userEl && userEl.value || '', password: pw.value }));
                    } catch (e) {}
                };
                document.addEventListener('submit', cap, true);
                document.addEventListener('keydown', (e) => { if (e.key === 'Enter') setTimeout(cap, 100); }, true);
                document.addEventListener('click', (e) => {
                    const t = e.target && e.target.closest && e.target.closest('button, [role="button"], input[type="submit"], a');
                    if (t) setTimeout(cap, 100);
                }, true);
            }
        `).catch(() => {});
    };
    app.on("web-contents-created", (e, wc) => {
        if (wc.getType() !== "window" && wc.getType() !== "webview") return;
        const autofill = () => { maybeAutofillGoogleSignin(wc); maybeAutofillCredentials(wc); };
        wc.on("did-navigate", autofill);
        wc.on("did-navigate-in-page", autofill); // SPA transitions (e.g. Google email -> password step)
        wc.on("dom-ready", autofill);
        if (wc.getType() === "window") wc.on("dom-ready", () => injectCredCapture(wc));
    });

    // Auto-sync cookies from the selected Chrome profile on startup
    try {
        let folder = "Default";
        const profFile = path.join(app.getPath("userData"), "active_chrome_profile.json");
        if (fs.existsSync(profFile)) {
            folder = JSON.parse(fs.readFileSync(profFile, "utf8")).folderName || "Default";
        }
        const res = await syncChromeCookiesForProfile(folder);
        if (res.success) {
            console.log(`[profile-sync] Imported ${res.synced} cookies from Chrome '${res.profile}'` +
                (res.skippedAppBound ? ` (${res.skippedAppBound} app-bound skipped)` : ""));
        } else {
            console.log("[profile-sync]", res.error);
        }
    } catch (e) {
        console.log("[profile-sync] auto-sync failed:", e.message);
    }

    appLog(`whenReady — packaged: ${app.isPackaged}, resourcesPath: ${process.resourcesPath}`);
    if (app.isPackaged) {
        const serverOk = await startEmbeddedServer();
        if (!serverOk) {
            dialog.showErrorBox(
                "Startup Error",
                `Claude Browser couldn't start its internal server.\n\nLog: ${path.join(app.getPath("userData"), "startup.log")}`
            );
        }
    }
    setupAutoUpdater();

    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('web-contents-created', (event, contents) => {
    try {
        if (contents.session) {
            contents.session.setPermissionRequestHandler((wc, perm, cb) => cb(true));
            contents.session.setPermissionCheckHandler(() => true);
        }
    } catch (e) {}
    if (contents.getType() === 'webview') {
        contents.on('context-menu', (event, params) => {
            const menu = new Menu();

            if (params.mediaType === 'image') {
                menu.append(new MenuItem({ label: 'Open image in new tab', enabled: false }));
                menu.append(new MenuItem({ label: 'Save image as...', click: () => contents.downloadURL(params.srcURL) }));
                menu.append(new MenuItem({ label: 'Copy image', click: () => contents.copyImageAt(params.x, params.y) }));
                menu.append(new MenuItem({ label: 'Copy image address', click: () => clipboard.writeText(params.srcURL) }));
                menu.append(new MenuItem({ label: 'Create QR Code for this image', enabled: false }));
                menu.append(new MenuItem({ type: 'separator' }));
                menu.append(new MenuItem({ label: 'Inspect', click: () => contents.inspectElement(params.x, params.y) }));
            } else {
                menu.append(new MenuItem({ label: 'Back', accelerator: 'Alt+Left', click: () => contents.goBack(), enabled: contents.canGoBack() }));
                menu.append(new MenuItem({ label: 'Forward', accelerator: 'Alt+Right', click: () => contents.goForward(), enabled: contents.canGoForward() }));
                menu.append(new MenuItem({ label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => contents.reload() }));
                menu.append(new MenuItem({ type: 'separator' }));
                menu.append(new MenuItem({ label: 'Save as...', accelerator: 'CmdOrCtrl+S', click: () => contents.downloadURL(params.pageURL) }));
                menu.append(new MenuItem({ label: 'Print...', accelerator: 'CmdOrCtrl+P', click: () => contents.print() }));
                menu.append(new MenuItem({ label: 'Cast...', enabled: false }));
                menu.append(new MenuItem({ type: 'separator' }));
                menu.append(new MenuItem({ label: 'Create QR Code for this page', enabled: false }));
                menu.append(new MenuItem({ type: 'separator' }));
                menu.append(new MenuItem({ label: 'Translate to English', enabled: false }));
                menu.append(new MenuItem({ type: 'separator' }));
                menu.append(new MenuItem({ label: 'View page source', accelerator: 'CmdOrCtrl+U', enabled: false }));
                menu.append(new MenuItem({ label: 'Inspect', click: () => contents.inspectElement(params.x, params.y) }));
            }
            
            menu.popup();
        });
    }
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("will-quit", () => {
    stopEmbeddedServer();
});

// IPC Handler for DevTools and WebContents IPC events
ipcMain.on("open-devtools", (event, data) => {
    try {
        const sender = event.sender;
        if (sender && typeof sender.openDevTools === "function") {
            if (typeof sender.isDevToolsOpened === "function" && sender.isDevToolsOpened()) {
                sender.closeDevTools();
            } else {
                sender.openDevTools({ mode: "right" });
            }
        }
    } catch (e) {
        console.error("Failed to handle devtools IPC:", e);
    }
});

ipcMain.on("toggle-devtools", (event, data) => {
    try {
        const sender = event.sender;
        if (sender && typeof sender.openDevTools === "function") {
            if (typeof sender.isDevToolsOpened === "function" && sender.isDevToolsOpened()) {
                sender.closeDevTools();
            } else {
                sender.openDevTools({ mode: "right" });
            }
        }
    } catch (e) {
        console.error("Failed to toggle devtools IPC:", e);
    }
});

// Window controls IPC
ipcMain.on("window-minimize", () => {
    if (mainWindow) mainWindow.minimize();
});
ipcMain.on("window-maximize", () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});
ipcMain.on("window-close", () => {
    if (mainWindow) mainWindow.close();
});

// OpenAI-compatible LLM backends, tried in order (primary -> backup)
const LLM_MAX_TOKENS = parseInt(process.env.LLM_MAX_TOKENS || "4000", 10);

function readKeyFile(name) {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8')).key || null;
    } catch (e) { return null; }
}

const LLM_PROVIDERS = [
    {
        name: "OpenRouter",
        url: "https://openrouter.ai/api/v1/chat/completions",
        model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash",
        supportsImages: true,
        getKey: () => process.env.OPENROUTER_API_KEY || readKeyFile("openrouter_key.json"),
        headers: { "HTTP-Referer": "http://localhost:3001", "X-Title": "Antigravity Browser" }
    },
    {
        name: "Groq",
        url: "https://api.groq.com/openai/v1/chat/completions",
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        supportsImages: false,
        getKey: () => process.env.GROQ_API_KEY || readKeyFile("groq_key.json"),
        headers: {}
    }
];

let activeProvider = LLM_PROVIDERS[0];

ipcMain.handle("claude-get-active-model", () => {
    return activeProvider.model;
});

// Convert Anthropic-style message blocks to OpenAI-compatible chat messages
function toOpenAiMessages(messages, supportsImages) {
    return (messages || []).map(msg => {
        const role = msg.role === "assistant" || msg.role === "model" ? "assistant" : "user";
        const content = msg.content;
        if (!Array.isArray(content)) return { role, content: typeof content === "string" ? content : "" };
        const parts = [];
        for (const c of content) {
            if (c.type === 'text' && c.text) parts.push({ type: "text", text: c.text });
            else if (c.type === 'image' && c.source?.data && supportsImages) {
                const mime = c.source.media_type || "image/png";
                parts.push({ type: "image_url", image_url: { url: `data:${mime};base64,${c.source.data}` } });
            }
        }
        if (!supportsImages) return { role, content: parts.map(p => p.text).join("\n") };
        return { role, content: parts.length ? parts : "" };
    });
}

async function callProvider(provider, apiKey, data, event, maxTokens) {
    const stream = data.stream !== false;
    const messages = toOpenAiMessages(data.messages, provider.supportsImages);
    if (data.systemPrompt) messages.unshift({ role: "system", content: data.systemPrompt });

    const response = await fetch(provider.url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            ...provider.headers
        },
        body: JSON.stringify({
            model: provider.model,
            messages,
            stream,
            max_tokens: maxTokens || LLM_MAX_TOKENS,
            ...(stream ? { stream_options: { include_usage: true } } : {})
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`${provider.name} API Error: ${response.status} - ${errText}`);
    }

    const extractText = (parsed) => {
        if (parsed?.usage?.total_tokens != null) lastTokenCount = parsed.usage.total_tokens;
        return parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content ?? "";
    };

    if (!stream) return extractText(await response.json());

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
            if (!line.startsWith('data: ') || line.trim() === 'data: [DONE]') continue;
            try {
                const text = extractText(JSON.parse(line.slice(6)));
                if (text) {
                    fullText += text;
                    event.sender.send("claude-generate-chunk", { content: text });
                }
            } catch (e) {}
        }
    }
    return fullText;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function callProviderWithRetry(provider, apiKey, data, event) {
    let maxTokens = LLM_MAX_TOKENS;
    let rateLimitRetried = false;
    for (let attempt = 0; attempt < 4; attempt++) {
        try {
            return await callProvider(provider, apiKey, data, event, maxTokens);
        } catch (e) {
            // OpenRouter 402 "can only afford N tokens" -> shrink max_tokens to fit balance
            const afford = e.message.match(/can only afford (\d+)/);
            if (afford) {
                const next = parseInt(afford[1], 10) - 100;
                if (next >= 128 && next < maxTokens) {
                    console.error(`${provider.name} credit limit: retrying with max_tokens=${next}`);
                    maxTokens = next;
                    continue;
                }
            }
            // 429 rate limit -> wait the suggested time, retry once
            if (!rateLimitRetried && /429|rate_limit/i.test(e.message)) {
                const m = e.message.match(/try again in ([\d.]+)s/i);
                const waitMs = Math.min((m ? parseFloat(m[1]) : 5) * 1000 + 1000, 45000);
                console.error(`${provider.name} rate limited, waiting ${Math.round(waitMs / 1000)}s then retrying`);
                rateLimitRetried = true;
                await sleep(waitMs);
                continue;
            }
            throw e;
        }
    }
    throw new Error(`${provider.name}: retry attempts exhausted`);
}

ipcMain.handle("claude-generate", async (event, data) => {
    const errors = [];
    for (const provider of LLM_PROVIDERS) {
        const apiKey = provider.getKey();
        if (!apiKey) continue;
        try {
            const result = await callProviderWithRetry(provider, apiKey, data, event);
            activeProvider = provider;
            return result;
        } catch (e) {
            console.error(`${provider.name} failed, trying next provider:`, e.message);
            errors.push(e.message);
        }
    }
    const err = new Error(errors.length ? errors.join(" | ") : "No LLM API key configured (OpenRouter or Groq)");
    console.error("Error in claude-generate handler:", err);
    throw err;
});

// Download Manager IPC Handlers
ipcMain.handle("open-downloads-folder", async () => {
    try {
        const downloadsPath = app.getPath('downloads');
        await shell.openPath(downloadsPath);
        return downloadsPath;
    } catch (e) {
        console.error("Failed to open downloads folder:", e);
    }
});

ipcMain.handle("open-download-item", async (event, savePath) => {
    try {
        if (savePath && fs.existsSync(savePath)) {
            await shell.openPath(savePath);
        }
    } catch (e) {
        console.error("Failed to open download item:", e);
    }
});

ipcMain.handle("show-download-in-folder", async (event, savePath) => {
    try {
        if (savePath && fs.existsSync(savePath)) {
            shell.showItemInFolder(savePath);
        } else {
            const downloadsPath = app.getPath('downloads');
            await shell.openPath(downloadsPath);
        }
    } catch (e) {
        console.error("Failed to show item in folder:", e);
    }
});

ipcMain.handle("pause-download", (event, downloadId) => {
    const dl = activeDownloads.get(downloadId);
    if (dl && dl.item) {
        try {
            dl.item.pause();
            dl.data.state = 'paused';
            dl.data.isPaused = true;
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('download-event', { type: 'download-progress', item: dl.data });
            }
        } catch (e) { }
    }
});

ipcMain.handle("resume-download", (event, downloadId) => {
    const dl = activeDownloads.get(downloadId);
    if (dl && dl.item) {
        try {
            if (dl.item.isPaused()) {
                dl.item.resume();
            }
            dl.data.state = 'downloading';
            dl.data.isPaused = false;
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('download-event', { type: 'download-progress', item: dl.data });
            }
        } catch (e) { }
    }
});

ipcMain.handle("cancel-download", (event, downloadId) => {
    const dl = activeDownloads.get(downloadId);
    if (dl && dl.item) {
        try {
            dl.item.cancel();
            dl.data.state = 'cancelled';
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('download-event', { type: 'download-done', item: dl.data });
            }
        } catch (e) { }
    }
});

ipcMain.handle("trigger-test-download", (event, url) => {
    try {
        const targetUrl = url || "https://raw.githubusercontent.com/electron/electron/main/README.md";
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.downloadURL(targetUrl);
        }
    } catch (e) {
        console.error("Failed to trigger test download:", e);
    }
});

ipcMain.handle("cdp-focus-tab", async (event, params) => {
    try {
        const webContentsId = params?.webContentsId;
        if (webContentsId) {
            const wc = webContents.fromId(webContentsId);
            if (wc && typeof wc.focus === "function") {
                wc.focus();
                return true;
            }
        }
    } catch (e) {
        console.error("Failed to focus webContents:", e);
    }
    return false;
});

// CDP-style webContents automation IPC handlers
function getGuestWebContents(webContentsId) {
    const wc = webContents.fromId(webContentsId);
    return wc && !wc.isDestroyed() ? wc : null;
}

ipcMain.handle("cdp-evaluate", async (event, params) => {
    try {
        const wc = getGuestWebContents(params?.webContentsId);
        if (!wc || typeof params?.expression !== "string") return null;
        return await wc.executeJavaScript(params.expression, true);
    } catch (e) {
        return null;
    }
});

ipcMain.handle("cdp-scroll", async (event, params) => {
    try {
        const wc = getGuestWebContents(params?.webContentsId);
        if (!wc) return false;
        const [w, h] = wc.getSize();
        wc.sendInputEvent({
            type: "mouseWheel",
            x: Math.floor(w / 2),
            y: Math.floor(h / 2),
            deltaY: params?.amount || 0,
            canScroll: true
        });
        return true;
    } catch (e) {
        return false;
    }
});

ipcMain.handle("cdp-click", async (event, params) => {
    try {
        const wc = getGuestWebContents(params?.webContentsId);
        if (!wc) return false;
        const x = params?.x || 0;
        const y = params?.y || 0;
        wc.sendInputEvent({ type: "mouseMove", x, y });
        wc.sendInputEvent({ type: "mouseDown", x, y, button: "left", clickCount: 1 });
        await new Promise(r => setTimeout(r, 35));
        wc.sendInputEvent({ type: "mouseUp", x, y, button: "left", clickCount: 1 });
        return true;
    } catch (e) {
        return false;
    }
});

const CDP_KEY_MAP = {
    Enter: "Enter", Return: "Enter", Backspace: "Backspace", Tab: "Tab",
    Escape: "Escape", Esc: "Escape", Delete: "Delete", Home: "Home", End: "End",
    PageUp: "PageUp", PageDown: "PageDown",
    ArrowLeft: "ArrowLeft", ArrowRight: "ArrowRight", ArrowUp: "ArrowUp", ArrowDown: "ArrowDown",
    " ": "Space", Spacebar: "Space"
};

function cdpModifiers(params) {
    const mods = [];
    if (params?.ctrl) mods.push("control");
    if (params?.shift) mods.push("shift");
    if (params?.alt) mods.push("alt");
    return mods;
}

ipcMain.handle("cdp-type", async (event, params) => {
    try {
        const wc = getGuestWebContents(params?.webContentsId);
        if (!wc) return false;
        const text = String(params?.text || "");
        for (const ch of text) {
            wc.sendInputEvent({ type: "keyDown", keyCode: ch });
            wc.sendInputEvent({ type: "char", keyCode: ch });
            wc.sendInputEvent({ type: "keyUp", keyCode: ch });
            await new Promise(r => setTimeout(r, 12));
        }
        return true;
    } catch (e) {
        return false;
    }
});

ipcMain.handle("cdp-press-key", async (event, params) => {
    try {
        const wc = getGuestWebContents(params?.webContentsId);
        if (!wc) return false;
        const key = String(params?.key || "");
        const keyCode = CDP_KEY_MAP[key] || key;
        const modifiers = cdpModifiers(params);
        wc.sendInputEvent({ type: "keyDown", keyCode, modifiers });
        // Emit char text for printable keys so inputs receive the characters
        if (keyCode.length === 1 && !params?.ctrl && !params?.alt) {
            wc.sendInputEvent({ type: "char", keyCode, modifiers });
        } else if (keyCode === "Enter") {
            wc.sendInputEvent({ type: "char", keyCode: "\r", modifiers });
        }
        wc.sendInputEvent({ type: "keyUp", keyCode, modifiers });
        return true;
    } catch (e) {
        return false;
    }
});

ipcMain.handle("cdp-wait-idle", async (event, params) => {
    try {
        const wc = getGuestWebContents(params?.webContentsId);
        if (!wc) return false;
        const timeoutMs = params?.timeoutMs || 4000;
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (wc.isDestroyed()) return false;
            if (!wc.isLoading()) {
                await new Promise(r => setTimeout(r, 400));
                if (!wc.isLoading() && !wc.isDestroyed()) return true;
            }
            await new Promise(r => setTimeout(r, 100));
        }
        return false;
    } catch (e) {
        return false;
    }
});

ipcMain.handle("cdp-get-frames", async (event, params) => {
    try {
        const wc = getGuestWebContents(params?.webContentsId);
        if (!wc) return null;
        if (!wc.debugger.isAttached()) wc.debugger.attach("1.3");
        return await wc.debugger.sendCommand("Page.getFrameTree");
    } catch (e) {
        return null;
    }
});

ipcMain.handle("cdp-emulate-network", async (event, params) => {
    try {
        const wc = getGuestWebContents(params?.webContentsId);
        if (!wc) return false;
        if (!wc.debugger.isAttached()) wc.debugger.attach("1.3");
        await wc.debugger.sendCommand("Network.enable");
        await wc.debugger.sendCommand("Network.emulateNetworkConditions", {
            offline: false,
            latency: params?.latency || 0,
            downloadThroughput: params?.downloadThroughput ?? -1,
            uploadThroughput: params?.uploadThroughput ?? -1
        });
        return true;
    } catch (e) {
        return false;
    }
});

ipcMain.handle("cdp-drag-select", async (event, params) => {
    try {
        const wc = getGuestWebContents(params?.webContentsId);
        if (!wc) return false;
        const startX = params?.startX || 0;
        const startY = params?.startY || 0;
        const endX = params?.endX || 0;
        const endY = params?.endY || 0;
        wc.sendInputEvent({ type: "mouseMove", x: startX, y: startY });
        wc.sendInputEvent({ type: "mouseDown", x: startX, y: startY, button: "left", clickCount: 1 });
        const steps = 12;
        for (let i = 1; i <= steps; i++) {
            wc.sendInputEvent({
                type: "mouseMove",
                x: startX + ((endX - startX) * i) / steps,
                y: startY + ((endY - startY) * i) / steps
            });
            await new Promise(r => setTimeout(r, 16));
        }
        wc.sendInputEvent({ type: "mouseUp", x: endX, y: endY, button: "left", clickCount: 1 });
        return true;
    } catch (e) {
        return false;
    }
});
// Native Node.js OpenAI Whisper Audio Transcriber
let whisperTranscriber = null;

ipcMain.handle("transcribe-pcm-audio", async (event, audioSamples) => {
    try {
        if (!whisperTranscriber) {
            const { pipeline, env } = require("@xenova/transformers");
            env.allowLocalModels = false;
            env.useBrowserCache = false;
            whisperTranscriber = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en");
        }
        if (!audioSamples || audioSamples.length === 0) return "";
        const float32Array = new Float32Array(audioSamples);
        const result = await whisperTranscriber(float32Array);
        return result?.text?.trim() || "";
    } catch (err) {
        console.error("Whisper transcription error in main process:", err);
        return "";
    }
});

// Native Windows Speech Recognition Engine IPC Handlers
let speechProcess = null;

ipcMain.on("start-speech-recognition", () => {
    if (speechProcess) {
        try { speechProcess.kill(); } catch (e) {}
    }

    const psScript = `
$ErrorActionPreference = 'SilentlyContinue';
Add-Type -AssemblyName System.Speech;
try {
  $reco = New-Object System.Speech.Recognition.SpeechRecognitionEngine;
  $reco.SetInputToDefaultAudioDevice();
  $grammar = New-Object System.Speech.Recognition.DictationGrammar;
  $reco.LoadGrammar($grammar);

  Register-ObjectEvent -InputObject $reco -EventName SpeechRecognized -Action {
      $txt = $Event.SourceEventArgs.Result.Text;
      if ($txt) {
        [Console]::WriteLine("SPEECH_RESULT:" + $txt);
        [Console]::Out.Flush();
      }
  };

  Register-ObjectEvent -InputObject $reco -EventName SpeechHypothesized -Action {
      $txt = $Event.SourceEventArgs.Result.Text;
      if ($txt) {
        [Console]::WriteLine("SPEECH_RESULT:" + $txt);
        [Console]::Out.Flush();
      }
  };

  $reco.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple);
  while ($true) { [System.Threading.Thread]::Sleep(100) }
} catch {
  [Console]::WriteLine("SPEECH_ERROR:" + $_.Exception.Message);
  [Console]::Out.Flush();
}
`;

    try {
        const { spawn } = require("child_process");
        const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript]);
        speechProcess = child;

        child.stdout.on("data", (data) => {
            const str = data.toString();
            const lines = str.split("\n");
            lines.forEach((line) => {
                if (line.includes("SPEECH_RESULT:")) {
                    const text = line.replace("SPEECH_RESULT:", "").trim();
                    if (text && mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send("speech-recognition-result", text);
                    }
                }
            });
        });

        child.on("exit", () => {
            speechProcess = null;
        });
    } catch (err) {
        console.error("Failed to spawn Windows speech engine:", err);
    }
});

ipcMain.on("stop-speech-recognition", () => {
    if (speechProcess) {
        try { speechProcess.kill(); } catch (e) {}
        speechProcess = null;
    }
});


// ==================== App-level & Chrome Profile IPC Handlers ====================

ipcMain.handle("relaunch-app", () => {
    app.relaunch();
    app.exit(0);
});

ipcMain.handle("clear-session-data", async (event, params) => {
    try {
        let folder = params?.folderName;
        if (!folder) {
            const profFile = path.join(app.getPath("userData"), "active_chrome_profile.json");
            if (fs.existsSync(profFile)) {
                folder = JSON.parse(fs.readFileSync(profFile, "utf8")).folderName;
            }
        }
        const ses = session.fromPartition(`persist:chrome-${folder || "Default"}`);
        await ses.clearStorageData();
        await ses.clearCache();
        await ses.clearAuthCache();
        return true;
    } catch (e) {
        console.error("Failed to clear session data:", e);
        return false;
    }
});

function getChromeUserDataDir() {
    const localAppData = process.env.LOCALAPPDATA || "";
    if (!localAppData) return null;
    const dir = path.join(localAppData, "Google", "Chrome", "User Data");
    return fs.existsSync(dir) ? dir : null;
}

function getActiveProfileFolder() {
    try {
        const profFile = path.join(app.getPath("userData"), "active_chrome_profile.json");
        if (fs.existsSync(profFile)) {
            return JSON.parse(fs.readFileSync(profFile, "utf8")).folderName || "Default";
        }
    } catch (e) {}
    return "Default";
}

function getActiveProfileEmail() {
    try {
        const userDataDir = getChromeUserDataDir();
        if (!userDataDir) return "";
        const localState = JSON.parse(fs.readFileSync(path.join(userDataDir, "Local State"), "utf8"));
        return localState?.profile?.info_cache?.[getActiveProfileFolder()]?.user_name || "";
    } catch (e) {
        return "";
    }
}

const credentialsCache = new Map(); // profileFolder -> [{host, username, password}]

// ==================== In-app credential vault (safeStorage / DPAPI) ====================
function vaultPathFor(folder) {
    return path.join(app.getPath("userData"), `vault_${folder}.json`);
}

function readVault(folder) {
    try {
        const p = vaultPathFor(folder);
        if (!fs.existsSync(p)) return [];
        const entries = JSON.parse(fs.readFileSync(p, "utf8"));
        return entries.map(e => ({
            host: e.host,
            username: e.username,
            password: safeStorage.decryptString(Buffer.from(e.passwordEnc, "base64"))
        })).filter(e => e.host && e.password);
    } catch (e) {
        return [];
    }
}

function saveVaultCredential(folder, host, username, password) {
    try {
        if (!safeStorage.isEncryptionAvailable() || !host || !password) return;
        const p = vaultPathFor(folder);
        let entries = [];
        try { entries = JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) {}
        const passwordEnc = safeStorage.encryptString(password).toString("base64");
        const existing = entries.findIndex(e => e.host === host && e.username === username);
        if (existing >= 0) entries[existing].passwordEnc = passwordEnc;
        else entries.push({ host, username: username || "", passwordEnc });
        fs.writeFileSync(p, JSON.stringify(entries, null, 2));
    } catch (e) {
        console.error("[vault] save failed:", e.message);
    }
}

ipcMain.on("vault-save-credential", (event, data) => {
    try {
        if (!data || typeof data.host !== "string") return;
        saveVaultCredential(getActiveProfileFolder(), data.host, data.username || "", String(data.password || ""));
    } catch (e) {}
});

function getChromeCredentials(folderName) {
    const folder = folderName && folderName !== "default" ? folderName : "Default";
    if (credentialsCache.has(folder)) return credentialsCache.get(folder);
    const userDataDir = getChromeUserDataDir();
    if (!userDataDir) return [];

    const candidates = [path.join(userDataDir, folder, "Login Data"), path.join(userDataDir, folder, "Login Data For Account")];
    const dbPath = candidates.find(p => fs.existsSync(p));
    if (!dbPath) return [];

    const tmpDir = fs.mkdtempSync(path.join(require("os").tmpdir(), "chr-login-"));
    const tmpDb = path.join(tmpDir, "LoginData");
    try {
        fs.copyFileSync(dbPath, tmpDb);
    } catch (e) {
        console.log(`[creds] '${folder}' Login Data locked (Chrome running):`, e.message);
        credentialsCache.set(folder, []);
        return [];
    }
    for (const suffix of ["-journal", "-wal", "-shm"]) {
        if (fs.existsSync(dbPath + suffix)) {
            try { fs.copyFileSync(dbPath + suffix, tmpDb + suffix); } catch (e) {}
        }
    }

    let rows = [];
    try {
        const { DatabaseSync } = require("node:sqlite");
        const db = new DatabaseSync(tmpDb);
        rows = db.prepare("SELECT origin_url, username_value, password_value FROM logins WHERE blacklisted_by_user = 0").all();
        db.close();
    } catch (e) {
        console.log("[creds] Failed to read Login Data:", e.message);
        return [];
    }

    let masterKey = null;
    try { masterKey = getChromeMasterKey(userDataDir); } catch (e) {}

    const creds = [];
    for (const r of rows) {
        if (!r.username_value || !r.password_value) continue;
        let password = null;
        if (masterKey) {
            const buf = Buffer.isBuffer(r.password_value) ? r.password_value : Buffer.from(r.password_value);
            password = decryptChromeCookie(buf, masterKey); // same v10/v11 AES-GCM format
        }
        if (!password) continue;
        let host = "";
        try { host = new URL(r.origin_url).hostname; } catch (e) {}
        if (host) creds.push({ host, username: r.username_value, password });
    }
    console.log(`[creds] Loaded ${creds.length} credentials from Chrome '${folder}'`);
    credentialsCache.set(folder, creds);
    return creds;
}

function listChromeProfileFolders(userDataDir) {
    try {
        return fs.readdirSync(userDataDir, { withFileTypes: true })
            .filter(d => d.isDirectory() && (d.name === "Default" || /^Profile \d+$/.test(d.name)))
            .map(d => d.name)
            .filter(name => fs.existsSync(path.join(userDataDir, name, "Preferences")));
    } catch (e) {
        return [];
    }
}

function getChromeProfileName(userDataDir, folderName) {
    try {
        const prefs = JSON.parse(fs.readFileSync(path.join(userDataDir, folderName, "Preferences"), "utf8"));
        return prefs?.profile?.name || folderName;
    } catch (e) {
        return folderName;
    }
}

function getChromeProfileAvatar(userDataDir, folderName, infoEntry) {
    const candidates = [
        infoEntry?.gaia_picture_file_name,
        "Google Profile Picture.png",
        "Avatar.png",
        "Profile Picture.png"
    ].filter(Boolean);
    for (const candidate of candidates) {
        try {
            const p = path.join(userDataDir, folderName, candidate);
            if (fs.existsSync(p) && fs.statSync(p).size < 2 * 1024 * 1024) {
                const ext = (path.extname(candidate).slice(1) || "png").toLowerCase();
                const mime = ext === "jpg" || ext === "jpeg" ? "jpeg" : ext;
                return `data:image/${mime};base64,${fs.readFileSync(p).toString("base64")}`;
            }
        } catch (e) {}
    }
    return null;
}

ipcMain.handle("get-chrome-profiles", async () => {
    const userDataDir = getChromeUserDataDir();
    if (!userDataDir) return [{ id: "default", name: "Default Profile" }];
    const folders = listChromeProfileFolders(userDataDir);
    if (folders.length === 0) return [{ id: "Default", name: "Default" }];

    // Local State info_cache carries gaia email + picture filename per profile folder
    let infoCache = {};
    try {
        const localState = JSON.parse(fs.readFileSync(path.join(userDataDir, "Local State"), "utf8"));
        infoCache = localState?.profile?.info_cache || {};
    } catch (e) {}

    const profiles = folders.map(f => {
        const info = infoCache[f] || {};
        const localName = getChromeProfileName(userDataDir, f);
        return {
            id: f,
            name: info.gaia_name || info.name || localName,
            email: info.user_name || "",
            avatar: getChromeProfileAvatar(userDataDir, f, info)
        };
    });
    profiles.push({ id: "__guest__", name: "Guest", email: "", avatar: null, isGuest: true });
    return profiles;
});

// Unprotect a Chrome "DPAPI"-prefixed blob via Windows DPAPI (CurrentUser scope)
function dpapiUnprotect(blob) {
    const { execFileSync } = require("child_process");
    const b64 = blob.toString("base64");
    const out = execFileSync("powershell.exe", [
        "-NoProfile", "-NonInteractive", "-Command",
        `Add-Type -AssemblyName System.Security; $enc=[Convert]::FromBase64String('${b64}'); [Convert]::ToBase64String([System.Security.Cryptography.ProtectedData]::Unprotect($enc,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser))`
    ], { encoding: "utf8", timeout: 15000 }).trim();
    return Buffer.from(out, "base64");
}

function getChromeMasterKey(userDataDir) {
    const localStatePath = path.join(userDataDir, "Local State");
    if (!fs.existsSync(localStatePath)) throw new Error("Chrome Local State file not found");
    const localState = JSON.parse(fs.readFileSync(localStatePath, "utf8"));
    const encKeyB64 = localState?.os_crypt?.encrypted_key;
    if (!encKeyB64) throw new Error("No os_crypt.encrypted_key in Local State");
    const encKey = Buffer.from(encKeyB64, "base64");
    if (encKey.subarray(0, 5).toString() !== "DPAPI") throw new Error("Unexpected encrypted_key format");
    return dpapiUnprotect(encKey.subarray(5));
}

// Decrypt a Chrome v10/v11 cookie value (AES-256-GCM). Returns null for v20 (app-bound) or failures.
function decryptChromeCookie(encryptedValue, masterKey) {
    const crypto = require("crypto");
    if (!encryptedValue || encryptedValue.length < 3) return null;
    const prefix = encryptedValue.subarray(0, 3).toString();
    if (prefix === "v20") return null; // Chrome 127+ app-bound encryption - not decryptable externally
    if (prefix !== "v10" && prefix !== "v11") return null;
    try {
        const nonce = encryptedValue.subarray(3, 15);
        const ciphertext = encryptedValue.subarray(15, encryptedValue.length - 16);
        const tag = encryptedValue.subarray(encryptedValue.length - 16);
        const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, nonce);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    } catch (e) {
        return null;
    }
}

async function syncChromeCookiesForProfile(folderName) {
    const userDataDir = getChromeUserDataDir();
    if (!userDataDir) return { success: false, error: "Chrome User Data directory not found on this machine." };

    const folder = folderName && folderName !== "default" ? folderName : "Default";
    const profileDir = path.join(userDataDir, folder);
    if (!fs.existsSync(profileDir)) return { success: false, error: `Chrome profile folder '${folder}' not found.` };

    const candidates = [path.join(profileDir, "Network", "Cookies"), path.join(profileDir, "Cookies")];
    const cookieDbPath = candidates.find(p => fs.existsSync(p));
    if (!cookieDbPath) return { success: false, error: `No Cookies database found for '${folder}'.` };

    const masterKey = getChromeMasterKey(userDataDir);

    // Copy DB to temp; Chrome holds an exclusive lock while running, so retry then report clearly
    const tmpDir = fs.mkdtempSync(path.join(require("os").tmpdir(), "chr-cookies-"));
    const tmpDb = path.join(tmpDir, "Cookies");
    let copied = false;
    let lastErr = null;
    for (let i = 0; i < 6 && !copied; i++) {
        try {
            fs.copyFileSync(cookieDbPath, tmpDb);
            copied = true;
        } catch (e) {
            lastErr = e;
            await new Promise(r => setTimeout(r, 400));
        }
    }
    if (!copied) {
        const busy = lastErr && (lastErr.code === "EBUSY" || lastErr.code === "EPERM");
        return {
            success: false,
            error: busy
                ? "Chrome is currently running and has locked its Cookies database. Please fully close Chrome (including background processes in the system tray) and try syncing again."
                : `Failed to copy Cookies database: ${lastErr?.message}`
        };
    }
    for (const suffix of ["-journal", "-wal", "-shm"]) {
        if (fs.existsSync(cookieDbPath + suffix)) {
            try { fs.copyFileSync(cookieDbPath + suffix, tmpDb + suffix); } catch (e) {}
        }
    }

    let rows = [];
    try {
        const { DatabaseSync } = require("node:sqlite");
        const db = new DatabaseSync(tmpDb);
        rows = db.prepare("SELECT host_key, name, value, encrypted_value, path, expires_utc, is_secure, is_httponly, samesite FROM cookies")
            .setReadBigInts(true).all();
        db.close();
    } catch (e) {
        return { success: false, error: `Failed to read Cookies database: ${e.message}` };
    }

    const ses = session.fromPartition(`persist:chrome-${folder}`);
    let synced = 0;
    let skippedAppBound = 0;
    for (const row of rows) {
        let value = row.value || "";
        if (!value && row.encrypted_value && row.encrypted_value.length) {
            const buf = Buffer.isBuffer(row.encrypted_value) ? row.encrypted_value : Buffer.from(row.encrypted_value);
            const decrypted = decryptChromeCookie(buf, masterKey);
            if (decrypted === null) {
                if (buf.subarray(0, 3).toString() === "v20") skippedAppBound++;
                continue;
            }
            value = decrypted;
        }
        if (!value) continue;

        const hostKey = row.host_key || "";
        const bareHost = hostKey.replace(/^\./, "");
        if (!bareHost) continue;

        const expiresUtc = row.expires_utc || 0n;
        const expiresUnix = expiresUtc > 0n ? Number(expiresUtc / 1000000n) - 11644473600 : 0;
        const details = {
            url: `${row.is_secure ? "https" : "http"}://${bareHost}${row.path || "/"}`,
            name: row.name,
            value,
            domain: hostKey,
            path: row.path || "/",
            secure: !!row.is_secure,
            httpOnly: !!row.is_httponly
        };
        if (expiresUnix > 0) details.expirationDate = expiresUnix;
        try {
            await ses.cookies.set(details);
            synced++;
        } catch (e) {}
    }

    return { success: true, synced, skippedAppBound, profile: folder };
}

ipcMain.handle("get-chrome-bookmarks", async (event, params) => {
    try {
        const userDataDir = getChromeUserDataDir();
        if (!userDataDir) return [];
        const folder = params?.folderName || getActiveProfileFolder();
        const bmPath = path.join(userDataDir, folder === "default" ? "Default" : folder, "Bookmarks");
        if (!fs.existsSync(bmPath)) return [];
        const data = JSON.parse(fs.readFileSync(bmPath, "utf8"));
        const mapNode = (n) => ({
            name: n.name || "",
            url: n.url || "",
            type: n.type,
            children: Array.isArray(n.children) ? n.children.map(mapNode) : []
        });
        const bar = data?.roots?.bookmark_bar;
        return bar && Array.isArray(bar.children) ? bar.children.map(mapNode) : [];
    } catch (e) {
        return [];
    }
});

ipcMain.handle("sync-chrome-cookies", async (event, params) => {
    try {
        return await syncChromeCookiesForProfile(params?.folderName);
    } catch (e) {
        console.error("sync-chrome-cookies failed:", e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle("switch-chrome-profile", async (event, params) => {
    try {
        const res = await syncChromeCookiesForProfile(params?.folderName);
        if (!res.success) return false;
        fs.writeFileSync(path.join(app.getPath("userData"), "active_chrome_profile.json"),
            JSON.stringify({ folderName: res.profile }));
        return true;
    } catch (e) {
        console.error("switch-chrome-profile failed:", e);
        return false;
    }
});

// ==================== Background Tool IPC Handlers ====================

let lastTokenCount = null;
ipcMain.handle("claude-get-last-token-count", () => lastTokenCount);

const CRAWL_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

ipcMain.handle("crawl-website", async (event, params) => {
    try {
        const url = params?.url;
        if (!url) return { error: "No URL provided" };
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(url, {
            headers: { "User-Agent": CRAWL_UA, "Accept": "text/html,application/xhtml+xml,text/plain,*/*" },
            redirect: "follow",
            signal: controller.signal
        });
        clearTimeout(timer);
        const html = await res.text();

        const getMeta = (name) => {
            const re = new RegExp(`<meta[^>]+(?:name|property)=["'](?:${name})["'][^>]*content=["']([^"']*)["']`, "i");
            const alt = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["'](?:${name})["']`, "i");
            const m = html.match(re) || html.match(alt);
            return m ? m[1] : "";
        };
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);

        return {
            html,
            status: res.status,
            url: res.url,
            meta: {
                title: titleMatch ? titleMatch[1].trim() : "",
                description: getMeta("description"),
                keywords: getMeta("keywords"),
                robots: getMeta("robots"),
                canonical: canonicalMatch ? canonicalMatch[1] : "",
                ogTitle: getMeta("og:title"),
                ogDescription: getMeta("og:description")
            }
        };
    } catch (e) {
        return { error: e.message };
    }
});

ipcMain.handle("check-domain-authority", async (event, params) => {
    try {
        const domain = params?.domain;
        if (!domain) return { error: "No domain provided" };
        const dns = require("dns").promises;

        const safe = async (fn) => { try { return await fn(); } catch (e) { return []; } };
        const ipAddresses = await safe(() => dns.resolve4(domain));
        const mailRecords = (await safe(() => dns.resolveMx(domain))).map(m => m.exchange);
        const txtRecords = (await safe(() => dns.resolveTxt(domain))).map(t => t.join(""));
        const nsRecords = await safe(() => dns.resolveNs(domain));

        const hasA = ipAddresses.length > 0;
        const hasMX = mailRecords.length > 0;
        const hasTXT = txtRecords.length > 0;
        let da = 10;
        if (hasA) da += 20;
        if (hasMX) da += 15;
        if (hasTXT) da += 15;
        da = Math.min(99, Math.max(12, da));
        const pa = Math.min(99, Math.max(10, Math.round(da * 0.85)));

        return {
            domain,
            da,
            pa,
            dnsRecordStats: { hasA, hasMX, hasTXT, ipAddresses, mailServers: mailRecords, txtRecords, nameServers: nsRecords }
        };
    } catch (e) {
        return { error: e.message };
    }
});

ipcMain.handle("trace-redirect-chain", async (event, params) => {
    try {
        let url = params?.url;
        if (!url) return { error: "No URL provided" };
        if (!/^https?:\/\//i.test(url)) url = "http://" + url;

        const initialUrl = url;
        const chain = [];
        const MAX_HOPS = 10;
        let current = url;

        for (let i = 0; i <= MAX_HOPS; i++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 10000);
            const res = await fetch(current, {
                method: "GET",
                headers: { "User-Agent": CRAWL_UA },
                redirect: "manual",
                signal: controller.signal
            });
            clearTimeout(timer);
            await res.arrayBuffer().catch(() => {});

            const isRedirect = res.status >= 300 && res.status < 400 && res.headers.get("location");
            chain.push({
                url: current,
                statusCode: res.status,
                statusText: res.statusText || (res.status === 200 ? "OK" : ""),
                type: isRedirect ? "Redirect" : "Destination"
            });

            if (!isRedirect) break;
            current = new URL(res.headers.get("location"), current).href;
        }

        const finalUrl = chain[chain.length - 1]?.url || current;
        return {
            initialUrl,
            finalUrl,
            totalRedirects: Math.max(0, chain.length - 1),
            isHttpsUpgraded: initialUrl.startsWith("http://") && finalUrl.startsWith("https://") || finalUrl.startsWith("https://"),
            chain
        };
    } catch (e) {
        return { error: e.message };
    }
});

ipcMain.handle("launch-desktop-chrome", async (event, params) => {
    try {
        const { spawn } = require("child_process");
        const args = params?.args || [];
        const candidates = [
            path.join(process.env["PROGRAMFILES"] || "", "Google", "Chrome", "Application", "chrome.exe"),
            path.join(process.env["PROGRAMFILES(X86)"] || "", "Google", "Chrome", "Application", "chrome.exe"),
            path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe")
        ].filter(p => p && p.length > 5);
        const exe = candidates.find(p => fs.existsSync(p));
        if (exe) {
            spawn(exe, args, { detached: true, stdio: "ignore" }).unref();
        } else {
            spawn("cmd.exe", ["/c", "start", "", "chrome", ...args], { detached: true, stdio: "ignore" }).unref();
        }
        return true;
    } catch (e) {
        console.error("launch-desktop-chrome failed:", e);
        return false;
    }
});
