/**
 * @file utils/projectSchema.js
 * @description 项目数据模型的统一转换层：编辑器对象 ↔ 引擎对象。
 * 供 ProjectFileService 与 projectExporter 共用，避免两套 schema 各自硬编码转换。
 * @module utils/projectSchema
 */

/**
 * 编辑器对象 → 引擎对象（.astra 场景格式）
 * @param {Object} obj - 编辑器对象
 * @returns {Object}
 */
export function editorObjectToEngineObject(obj) {
  return {
    id: obj.id,
    name: obj.name,
    type: obj.type,
    active: true,
    transform: {
      position: obj.position || [0, 0, 0],
      rotation: obj.rotation || [0, 0, 0],
      scale: obj.scale || [1, 1, 1],
    },
    parentId: obj.parentId || null,
    children: [],
    components: [
      {
        type: 'MeshRenderer',
        color: obj.color || '#ffffff',
      },
    ],
    prefabId: obj.prefabId || null,
    overrides: obj.overrides || null,
  };
}

/**
 * 引擎对象 → 编辑器对象
 * @param {Object} obj - 引擎对象
 * @returns {Object}
 */
export function engineObjectToEditorObject(obj) {
  return {
    id: obj.id,
    name: obj.name,
    type: obj.type,
    position: obj.transform?.position || [0, 0, 0],
    rotation: obj.transform?.rotation || [0, 0, 0],
    scale: obj.transform?.scale || [1, 1, 1],
    color: obj.components?.[0]?.color || '#ffffff',
    parentId: obj.parentId || null,
    prefabId: obj.prefabId || null,
    overrides: obj.overrides || null,
  };
}
