const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
  onMaximize: (callback) => ipcRenderer.on("window:maximized", callback),
  onUnmaximize: (callback) => ipcRenderer.on("window:unmaximized", callback),
  openGame: () => ipcRenderer.send("game:open")
});
