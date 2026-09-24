/**
 * @file lib/ShortcutManager.js
 * @description 全局快捷键管理单例：注册/注销 keydown 处理器，统一生命周期。
 * @module lib/ShortcutManager
 */

class ShortcutManager {
  constructor() {
    /** @type {Map<string, Function>} */
    this.handlers = new Map();
    this._listener = null;
    this._bound = false;
  }

  _ensureBound() {
    if (this._bound) return;
    this._listener = (e) => {
      for (const handler of this.handlers.values()) {
        handler(e);
      }
    };
    document.addEventListener('keydown', this._listener);
    this._bound = true;
  }

  _unbindIfEmpty() {
    if (this.handlers.size === 0 && this._bound) {
      document.removeEventListener('keydown', this._listener);
      this._bound = false;
      this._listener = null;
    }
  }

  /**
   * 注册快捷键处理器。
   * @param {string} id - 唯一标识
   * @param {(e: KeyboardEvent) => void} handler
   */
  register(id, handler) {
    this.handlers.set(id, handler);
    this._ensureBound();
  }

  /** 注销处理器 */
  unregister(id) {
    this.handlers.delete(id);
    this._unbindIfEmpty();
  }
}

/** 全局唯一快捷键管理器 */
export const shortcuts = new ShortcutManager();
export default shortcuts;
