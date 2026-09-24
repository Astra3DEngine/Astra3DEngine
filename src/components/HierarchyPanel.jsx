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
import { getAllDescendants, getAllDescendantIds } from '../engine/TreeMath.js';
import RenameInput from './primitives/RenameInput.jsx';
import { useScenesStore } from '../stores/useScenesStore.js';
import { useSelectionStore } from '../stores/useSelectionStore.js';
import { usePrefabsStore } from '../stores/usePrefabsStore.js';
import IconCube from '../assets/icons/tools/cube.svg?react';
import IconSphere from '../assets/icons/tools/sphere.svg?react';
import IconPlane from '../assets/icons/tools/plane.svg?react';
import IconModel from '../assets/icons/tools/model.svg?react';
import IconFolder from '../assets/icons/editor/folder.svg?react';
import IconPrefabInstance from '../assets/icons/tools/prefab-instance.svg?react';
import IconDelete from '../assets/icons/editor/delete.svg?react';
import IconPrefab from '../assets/icons/tools/prefab.svg?react';
import IconCopy from '../assets/icons/editor/copy.svg?react';
import IconPaste from '../assets/icons/editor/paste.svg?react';
import IconDuplicate from '../assets/icons/editor/duplicate.svg?react';
import IconRename from '../assets/icons/editor/rename.svg?react';
import IconPlus from '../assets/icons/editor/plus.svg?react';
import IconSearch from '../assets/icons/editor/search.svg?react';
import IconChevronCollapsed from '../assets/icons/nav/chevron-collapsed.svg?react';
import IconPointLight from '../assets/icons/tools/light-point.svg?react';
import IconDirectionalLight from '../assets/icons/tools/light-directional.svg?react';
import IconSpotLight from '../assets/icons/tools/light-spot.svg?react';

/**
 * 层级面板组件
 * @param {Object} props - 组件属性
 * @param {Array} props.objects - 当前场景的对象列表
 * @param {Object} props.selectedObject - 当前选中的对象
 * @param {Array} props.selectedObjects - 多选对象列表
 * @param {Function} props.onSelectObject - 选择对象回调
 * @param {Function} props.onAddObject - 添加对象回调
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
  const onAddObject = useScenesStore.getState().addObject;
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
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const addMenu = useDropdownMenu();
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

  useEffect(() => {
    /**
     * 关于快捷键的方法
     * 通过检测alt+q，打开创建object的右键菜单
     */
    const handleShortcutKey = (e) => {
      if (e.altKey && e.key === 'q') {
        addMenu.close();
        addMenu.openAt(position.x, position.y);
      }
    };

    document.addEventListener('keydown', handleShortcutKey);
    return () => {
      document.removeEventListener('keydown', handleShortcutKey);
    };
  }, [position, addMenu]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({
        x: e.clientX, // 相对于视口
        y: e.clientY,
      });
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []); // 只绑定一次，不依赖任何状态

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
      if (
        selectedObjects &&
        selectedObjects.length > 1 &&
        selectedObjects.some((o) => o && o.id === contextMenuObject.id)
      ) {
        onCopyObject(contextMenuObject.id);
      } else {
        onCopyObject(contextMenuObject.id);
      }
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

  const getObjectIcon = (obj) => {
    if (obj.isFolder) return <IconFolder className="hierarchy-icon" />;
    if (obj.type === 'mesh') return <IconModel className="hierarchy-icon" />;
    if (obj.prefabId) return <IconPrefabInstance className="hierarchy-icon" />;
    if (obj.type === 'cube') return <IconCube className="hierarchy-icon" />;
    if (obj.type === 'sphere') return <IconSphere className="hierarchy-icon" />;
    if (obj.type === 'plane') return <IconPlane className="hierarchy-icon" />;
    if (obj.type === 'model') return <IconModel className="hierarchy-icon" />;
    if (obj.type === 'pointLight') return <IconPointLight className="hierarchy-icon" />;
    if (obj.type === 'directionalLight') return <IconDirectionalLight className="hierarchy-icon" />;
    if (obj.type === 'spotLight') return <IconSpotLight className="hierarchy-icon" />;
    return <IconCube className="hierarchy-icon" />;
  };

  /**
   * 递归获取所有后代对象的 ID
   *
   * 这个函数非常重要，用于防止循环父子关系，自己的儿子不能是自己的父亲。
   * 傻逼。
   *
   * 这个递归实现有点暴力，每次拖拽都要重新计算，但考虑到场景对象数量通常不多，
   * 能跑就行，不肉，能跑就行。
   *
   * @param {number} objId - 对象 ID
   * @returns {Set<number>} 所有后代对象的 ID 集合
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

  const renderObject = (obj, depth = 0) => {
    const isDropTarget = dropTarget === obj.id;
    const isDragged = draggedId === obj.id;
    const hasChildren = objects.some((o) => o.parentId === obj.id);
    const isSelected = selectedObjects.some((o) => o && o.id === obj.id);
    const isExpanded = computedExpandedIds.has(obj.id);

    return (
      <React.Fragment key={obj.id}>
        <div
          className={`hierarchy-item ${isSelected ? 'selected' : ''} ${obj.prefabId ? 'prefab-instance' : ''} ${isDragged ? 'dragging' : ''} ${isDropTarget && dropPosition === 'before' ? 'drop-before' : ''} ${isDropTarget && dropPosition === 'after' ? 'drop-after' : ''} ${isDropTarget && dropPosition === 'inside' ? 'drop-inside' : ''}`}
          style={{ paddingLeft: `${6 + depth * 16}px` }}
          onClick={(e) => {
            if (isRenaming) return;
            if (obj.isFolder) {
              const descendants = getAllDescendants(obj.id, objects);
              onSelectObject(obj, e.ctrlKey || e.metaKey, [obj, ...descendants]);
            } else {
              onSelectObject(obj, e.ctrlKey || e.metaKey);
            }
          }}
          onDoubleClick={(e) => {
            if (hasChildren) {
              e.stopPropagation();
              toggleExpanded(obj.id);
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, obj)}
          draggable={true}
          onDragStart={(e) => handleDragStart(e, obj)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, obj)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, obj)}
        >
          {hasChildren && (
            <span
              className={`hierarchy-expand-icon ${isExpanded ? 'expanded' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                toggleExpanded(obj.id);
              }}
            >
              <IconChevronCollapsed className="hierarchy-expand-svg" />
            </span>
          )}
          {!hasChildren && depth > 0 && <span className="hierarchy-expand-placeholder" />}
          <span className="hierarchy-item-icon">{getObjectIcon(obj)}</span>
          {isRenaming === obj.id ? (
            <RenameInput
              value={obj.name}
              className="hierarchy-rename-input"
              onSubmit={(value) => {
                onRenameObject(obj.id, value);
                setIsRenaming(null);
              }}
              onCancel={() => setIsRenaming(null)}
            />
          ) : (
            <span className="hierarchy-item-name">{obj.name}</span>
          )}
          {obj.prefabId && (
            <span className="hierarchy-prefab-badge" title={getPrefabName(obj.prefabId)}>
              P
            </span>
          )}
          <button
            className="icon-btn icon-btn-danger"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteObject(obj.id);
            }}
            title={msg('hierarchy.delete')}
          >
            <IconDelete className="btn-icon" />
          </button>
        </div>
        {isExpanded &&
          objects
            .filter((o) => o.parentId === obj.id)
            .sort((a, b) => {
              const indexA = objects.findIndex((item) => item.id === a.id);
              const indexB = objects.findIndex((item) => item.id === b.id);
              return indexA - indexB;
            })
            .map((child) => renderObject(child, depth + 1))}
      </React.Fragment>
    );
  };

  const filteredObjects = useMemo(() => {
    if (!searchText.trim()) return objects;
    const lowerSearch = searchText.toLowerCase().trim();
    return objects.filter((obj) => obj.name.toLowerCase().includes(lowerSearch));
  }, [objects, searchText]);

  const isSearching = searchText.trim().length > 0;

  const addMenuItems = useMemo(
    () => [
      {
        label: msg('hierarchy.folder'),
        icon: <IconFolder className="dropdown-icon" />,
        onClick: () => {
          onAddObject('folder');
          addMenu.close();
        },
      },
      { divider: true },
      {
        label: msg('hierarchy.cube'),
        icon: <IconCube className="dropdown-icon" />,
        onClick: () => {
          onAddObject('cube');
          addMenu.close();
        },
      },
      {
        label: msg('hierarchy.sphere'),
        icon: <IconSphere className="dropdown-icon" />,
        onClick: () => {
          onAddObject('sphere');
          addMenu.close();
        },
      },
      {
        label: msg('hierarchy.plane'),
        icon: <IconPlane className="dropdown-icon" />,
        onClick: () => {
          onAddObject('plane');
          addMenu.close();
        },
      },
      { divider: true },
      {
        label: msg('hierarchy.pointLight'),
        icon: <IconPointLight className="dropdown-icon" />,
        onClick: () => {
          onAddObject('pointLight');
          addMenu.close();
        },
      },
      {
        label: msg('hierarchy.directionalLight'),
        icon: <IconDirectionalLight className="dropdown-icon" />,
        onClick: () => {
          onAddObject('directionalLight');
          addMenu.close();
        },
      },
      {
        label: msg('hierarchy.spotLight'),
        icon: <IconSpotLight className="dropdown-icon" />,
        onClick: () => {
          onAddObject('spotLight');
          addMenu.close();
        },
      },
    ],
    [onAddObject, addMenu]
  );

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
          <div className="add-menu-container">
            <button
              className="add-menu-trigger"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => {
                if (addMenu.isOpen) {
                  addMenu.close();
                } else {
                  addMenu.openAt(position.x, position.y);
                }
              }}
              title={msg('hierarchy.addObject')}
            >
              <IconPlus className="add-menu-icon" />
            </button>
            <DropdownMenu
              isOpen={addMenu.isOpen}
              onClose={addMenu.close}
              position={addMenu.position}
              roundedCorners="all"
              items={addMenuItems}
            />
          </div>
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
          filteredObjects.map((obj) => renderObject(obj))
        ) : (
          filteredObjects.filter((obj) => !obj.parentId).map((obj) => renderObject(obj))
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
