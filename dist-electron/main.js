import { ipcMain, dialog, app, BrowserWindow, shell, nativeImage, Tray, Menu } from "electron";
import path from "path";
import { fileURLToPath } from "url";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
let mainWindow = null;
let tray = null;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "Astra 3D Engine",
    frame: false,
    icon: path.join(__dirname$1, "icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname$1, "preload.js")
    },
    show: false
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname$1, "../dist/index.html"));
  }
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  ipcMain.on("window:minimize", () => {
    mainWindow == null ? void 0 : mainWindow.minimize();
  });
  ipcMain.on("window:maximize", () => {
    if (mainWindow == null ? void 0 : mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow == null ? void 0 : mainWindow.maximize();
    }
  });
  ipcMain.on("window:close", () => {
    mainWindow == null ? void 0 : mainWindow.close();
  });
  ipcMain.handle("window:isMaximized", () => {
    return (mainWindow == null ? void 0 : mainWindow.isMaximized()) || false;
  });
  mainWindow.on("maximize", () => {
    mainWindow == null ? void 0 : mainWindow.webContents.send("window:maximized");
  });
  mainWindow.on("unmaximize", () => {
    mainWindow == null ? void 0 : mainWindow.webContents.send("window:unmaximized");
  });
  mainWindow.on("close", (event) => {
    event.preventDefault();
    mainWindow == null ? void 0 : mainWindow.webContents.send("window:before-close");
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  setupApplicationMenu();
}
function createTray() {
  const iconPath = path.join(__dirname$1, "icon.png");
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      trayIcon = nativeImage.createEmpty();
    }
  } catch {
    trayIcon = nativeImage.createEmpty();
  }
  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "显示主窗口",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: "新建项目",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send("menu:new-project");
        }
      }
    },
    { type: "separator" },
    {
      label: "打开开发者工具",
      click: () => {
        mainWindow == null ? void 0 : mainWindow.webContents.openDevTools();
      }
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        app.exit(0);
      }
    }
  ]);
  tray.setToolTip("Astra 3D Engine");
  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
function setupApplicationMenu() {
  Menu.setApplicationMenu(null);
}
function createGameWindow() {
  const gameWindow = new BrowserWindow({
    width: 640,
    height: 360,
    minWidth: 400,
    minHeight: 300,
    title: "Astra 3D Engine",
    frame: true,
    resizable: true,
    parent: BrowserWindow.getFocusedWindow(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  });
  if (VITE_DEV_SERVER_URL) {
    gameWindow.loadURL(VITE_DEV_SERVER_URL + "game.html");
  } else {
    gameWindow.loadFile(path.join(__dirname$1, "../dist/game.html"));
  }
  gameWindow.on("closed", () => {
  });
}
ipcMain.on("game:open", createGameWindow);
ipcMain.on("window:force-close", () => {
  mainWindow == null ? void 0 : mainWindow.destroy();
});
ipcMain.handle("dialog:showSave", async (event, options) => {
  return await dialog.showSaveDialog(mainWindow, options);
});
ipcMain.handle("dialog:showOpen", async (event, options) => {
  return await dialog.showOpenDialog(mainWindow, options);
});
ipcMain.handle("dialog:showMessage", async (event, options) => {
  return await dialog.showMessageBox(mainWindow, options);
});
app.whenReady().then(() => {
  createWindow();
  createTray();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (tray) {
    tray.destroy();
    tray = null;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("before-quit", () => {
  if (tray) {
    tray.destroy();
    tray = null;
  }
});
