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
  // 开发模式：__dirname 是 dist-electron，需要指向源 electron 目录
  // 生产模式：打包后 __dirname 在 resources/app.asar 或 resources 目录
  let basePath;
  if (VITE_DEV_SERVER_URL) {
    // 开发模式：从 dist-electron 回到项目根目录，再进入 electron
    basePath = path.join(__dirname, '../electron');
  } else {
    // 生产模式：electron 目录内容会被复制到 resources 目录
    basePath = __dirname;
  }
  
  // Windows 优先使用 .ico 格式（任务栏图标支持更好）
  if (process.platform === 'win32') {
    const icoPath = path.join(basePath, 'icon.ico');
    if (fs.existsSync(icoPath)) {
      return icoPath;
    }
  }
  
  // 其他平台使用 PNG
  return path.join(basePath, 'icon.png');
}

function createWindow() {
  const iconPath = getIconPath();
  const icon = nativeImage.createFromPath(iconPath);
  
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

/**
 * 递归读取文件夹中的所有文件
 * 
 * 返回文件夹中所有文件的路径列表，支持递归遍历子文件夹。
 * 用于导入整个文件夹的资源。
 */
ipcMain.handle('file:readDirectory', async (event, dirPath, recursive = true) => {
  try {
    const files = [];
    
    const scanDir = async (currentPath) => {
      const entries = await fsp.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory() && recursive) {
          await scanDir(fullPath);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    };
    
    await scanDir(dirPath);
    return { success: true, files };
  } catch (error) {
    return { success: false, error: error.message, files: [] };
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
  } else if (process.platform === 'darwin') {
    // macOS: 读取 /Volumes/ 下的挂载点（外接磁盘、U盘等）
    const drives = [{ name: '/', label: 'Macintosh HD', path: '/' }];
    try {
      const entries = await fsp.readdir('/Volumes', { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'Macintosh HD') {
          drives.push({
            name: entry.name,
            label: entry.name,
            path: '/Volumes/' + entry.name  // 不带末尾斜杠，与前端 normalizePath 保持一致
          });
        }
      }
    } catch (_) {}

    _drivesCache = drives;
    _drivesCacheTime = Date.now();
    return { success: true, drives };
  } else {
    // Linux: 解析 /proc/mounts 获取挂载点
    const drives = [];
    try {
      const mounts = await fsp.readFile('/proc/mounts', 'utf-8');
      // 跳过 tmpfs、proc、sysfs 等虚拟文件系统，只保留真实设备
      const skipFs = new Set(['tmpfs', 'proc', 'sysfs', 'devtmpfs', 'cgroup', 'cgroup2', 'debugfs', 'securityfs', 'fusectl', 'configfs', 'pstore', 'hugetlbfs', 'mqueue', 'binfmt_misc']);
      for (const line of mounts.split('\n')) {
        if (!line.trim()) continue;
        const parts = line.split(/\s+/);
        const device = parts[0];
        const mountPoint = parts[1];
        const fsType = parts[2];
        if (!mountPoint || mountPoint === '/') continue;
        if (skipFs.has(fsType)) continue;
        // 排除用户目录下的一些自动挂载
        if (mountPoint.startsWith('/run/user/') || mountPoint.startsWith('/snap/')) continue;

        const label = mountPoint.split('/').filter(Boolean).pop() || mountPoint;
        drives.push({
          name: label,
          label: label,
          path: mountPoint  // 不带末尾斜杠，与前端 normalizePath 保持一致
        });
      }
    } catch (_) {}

    // 至少保证有根目录
    if (drives.length === 0 || !drives.some(d => d.path === '/')) {
      drives.unshift({ name: '/', label: 'Root (/)', path: '/' });
    }

    _drivesCache = drives;
    _drivesCacheTime = Date.now();
    return { success: true, drives };
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