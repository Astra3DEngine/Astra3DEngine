/**
 * @file engine/ObjectFactory.js
 * @description 场景对象模板工厂：编辑器对象数据的统一默认值。
 * 此前对象默认值散落在 App.jsx handleAddObject 与 Viewport.jsx 渲染逻辑中，
 * 这里作为唯一权威来源，避免两处漂移。
 * @module engine/ObjectFactory
 */

const DEFAULTS = {
  faceTextures: () => ({
    right: null,
    left: null,
    top: null,
    bottom: null,
    front: null,
    back: null,
  }),
};

/**
 * 创建基础对象数据骨架。
 * @param {number} id - 对象 ID
 * @param {string} name - 名称
 * @param {string} type - 类型（cube/sphere/plane/folder/light…）
 * @param {Object} [extra={}] - 额外字段
 * @returns {Object}
 */
export function createObjectDefaults(id, name, type, extra = {}) {
  return {
    id,
    name,
    type,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    ...extra,
  };
}

/**
 * 创建文件夹对象。
 * @param {number} id
 * @param {string} name
 * @returns {Object}
 */
export function createFolderObject(id, name) {
  return createObjectDefaults(id, name, 'folder', {
    isFolder: true,
    children: [],
  });
}

/**
 * 创建点光源对象。
 * @param {number} id
 * @param {string} name
 * @returns {Object}
 */
export function createPointLightObject(id, name) {
  return createObjectDefaults(id, name, 'pointLight', {
    position: [0, 2, 0],
    color: '#ffffff',
    intensity: 2,
    distance: 10,
    decay: 1,
    isLight: true,
    lightType: 'point',
  });
}

/**
 * 创建平行光对象。
 * @param {number} id
 * @param {string} name
 * @returns {Object}
 */
export function createDirectionalLightObject(id, name) {
  return createObjectDefaults(id, name, 'directionalLight', {
    position: [1, 2, 1],
    color: '#ffffff',
    intensity: 1.5,
    isLight: true,
    lightType: 'directional',
  });
}

/**
 * 创建聚光灯对象。
 * @param {number} id
 * @param {string} name
 * @returns {Object}
 */
export function createSpotLightObject(id, name) {
  return createObjectDefaults(id, name, 'spotLight', {
    position: [0, 2, 0],
    rotation: [-Math.PI / 4, 0, 0],
    color: '#ffffff',
    intensity: 3,
    distance: 10,
    decay: 1,
    angle: Math.PI / 4,
    penumbra: 0.3,
    isLight: true,
    lightType: 'spot',
  });
}

/**
 * 创建模型对象。
 * @param {number} id
 * @param {string} name
 * @param {Object} asset - 资源
 * @returns {Object}
 */
export function createModelObject(id, name, asset) {
  return createObjectDefaults(id, name, 'model', {
    color: '#ffffff',
    assetId: asset.id,
    isModel: true,
    textureId: null,
    uvScale: [1, 1],
    uvOffset: [0, 0],
  });
}

/**
 * 创建基础图元对象（cube/sphere/plane）。
 * @param {number} id
 * @param {string} name
 * @param {string} type
 * @returns {Object}
 */
export function createPrimitiveObject(id, name, type) {
  const isUVType = type === 'sphere' || type === 'plane';
  return createObjectDefaults(id, name, type, {
    color: '#66ccff',
    faceTextures: type === 'cube' ? DEFAULTS.faceTextures() : undefined,
    textureId: isUVType ? null : undefined,
    uvScale: isUVType ? [1, 1] : undefined,
    uvOffset: isUVType ? [0, 0] : undefined,
  });
}

/**
 * 根据对象类型创建对象。
 * @param {number} id - 对象 ID
 * @param {string} name - 名称
 * @param {string} type - 类型
 * @param {Object} [asset] - 模型类型所需资源
 * @returns {Object}
 */
export function createObject(id, name, type, asset = null) {
  switch (type) {
    case 'folder':
      return createFolderObject(id, name);
    case 'pointLight':
      return createPointLightObject(id, name);
    case 'directionalLight':
      return createDirectionalLightObject(id, name);
    case 'spotLight':
      return createSpotLightObject(id, name);
    case 'model':
      return createModelObject(id, name, asset);
    default:
      return createPrimitiveObject(id, name, type);
  }
}

/**
 * 生成基础图元的名字（"Cube" -> "cube" 类型名首字母大写）。
 * @param {string} type - 对象类型
 * @returns {string}
 */
export function getTypeLabel(type) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
