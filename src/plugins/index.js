/**
 * @file plugins/index.js
 * @description 插件系统入口，导出插件管理器的初始化和操作方法
 * @module plugins
 */

import PluginManager from './PluginManager';

const pluginManager = new PluginManager();

/**
 * 初始化插件系统
 * @returns {Promise<PluginManager>} 插件管理器实例
 */
export const initPlugins = async () => {
  await pluginManager.loadPlugins();
  return pluginManager;
};

/**
 * 获取插件管理器实例
 * @returns {PluginManager} 插件管理器实例
 */
export const getPluginManager = () => pluginManager;

/**
 * 设置插件系统语言
 * @param {string} locale - 语言代码
 */
export const setPluginLocale = (locale) => {
  pluginManager.setLocale(locale);
};

/**
 * 订阅插件系统语言变化
 * @param {Function} callback - 回调函数
 * @returns {Function} 取消订阅的函数
 */
export const subscribePluginLocale = (callback) => {
  return pluginManager.subscribeLocale(callback);
};

/**
 * 获取插件翻译文本
 * @param {string} pluginId - 插件 ID
 * @param {string} key - 翻译键
 * @param {...*} args - 替换参数
 * @returns {string} 翻译后的文本
 */
export const pluginMsg = (pluginId, key, ...args) => {
  return pluginManager.msg(pluginId, key, ...args);
};

export default pluginManager;