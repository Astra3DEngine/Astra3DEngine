/**
 * @file utils/id.js
 * @description 统一 ID / 路径工具：ID 生成与文件基名提取。
 * @module utils/id
 */

/**
 * 生成 GUID。
 *
 * 使用 Math.random() 实现（非真正的安全 GUID），编辑器场景足够用。
 * @returns {string} 形如 "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
 */
export function generateGUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 生成自增式唯一数值 ID。
 * @returns {number} 时间戳 + 随机增量
 */
export function generateId() {
  return Date.now() + Math.random();
}

/**
 * 生成带前缀的唯一 ID。
 * @param {string} prefix - ID 前缀
 * @returns {string} 形如 "snap_1700000000000_abc123456"
 */
export function generatePrefixedId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * 提取文件路径的基名（兼容 / 与 \ 分隔符）。
 * @param {string} filePath - 文件路径
 * @returns {string} 基名或空串
 */
export function getBasename(filePath) {
  if (!filePath) return '';
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] || '';
}
