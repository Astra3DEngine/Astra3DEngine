/**
 * Electron 主进程入口
 * 
 * 负责创建应用窗口、处理 IPC 通信和系统对话框。
 * 无边框窗口设计，提供自定义窗口控制按钮。
 * 
 * @file electron/main.js
 * @module electron/main
 */

import { app, BrowserWindow, ipcMain, shell, dialog, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fsp } from 'fs';
import { exec } from 'child_process';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

let mainWindow = null;

function getIconPath() {
  const iconPath = path.join(__dirname, 'icon.png');
  if (VITE_DEV_SERVER_URL) {
    return path.join(__dirname, 'icon.png');
  }
  return path.join(__dirname, '../electron/icon.png');
}

function createWindow() {
  const icon = nativeImage.createFromPath(getIconPath());
  
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Astra 3D Engine',
    frame: false,
    icon: icon,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: false,
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

ipcMain.handle('file:read', async (event, filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.glb', '.gltf', '.obj', '.fbx', '.bin', '.astra'];
    
    if (binaryExtensions.includes(ext)) {
      const buffer = await fsp.readFile(filePath);
      const base64 = buffer.toString('base64');
      return { success: true, content: base64, isBinary: true };
    } else {
      const content = await fsp.readFile(filePath, 'utf-8');
      return { success: true, content, isBinary: false };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('file:write', async (event, filePath, content) => {
  try {
    await fsp.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:listDirectory', async (event, dirPath) => {
  try {
    const entries = await fsp.readdir(dirPath, { withFileTypes: true });
    const items = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name);
      let stats;
      try {
        stats = await fsp.stat(fullPath);
      } catch (e) {
        stats = null;
      }
      
      return {
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
        size: stats ? stats.size : 0,
        modifiedTime: stats ? stats.mtime.getTime() : 0,
        isHidden: entry.name.startsWith('.')
      };
    }));
    
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    
    return { success: true, items };
  } catch (error) {
    return { success: false, error: error.message, items: [] };
  }
});

ipcMain.handle('fs:getHomeDir', () => {
  return app.getPath('home');
});

ipcMain.handle('fs:getCommonDirs', () => {
  return {
    home: app.getPath('home'),
    desktop: app.getPath('desktop'),
    documents: app.getPath('documents'),
    downloads: app.getPath('downloads'),
    pictures: app.getPath('pictures'),
    music: app.getPath('music'),
    videos: app.getPath('videos'),
    appData: app.getPath('appData'),
    userData: app.getPath('userData')
  };
});

ipcMain.handle('fs:pathExists', async (event, filePath) => {
  try {
    await fsp.access(filePath);
    return { success: true, exists: true };
  } catch {
    return { success: true, exists: false };
  }
});

ipcMain.handle('fs:getPathInfo', async (event, filePath) => {
  try {
    const stats = await fsp.stat(filePath);
    return {
      success: true,
      info: {
        name: path.basename(filePath),
        path: filePath,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        size: stats.size,
        createdTime: stats.birthtime.getTime(),
        modifiedTime: stats.mtime.getTime(),
        accessedTime: stats.atime.getTime()
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:createDirectory', async (event, dirPath) => {
  try {
    await fsp.mkdir(dirPath, { recursive: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 盘符列表缓存（避免每次打开文件浏览器都执行 PowerShell）
let _drivesCache = null;
let _drivesCacheTime = 0;
const DRIVES_CACHE_TTL = 60 * 1000; // 缓存 60 秒

ipcMain.handle('fs:getDrives', async () => {
  // 检查缓存是否有效
  if (_drivesCache && (Date.now() - _drivesCacheTime) < DRIVES_CACHE_TTL) {
    return { success: true, drives: _drivesCache };
  }

  if (process.platform === 'win32') {
    let drives = [];

    try {
      const buf = await new Promise((resolve, reject) => {
        exec(
          'powershell -NoProfile -Command "Get-Volume | Where-Object { $_.DriveLetter -ne $null } | Select-Object DriveLetter, FileSystemLabel | ConvertTo-Json -Compress"',
          { timeout: 8000 },
          (error, stdout) => error ? reject(error) : resolve(Buffer.from(stdout, 'binary'))
        );
      });
      const psOutput = new TextDecoder('gbk').decode(buf);
      const parsed = JSON.parse(psOutput.trim());
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of arr) {
        if (item.DriveLetter) {
          const letter = item.DriveLetter.toUpperCase() + ':';
          const rawLabel = (item.FileSystemLabel || '').trim();
          drives.push({
            name: letter,
            label: rawLabel ? `${rawLabel} (${letter})` : letter,
            path: letter + '\\'
          });
        }
      }
    } catch (_) {}

    if (drives.length === 0) {
      for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')) {
        const p = letter + ':\\';
        try {
          if (fs.existsSync(p)) {
            drives.push({ name: letter + ':', label: letter + ':', path: p });
          }
        } catch (_) {}
      }
    }

    // 写入缓存
    _drivesCache = drives;
    _drivesCacheTime = Date.now();

    return { success: true, drives };
  } else {
    return { success: true, drives: [{ name: '/', label: 'Root', path: '/' }] };
  }
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