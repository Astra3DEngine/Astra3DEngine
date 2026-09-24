/**
 * @file lib/ToastManager.js
 * @description Toast 服务单例：全局通知管理，与 React 解耦。
 * UI 侧通过 components/toast/ToastHost 订阅渲染。
 * @module lib/ToastManager
 */

/**
 * @typedef {'success'|'error'|'warning'|'info'} ToastType
 * @typedef {{ id: number, message: string, type: ToastType, duration: number }} ToastItem
 */

class ToastManager {
  constructor() {
    /** @type {ToastItem[]} */
    this.toasts = [];
    /** @type {Set<Function>} */
    this.listeners = new Set();
  }

  _emit() {
    this.listeners.forEach((listener) => listener(this.toasts));
  }

  /**
   * @param {string} message
   * @param {ToastType} type
   * @param {number} duration
   * @returns {number} toast id
   */
  show(message, type = 'info', duration = 3000) {
    const id = Date.now() + Math.random();
    this.toasts = [...this.toasts, { id, message, type, duration }];
    this._emit();
    return id;
  }

  success(message, duration = 3000) {
    return this.show(message, 'success', duration);
  }

  error(message, duration = 4000) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration = 3500) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration = 3000) {
    return this.show(message, 'info', duration);
  }

  close(id) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this._emit();
  }

  closeAll() {
    this.toasts = [];
    this._emit();
  }

  /** 订阅 toast 列表变化 */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/** 全局唯一 Toast 管理器 */
export const Toast = new ToastManager();
export default Toast;
