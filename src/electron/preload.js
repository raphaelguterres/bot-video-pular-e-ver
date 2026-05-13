const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("videoBot", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  exportSettings: () => ipcRenderer.invoke("settings:export"),
  importSettings: () => ipcRenderer.invoke("settings:import"),
  listPresets: () => ipcRenderer.invoke("presets:list"),
  getHistory: () => ipcRenderer.invoke("history:get"),
  checkBrave: (settings) => ipcRenderer.invoke("brave:status", settings),
  openBraveDebug: (settings) => ipcRenderer.invoke("brave:open-debug", settings),
  start: (settings) => ipcRenderer.invoke("bot:start", settings),
  stop: () => ipcRenderer.invoke("bot:stop"),
  setSpeed: (playbackRate) => ipcRenderer.invoke("bot:speed", playbackRate),
  generateDiagnostic: () => ipcRenderer.invoke("diagnostic:generate"),
  onBotEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("bot:event", listener);
    return () => ipcRenderer.removeListener("bot:event", listener);
  },
});
