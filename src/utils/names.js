/**
 * @file utils/names.js
 * @description 名称生成工具：生成场景对象等实体的唯一名称。
 * @module utils/names
 */

/**
 * 生成唯一的对象名称。
 *
 * 若基础名称已被占用，自动追加数字后缀：
 * - "Cube" -> "Cube_1"
 * - "Cube_1" -> "Cube_2"
 *
 * @param {string} baseName - 基础名称
 * @param {Array<Object>} existingObjects - 已存在对象/实体列表
 * @param {number} [excludeId] - 重命名时排除自身
 * @returns {string} 唯一名称
 */
export function generateUniqueName(baseName, existingObjects, excludeId = null) {
  const existingNames = existingObjects
    .filter((obj) => obj.id !== excludeId)
    .map((obj) => obj.name);

  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  const match = baseName.match(/^(.+?)_(\d+)$/);
  if (match) {
    const prefix = match[1];
    const num = parseInt(match[2], 10);
    let newName = `${prefix}_${num + 1}`;
    while (existingNames.includes(newName)) {
      newName = `${prefix}_${parseInt(newName.split('_').pop(), 10) + 1}`;
    }
    return newName;
  }

  let counter = 1;
  let newName = `${baseName}_${counter}`;
  while (existingNames.includes(newName)) {
    counter++;
    newName = `${baseName}_${counter}`;
  }
  return newName;
}
