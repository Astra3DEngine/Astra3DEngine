import React, { useState, useRef, useEffect, useMemo } from 'react';
import { msg } from '../i18n/index.js';
import CollapsiblePanel from './CollapsiblePanel.jsx';
import IconCube from '../icons/cube.svg?react';
import IconSphere from '../icons/sphere.svg?react';
import IconPlane from '../icons/plane.svg?react';
import IconModel from '../icons/model.svg?react';
import IconPrefabInstance from '../icons/prefab-instance.svg?react';
import IconDelete from '../icons/delete.svg?react';
import IconPrefab from '../icons/prefab.svg?react';
import IconCopy from '../icons/copy.svg?react';
import IconPaste from '../icons/paste.svg?react';
import IconDuplicate from '../icons/duplicate.svg?react';
import IconRename from '../icons/rename.svg?react';
import IconPlus from '../icons/plus.svg?react';
import IconSearch from '../icons/search.svg?react';

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
  const addMenuRef = useRef(null);
  const contextMenuRef = useRef(null);
  const renameInputRef = useRef(null);
  const searchInputRef = useRef(null);

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

  const handleCopy = () => {
    if (contextMenu?.object) {
      onCopyObject(contextMenu.object.id);
    }
    setContextMenu(null);
  };

  const handlePaste = () => {
    onPasteObject();
    setContextMenu(null);
  };

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
    if (obj.prefabId) return <IconPrefabInstance className="hierarchy-icon" />;
    if (obj.type === 'cube') return <IconCube className="hierarchy-icon" />;
    if (obj.type === 'sphere') return <IconSphere className="hierarchy-icon" />;
    if (obj.type === 'plane') return <IconPlane className="hierarchy-icon" />;
    if (obj.type === 'model') return <IconModel className="hierarchy-icon" />;
    return <IconCube className="hierarchy-icon" />;
  };

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
    setDraggedId(obj.id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropTarget(null);
    setDropPosition(null);
  };

  const handleDragOver = (e, obj) => {
    e.preventDefault();
    if (draggedId === obj.id) return;
    
    const descendantIds = getAllDescendantIds(draggedId);
    if (descendantIds.has(obj.id)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    if (y < height * 0.25) {
      setDropPosition('before');
    } else if (y > height * 0.75) {
      setDropPosition('after');
    } else {
      setDropPosition('inside');
    }
    
    setDropTarget(obj.id);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = () => {
    setDropTarget(null);
    setDropPosition(null);
  };

  const handleDrop = (e, targetObj) => {
    e.preventDefault();
    
    if (!draggedId || draggedId === targetObj.id) return;
    
    const descendantIds = getAllDescendantIds(draggedId);
    if (descendantIds.has(targetObj.id)) return;

    if (onReorderObjects) {
      onReorderObjects(draggedId, targetObj.id, dropPosition);
    }
    
    setDraggedId(null);
    setDropTarget(null);
    setDropPosition(null);
  };

  const handleDropOnEmpty = (e) => {
    e.preventDefault();
    
    if (!draggedId) return;
    
    if (onReorderObjects) {
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
    
    return (
      <React.Fragment key={obj.id}>
        <div
          className={`hierarchy-item ${isSelected ? 'selected' : ''} ${obj.prefabId ? 'prefab-instance' : ''} ${isDragged ? 'dragging' : ''} ${isDropTarget && dropPosition === 'before' ? 'drop-before' : ''} ${isDropTarget && dropPosition === 'after' ? 'drop-after' : ''} ${isDropTarget && dropPosition === 'inside' ? 'drop-inside' : ''}`}
          style={{ paddingLeft: `${6 + depth * 16}px` }}
          onClick={(e) => {
            if (isRenaming) return;
            onSelectObject(obj, e.ctrlKey || e.metaKey);
          }}
          onContextMenu={(e) => handleContextMenu(e, obj)}
          draggable
          onDragStart={(e) => handleDragStart(e, obj)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, obj)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, obj)}
        >
          {hasChildren && (
            <span className="hierarchy-expand-icon">▼</span>
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
        {objects
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
        onDragOver={(e) => e.preventDefault()}
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
