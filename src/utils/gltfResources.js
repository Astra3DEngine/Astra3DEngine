/**
 * @file utils/gltfResources.js
 * @description GLTF 外部资源路径解析：把模型中引用的相对路径映射为本地资源文件。
 * @module utils/gltfResources
 */

/**
 * 将 GLTF 中引用的资源路径（如 model.bin / textures/foo.jpg）解析为资源映射中的键。
 *
 * 匹配策略（依次尝试）：
 * 1. 完全一致
 * 2. 去掉 ./ 前缀
 * 3. 补上 ./ 前缀
 * 4. 仅比较文件名（忽略目录层级）
 *
 * @param {string} url - GLTF 中引用的 URL
 * @param {Map<string, string>} urlMap - 相对路径 -> blob URL
 * @returns {string} 匹配到的映射值（blob URL），找不到则返回原 url
 */
export function resolveGltfResourceUrl(url, urlMap) {
  if (urlMap.has(url)) return urlMap.get(url);

  const urlWithoutDotSlash = url.startsWith('./') ? url.substring(2) : url;
  if (urlMap.has(urlWithoutDotSlash)) return urlMap.get(urlWithoutDotSlash);

  const urlWithDotSlash = './' + url;
  if (urlMap.has(urlWithDotSlash)) return urlMap.get(urlWithDotSlash);

  const fileName = url.split('/').pop();
  for (const [key, blobUrl] of urlMap) {
    if (key.split('/').pop() === fileName) return blobUrl;
  }

  return url;
}

/**
 * 计算两个相对路径之间的相对路径。
 * @param {string} fromDir - 基准目录（可为 ''）
 * @param {string} toPath - 目标相对路径
 * @returns {string}
 */
export function relativePathToDir(fromDir, toPath) {
  if (!fromDir) return toPath;
  return toPath.substring(fromDir.length + 1);
}
