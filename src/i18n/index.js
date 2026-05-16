import en from './en.json';
import zh from './zh.json';
import ja from './ja.json';
import ru from './ru.json';
import la from './la.json';

const messages = {
  en,
  zh,
  ja,
  ru,
  la
};

export const languages = [
  { code: 'zh', name: '中文', nativeName: '中文' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'la', name: 'Latin', nativeName: 'Latina' }
];

const STORAGE_KEY = 'astra-locale';

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

export function setLocale(locale) {
  if (messages[locale]) {
    currentLocale = locale;
    localStorage.setItem(STORAGE_KEY, locale);
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
  const langCodes = Object.keys(messages);
  const currentIndex = langCodes.indexOf(currentLocale);
  const nextIndex = (currentIndex + 1) % langCodes.length;
  currentLocale = langCodes[nextIndex];
  localStorage.setItem(STORAGE_KEY, currentLocale);
}
