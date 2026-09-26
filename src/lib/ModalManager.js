/**
 * @file lib/ModalManager.js
 * @description 模态框服务单例：以 Promise 方式打开任意组件，与 React 解耦。
 * UI 侧通过 components/modal/ModalHost 订阅渲染。
 * @module lib/ModalManager
 */

import { generateId } from '../utils/id.js';

class ModalManager {
  constructor() {
    /** @type {Array<{id: number, Component: Function, props: Object, close: Function}>} */
    this.stack = [];
    /** @type {Set<Function>} */
    this.listeners = new Set();
  }

  _emit() {
    this.listeners.forEach((listener) => listener(this.stack));
  }

  /**
   * 打开一个模态框组件。
   * 若该组件已在栈中打开，则忽略重复打开（返回已 resolve 的 Promise）。
   * @param {Function} Component - 模态框组件
   * @param {Object} [props={}] - 传给组件的 props（不含 isOpen/onClose）
   * @returns {Promise<any>} 关闭时 resolve 结果
   */
  open(Component, props = {}) {
    if (this.stack.some((m) => m.Component === Component)) {
      return Promise.resolve(null);
    }
    const id = generateId();
    return new Promise((resolve) => {
      const close = (result) => {
        if (!this.stack.some((m) => m.id === id)) return;
        this.stack = this.stack.filter((m) => m.id !== id);
        this._emit();
        resolve(result);
      };
      this.stack = [...this.stack, { id, Component, props, close }];
      this._emit();
    });
  }

  /** 关闭所有模态框，所有 pending Promise resolve null */
  closeAll() {
    const pending = this.stack;
    this.stack = [];
    this._emit();
    pending.forEach((m) => m.close(null));
  }

  /** 订阅模态框栈变化 */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/** 全局唯一模态框管理器 */
export const modal = new ModalManager();
export default modal;
