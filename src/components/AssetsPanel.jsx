import React, { useRef, useState, useMemo, useEffect } from 'react';
import { msg } from '../i18n/index.js';
import CollapsiblePanel from './CollapsiblePanel.jsx';
import IconModel from '../icons/cube.svg?react';
import IconImage from '../icons/image.svg?react';
import IconFile from '../icons/file.svg?react';
import IconFolder from '../icons/folder.svg?react';
import IconDelete from '../icons/delete.svg?react';
import IconRename from '../icons/rename.svg?react';
import IconPlus from '../icons/plus.svg?react';

/**
 * 资源面板组件
 * 永远不要忘了我这东西有多屌。
 * 
 * @param {Object} props - 组件属性
 * @param {Array} props.assets - 资源列表
 * @param {Function} props.onImport - 导入资源回调
 * @param {Function} props.onSelectAsset - 选择资源回调
 * @param {Object} props.selectedAsset - 当前选中的资源
 * @param {Function} props.onDeleteAsset - 删除资源回调
 * @param {Function} props.onRenameAsset - 重命名资源回调
 * @returns {JSX.Element} 资源面板组件
 */
function AssetsPanel({ assets, onImport, onSelectAsset, selectedAsset, onDeleteAsset, onRenameAsset }) {
  const fileInputRef = useRef(null);
  const contextMenuRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [editName, setEditName] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => onImport(file));
      e.target.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => onImport(file));
    }
  };

  const handleContextMenu = (e, asset) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      asset
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleDelete = (asset) => {
    if (onDeleteAsset) {
      onDeleteAsset(asset);
    }
    setContextMenu(null);
  };

  const handleStartRename = (asset) => {
    setEditingAsset(asset);
    setEditName(asset.name);
    setContextMenu(null);
  };

  const handleFinishRename = (asset) => {
    if (editName.trim() && editName !== asset.name && onRenameAsset) {
      onRenameAsset(asset, editName.trim());
    }
    setEditingAsset(null);
    setEditName('');
  };

  const handleKeyDown = (e, asset) => {
    if (e.key === 'Enter') {
      handleFinishRename(asset);
    } else if (e.key === 'Escape') {
      setEditingAsset(null);
      setEditName('');
    }
  };

  const filteredAssets = useMemo(() => {
    if (filter === 'all') return assets;
    return assets.filter(asset => asset.assetType === filter);
  }, [assets, filter]);

  const assetCounts = useMemo(() => {
    return {
      all: assets.length,
      model: assets.filter(a => a.assetType === 'model').length,
      texture: assets.filter(a => a.assetType === 'texture').length
    };
  }, [assets]);

  const getAssetIcon = (asset) => {
    if (asset.assetType === 'model') {
      return <IconModel className="asset-type-icon" />;
    }
    if (asset.assetType === 'texture') {
      return null;
    }
    return <IconFile className="asset-type-icon" />;
  };

  return (
    <CollapsiblePanel 
      title={msg('assets.title')} 
      className="assets-panel"
      storageKey="astra-panel-assets-collapsed"
      headerRight={
        <>
          <div className="assets-filter">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
              title={msg('assets.filterAll')}
            >
              {assetCounts.all}
            </button>
            <button 
              className={`filter-btn ${filter === 'model' ? 'active' : ''}`}
              onClick={() => setFilter('model')}
              title={msg('assets.filterModels')}
            >
              <IconModel className="filter-icon" />
              {assetCounts.model}
            </button>
            <button 
              className={`filter-btn ${filter === 'texture' ? 'active' : ''}`}
              onClick={() => setFilter('texture')}
              title={msg('assets.filterTextures')}
            >
              <IconImage className="filter-icon" />
              {assetCounts.texture}
            </button>
          </div>
          <button className="import-btn" onClick={handleImportClick} title={msg('assets.import')}>
            <IconPlus className="import-btn-icon" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".gltf,.glb,.obj,.png,.jpg,.jpeg,.webp"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </>
      }
    >
      <div
        className={`assets-content ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleCloseContextMenu}
      >
        {filteredAssets.length === 0 ? (
          <div className="assets-empty">
            {isDragging ? msg('assets.dragHint') : msg('assets.empty')}
          </div>
        ) : (
          <div className="assets-grid">
            {filteredAssets.map((asset, index) => (
              <div
                key={asset.id || index}
                className={`asset-item ${selectedAsset?.id === asset.id ? 'selected' : ''}`}
                onClick={() => onSelectAsset(asset)}
                onContextMenu={(e) => handleContextMenu(e, asset)}
                title={asset.name}
              >
                <div className="asset-preview">
                  {asset.assetType === 'texture' && asset.url ? (
                    <img 
                      src={asset.url} 
                      alt={asset.name}
                      className="asset-thumbnail"
                      draggable={false}
                    />
                  ) : (
                    <div className="asset-icon-wrapper">
                      {getAssetIcon(asset)}
                    </div>
                  )}
                </div>
                {editingAsset?.id === asset.id ? (
                  <input
                    type="text"
                    className="asset-name-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleFinishRename(asset)}
                    onKeyDown={(e) => handleKeyDown(e, asset)}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="asset-name">{asset.name}</div>
                )}
              </div>
            ))}
          </div>
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
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="context-menu-item"
            onClick={() => handleStartRename(contextMenu.asset)}
          >
            <IconRename className="context-menu-icon" />
            {msg('assets.rename')}
          </div>
          <div 
            className="context-menu-item context-menu-danger"
            onClick={() => handleDelete(contextMenu.asset)}
          >
            <IconDelete className="context-menu-icon" />
            {msg('assets.delete')}
          </div>
        </div>
      )}
    </CollapsiblePanel>
  );
}

export default AssetsPanel;
