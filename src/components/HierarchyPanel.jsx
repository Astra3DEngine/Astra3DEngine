/**
 * @file components/HierarchyPanel.jsx
 * @description 层级面板组件，显示和管理场景对象的层级结构
 * @module components/HierarchyPanel
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { msg } from '../i18n/index.js';
import useDropdownMenu from '../hooks/useDropdownMenu.js';
import usePanelSearch from '../hooks/usePanelSearch.js';
import DropdownMenu from './DropdownMenu.jsx';
import HierarchyItem from './hierarchy/HierarchyItem.jsx';
import { getAllDescendantIds } from '../engine/TreeMath.js';
import { useScenesStore } from '../stores/useScenesStore.js';
import { useSelectionStore } from '../stores/useSelectionStore.js';
import { usePrefabsStore } from '../stores/usePrefabsStore.js';
import IconCopy from '../assets/icons/editor/copy.svg?react';
import IconPaste from '../assets/icons/editor/paste.svg?react';
import IconDuplicate from '../assets/icons/editor/duplicate.svg?react';
import IconRename from '../assets/icons/editor/rename.svg?react';
import IconSearch from '../assets/icons/editor/search.svg?react';
import IconPrefabInstance from '../assets/icons/tools/prefab-instance.svg?react';
import IconPrefab from '../assets/icons/tools/prefab.svg?react';
import IconDelete from '../assets/icons/editor/delete.svg?react';

/**
 * 层级面板组件
 * @param {Object} props - 组件属性
 * @param {Array} props.objects - 当前场景的对象列表
 * @param {Object} props.selectedObject - 当前选中的对象
 * @param {Array} props.selectedObjects - 多选对象列表
 * @param {Function} props.onSelectObject - 选择对象回调
 * @param {Function} props.onDeleteObject - 删除对象回调
 * @param {Function} props.onDeleteSelectedObjects - 删除选中对象回调
 * @param {Function} props.onCreatePrefab - 创建预制件回调
 * @param {Array} props.prefabs - 预制件列表
 * @param {Function} props.onCopyObject - 复制对象回调
 * @param {Function} props.onPasteObject - 粘贴对象回调
 * @param {Function} props.onDuplicateObject - 复制对象回调
 * @param {Function} props.onRenameObject - 重命名对象回调
 * @param {Object} props.clipboard - 剪贴板内容
 * @param {Function} props.onReorderObjects - 重排序对象回调
 * @returns {JSX.Element} 层级面板组件
 */
function HierarchyPanel() {
  // ===== 直接读取 store，避免 App 层层传 props =====
  const objects = useScenesStore(
    (s) => s.scenes.find((sc) => sc.id === s.currentSceneId)?.objects || []
  );
  const selectedObjects = useSelectionStore((s) => s.selectedObjects);
  const prefabs = usePrefabsStore((s) => s.prefabs);
  const clipboard = useScenesStore((s) => s.clipboard);
  const onSelectObject = useSelectionStore.getState().selectObject;
  const onDeleteObject = useScenesStore.getState().deleteObject;
  const onDeleteSelectedObjects = useScenesStore.getState().deleteSelectedObjects;
  const onCreatePrefab = usePrefabsStore.getState().createPrefab;
  const onCopyObject = useScenesStore.getState().copyObject;
  const onPasteObject = useScenesStore.getState().pasteObject;
  const onDuplicateObject = useScenesStore.getState().duplicateObject;
  const onRenameObject = useScenesStore.getState().renameObject;
  const onReorderObjects = useScenesStore.getState().reorderObjects;

  const [contextMenuObject, setContextMenuObject] = useState(null);
  const [isRenaming, setIsRenaming] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [dropPosition, setDropPosition] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const ctxMenu = useDropdownMenu({
    onClose: () => setContextMenuObject(null),
  });

  const {
    containerRef: panelRef,
    inputRef: searchInputRef,
    searchText,
    setSearchText,
    searchVisible,
  } = usePanelSearch();
  const objectsRef = useRef(objects);

  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);

  const computedExpandedIds = useMemo(() => {
    return new Set(expandedIds);
  }, [expandedIds]);

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleContextMenu = (e, obj) => {
    e.preventDefault();
    e.stopPropagation();

    if (isRenaming) return;

    setContextMenuObject(obj);
    ctxMenu.openAt(e.clientX, e.clientY);
  };

  const handleCreatePrefab = () => {
    if (contextMenuObject) {
      if (!contextMenuObject.prefabId) {
        onCreatePrefab(contextMenuObject.id);
      }
    }
    ctxMenu.close();
  };

  const handleDelete = () => {
    if (contextMenuObject) {
      if (
        selectedObjects.length > 1 &&
        selectedObjects.some((o) => o && o.id === contextMenuObject.id)
      ) {
        onDeleteSelectedObjects();
      } else {
        onDeleteObject(contextMenuObject.id);
      }
    }
    ctxMenu.close();
  };

  /**
   * 复制对象到剪贴板
   *
   * 如果当前有多个选中对象，且右键菜单的对象在其中，
   * 则复制所有选中的对象。否则只复制单个对象。
   */
  const handleCopy = () => {
    if (contextMenuObject) {
      onCopyObject(contextMenuObject.id);
    }
    ctxMenu.close();
  };

  const handlePaste = () => {
    onPasteObject();
    ctxMenu.close();
  };

  /**
   * 复制对象（原地复制）
   *
   * 如果当前有多个选中对象，且右键菜单的对象在其中，
   * 则复制所有选中的对象。否则只复制单个对象。
   */
  const handleDuplicate = () => {
    if (contextMenuObject) {
      onDuplicateObject(contextMenuObject.id);
    }
    ctxMenu.close();
  };

  const handleRename = () => {
    if (contextMenuObject) {
      setIsRenaming(contextMenuObject.id);
    }
    ctxMenu.close();
  };

  const getPrefabName = (prefabId) => {
    const prefab = prefabs?.find((p) => p.id === prefabId);
    return prefab?.name || 'Unknown Prefab';
  };

  /**
   * 递归获取所有后代对象的 ID
   *
   * 这个函数非常重要，用于防止循环父子关系，自己的儿子不能是自己的父亲。
   * 傻逼。
   *
   * 这个递归实现有点暴力，每次拖拽都要重新计算，但考虑到场景对象数量通常不多，
   * 能跑就行，不肉，能跑就行。
   */
  const handleDragStart = (e, obj) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', obj.id.toString());
    e.dataTransfer.setData('application/json', JSON.stringify({ id: obj.id }));
    setDraggedId(obj.id);
    setDropTarget(null);
    setDropPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropTarget(null);
    setDropPosition(null);
  };

  /**
   * 拖拽悬停事件处理
   *
   * 这里实现了三种拖拽放置位置的判断：上方 1/3 是 before（插入到目标前面），
   * 中间 1/3 是 inside（成为目标的子对象），下方 1/3 是 after（插入到目标后面）。
   *
   * 用 1/3 分割而不是 1/2，是因为 "inside" 操作更重要，需要更大的触发区域，
   * 用户创建父子关系的意图通常比排序更常见，这样设计可以让拖拽体验更流畅。
   *
   * 关键检查：不能拖到自己身上（废话），不能拖到自己的后代身上。
   *
   * HTML5 拖拽 API 看起来像个傻逼一样，dataTransfer.dropEffect 在不同浏览器表现不一致。
   */
  const handleDragOver = (e, obj) => {
    e.preventDefault();

    if (!draggedId || draggedId === obj.id) return;

    const descendantIds = getAllDescendantIds(draggedId, objects);
    if (descendantIds.has(obj.id)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    let newDropPosition;
    if (y < height * 0.33) {
      newDropPosition = 'before';
    } else if (y > height * 0.67) {
      newDropPosition = 'after';
    } else {
      newDropPosition = 'inside';
    }

    setDropPosition(newDropPosition);
    setDropTarget(obj.id);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isOutside =
      e.clientX < rect.left ||
      e.clientX >= rect.right ||
      e.clientY < rect.top ||
      e.clientY >= rect.bottom;
    if (isOutside) {
      setDropTarget(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (e, targetObj) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedId || draggedId === targetObj.id) {
      return;
    }

    const descendantIds = getAllDescendantIds(draggedId, objects);
    if (descendantIds.has(targetObj.id)) {
      return;
    }

    const finalDropPosition = dropPosition || 'after';

    if (onReorderObjects) {
      onReorderObjects(draggedId, targetObj.id, finalDropPosition);
    }

    // 拖拽创建父子关系时自动展开父对象
    if (finalDropPosition === 'inside') {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(targetObj.id);
        return next;
      });
    }

    setDraggedId(null);
    setDropTarget(null);
    setDropPosition(null);
  };

  const handleDropOnEmpty = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedId) {
      return;
    }

    const data = e.dataTransfer.getData('application/json');

    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.id && onReorderObjects) {
          onReorderObjects(parsed.id, null, 'end');
        }
      } catch {
        if (onReorderObjects) {
          onReorderObjects(draggedId, null, 'end');
        }
      }
    } else if (onReorderObjects) {
      onReorderObjects(draggedId, null, 'end');
    }

    setDraggedId(null);
    setDropTarget(null);
    setDropPosition(null);
  };

  const itemProps = {
    selectedObjects,
    isRenaming,
    expandedIds: computedExpandedIds,
    draggedId,
    dropTarget,
    dropPosition,
    getPrefabName,
    toggleExpanded,
    onSelectObject,
    onDeleteObject,
    onRenameObject,
    onRenameCancel: () => setIsRenaming(null),
    onContextMenu: handleContextMenu,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };

  const filteredObjects = useMemo(() => {
    if (!searchText.trim()) return objects;
    const lowerSearch = searchText.toLowerCase().trim();
    return objects.filter((obj) => obj.name.toLowerCase().includes(lowerSearch));
  }, [objects, searchText]);

  const isSearching = searchText.trim().length > 0;

  const ctxMenuItems = useMemo(() => {
    if (!contextMenuObject) return [];
    return [
      {
        label: msg('hierarchy.copy'),
        icon: <IconCopy className="dropdown-icon" />,
        onClick: handleCopy,
      },
      {
        label: msg('hierarchy.paste'),
        icon: <IconPaste className="dropdown-icon" />,
        disabled: !clipboard,
        onClick: handlePaste,
      },
      {
        label: msg('hierarchy.duplicate'),
        icon: <IconDuplicate className="dropdown-icon" />,
        onClick: handleDuplicate,
      },
      {
        label: msg('hierarchy.rename'),
        icon: <IconRename className="dropdown-icon" />,
        onClick: handleRename,
      },
      { divider: true },
      {
        label: contextMenuObject?.prefabId
          ? getPrefabName(contextMenuObject.prefabId)
          : msg('prefabs.createFromObject'),
        icon: contextMenuObject?.prefabId ? (
          <IconPrefabInstance className="dropdown-icon" />
        ) : (
          <IconPrefab className="dropdown-icon" />
        ),
        onClick: handleCreatePrefab,
      },
      { divider: true },
      {
        label:
          selectedObjects.length > 1 &&
          selectedObjects.some((o) => o && o.id === contextMenuObject?.id)
            ? `${msg('hierarchy.deleteSelected')} (${selectedObjects.length})`
            : msg('hierarchy.delete'),
        icon: <IconDelete className="dropdown-icon" />,
        danger: true,
        onClick: handleDelete,
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextMenuObject, clipboard, selectedObjects, msg]);

  return (
    <div className="hierarchy-panel" ref={panelRef}>
      {searchVisible && (
        <div className="hierarchy-search">
          <IconSearch className="hierarchy-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="hierarchy-search-input"
            placeholder={msg('hierarchy.searchPlaceholder')}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {searchText && (
            <button className="hierarchy-search-clear" onClick={() => setSearchText('')}>
              ×
            </button>
          )}
        </div>
      )}
      <div
        className="panel-content"
        onDragOver={(e) => {
          if (!draggedId) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={handleDropOnEmpty}
      >
        {filteredObjects.length === 0 ? (
          <div
            style={{
              color: 'var(--text-secondary)',
              textAlign: 'center',
              padding: '20px',
              fontSize: '12px',
            }}
          >
            {objects.length === 0 ? (
              <>
                {msg('hierarchy.empty')}
                <br />
                <span style={{ opacity: 0.7 }}>{msg('hierarchy.emptyHint')}</span>
              </>
            ) : (
              msg('hierarchy.noResults')
            )}
          </div>
        ) : isSearching ? (
          filteredObjects.map((obj) => (
            <HierarchyItem key={obj.id} obj={obj} objects={objects} {...itemProps} />
          ))
        ) : (
          filteredObjects
            .filter((obj) => !obj.parentId)
            .map((obj) => <HierarchyItem key={obj.id} obj={obj} objects={objects} {...itemProps} />)
        )}
      </div>

      <DropdownMenu
        isOpen={ctxMenu.isOpen}
        onClose={ctxMenu.close}
        position={ctxMenu.position}
        roundedCorners="all"
        items={ctxMenuItems}
      />
    </div>
  );
}

export default HierarchyPanel;
