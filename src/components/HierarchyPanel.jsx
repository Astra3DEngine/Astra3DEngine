import React, { useState, useRef, useEffect } from 'react';
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

function HierarchyPanel({ 
  objects, 
  selectedObject, 
  onSelectObject, 
  onAddObject, 
  onDeleteObject,
  onCreatePrefab,
  prefabs,
  onCopyObject,
  onPasteObject,
  onDuplicateObject,
  onRenameObject,
  clipboard,
  vertical,
  onCollapseChange
}) {
  const [contextMenu, setContextMenu] = useState(null);
  const [isRenaming, setIsRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const contextMenuRef = useRef(null);
  const renameInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null);
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
      onDeleteObject(contextMenu.object.id);
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

  return (
    <CollapsiblePanel 
      title={msg('hierarchy.title')} 
      className="hierarchy-panel"
      storageKey="astra-panel-hierarchy-collapsed"
      vertical={vertical}
      onCollapseChange={onCollapseChange}
    >
      <div className="panel-content">
        {objects.length === 0 ? (
          <div style={{
            color: 'var(--text-secondary)',
            textAlign: 'center',
            padding: '20px',
            fontSize: '12px'
          }}>
            {msg('hierarchy.empty')}<br />
            <span style={{ opacity: 0.7 }}>{msg('hierarchy.emptyHint')}</span>
          </div>
        ) : (
          objects.map(obj => (
            <div
              key={obj.id}
              className={`hierarchy-item ${selectedObject && selectedObject.id === obj.id ? 'selected' : ''} ${obj.prefabId ? 'prefab-instance' : ''}`}
              onClick={() => !isRenaming && onSelectObject(obj)}
              onContextMenu={(e) => handleContextMenu(e, obj)}
            >
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
          ))
        )}
      </div>
      <div className="hierarchy-actions">
        <button className="btn btn-small" onClick={() => onAddObject('cube')}>
          {msg('hierarchy.addCube')}
        </button>
        <button className="btn btn-small" onClick={() => onAddObject('sphere')}>
          {msg('hierarchy.addSphere')}
        </button>
        <button className="btn btn-small" onClick={() => onAddObject('plane')}>
          {msg('hierarchy.addPlane')}
        </button>
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
            <IconDelete className="context-menu-icon" /> {msg('hierarchy.delete')}
          </div>
        </div>
      )}
    </CollapsiblePanel>
  );
}

export default HierarchyPanel;
