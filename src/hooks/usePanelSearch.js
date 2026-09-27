/**
 * @file hooks/usePanelSearch.js
 * @description 面板搜索：默认隐藏，焦点在面板内按 Ctrl+F 呼出并聚焦；Esc（焦点在输入框）隐藏并清空。
 * @module hooks/usePanelSearch
 */

import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * @returns {{
 *   containerRef: React.RefObject, // 绑到面板容器（判断焦点归属）
 *   inputRef: React.RefObject,    // 绑到搜索输入框
 *   searchText: string,
 *   setSearchText: Function,
 *   searchVisible: boolean,
 *   clearSearch: Function,
 * }}
 */
export function usePanelSearch() {
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [searchText, setSearchText] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        // 仅当焦点落在本面板内才呼出搜索
        if (containerRef.current && containerRef.current.contains(document.activeElement)) {
          e.preventDefault();
          setSearchVisible(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }
        return;
      }
      if (e.key === 'Escape' && searchVisible && inputRef.current === document.activeElement) {
        setSearchVisible(false);
        setSearchText('');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchVisible]);

  const clearSearch = useCallback(() => setSearchText(''), []);

  return { containerRef, inputRef, searchText, setSearchText, searchVisible, clearSearch };
}

export default usePanelSearch;
