/**
 * @file components/HierarchyPanel.jsx
 * @description 层级面板组件，显示和管理场景对象的层级结构
 * @module components/HierarchyPanel
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { msg } from '../i18n/index.js';
import CollapsiblePanel from './CollapsiblePanel.jsx';
import IconCube from '../icons/cube.svg?react';
import IconSphere from '../icons/sphere.svg?react';
import IconPlane from '../icons/plane.svg?react';
import IconModel from '../icons/model.svg?react';
import IconFolder from '../icons/folder.svg?react';
import IconPrefabInstance from '../icons/prefab-instance.svg?react';
import IconDelete from '../icons/delete.svg?react';
import IconPrefab from '../icons/prefab.svg?react';
import IconCopy from '../icons/copy.svg?react';
import IconPaste from '../icons/paste.svg?react';
import IconDuplicate from '../icons/duplicate.svg?react';
import IconRename from '../icons/rename.svg?react';
import IconPlus from '../icons/plus.svg?react';
import IconSearch from '../icons/search.svg?react';
import IconChevronCollapsed from '../icons/chevron-collapsed.svg?react';

/**
 * 层级面板组件
 * @param {Object} props - 组件属性
 * @param {Array} props.objects - 场景对象列表
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
 * @param {boolean} props.vertical - 是否垂直布局
 * @param {Function} props.onCollapseChange - 折叠状态变化回调
 * @param {Function} props.onReorderObjects - 重排序对象回调
 * @returns {JSX.Element} 层级面板组件
 */
function HierarchyPanel({ 
  objects, 
  selectedObject, 
  selectedObjects = [],
  onSelectObject, 
  onAddObject, 
  onDeleteObject,
  onDeleteSelectedObjects,
  onCreatePrefab,
  prefabs,
  onCopyObject,
  onPasteObject,
  onDuplicateObject,
  onRenameObject,
  clipboard,
  vertical,
  onCollapseChange,
  onReorderObjects
}) {
  const [contextMenu, setContextMenu] = useState(null);
  const [isRenaming, setIsRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [draggedId, setDraggedId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [dropPosition, setDropPosition] = useState(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const addMenuRef = useRef(null);
  const contextMenuRef = useRef(null);
  const renameInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const objectsRef = useRef(objects);

  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);

  /**
   * 获取对象的所有后代对象（包括嵌套的子对象）
   * @param {number} parentId - 父对象ID
   * @returns {Array} 所有后代对象列表
   */
  const getAllDescendants = useCallback((parentId) => {
    const descendants = [];
    const children = objects.filter(o => o.parentId === parentId);
    children.forEach(child => {
      descendants.push(child);
      const nestedChildren = getAllDescendants(child.id);
      descendants.push(...nestedChildren);
    });
    return descendants;
  }, [objects]);

  const computedExpandedIds = useMemo(() => {
    return new Set(expandedIds);
  }, [expandedIds]);

  const toggleExpanded = (id) => {
    setExpandedIds(prev => {
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
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) {
        setAddMenuOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const handleContextMenu = (e, obj) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isRenaming) return;
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      object: obj
    });
  };

  const handleCreatePrefab = () => {
    if (contextMenu?.object) {
      if (!contextMenu.object.prefabId) {
        onCreatePrefab(contextMenu.object.id);
      }
    }
    setContextMenu(null);
  };

  const handleDelete = () => {
    if (contextMenu?.object) {
      if (selectedObjects.length > 1 && selectedObjects.some(o => o && o.id === contextMenu.object.id)) {
        onDeleteSelectedObjects();
      } else {
        onDeleteObject(contextMenu.object.id);
      }
    }
    setContextMenu(null);
  };

  /**
   * 复制对象到剪贴板
   * 
   * 如果当前有多个选中对象，且右键菜单的对象在其中，
   * 则复制所有选中的对象。否则只复制单个对象。
   */
  const handleCopy = () => {
    if (contextMenu?.object) {
      if (selectedObjects && selectedObjects.length > 1 && 
          selectedObjects.some(o => o && o.id === contextMenu.object.id)) {
        onCopyObject(contextMenu.object.id);
      } else {
        onCopyObject(contextMenu.object.id);
      }
    }
    setContextMenu(null);
  };

  const handlePaste = () => {
    onPasteObject();
    setContextMenu(null);
  };

  /**
   * 复制对象（原地复制）
   * 
   * 如果当前有多个选中对象，且右键菜单的对象在其中，
   * 则复制所有选中的对象。否则只复制单个对象。
   */
  const handleDuplicate = () => {
    if (contextMenu?.object) {
      onDuplicateObject(contextMenu.object.id);
    }
    setContextMenu(null);
  };

  const handleRename = () => {
    if (contextMenu?.object) {
      setIsRenaming(contextMenu.object.id);
      setRenameValue(contextMenu.object.name);
    }
    setContextMenu(null);
  };

  const handleRenameSubmit = () => {
    if (isRenaming && renameValue.trim()) {
      onRenameObject(isRenaming, renameValue.trim());
    }
    setIsRenaming(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsRenaming(null);
      setRenameValue('');
    }
  };

  const getPrefabName = (prefabId) => {
    const prefab = prefabs?.find(p => p.id === prefabId);
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
  const getAllDescendantIds = (objId) => {
    const descendants = new Set();
    const findDescendants = (id) => {
      objects.forEach(obj => {
        if (obj.parentId === id) {
          descendants.add(obj.id);
          findDescendants(obj.id);
        }
      });
    };
    findDescendants(objId);
    return descendants;
  };

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
    
    const descendantIds = getAllDescendantIds(draggedId);
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
    const isOutside = (
      e.clientX < rect.left ||
      e.clientX >= rect.right ||
      e.clientY < rect.top ||
      e.clientY >= rect.bottom
    );
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
    
    const descendantIds = getAllDescendantIds(draggedId);
    if (descendantIds.has(targetObj.id)) {
      return;
    }

    const finalDropPosition = dropPosition || 'after';

    if (onReorderObjects) {
      onReorderObjects(draggedId, targetObj.id, finalDropPosition);
    }
    
    // 拖拽创建父子关系时自动展开父对象
    if (finalDropPosition === 'inside') {
      setExpandedIds(prev => {
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
      } catch (err) {
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
    const hasChildren = objects.some(o => o.parentId === obj.id);
    const isSelected = selectedObjects.some(o => o && o.id === obj.id);
    const isExpanded = computedExpandedIds.has(obj.id);
    
    return (
      <React.Fragment key={obj.id}>
        <div
          className={`hierarchy-item ${isSelected ? 'selected' : ''} ${obj.prefabId ? 'prefab-instance' : ''} ${isDragged ? 'dragging' : ''} ${isDropTarget && dropPosition === 'before' ? 'drop-before' : ''} ${isDropTarget && dropPosition === 'after' ? 'drop-after' : ''} ${isDropTarget && dropPosition === 'inside' ? 'drop-inside' : ''}`}
          style={{ paddingLeft: `${6 + depth * 16}px` }}
          onClick={(e) => {
            if (isRenaming) return;
            if (obj.isFolder) {
              const descendants = getAllDescendants(obj.id);
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
          {!hasChildren && depth > 0 && (
            <span className="hierarchy-expand-placeholder" />
          )}
          <span className="hierarchy-item-icon">
            {getObjectIcon(obj)}
          </span>
          {isRenaming === obj.id ? (
            <input
              ref={renameInputRef}
              type="text"
              className="hierarchy-rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              onClick={(e) => e.stopPropagation()}
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
        {isExpanded && objects
          .filter(o => o.parentId === obj.id)
          .sort((a, b) => {
            const indexA = objects.findIndex(item => item.id === a.id);
            const indexB = objects.findIndex(item => item.id === b.id);
            return indexA - indexB;
          })
          .map(child => renderObject(child, depth + 1))
        }
      </React.Fragment>
    );
  };

  const filteredObjects = useMemo(() => {
    if (!searchText.trim()) return objects;
    const lowerSearch = searchText.toLowerCase().trim();
    return objects.filter(obj => obj.name.toLowerCase().includes(lowerSearch));
  }, [objects, searchText]);

  const isSearching = searchText.trim().length > 0;

  const headerRight = (
    <div className="add-menu-container" ref={addMenuRef}>
      <button 
        className="add-menu-trigger"
        onClick={() => setAddMenuOpen(!addMenuOpen)}
        title={msg('hierarchy.addObject')}
      >
        <IconPlus className="add-menu-icon" />
      </button>
      {addMenuOpen && (
        <div className="add-menu-dropdown">
          <div 
            className="add-menu-item"
            onClick={() => { onAddObject('folder'); setAddMenuOpen(false); }}
          >
            <IconFolder className="add-menu-item-icon" />
            {msg('hierarchy.folder')}
          </div>
          <div className="add-menu-divider" />
          <div 
            className="add-menu-item"
            onClick={() => { onAddObject('cube'); setAddMenuOpen(false); }}
          >
            <IconCube className="add-menu-item-icon" />
            {msg('hierarchy.cube')}
          </div>
          <div 
            className="add-menu-item"
            onClick={() => { onAddObject('sphere'); setAddMenuOpen(false); }}
          >
            <IconSphere className="add-menu-item-icon" />
            {msg('hierarchy.sphere')}
          </div>
          <div 
            className="add-menu-item"
            onClick={() => { onAddObject('plane'); setAddMenuOpen(false); }}
          >
            <IconPlane className="add-menu-item-icon" />
            {msg('hierarchy.plane')}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <CollapsiblePanel 
      title={msg('hierarchy.title')} 
      className="hierarchy-panel"
      storageKey="astra-panel-hierarchy-collapsed"
      vertical={vertical}
      onCollapseChange={onCollapseChange}
      headerRight={headerRight}
    >
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
          <button
            className="hierarchy-search-clear"
            onClick={() => setSearchText('')}
          >
            ×
          </button>
        )}
      </div>
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
          <div style={{
            color: 'var(--text-secondary)',
            textAlign: 'center',
            padding: '20px',
            fontSize: '12px'
          }}>
            {objects.length === 0 ? (
              <>
                {msg('hierarchy.empty')}<br />
                <span style={{ opacity: 0.7 }}>{msg('hierarchy.emptyHint')}</span>
              </>
            ) : (
              msg('hierarchy.noResults')
            )}
          </div>
        ) : isSearching ? (
          filteredObjects.map(obj => renderObject(obj))
        ) : (
          filteredObjects.filter(obj => !obj.parentId).map(obj => renderObject(obj))
        )}
      </div>

      {contextMenu && (
        <div 
          ref={contextMenuRef}
          className="context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000
          }}
        >
          <div className="context-menu-item" onClick={handleCopy}>
            <IconCopy className="context-menu-icon" /> {msg('hierarchy.copy')}
          </div>
          <div 
            className={`context-menu-item ${!clipboard ? 'context-menu-disabled' : ''}`} 
            onClick={clipboard ? handlePaste : undefined}
          >
            <IconPaste className="context-menu-icon" /> {msg('hierarchy.paste')}
          </div>
          <div className="context-menu-item" onClick={handleDuplicate}>
            <IconDuplicate className="context-menu-icon" /> {msg('hierarchy.duplicate')}
          </div>
          <div className="context-menu-item" onClick={handleRename}>
            <IconRename className="context-menu-icon" /> {msg('hierarchy.rename')}
          </div>
          <div className="context-menu-divider" />
          <div className="context-menu-item" onClick={handleCreatePrefab}>
            {contextMenu.object.prefabId 
              ? <><IconPrefabInstance className="context-menu-icon" /> {getPrefabName(contextMenu.object.prefabId)}</>
              : <><IconPrefab className="context-menu-icon" /> {msg('prefabs.createFromObject')}</>
            }
          </div>
          <div className="context-menu-divider" />
          <div className="context-menu-item context-menu-danger" onClick={handleDelete}>
            <IconDelete className="context-menu-icon" /> 
            {selectedObjects.length > 1 && selectedObjects.some(o => o && o.id === contextMenu?.object?.id)
              ? `${msg('hierarchy.deleteSelected')} (${selectedObjects.length})`
              : msg('hierarchy.delete')
            }
          </div>
        </div>
      )}
    </CollapsiblePanel>
  );
}

export default HierarchyPanel;
