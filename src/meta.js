/**
 * @file meta.js
 * @description Astra 3D Engine 元数据：版本号、项目格式版本、引擎信息。
 * 引擎版本以 package.json 为单一来源（version 字段），避免多处硬编码漂移。
 * @module meta
 */

import pkg from '../package.json';

/**
 * Astra 3D Engine 版本号（单一来源：package.json version）
 */
export const ENGINE_VERSION = pkg.version;

/**
 * 项目文件格式版本
 *
 * - 0.1.0：单场景格式（scene.objects 数组）
 * - 1.0.0：多场景格式（scenes 数组）
 */
export const PROJECT_FORMAT_VERSION = '1.0.0';

/**
 * 引擎名称
 */
export const ENGINE_NAME = 'Astra3DEngine';

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
 */
export const ENGINE_META = {
  name: ENGINE_NAME,
  version: ENGINE_VERSION,
  description: ENGINE_DESCRIPTION,
  developer: DEVELOPER,
  license: LICENSE,
  projectFormatVersion: PROJECT_FORMAT_VERSION,
};

/**
 * 获取完整的引擎信息字符串
 * @returns {string}
 */
export function getEngineInfo() {
  return `${ENGINE_NAME} ${ENGINE_VERSION}\n${ENGINE_DESCRIPTION}`;
}

/**
 * 获取项目格式版本信息
 * @returns {string}
 */
export function getProjectFormatVersion() {
  return PROJECT_FORMAT_VERSION;
}

/**
 * 检查项目格式版本是否兼容
 * @param {string} version - 项目文件中的版本号
 * @returns {boolean}
 */
export function isProjectFormatCompatible(version) {
  const supportedVersions = ['0.1.0', '1.0.0'];
  return supportedVersions.includes(version);
}

export default ENGINE_META;
