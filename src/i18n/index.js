import en from './en.json';
import zh from './zh.json';

const messages = {
  en,
  zh
};

let currentLocale = 'en';

export function setLocale(locale) {
  if (messages[locale]) {
    currentLocale = locale;
  }
}

export function getLocale() {
  return currentLocale;
}

export function msg(key, params = {}) {
  const locale = currentLocale;
  let text = messages[locale]?.[key] || messages['en']?.[key] || key;

  Object.keys(params).forEach(param => {
    text = text.replace(new RegExp(`\\{${param}\\}`), params[param]);
  });

  return text;
}

export function toggleLocale() {
  currentLocale = currentLocale === 'en' ? 'zh' : 'en';
}

export const localeNames = {
  en: 'English',
  zh: '中文'
};