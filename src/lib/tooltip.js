/**
 * @file lib/tooltip.js
 * @description 统一 Tooltip 管理：单一全局 Host（components/primitives/TooltipHost.jsx）
 * 事件委托监听 `data-astra-tip` / `data-astra-place`，气泡带箭头指向元素，外观完全可控。
 * @module lib/tooltip
 */

/**
 * 返回挂到元素上的 data-* 属性（配合 TooltipHost 使用）。
 * @param {string} content - 提示内容
 * @param {'top'|'right'|'bottom'|'left'} [place='top'] - 首选出现方位（空间不足会自动翻转）
 * @returns {Object}
 */
export function tip(content, place = 'top') {
  if (!content) return {};
  return { 'data-astra-tip': content, 'data-astra-place': place };
}