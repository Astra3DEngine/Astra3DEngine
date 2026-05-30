/**
 * 依旧神秘 Electron ，看我可不可以驾驭一下。
 * @file electron/main.js
 * @description Electron 主进程入口，负责创建应用窗口、处理 IPC 通信和系统对话框
 * @module electron/main
 */

import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

let mainWindow = null;

/**
 * 创建主应用窗口
 * @description 创建无边框的主编辑器窗口，配置 Web 安全策略和预加载脚本
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Astra 3D Engine',
    frame: false,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    mainWindow?.close();
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow?.isMaximized() || false;
  });

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:unmaximized');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createGameWindow() {
  const gameWindow = new BrowserWindow({
    width: 640,
    height: 360,
    minWidth: 400,
    minHeight: 300,
    title: 'Astra 3D Engine',
    frame: true,
    resizable: true,
    parent: BrowserWindow.getFocusedWindow(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    gameWindow.loadURL(VITE_DEV_SERVER_URL + 'game.html');
  } else {
    gameWindow.loadFile(path.join(__dirname, '../dist/game.html'));
  }

  gameWindow.on('closed', () => {});
}

ipcMain.on('game:open', createGameWindow);

ipcMain.on('window:force-close', () => {
  mainWindow?.destroy();
});

ipcMain.handle('dialog:showSave', async (event, options) => {
  return await dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('dialog:showOpen', async (event, options) => {
  return await dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('dialog:showMessage', async (event, options) => {
  return await dialog.showMessageBox(mainWindow, options);
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});