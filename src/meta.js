/**
 * @file meta.js
 * @description Astra 3D Engine 元数据文件，包含版本号、项目格式版本等信息
 * @module meta
 */

/**
 * Astra 3D Engine 版本号
 * 
 * 这个版本号是引擎本身的版本号，不是项目文件的格式版本
 * 格式遵循语义化版本规范：主版本号.次版本号.修订号
 * 
 * - 主版本号：重大架构改动、不兼容的 API 修改
 * - 次版本号：向下兼容的功能性新增
 * - 修订号：向下兼容的问题修正
 */
export const ENGINE_VERSION = '0.1.0';

/**
 * 项目文件格式版本
 * 
 * 这个版本号用于识别项目文件的格式
 * 
 * - 0.1.0：单场景格式（scene.objects 数组）
 * - 1.0.0：多场景格式（scenes 数组）
 * 
 * 加载项目时会根据这个版本号选择正确的解析方式
 */
export const PROJECT_FORMAT_VERSION = '1.0.0';

/**
 * 引擎名称
 */
export const ENGINE_NAME = 'Astra 3D Engine';

/**
 * 引擎描述
 */
export const ENGINE_DESCRIPTION = 'A Joking 3D Engine';

/**
 * 开发者信息
 */
export const DEVELOPER = 'Cyberexplorer';

/**
 * 开源协议
 */
export const LICENSE = 'GPL v3';

/**
 * 引擎元数据对象
 * 
 * 包含所有引擎相关的元数据信息
 */
export const ENGINE_META = {
  name: ENGINE_NAME,
  version: ENGINE_VERSION,
  description: ENGINE_DESCRIPTION,
  developer: DEVELOPER,
  license: LICENSE,
  projectFormatVersion: PROJECT_FORMAT_VERSION
};

/**
 * 获取完整的引擎信息字符串
 * @returns {string} 格式化的引擎信息
 */
export function getEngineInfo() {
  return `${ENGINE_NAME} ${ENGINE_VERSION}\n${ENGINE_DESCRIPTION}`;
}

/**
 * 获取项目格式版本信息
 * @returns {string} 项目格式版本号
 */
export function getProjectFormatVersion() {
  return PROJECT_FORMAT_VERSION;
}

/**
 * 检查项目格式版本是否兼容
 * @param {string} version - 项目文件中的版本号
 * @returns {boolean} 是否兼容
 */
export function isProjectFormatCompatible(version) {
  // 支持的版本列表
  const supportedVersions = ['0.1.0', '1.0.0'];
  return supportedVersions.includes(version);
}

export default ENGINE_META;