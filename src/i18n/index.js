/**
 * @file i18n/index.js
 * @description 国际化（i18n）系统核心模块，提供多语言支持和语言切换功能
 * @module i18n
 * 兄弟兄弟~
 */

import en from './en.json';
import zh from './zh.json';
import ja from './ja.json';
import ru from './ru.json';
import la from './la.json';

import pluginSettingsEn from './plugin-settings/en.json';
import pluginSettingsZh from './plugin-settings/zh.json';

/**
 * 合并基础翻译和插件设置翻译
 * @param {Object} base - 基础翻译对象
 * @param {Object} pluginSettings - 插件设置翻译对象
 * @returns {Object} 合合后的翻译对象
 */
function mergeMessages(base, pluginSettings) {
  const merged = { ...base };
  Object.entries(pluginSettings).forEach(([key, value]) => {
    merged[`pluginSettings.${key}`] = value;
  });
  return merged;
}

const messages = {
  en: mergeMessages(en, pluginSettingsEn),
  zh: mergeMessages(zh, pluginSettingsZh),
  ja: mergeMessages(ja, pluginSettingsEn),
  ru: mergeMessages(ru, pluginSettingsEn),
  la: mergeMessages(la, pluginSettingsEn)
};

export const languages = [
  { code: 'zh', name: '中文', nativeName: '中文' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'la', name: 'Latin', nativeName: 'Latina' }
];

const STORAGE_KEY = 'astra-locale';

/**
 * 从 localStorage 加载保存的语言设置，若未保存则根据浏览器语言自动选择
 * @returns {string} 语言代码（如 'zh', 'en'）
 */
function loadLocaleFromStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && messages[saved]) {
    return saved;
  }
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('zh')) return 'zh';
  if (browserLang.startsWith('ja')) return 'ja';
  if (browserLang.startsWith('ru')) return 'ru';
  if (browserLang.startsWith('la')) return 'la';
  return 'en';
}

let currentLocale = loadLocaleFromStorage();
const localeListeners = new Set();

/**
 * 订阅语言变化事件
 * @param {Function} callback - 语言变化时的回调函数
 * @returns {Function} 取消订阅的函数
 */
export function subscribeLocale(callback) {
  localeListeners.add(callback);
  return () => localeListeners.delete(callback);
}

/**
 * 设置当前语言
 * @param {string} locale - 语言代码（如 'zh', 'en'）
 */
export function setLocale(locale) {
  if (messages[locale] && locale !== currentLocale) {
    currentLocale = locale;
    localStorage.setItem(STORAGE_KEY, locale);
    localeListeners.forEach(callback => callback(locale));
  }
}

/**
 * 获取当前语言代码
 * @returns {string} 当前语言代码
 */
export function getLocale() {
  return currentLocale;
}

/**
 * 获取翻译文本，支持参数替换
 * @param {string} key - 翻译键
 * @param {Object} params - 替换参数对象（如 { count: 5 }）
 * @returns {string} 翻译后的文本
 */
export function msg(key, params = {}) {
  const locale = currentLocale;
  let text = messages[locale]?.[key] || messages['en']?.[key] || key;

  Object.keys(params).forEach(param => {
    text = text.replace(new RegExp(`\\{${param}\\}`), params[param]);
  });

  return text;
}

/**
 * 循环切换到下一个语言
 */
export function toggleLocale() {
  const langCodes = Object.keys(messages);
  const currentIndex = langCodes.indexOf(currentLocale);
  const nextIndex = (currentIndex + 1) % langCodes.length;
  const newLocale = langCodes[nextIndex];
  currentLocale = newLocale;
  localStorage.setItem(STORAGE_KEY, newLocale);
  localeListeners.forEach(callback => callback(newLocale));
}