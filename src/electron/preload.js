const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("videoBot", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  listPresets: () => ipcRenderer.invoke("presets:list"),
  getHistory: () => ipcRenderer.invoke("history:get"),
  getBraveCommand: (settings) => ipcRenderer.invoke("brave:command", settings),
  checkBrave: (settings) => ipcRenderer.invoke("brave:status", settings),
  openBraveDebug: (settings) => ipcRenderer.invoke("brave:open-debug", settings),
  start: (settings) => ipcRenderer.invoke("bot:start", settings),
  stop: () => ipcRenderer.invoke("bot:stop"),
  setSpeed: (playbackRate) => ipcRenderer.invoke("bot:speed", playbackRate),
  onBotEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("bot:event", listener);
    return () => ipcRenderer.removeListener("bot:event", listener);
  },
});
