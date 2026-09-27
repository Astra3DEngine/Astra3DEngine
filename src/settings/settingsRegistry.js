/**
 * @file settings/settingsRegistry.js
 * @description 统一设置注册表：内置 + 插件设置的定义、默认值、分类与 localStorage 持久化。
 * 取代项目中散落的 `localStorage.getItem('astra-...')` 惰性初始化。
 * @module settings/settingsRegistry
 */

import { create } from 'zustand';
import { readLocalStorage, setItemToLocalStorage } from '../utils/localstorage.js';

const STORAGE_KEY = 'astra-settings';

/** @typedef {'text'|'number'|'boolean'|'select'} TSettingType */
/** @typedef {{ key: string, defaultValue: unknown, category: string, label: string, description?: string, type: TSettingType, options?: Array<{value: string, label: string}> }} ISettingDefinition */

class SettingsRegistry {
  constructor() {
    /** @type {Map<string, ISettingDefinition>} */
    this.definitions = new Map();
    /** @type {ReturnType<typeof create>|null} */
    this._store = null;
  }

  /** 注册一个设置定义 */
  register(def) {
    this.definitions.set(def.key, def);
    if (this._store) {
      const current = this._store.getState()[def.key];
      if (current === undefined) {
        this._store.getState().setValue(def.key, def.defaultValue);
      }
    }
    return this;
  }

  /** 批量注册 */
  registerMany(defs) {
    for (const def of defs) this.register(def);
    return this;
  }

  /** 构建 store（幂等） */
  build() {
    if (this._store) return this._store;

    const defaults = {};
    for (const [key, def] of this.definitions) {
      defaults[key] = def.defaultValue;
    }
    const persisted = readLocalStorage(STORAGE_KEY) || {};
    const initialValues = { ...defaults, ...persisted };

    this._store = create((set) => ({
      ...initialValues,
      setValue: (key, value) => set({ [key]: value }),
    }));

    this._store.subscribe((state) => {
      const values = {};
      for (const key of this.definitions.keys()) {
        values[key] = state[key];
      }
      setItemToLocalStorage(STORAGE_KEY, values);
    });

    return this._store;
  }

  get store() {
    if (!this._store) throw new Error('Settings not built yet. Call Settings.build() first.');
    return this._store;
  }

  get(key) {
    return this.store.getState()[key];
  }

  set(key, value) {
    this.store.getState().setValue(key, value);
  }

  reset(key) {
    const def = this.definitions.get(key);
    if (def) this.set(key, def.defaultValue);
  }

  resetAll() {
    for (const [key, def] of this.definitions) {
      this.set(key, def.defaultValue);
    }
  }

  getDefinitions() {
    return Array.from(this.definitions.values());
  }

  getDefinitionsByCategory() {
    const groups = {};
    for (const def of this.definitions.values()) {
      (groups[def.category] ??= []).push(def);
    }
    return groups;
  }
}

/** 全局唯一设置注册表 */
export const Settings = new SettingsRegistry();

/**
 * 注册内置设置（应用启动时调用）
 */
export function initBuiltInSettings() {
  Settings.registerMany([
    {
      key: 'theme',
      defaultValue: 'dark',
      category: 'appearance',
      label: 'settings.theme',
      type: 'select',
      options: [
        { value: 'dark', label: 'DamnDarkMode' },
        { value: 'light', label: 'LightMode' },
      ],
    },
    {
      key: 'autosaveEnabled',
      defaultValue: true,
      category: 'autosave',
      label: 'settings.autosave',
      type: 'boolean',
    },
    {
      key: 'maxSnapshots',
      defaultValue: 10,
      category: 'autosave',
      label: 'settings.maxSnapshots',
      type: 'number',
      options: undefined,
    },
  ]);
  Settings.build();

  // 兼容迁移：旧版本使用单独的 localStorage 键，仅在全新设置存储时迁移一次
  if (!localStorage.getItem(STORAGE_KEY)) {
    const legacyTheme = localStorage.getItem('astra-theme');
    if (legacyTheme && (legacyTheme === 'dark' || legacyTheme === 'light')) {
      Settings.set('theme', legacyTheme);
    }
    const legacyAuto = localStorage.getItem('astra-autosave-enabled');
    if (legacyAuto !== null) {
      Settings.set('autosaveEnabled', legacyAuto !== 'false');
    }
    const legacySnap = localStorage.getItem('astra-max-snapshots');
    if (legacySnap !== null) {
      Settings.set('maxSnapshots', parseInt(legacySnap, 10) || 10);
    }
  }
}

export default Settings;
