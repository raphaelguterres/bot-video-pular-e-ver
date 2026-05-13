const fs = require("fs");
const path = require("path");
const { app, BrowserWindow, ipcMain } = require("electron");
const { VideoCourseBot } = require("../core/video-course-bot");
const { getBraveDebugCommand, getCdpStatus, openBraveDebug } = require("../core/brave");
const { loadConfigFromWorkspace, normalizeConfig, readJsonIfExists } = require("../core/config");
const { HistoryStore } = require("../core/history-store");
const { listPresets } = require("../core/presets");

let mainWindow = null;
let bot = null;

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
  fs.mkdirSync(path.dirname(getSettingsPath()), { recursive: true });
  fs.writeFileSync(getSettingsPath(), JSON.stringify(normalized, null, 2));
  return normalized;
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
    backgroundColor: "#f7f3ea",
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

ipcMain.handle("brave:command", (_event, settings) => getBraveDebugCommand(normalizeConfig(settings)));

ipcMain.handle("brave:status", async (_event, settings) => {
  const config = normalizeConfig(settings);
  return getCdpStatus(config.browserCdpUrl);
});

ipcMain.handle("brave:open-debug", async (_event, settings) => {
  const config = normalizeConfig(settings);
  return openBraveDebug(config);
});

ipcMain.handle("bot:start", async (_event, settings) => {
  const config = saveSettings(settings);

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
