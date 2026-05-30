/**
 * @file utils/recentProjectsDB.js
 * @description 最近项目数据库，使用 IndexedDB 存储文件句柄和项目信息
 * @module utils/recentProjectsDB
 */

const DB_NAME = 'astra-recent-projects';
const STORE_NAME = 'handles';
const MAX_RECENT_PROJECTS = 10;

/**
 * 打开 IndexedDB 数据库
 * @returns {Promise<IDBDatabase>} 数据库实例
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * 获取所有文件句柄
 * @returns {Promise<Array>} 文件句柄列表
 */
async function getAllHandles() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * 保存文件句柄
 * @param {Object} handle - 文件句柄对象
 * @returns {Promise<void>}
 */
async function saveHandle(handle) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(handle);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * 删除文件句柄
 * @param {string} id - 项目 ID
 * @returns {Promise<void>}
 */
async function deleteHandle(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * 清除所有文件句柄
 * @returns {Promise<void>}
 */
async function clearAllHandles() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * 添加最近项目
 * @param {string} name - 项目名称
 * @param {FileSystemFileHandle} fileHandle - 文件系统句柄
 * @returns {Promise<Array>} 更新后的最近项目列表
 */
export async function addRecentProject(name, fileHandle) {
  const handles = await getAllHandles();
  const existingIndex = handles.findIndex(h => h.name === name);
  
  if (existingIndex !== -1) {
    await deleteHandle(handles[existingIndex].id);
  }

  const newHandle = {
    id: Date.now(),
    name: name,
    handle: fileHandle,
    lastOpened: Date.now()
  };

  const updated = [newHandle, ...handles.filter(h => h.name !== name)]
    .slice(0, MAX_RECENT_PROJECTS);

  await clearAllHandles();
  for (const h of updated) {
    await saveHandle(h);
  }

  return updated.map(h => ({ id: h.id, name: h.name, lastOpened: h.lastOpened }));
}

/**
 * 获取最近项目列表
 * @returns {Promise<Array>} 最近项目列表（不含文件句柄）
 */
export async function getRecentProjects() {
  const handles = await getAllHandles();
  return handles.map(h => ({ id: h.id, name: h.name, lastOpened: h.lastOpened }));
}

/**
 * 获取项目文件句柄
 * @param {string} id - 项目 ID
 * @returns {Promise<FileSystemFileHandle|null>} 文件句柄
 */
export async function getProjectHandle(id) {
  const handles = await getAllHandles();
  const found = handles.find(h => h.id === id);
  return found?.handle;
}

/**
 * 移除最近项目
 * @param {string} id - 项目 ID
 * @returns {Promise<Array>} 更新后的最近项目列表
 */
export async function removeRecentProject(id) {
  await deleteHandle(id);
  return getRecentProjects();
}

/**
 * 清除所有最近项目
 * @returns {Promise<Array>} 空数组
 */
export async function clearRecentProjects() {
  await clearAllHandles();
  return [];
}