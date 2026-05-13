const fs = require("fs");
const path = require("path");
const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { VideoCourseBot } = require("../core/video-course-bot");
const { getCdpStatus, openBraveDebug } = require("../core/brave");
const { loadConfigFromWorkspace, normalizeConfig, readJsonIfExists } = require("../core/config");
const { HistoryStore } = require("../core/history-store");
const { listPresets } = require("../core/presets");
const { assertValidConfig } = require("../core/validation");

let mainWindow = null;
let bot = null;
let lastBotStatus = null;
const eventBuffer = [];

function getSettingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function getHistoryStore() {
  return new HistoryStore(path.join(app.getPath("userData"), "history.json"));
}

function loadInitialSettings() {
  const workspaceConfig = loadConfigFromWorkspace(process.cwd());
  const savedSettings = readJsonIfExists(getSettingsPath());

  return normalizeConfig({
    ...workspaceConfig,
    ...savedSettings,
  });
}

function saveSettings(settings) {
  const normalized = normalizeConfig(settings);
  assertValidConfig(normalized, { requireStartUrl: false });
  fs.mkdirSync(path.dirname(getSettingsPath()), { recursive: true });
  fs.writeFileSync(getSettingsPath(), JSON.stringify(normalized, null, 2));
  return normalized;
}

function sanitizeSettings(settings = {}) {
  return {
    ...settings,
    browserExecutablePath: settings.browserExecutablePath ? "[local-browser-path]" : "",
    startUrl: settings.startUrl ? "[configured-url]" : "",
  };
}

function pushEvent(event) {
  lastBotStatus = event.type === "status" ? event : lastBotStatus;
  eventBuffer.push(event);
  if (eventBuffer.length > 500) {
    eventBuffer.shift();
  }
}

function sendToRenderer(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send(channel, payload);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: "#f5f7fb",
    title: "Video Course Bot",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "../ui/index.html"));
}

function attachBot(botInstance) {
  botInstance.on("event", (event) => {
    pushEvent(event);
    sendToRenderer("bot:event", event);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async (event) => {
  if (bot?.running) {
    event.preventDefault();
    await bot.stop().catch(() => {});
    app.quit();
  }
});

ipcMain.handle("settings:get", () => loadInitialSettings());

ipcMain.handle("settings:save", (_event, settings) => saveSettings(settings));

ipcMain.handle("presets:list", () => listPresets());

ipcMain.handle("history:get", () => getHistoryStore().getSummary());

ipcMain.handle("brave:status", async (_event, settings) => {
  const config = normalizeConfig(settings);
  return getCdpStatus(config.browserCdpUrl);
});

ipcMain.handle("brave:open-debug", async (_event, settings) => {
  const config = normalizeConfig(settings);
  return openBraveDebug(config);
});

ipcMain.handle("bot:start", async (_event, settings) => {
  const config = normalizeConfig(settings);
  assertValidConfig(config);
  saveSettings(config);

  if (bot?.running) {
    throw new Error("O bot ja esta em execucao.");
  }

  bot = new VideoCourseBot(config, {
    historyStore: getHistoryStore(),
  });
  attachBot(bot);
  await bot.start(config);
  return { started: true };
});

ipcMain.handle("bot:stop", async () => {
  if (!bot) {
    return { stopped: true };
  }

  await bot.stop();
  return { stopped: true };
});

ipcMain.handle("bot:speed", async (_event, playbackRate) => {
  if (!bot) {
    return { playbackRate: Number(playbackRate) };
  }

  return bot.setSpeed(playbackRate);
});

ipcMain.handle("settings:export", async () => {
  const settings = loadInitialSettings();
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Exportar configuracoes",
    defaultPath: "video-course-bot-settings.json",
    filters: [{ name: "JSON", extensions: ["json"] }],
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  fs.writeFileSync(result.filePath, JSON.stringify(settings, null, 2));
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle("settings:import", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Importar configuracoes",
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }],
  });

  if (result.canceled || !result.filePaths?.[0]) {
    return { canceled: true };
  }

  const imported = readJsonIfExists(result.filePaths[0]);
  const normalized = saveSettings(imported);
  return { canceled: false, settings: normalized };
});

ipcMain.handle("diagnostic:generate", async () => {
  const diagnosticsDir = path.join(app.getPath("userData"), "diagnostics");
  fs.mkdirSync(diagnosticsDir, { recursive: true });

  const filePath = path.join(
    diagnosticsDir,
    `diagnostic-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );
  const payload = {
    generatedAt: new Date().toISOString(),
    appVersion: app.getVersion(),
    platform: process.platform,
    status: lastBotStatus,
    settings: sanitizeSettings(loadInitialSettings()),
    recentEvents: eventBuffer.slice(-120),
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return { filePath };
});
