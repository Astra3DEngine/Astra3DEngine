/**
 * Electron 预加载脚本
 * 
 * 通过 contextBridge 安全地暴露主进程 API 到渲染进程。
 * 包含窗口控制、文件系统操作、对话框等功能。
 * 
 * @file electron/preload.js
 * @module electron/preload
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window:minimize'),
  
  maximize: () => ipcRenderer.send('window:maximize'),
  
  close: () => ipcRenderer.send('window:close'),
  
  forceClose: () => ipcRenderer.send('window:force-close'),
  
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  
  onMaximize: (callback) => {
    ipcRenderer.on('window:maximized', callback);
    return () => ipcRenderer.removeListener('window:maximized', callback);
  },
  
  onUnmaximize: (callback) => {
    ipcRenderer.on('window:unmaximized', callback);
    return () => ipcRenderer.removeListener('window:unmaximized', callback);
  },

  openGame: () => ipcRenderer.send('game:open'),
  
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSave', options),
  
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpen', options),
  
  showMessage: (options) => ipcRenderer.invoke('dialog:showMessage', options),
  
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  
  writeFile: (filePath, content) => ipcRenderer.invoke('file:write', filePath, content),
  
  fs: {
    listDirectory: (dirPath) => ipcRenderer.invoke('fs:listDirectory', dirPath),
    getHomeDir: () => ipcRenderer.invoke('fs:getHomeDir'),
    getCommonDirs: () => ipcRenderer.invoke('fs:getCommonDirs'),
    pathExists: (filePath) => ipcRenderer.invoke('fs:pathExists', filePath),
    getPathInfo: (filePath) => ipcRenderer.invoke('fs:getPathInfo', filePath),
    createDirectory: (dirPath) => ipcRenderer.invoke('fs:createDirectory', dirPath),
    getDrives: () => ipcRenderer.invoke('fs:getDrives')
  }
});