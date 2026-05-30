/**
 * @file electron/preload.js
 * @description Electron 预加载脚本，安全地暴露主进程 API 到渲染进程
 * @module electron/preload
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * 暴露 electronAPI 到渲染进程的 window 对象
 * @description 通过 contextBridge 安全地暴露有限的 IPC 通信接口
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * 最小化窗口
   */
  minimize: () => ipcRenderer.send('window:minimize'),
  
  /**
   * 最大化/还原窗口
   */
  maximize: () => ipcRenderer.send('window:maximize'),
  
  /**
   * 关闭窗口
   */
  close: () => ipcRenderer.send('window:close'),
  
  /**
   * 强制关闭窗口（绕过关闭确认）
   */
  forceClose: () => ipcRenderer.send('window:force-close'),
  
  /**
   * 检查窗口是否已最大化
   * @returns {Promise<boolean>} 是否最大化
   */
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  
  /**
   * 监听窗口最大化事件
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消监听的函数
   */
  onMaximize: (callback) => {
    ipcRenderer.on('window:maximized', callback);
    return () => ipcRenderer.removeListener('window:maximized', callback);
  },
  
  /**
   * 监听窗口还原事件
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消监听的函数
   */
  onUnmaximize: (callback) => {
    ipcRenderer.on('window:unmaximized', callback);
    return () => ipcRenderer.removeListener('window:unmaximized', callback);
  },

  openGame: () => ipcRenderer.send('game:open'),
  
  /**
   * 显示保存文件对话框
   * @param {Object} options - 对话框选项
   * @returns {Promise<Object>} 用户选择的文件路径
   */
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSave', options),
  
  /**
   * 显示打开文件对话框
   * @param {Object} options - 对话框选项
   * @returns {Promise<Object>} 用户选择的文件路径列表
   */
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpen', options),
  
  /**
   * 显示消息对话框
   * @param {Object} options - 对话框选项
   * @returns {Promise<Object>} 用户的选择结果
   */
  showMessage: (options) => ipcRenderer.invoke('dialog:showMessage', options),
});