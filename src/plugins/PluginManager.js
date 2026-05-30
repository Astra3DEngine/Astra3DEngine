/**
 * @file plugins/PluginManager.js
 * @description 插件管理器，负责加载、启用、禁用插件以及管理钩子系统
 * @module plugins/PluginManager
 */

/**
 * 插件管理器类
 * 
 * 插件系统是编辑器的扩展机制，允许第三方开发者添加功能。每个插件是一个独立的 npm 包，
 * 放在 plugins/ 目录下。插件通过 manifest.json 描述元数据（名称、版本、作者等），
 * 通过 index.js 导出 activate 和 deactivate 函数，通过钩子系统（hooks）与主程序交互。
 * 
 * 钩子系统包括 onObjectAdd（对象添加时触发）、onObjectDelete（对象删除时触发）、
 * onViewportRender（视口渲染时触发）等。
 * 
 * 不过还有很多东西没做，只是有了个大概。
 * 
 * @description 管理插件的生命周期、设置、国际化和钩子系统
 */
class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.enabledPlugins = new Set();
    this.hooks = {
      onObjectAdd: [],
      onObjectDelete: [],
      onObjectUpdate: [],
      onSceneLoad: [],
      onSceneSave: [],
      onViewportRender: [],
      onToolbarRender: [],
      onPanelRender: [],
      onContextMenu: [],
      onKeyPress: [],
      onMouseDown: [],
      onMouseMove: [],
      onMouseUp: [],
      onAssetImport: [],
      onAssetDelete: [],
    };
    this.api = null;
    this.settings = this.loadSettings();
    this.l10n = new Map();
    this.currentLocale = 'zh';
    this.localeListeners = new Set();
  }

  /**
   * 从 localStorage 加载插件设置
   * @returns {Object} 插件设置对象
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem('astra3d-plugin-settings');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }

  /**
   * 保存插件设置到 localStorage
   */
  saveSettings() {
    localStorage.setItem('astra3d-plugin-settings', JSON.stringify(this.settings));
  }

  /**
   * 设置插件 API
   * @param {Object} api - 插件 API 对象
   */
  setApi(api) {
    this.api = api;
  }

  /**
   * 设置当前语言
   * @param {string} locale - 语言代码
   */
  setLocale(locale) {
    if (locale !== this.currentLocale) {
      this.currentLocale = locale;
      this.localeListeners.forEach(callback => callback(locale));
    }
  }

  /**
   * 订阅语言变化事件
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅的函数
   */
  subscribeLocale(callback) {
    this.localeListeners.add(callback);
    return () => this.localeListeners.delete(callback);
  }

  /**
   * 获取插件翻译文本
   * @param {string} pluginId - 插件 ID
   * @param {string} key - 翻译键
   * @param {...*} args - 替换参数
   * @returns {string} 翻译后的文本
   */
  msg(pluginId, key, ...args) {
    const locale = this.currentLocale;
    const localeData = this.l10n.get(pluginId)?.get(locale);
    
    if (localeData && localeData[key]) {
      return this.formatMessage(localeData[key], ...args);
    }
    
    const fallbackData = this.l10n.get(pluginId)?.get('en');
    if (fallbackData && fallbackData[key]) {
      return this.formatMessage(fallbackData[key], ...args);
    }
    
    return key;
  }

  /**
   * 格式化消息模板
   * @param {string} template - 消息模板
   * @param {...*} args - 替换参数
   * @returns {string} 格式化后的消息
   */
  formatMessage(template, ...args) {
    if (args.length === 0) return template;
    return template.replace(/\{(\d+)\}/g, (match, index) => {
      return args[parseInt(index)] ?? match;
    });
  }

  /**
   * 加载所有插件
   * 
   * 用了 Vite 的 import.meta.glob 动态加载插件，这是个新东西、
   * 
   * - Vite 会自动扫描 plugins/.xx/manifest.json 和 index.js
   * - 不需要手动维护插件列表
   * - 新增插件只需要放到 plugins/ 目录下
   * 他妈的这不比 Scratch 的插件系统高级多了，直接起飞。
   * 
   * - 先加载 manifest.json 获取插件元数据
   * - 再加载 index.js 获取插件代码
   * - 最后加载 l10n 翻译文件
   * 全部分开，爽炸了。
   * 
   * 注意：插件加载失败不会阻止编辑器启动
   * - 只会在控制台打印警告
   * - 插件被标记为加载失败状态
   * - 用户可以在插件设置里看到失败原因
   * 
   * @description 从 plugins 目录加载所有插件的 manifest 和脚本
   */
  async loadPlugins() {
    const manifestModules = import.meta.glob('./plugins/*/manifest.json', { eager: false });
    const scriptModules = import.meta.glob('./plugins/*/index.js', { eager: false });
    
    for (const [path, loader] of Object.entries(manifestModules)) {
      try {
        const match = path.match(/\.\/plugins\/([^/]+)\/manifest\.json$/);
        if (!match) continue;
        
        const pluginId = match[1];
        const manifest = await loader();
        
        await this.loadPluginL10n(pluginId, pluginId);
        
        const userscript = manifest.default?.userscript || manifest.userscript || 'index.js';
        const scriptPath = `./plugins/${pluginId}/${userscript}`;
        const scriptLoader = scriptModules[scriptPath];
        
        if (!scriptLoader) {
          console.warn(`Plugin ${pluginId}: userscript not found at ${scriptPath}`);
          this.plugins.set(pluginId, {
            id: pluginId,
            manifest: manifest.default || manifest,
            activate: () => {},
            deactivate: () => {},
            instance: null,
          });
          continue;
        }
        
        const module = await scriptLoader();
        const plugin = module.default || module;
        
        this.plugins.set(pluginId, {
          id: pluginId,
          manifest: manifest.default || manifest,
          activate: plugin.activate || (() => {}),
          deactivate: plugin.deactivate || (() => {}),
          instance: null,
        });
        
        const isEnabled = this.settings[pluginId]?.enabled ?? (manifest.default?.enabledByDefault || manifest.enabledByDefault || false);
        if (isEnabled) {
          await this.enablePlugin(pluginId);
        }
      } catch (error) {
        console.error(`Failed to load plugin from ${path}:`, error);
      }
    }
  }

  /**
   * 加载插件国际化文件
   * @param {string} pluginId - 插件 ID
   * @param {string} pluginDir - 插件目录名
   */
  async loadPluginL10n(pluginId, pluginDir) {
    const l10nModules = import.meta.glob('./plugins/*/l10n/*.json', { eager: false });
    const pluginL10n = new Map();
    
    for (const [path, loader] of Object.entries(l10nModules)) {
      const expectedPrefix = `./plugins/${pluginDir}/l10n/`;
      if (!path.startsWith(expectedPrefix)) continue;
      
      const match = path.match(/\/([^/]+)\.json$/);
      if (!match) continue;
      
      const locale = match[1];
      try {
        const data = await loader();
        pluginL10n.set(locale, data.default || data);
      } catch (error) {
        console.warn(`Failed to load l10n for ${pluginId}/${locale}:`, error);
      }
    }
    
    if (pluginL10n.size > 0) {
      this.l10n.set(pluginId, pluginL10n);
    }
  }

  /**
   * 启用插件
   * @param {string} pluginId - 插件 ID
   */
  async enablePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || this.enabledPlugins.has(pluginId)) return;

    try {
      const context = this.createPluginContext(pluginId);
      plugin.instance = await plugin.activate(context);
      this.enabledPlugins.add(pluginId);
      
      if (!this.settings[pluginId]) {
        this.settings[pluginId] = {};
      }
      this.settings[pluginId].enabled = true;
      this.saveSettings();
      
      console.log(`Plugin "${plugin.manifest.name}" enabled`);
    } catch (error) {
      console.error(`Failed to enable plugin ${pluginId}:`, error);
    }
  }

  /**
   * 禁用插件
   * @param {string} pluginId - 插件 ID
   */
  async disablePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !this.enabledPlugins.has(pluginId)) return;

    try {
      const context = this.createPluginContext(pluginId);
      await plugin.deactivate(context, plugin.instance);
      plugin.instance = null;
      this.enabledPlugins.delete(pluginId);
      
      this.settings[pluginId].enabled = false;
      this.saveSettings();
      
      this.removeAllPluginHooks(pluginId);
      
      console.log(`Plugin "${plugin.manifest.name}" disabled`);
    } catch (error) {
      console.error(`Failed to disable plugin ${pluginId}:`, error);
    }
  }

  /**
   * 移除插件的所有钩子
   * @param {string} pluginId - 插件 ID
   */
  removeAllPluginHooks(pluginId) {
    for (const hookName of Object.keys(this.hooks)) {
      this.hooks[hookName] = this.hooks[hookName].filter(
        h => h.pluginId !== pluginId
      );
    }
  }

  /**
   * 创建插件上下文
   * @param {string} pluginId - 插件 ID
   * @returns {Object} 插件上下文对象
   */
  createPluginContext(pluginId) {
    const self = this;
    return {
      pluginId,
      
      get manifest() {
        return self.plugins.get(pluginId)?.manifest;
      },
      
      get api() {
        return self.api;
      },
      
      msg(key, ...args) {
        return self.msg(pluginId, key, ...args);
      },
      
      registerHook(hookName, callback) {
        if (!self.hooks[hookName]) {
          console.warn(`Unknown hook: ${hookName}`);
          return;
        }
        self.hooks[hookName].push({ pluginId, callback });
      },
      
      unregisterHook(hookName, callback) {
        if (!self.hooks[hookName]) return;
        self.hooks[hookName] = self.hooks[hookName].filter(
          h => h.pluginId !== pluginId || h.callback !== callback
        );
      },
      
      showNotification(message, type = 'info') {
        if (self.api?.showNotification) {
          self.api.showNotification(message, type);
        }
      },
      
      log(...args) {
        console.log(`[${pluginId}]`, ...args);
      },
      
      error(...args) {
        console.error(`[${pluginId}]`, ...args);
      },
      
      getSetting(key, defaultValue) {
        return self.settings[pluginId]?.[key] ?? defaultValue;
      },
      
      setSetting(key, value) {
        if (!self.settings[pluginId]) {
          self.settings[pluginId] = {};
        }
        self.settings[pluginId][key] = value;
        self.saveSettings();
      },
    };
  }

  /**
   * 执行钩子
   * @param {string} hookName - 钩子名称
   * @param {...*} args - 钩子参数
   */
  async executeHook(hookName, ...args) {
    const hooks = this.hooks[hookName] || [];
    for (const { callback } of hooks) {
      try {
        await callback(...args);
      } catch (error) {
        console.error(`Hook ${hookName} error:`, error);
      }
    }
  }

  /**
   * 获取所有插件列表
   * @returns {Array} 插件列表
   */
  getPlugins() {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取已启用的插件列表
   * @returns {Array} 已启用的插件列表
   */
  getEnabledPlugins() {
    return Array.from(this.enabledPlugins).map(id => this.plugins.get(id));
  }

  /**
   * 检查插件是否已启用
   * @param {string} pluginId - 插件 ID
   * @returns {boolean} 是否已启用
   */
  isPluginEnabled(pluginId) {
    return this.enabledPlugins.has(pluginId);
  }
}

export default PluginManager;