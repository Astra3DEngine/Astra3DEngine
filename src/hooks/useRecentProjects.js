/**
 * @file hooks/useRecentProjects.js
 * @description 最近项目管理 Hook，使用 IndexedDB 存储最近打开的项目列表
 * @module hooks/useRecentProjects
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  addRecentProject as addProjectToDB,
  getRecentProjects as getProjectsFromDB,
  getProjectHandle,
  removeRecentProject as removeProjectFromDB,
  clearRecentProjects as clearProjectsFromDB
} from '../utils/recentProjectsDB.js';

/**
 * 最近项目管理 Hook
 * @returns {Object} 最近项目相关方法和数据
 * @property {Array} recentProjects - 最近项目列表
 * @property {Function} addRecentProject - 添加最近项目
 * @property {Function} openRecentProject - 打开最近项目（获取文件句柄）
 * @property {Function} removeRecentProject - 移除最近项目
 * @property {Function} clearRecentProjects - 清除所有最近项目
 */
export function useRecentProjects() {
  const [recentProjects, setRecentProjects] = useState([]);

  useEffect(() => {
    getProjectsFromDB().then(setRecentProjects);
  }, []);

  /**
   * 添加最近项目
   * @param {string} name - 项目名称
   * @param {FileSystemFileHandle} fileHandle - 文件句柄
   * @returns {Promise<Array>} 更新后的最近项目列表
   */
  const addRecentProject = useCallback(async (name, fileHandle) => {
    const updated = await addProjectToDB(name, fileHandle);
    setRecentProjects(updated);
    return updated;
  }, []);

  /**
   * 打开最近项目（获取文件句柄并验证权限）
   * @param {string} id - 项目 ID
   * @returns {Promise<FileSystemFileHandle|null>} 文件句柄，失败返回 null
   */
  const openRecentProject = useCallback(async (id) => {
    const handle = await getProjectHandle(id);
    if (!handle) return null;
    
    try {
      const permission = await handle.queryPermission({ mode: 'read' });
      if (permission === 'granted') {
        return handle;
      }
      
      const requestPermission = await handle.requestPermission({ mode: 'read' });
      if (requestPermission === 'granted') {
        return handle;
      }
    } catch (e) {
      return null;
    }
    
    return null;
  }, []);

  /**
   * 移除最近项目
   * @param {string} id - 项目 ID
   */
  const removeRecentProject = useCallback(async (id) => {
    const updated = await removeProjectFromDB(id);
    setRecentProjects(updated);
  }, []);

  /**
   * 清除所有最近项目
   */
  const clearRecentProjects = useCallback(async () => {
    await clearProjectsFromDB();
    setRecentProjects([]);
  }, []);

  return {
    recentProjects,
    addRecentProject,
    openRecentProject,
    removeRecentProject,
    clearRecentProjects
  };
}