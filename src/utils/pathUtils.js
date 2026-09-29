/**
 * @file utils/pathUtils.js
 * @description 路径规范化与文件信息格式化纯函数。
 * @module utils/pathUtils
 */

/**
 * 规范化路径：统一分隔符、去除重复斜杠、确保末尾无斜杠（跨平台支持）。
 * @param {string} rawPath - 原始路径
 * @returns {string} 规范化后的路径
 */
export function normalizePath(rawPath) {
  if (!rawPath) return rawPath;

  // 检测是否为 Windows 路径（盘符开头或网络路径）
  const isWindowsPath = /^[A-Za-z]:/.test(rawPath) || rawPath.startsWith('\\\\');

  if (isWindowsPath) {
    // Windows 路径：统一使用反斜杠
    let p = rawPath.replace(/\//g, '\\');
    const driveMatch = p.match(/^([A-Za-z]:)(.*)/);
    if (driveMatch) {
      const drive = driveMatch[1]; // e.g. "D:"
      const rest = driveMatch[2].replace(/\\+/g, '\\'); // 统一反斜杠
      // 去除开头的多余斜杠，然后分割各段过滤空串
      const segments = rest.replace(/^\\+/, '').split('\\').filter(Boolean);
      return drive + '\\' + segments.join('\\');
    }
    // 网络路径 \\server\share
    return p.replace(/\\+/g, '\\').replace(/\\$/, '');
  } else {
    // Unix 路径（Linux/macOS）：统一使用正斜杠
    let p = rawPath.replace(/\\/g, '/');
    // 确保以 / 开头（绝对路径）
    if (!p.startsWith('/')) {
      p = '/' + p;
    }
    // 去除重复斜杠，保留开头的 /
    p = '/' + p.slice(1).replace(/\/+/g, '/');
    // 去除末尾斜杠（但保留根路径 /）
    if (p.length > 1) {
      p = p.replace(/\/$/, '');
    }
    return p;
  }
}

/**
 * 格式化文件大小为可读字符串。
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后大小
 */
export function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

/**
 * 格式化时间戳为本地日期字符串。
 * @param {number} timestamp - 时间戳（毫秒）
 * @returns {string} 本地日期字符串
 */
export function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString();
}

/**
 * 根据路径分割出面包屑分段。
 * @param {string} currentPath - 当前路径
 * @param {boolean} isWindows - 是否 Windows 平台
 * @param {Function} normalize - 路径规范化函数
 * @returns {string[]} 路径分段数组
 */
export function splitPathParts(currentPath, isWindows, normalize = normalizePath) {
  if (!currentPath) return [];
  const normalized = normalize(currentPath);
  const sep = isWindows ? '\\' : '/';
  return normalized.split(sep).filter(Boolean);
}
