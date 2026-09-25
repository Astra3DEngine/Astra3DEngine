/**
 * @file lib/ShortcutManager.js
 * @description 全局快捷键管理单例（命令式 + 可配置热键，参照 AstraEditor-Next）：
 * - define(): 注册命令（id / 显示标签 / 分类 / 默认组合键 / 触发回调）
 * - getCommands() / getBinding(id) / setBinding(id) / resetBinding(id) / resetAll()
 * - matchesCombo(): 组合键匹配（ctrl/meta 互换），供测试
 * - 绑定持久化到 localStorage('astra-keybindings')，可在首选项界面配置
 * @module lib/ShortcutManager
 */

const STORAGE_KEY = 'astra-keybindings';

function readSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * 组合键匹配。combo 示例：'ctrl+s'、'f5'、'q'、'ctrl+shift+z'。
 * - 显式要求的修饰键必须按下；未要求的修饰键不能处于按下状态。
 * - ctrl 与 meta 视为等价（跨平台）。
 * @param {KeyboardEvent} e
 * @param {string} combo
 * @returns {boolean}
 */
export function matchesCombo(e, combo) {
  const parts = combo.split('+').map((s) => s.trim().toLowerCase());
  const key = parts[parts.length - 1];
  const mods = parts.slice(0, -1);

  if ((e.key || '').toLowerCase() !== key) return false;

  const hasCtrl = e.ctrlKey || e.metaKey;
  const hasShift = e.shiftKey;
  const hasAlt = e.altKey;

  const wantCtrl = mods.includes('ctrl');
  const wantShift = mods.includes('shift');
  const wantAlt = mods.includes('alt');

  if (wantCtrl && !hasCtrl) return false;
  if (wantShift && !hasShift) return false;
  if (wantAlt && !hasAlt) return false;
  if (!wantCtrl && hasCtrl) return false;
  if (!wantShift && hasShift) return false;
  if (!wantAlt && hasAlt) return false;

  return true;
}

/**
 * 将键盘事件格式化为组合键字符串（供录制使用）。
 * 纯修饰键返回 null；特殊键转为小写标识（f5 / delete / backspace / escape …）。
 * @param {KeyboardEvent} e
 * @returns {string|null}
 */
export function formatShortcut(e) {
  const special = {
    Delete: 'delete',
    Backspace: 'backspace',
    Escape: 'escape',
    Enter: 'enter',
    Tab: 'tab',
    ' ': 'space',
  };
  const rawKey = e.key || '';
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(rawKey)) return null;
  const key = special[rawKey] !== undefined ? special[rawKey] : rawKey.toLowerCase();

  const mods = [];
  if (e.ctrlKey || e.metaKey) mods.push('ctrl');
  if (e.altKey) mods.push('alt');
  if (e.shiftKey) mods.push('shift');
  return [...mods, key].join('+');
}

/**
 * 将绑定字符串格式化为人类可读显示（如 'ctrl+shift+s' -> 'Ctrl+Shift+S'，
 * 'ctrl+y|ctrl+shift+z' -> 'Ctrl+Y / Ctrl+Shift+Z'）。
 * @param {string|string[]} keys
 * @returns {string}
 */
export function formatShortcutDisplay(keys) {
  const combos = normalizeKeys(keys);
  return combos
    .map((combo) => {
      const parts = combo.split('+');
      const key = parts.pop();
      const mods = parts.map(
        (m) => ({ ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift', meta: 'Meta' })[m] || m
      );
      const keyLabel =
        key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1);
      return [...mods, keyLabel].join('+');
    })
    .join(' / ');
}

/**
 * 解析绑定 keys：支持 '|' 分隔多个组合键。
 * @param {string|string[]} keys
 * @returns {string[]}
 */
function normalizeKeys(keys) {
  if (Array.isArray(keys)) return keys;
  return String(keys)
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
}

class ShortcutManager {
  constructor() {
    /** @type {Map<string, {id:string,label:string,category:string,keys:string,handler:Function}>} */
    this.commands = new Map();
    this.saved = readSaved();
    this._listener = null;
    this._bound = false;
    /** @type {Set<Function>} */
    this._subscribers = new Set();
  }

  _notify() {
    this._subscribers.forEach((fn) => fn());
  }

  /**
   * 注册一个命令（幂等；重复 define 覆盖 handler）。
   * @param {{id:string,label?:string,category?:string,keys:string,handler:Function}} cmd
   */
  define(cmd) {
    this.commands.set(cmd.id, {
      id: cmd.id,
      label: cmd.label || cmd.id,
      category: cmd.category || '',
      keys: cmd.keys,
      handler: cmd.handler,
    });
    this._ensureBound();
  }

  /** 注销命令（组件卸载时调用，避免残留误触发） */
  remove(id) {
    this.commands.delete(id);
  }

  getCommands() {
    return [...this.commands.values()];
  }

  /** 获取命令当前生效的组合键字符串 */
  getBinding(id) {
    const cmd = this.commands.get(id);
    if (!cmd) return null;
    const saved = this.saved[id];
    if (saved) return Array.isArray(saved) ? saved.join('|') : saved;
    return cmd.keys;
  }

  /** 设置绑定（可传数组或 '|' 字符串），持久化并通知 */
  setBinding(id, keys) {
    this.saved[id] = Array.isArray(keys) ? keys : normalizeKeys(keys);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.saved));
    this._notify();
  }

  resetBinding(id) {
    delete this.saved[id];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.saved));
    this._notify();
  }

  resetAll() {
    this.saved = {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.saved));
    this._notify();
  }

  subscribe(fn) {
    this._subscribers.add(fn);
    return () => this._subscribers.delete(fn);
  }

  _ensureBound() {
    if (this._bound) return;
    this._listener = (e) => {
      if (e.repeat) return; // 忽略按住按键的 auto-repeat，避免重复触发
      // 输入控件里不触发
      if (
        e.target &&
        (e.target.tagName === 'INPUT' ||
          e.target.tagName === 'TEXTAREA' ||
          e.target.tagName === 'SELECT' ||
          e.target.isContentEditable)
      ) {
        return;
      }
      for (const cmd of this.commands.values()) {
        const bindings = this.saved[cmd.id]
          ? normalizeKeys(this.saved[cmd.id])
          : normalizeKeys(cmd.keys);
        if (bindings.some((combo) => matchesCombo(e, combo))) {
          e.preventDefault();
          cmd.handler(e);
          return;
        }
      }
    };
    document.addEventListener('keydown', this._listener);
    this._bound = true;
  }
}

/** 全局唯一快捷键管理器 */
export const shortcuts = new ShortcutManager();
export default shortcuts;