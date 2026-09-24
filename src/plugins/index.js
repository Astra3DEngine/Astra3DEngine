/**
 * @file plugins/index.js
 * @description 插件系统临时入口。
 *
 * ⚠️ TODO: 插件系统重构（原实现已删除）
 * -----------------------------------------------------------------
 * 原 PluginManager / api.js / plugins/* 存在严重问题，已临时移除：
 *   1. import.meta.glob 加载与打包（Vite/Electron 构建下路径解析不可靠）
 *   2. 钩子系统未接入 store，插件无法真正读取/修改场景状态
 *   3. 插件设置与 SettingsRegistry 未打通，持久化互相冲突
 *   4. 生命周期（activate/deactivate）在 HMR/刷新下重复执行、状态泄漏
 *
 * 重构计划（下次实现时对照）：
 *   - 插件声明改为显式注册表（plugins/registry.js），放弃 import.meta.glob
 *   - 插件 API 改为面向 zustand store 的只读快照 + action 注入
 *   - 插件设置并入 settings/settingsRegistry.js（category: 'plugin:<id>'）
 *   - 钩子改为 store subscribe 中间件，而非独立事件总线
 *   - 移除对 React 组件的直接注入，改由 Provider/Host 组合
 * -----------------------------------------------------------------
 * 当前为占位实现：所有导出均为 no-op，保证既有 import 不报错。
 * @module plugins
 */

/** @returns {Promise<null>} 占位：插件系统待重构 */
export const initPlugins = async () => null;

/** @returns {null} 占位 */
export const getPluginManager = () => null;

/** 占位：语言同步待插件系统恢复 */
export const setPluginLocale = () => {};

/** @returns {() => void} 占位：返回空取消订阅函数 */
export const subscribePluginLocale = () => () => {};

/** 占位 */
export const pluginMsg = () => '';

export default null;
