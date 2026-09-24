/**
 * @file utils/localstorage.js
 * @description localStorage 安全读写工具。
 * @module utils/localstorage
 */

/**
 * 读取 localStorage 并安全解析 JSON。
 * @param {string} key
 * @returns {any|null}
 */
export function readLocalStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * 写入 localStorage（序列化）。
 * @param {string} key
 * @param {any} value
 */
export function setItemToLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded 等错误静默忽略
  }
}

/**
 * 读取原始字符串。
 * @param {string} key
 * @param {string} [fallback='']
 * @returns {string}
 */
export function readRawLocalStorage(key, fallback = '') {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * 写入原始字符串。
 * @param {string} key
 * @param {string} value
 */
export function writeRawLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}
