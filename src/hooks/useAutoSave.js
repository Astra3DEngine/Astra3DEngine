/**
 * @file hooks/useAutoSave.js
 * @description 自动保存 Hook，使用 IndexedDB 存储项目快照
 * @module hooks/useAutoSave
 */

import React from 'react';

const DB_NAME = 'Astra3DEngine';
const DB_VERSION = 2;
const STORE_NAME = 'snapshots';

/**
 * 打开 IndexedDB 数据库
 * 
 * IndexedDB API 好他妈难，妈的。这里的读取看起来得用 Promise 包装回调，异步起来。
 * 看见 IndexedDB 我又一次想起从前写扩展的无力感了。
 * 
 * @returns {Promise<IDBDatabase>} 数据库实例
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('savedAt', 'savedAt', { unique: false });
      }
    };
  });
}

/**
 * 保存快照到 IndexedDB
 * 
 * 自动清理旧快照：先保存新快照，然后检查总数是否超过限制，
 * 如果超过，删除最旧的快照。
 * 
 * 在 transaction.oncomplete 里清理，因为 put 操作完成后才能获取准确的快照数量，
 * 如果在 put 之前清理，可能会误删。
 * 
 * IndexedDB 的 transaction 很特殊：transaction.oncomplete 在所有操作完成后触发，
 * 但 request.onsuccess 在单个操作完成后就触发，所以清理逻辑要放在 transaction.oncomplete 里。
 * 
 * 清理逻辑得暴力起来：每次保存都要重新排序，但快照数量通常不多（默认 10 个），
 * 性能影响很小，我的垃圾电脑也没卡过，优化万岁。
 * 
 * @param {Object} snapshot - 快照数据对象
 * @param {number} maxSnapshots - 最大快照数量
 * @returns {Promise<void>}
 */
async function saveSnapshotToIndexedDB(snapshot, maxSnapshots) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.put(snapshot);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    
    transaction.oncomplete = async () => {
      const allSnapshots = await getAllSnapshotsFromIndexedDB();
      if (allSnapshots.length > maxSnapshots) {
        const toDelete = allSnapshots
          .sort((a, b) => b.savedAt - a.savedAt)
          .slice(maxSnapshots);
        
        for (const snap of toDelete) {
          await deleteSnapshotFromIndexedDB(snap.id);
        }
      }
      db.close();
    };
  });
}

/**
 * 获取所有快照
 * @returns {Promise<Array>} 快照列表
 */
async function getAllSnapshotsFromIndexedDB() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
    
    transaction.oncomplete = () => db.close();
  });
}

/**
 * 获取单个快照
 * @param {string} id - 快照 ID
 * @returns {Promise<Object|null>} 快照数据
 */
async function getSnapshotFromIndexedDB(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.get(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
    
    transaction.oncomplete = () => db.close();
  });
}

/**
 * 删除单个快照
 * @param {string} id - 快照 ID
 * @returns {Promise<void>}
 */
async function deleteSnapshotFromIndexedDB(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    
    transaction.oncomplete = () => db.close();
  });
}

/**
 * 清除所有快照
 * @returns {Promise<void>}
 */
async function clearAllSnapshotsFromIndexedDB() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.clear();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    
    transaction.oncomplete = () => db.close();
  });
}

/**
 * 生成快照 ID
 * @returns {string} 唯一的快照 ID
 */
function generateSnapshotId() {
  return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 自动保存 Hook
 * @param {Function} getProjectData - 获取项目数据的函数
 * @param {number} interval - 自动保存间隔（毫秒），默认 60000
 * @param {number} maxSnapshots - 最大快照数量，默认 10
 * @returns {Object} 自动保存相关方法
 * @property {Function} save - 立即保存
 * @property {Function} scheduleSave - 计划保存（延迟执行）
 * @property {Function} loadSnapshots - 加载所有快照
 * @property {Function} loadSnapshot - 加载单个快照
 * @property {Function} deleteSnapshot - 删除快照
 * @property {Function} clearAll - 清除所有快照
 * @property {Function} getLastSave - 获取上次保存时间
 */
export function useAutoSave(getProjectData, interval = 60000, maxSnapshots = 10) {
  const lastSaveRef = React.useRef(null);
  const timerRef = React.useRef(null);
  const pendingRef = React.useRef(false);
  
  const save = React.useCallback(async () => {
    try {
      const data = getProjectData();
      const snapshot = {
        id: generateSnapshotId(),
        name: data.name || 'Untitled Project',
        data: data,
        savedAt: Date.now()
      };
      
      await saveSnapshotToIndexedDB(snapshot, maxSnapshots);
      lastSaveRef.current = Date.now();
      pendingRef.current = false;
      console.log('[AutoSave] Snapshot saved to IndexedDB');
      return snapshot;
    } catch (error) {
      console.error('[AutoSave] Save failed:', error);
      return null;
    }
  }, [getProjectData, maxSnapshots]);
  
  const scheduleSave = React.useCallback(() => {
    pendingRef.current = true;
    
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    timerRef.current = setTimeout(() => {
      if (pendingRef.current) {
        save();
      }
    }, interval);
  }, [save, interval]);
  
  const loadSnapshots = React.useCallback(async () => {
    try {
      const snapshots = await getAllSnapshotsFromIndexedDB();
      console.log(`[AutoSave] Loaded ${snapshots.length} snapshots`);
      return snapshots.sort((a, b) => b.savedAt - a.savedAt);
    } catch (error) {
      console.error('[AutoSave] Load snapshots failed:', error);
      return [];
    }
  }, []);
  
  const loadSnapshot = React.useCallback(async (id) => {
    try {
      const snapshot = await getSnapshotFromIndexedDB(id);
      if (snapshot) {
        console.log('[AutoSave] Loaded snapshot:', snapshot.name);
        return snapshot;
      }
      return null;
    } catch (error) {
      console.error('[AutoSave] Load snapshot failed:', error);
      return null;
    }
  }, []);
  
  const deleteSnapshot = React.useCallback(async (id) => {
    try {
      await deleteSnapshotFromIndexedDB(id);
      console.log('[AutoSave] Deleted snapshot:', id);
      return true;
    } catch (error) {
      console.error('[AutoSave] Delete snapshot failed:', error);
      return false;
    }
  }, []);
  
  const clearAll = React.useCallback(async () => {
    try {
      await clearAllSnapshotsFromIndexedDB();
      console.log('[AutoSave] Cleared all snapshots');
      return true;
    } catch (error) {
      console.error('[AutoSave] Clear all failed:', error);
      return false;
    }
  }, []);
  
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
  
  return { 
    save, 
    scheduleSave, 
    loadSnapshots,
    loadSnapshot,
    deleteSnapshot,
    clearAll, 
    getLastSave: () => lastSaveRef.current 
  };
}

export { getAllSnapshotsFromIndexedDB, deleteSnapshotFromIndexedDB, clearAllSnapshotsFromIndexedDB };