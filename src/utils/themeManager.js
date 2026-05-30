/**
 * @file utils/themeManager.js
 * @description 主题管理器，负责注册、切换和管理应用主题
 * @module utils/themeManager
 */

const themes = new Map([
  ['dark', {
    id: 'dark',
    name: '暗色模式',
    nameEn: 'Dark Mode',
    builtIn: true,
    variables: {}
  }],
  ['light', {
    id: 'light',
    name: '明亮模式',
    nameEn: 'Light Mode',
    builtIn: true,
    variables: {}
  }]
]);

const listeners = new Set();

/**
 * 注册新主题
 * 
 * 主题插件可以通过它来创建主题，这个主题会被放到首选项里头。
 * 
 * @param {Object} theme - 主题配置对象
 * @param {string} theme.id - 主题唯一标识
 * @param {string} theme.name - 主题名称
 * @param {Object} theme.variables - CSS 变量映射
 * @returns {boolean} 注册成功返回 true
 */
export const registerTheme = (theme) => {
  if (!theme || !theme.id) {
    console.error('Invalid theme object');
    return false;
  }
  
  if (themes.has(theme.id) && themes.get(theme.id).builtIn) {
    console.warn(`Cannot override built-in theme: ${theme.id}`);
    return false;
  }
  
  themes.set(theme.id, {
    ...theme,
    builtIn: false
  });
  
  listeners.forEach(fn => fn(getAllThemes()));
  return true;
};

/**
 * 取消注册主题
 * @param {string} themeId - 主题 ID
 * @returns {boolean} 取消成功返回 true，内置主题无法取消
 */
export const unregisterTheme = (themeId) => {
  const theme = themes.get(themeId);
  if (!theme || theme.builtIn) {
    return false;
  }
  
  themes.delete(themeId);
  listeners.forEach(fn => fn(getAllThemes()));
  return true;
};

/**
 * 获取单个主题配置
 * @param {string} themeId - 主题 ID
 * @returns {Object|undefined} 主题配置对象
 */
export const getTheme = (themeId) => {
  return themes.get(themeId);
};

/**
 * 获取所有主题列表
 * @returns {Array<Object>} 所有主题配置数组
 */
export const getAllThemes = () => {
  return Array.from(themes.values());
};

/**
 * 订阅主题变化事件
 * @param {Function} callback - 主题变化时的回调函数
 * @returns {Function} 取消订阅的函数
 */
export const subscribe = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

/**
 * 应用主题到 DOM
 * @param {string} themeId - 主题 ID
 * @returns {boolean} 应用成功返回 true
 */
export const applyTheme = (themeId) => {
  const theme = themes.get(themeId);
  if (!theme) return false;
  
  document.documentElement.setAttribute('data-theme', themeId);
  
  if (theme.variables && Object.keys(theme.variables).length > 0) {
    const root = document.documentElement;
    Object.entries(theme.variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }
  
  return true;
};