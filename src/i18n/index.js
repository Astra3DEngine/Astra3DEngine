/**
 * @file i18n/index.js
 * @description 国际化入口：基于 i18next。
 * 对外保持原有 msg/getLocale/setLocale/toggleLocale/subscribeLocale/languages API，
 * 内部由 i18next 负责语言资源、检测与切换。
 * @module i18n
 */

import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './en.json';
import zh from './zh.json';
import ja from './ja.json';
import ru from './ru.json';
import la from './la.json';

import pluginSettingsEn from './plugin-settings/en.json';
import pluginSettingsZh from './plugin-settings/zh.json';

const STORAGE_KEY = 'astra-locale';

export const languages = [
  { code: 'zh', name: '中文', nativeName: '中文' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'la', name: 'Latin', nativeName: 'Latina' },
];

const supportedLngs = languages.map((l) => l.code);
const normalizeLanguage = (lng) => {
  const base = (lng || '').split('-')[0].toLowerCase();
  return supportedLngs.includes(base) ? base : 'en';
};

/**
 * 合并基础翻译和插件设置翻译。
 * 注：插件设置翻译随插件系统重构一并保留为只读资源。
 * @param {Object} base
 * @param {Object} pluginSettings
 * @returns {Object}
 */
function mergeMessages(base, pluginSettings) {
  const merged = { ...base };
  Object.entries(pluginSettings).forEach(([key, value]) => {
    merged[`pluginSettings.${key}`] = value;
  });
  return merged;
}

i18next.use(LanguageDetector).init({
  resources: {
    zh: { translation: mergeMessages(zh, pluginSettingsZh) },
    en: { translation: mergeMessages(en, pluginSettingsEn) },
    ja: { translation: mergeMessages(ja, pluginSettingsEn) },
    ru: { translation: mergeMessages(ru, pluginSettingsEn) },
    la: { translation: mergeMessages(la, pluginSettingsEn) },
  },
  supportedLngs,
  fallbackLng: 'en',
  nonExplicitSupportedLngs: false,
  load: 'languageOnly',
  detection: {
    order: ['localStorage', 'navigator'],
    caches: ['localStorage'],
    lookupLocalStorage: STORAGE_KEY,
    convertDetectedLanguage: (lng) => normalizeLanguage(lng),
  },
  // 翻译键为扁平的带点键（如 "menu.openProject"），不按点号嵌套
  keySeparator: false,
  // 插值参数由 msg() 手动替换，兼容旧 {param} 占位格式
  interpolation: { enabled: false },
});

/**
 * 获取翻译文本，兼容旧的 {param} 占位替换。
 * @param {string} key - 扁平翻译键
 * @param {Object} [params={}] - 替换参数
 * @returns {string}
 */
export function msg(key, params = {}) {
  let text = i18next.t(key);
  Object.keys(params).forEach((param) => {
    text = text.replace(new RegExp(`\\{${param}\\}`), String(params[param]));
  });
  return text;
}

/**
 * 获取当前语言代码。
 * @returns {string}
 */
export function getLocale() {
  return normalizeLanguage(i18next.language);
}

/**
 * 设置当前语言。
 * @param {string} locale - 语言代码（zh/en/ja/ru/la）
 */
export function setLocale(locale) {
  const normalized = normalizeLanguage(locale);
  if (normalized === getLocale()) return;
  i18next.changeLanguage(normalized);
  localStorage.setItem(STORAGE_KEY, normalized);
}

/**
 * 循环切换到下一个语言。
 */
export function toggleLocale() {
  const current = supportedLngs.indexOf(getLocale());
  const next = supportedLngs[(current + 1) % supportedLngs.length];
  i18next.changeLanguage(next);
  localStorage.setItem(STORAGE_KEY, next);
}

/**
 * 订阅语言变化事件。
 * @param {Function} callback - (locale: string) => void
 * @returns {Function} 取消订阅
 */
export function subscribeLocale(callback) {
  const handler = () => callback(getLocale());
  i18next.on('languageChanged', handler);
  return () => i18next.off('languageChanged', handler);
}

export default { i18next, msg, getLocale, setLocale, toggleLocale, languages };
