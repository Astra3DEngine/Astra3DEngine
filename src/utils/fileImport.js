/**
 * @file utils/fileImport.js
 * @description 文件导入纯逻辑：MIME 推断、目录递归收集、批量导入编排（GLTF 资源打包）。
 * @module utils/fileImport
 */

/**
 * 按文件扩展名推断 MIME 类型。
 * @param {string} filename - 文件名
 * @returns {string} MIME 类型
 */
export function getMimeType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes = {
    gltf: 'model/gltf+json',
    glb: 'model/gltf-binary',
    obj: 'model/obj',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    bmp: 'image/bmp',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 递归收集 FileSystem 目录条目到 fileMap（相对路径 -> File）。
 * @param {FileSystemDirectoryEntry} entry
 * @param {Map<string, File>} fileMap
 * @param {string} [basePath='']
 */
export async function collectDirectoryInto(entry, fileMap, basePath = '') {
  const reader = entry.createReader();

  const readEntriesBatch = async () => {
    const entries = await new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });

    for (const subEntry of entries) {
      const relPath = basePath ? `${basePath}/${subEntry.name}` : subEntry.name;
      if (subEntry.isDirectory) {
        await collectDirectoryInto(subEntry, fileMap, relPath);
      } else {
        const file = await new Promise((resolve, reject) => {
          subEntry.file(resolve, reject);
        });
        if (file) fileMap.set(relPath, file);
      }
    }

    // readEntries 可能一次只返回部分条目，需要循环读取直到空
    if (entries.length > 0) {
      await readEntriesBatch();
    }
  };

  await readEntriesBatch();
}

/**
 * 批量导入文件集合。
 *
 * - 若存在 .gltf：为每个 gltf 收集同目录资源（.bin/贴图）成 resourceMap 一起导入，
 *   .glb 自包含直接导入。
 * - 否则逐个导入所有文件。
 *
 * @param {Map<string, File>} fileMap - 相对路径 -> File
 * @param {(fileOrObject: File|Object) => void} onImport
 */
export function importFileCollection(fileMap, onImport) {
  const gltfFiles = [];
  for (const [relativePath, file] of fileMap) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'gltf' || ext === 'glb') {
      gltfFiles.push({ relativePath, file, ext });
    }
  }

  if (gltfFiles.length === 0) {
    for (const file of fileMap.values()) {
      onImport(file);
    }
    return;
  }

  for (const { relativePath, file, ext } of gltfFiles) {
    if (ext === 'glb') {
      onImport(file);
      continue;
    }

    // 收集同目录或子目录下的资源文件
    const resourceMap = new Map();
    const gltfDir = relativePath.substring(0, relativePath.lastIndexOf('/')) || '';

    for (const [resourcePath, resourceFile] of fileMap) {
      if (resourcePath === relativePath) continue;
      const resourceDir = resourcePath.substring(0, resourcePath.lastIndexOf('/')) || '';
      if (resourceDir === gltfDir || resourceDir.startsWith(gltfDir + '/')) {
        const relativeToGltf =
          gltfDir === '' ? resourcePath : resourcePath.substring(gltfDir.length + 1);
        resourceMap.set(relativeToGltf, resourceFile);
      }
    }

    onImport({ file, resourceMap, relativePath });
  }
}
