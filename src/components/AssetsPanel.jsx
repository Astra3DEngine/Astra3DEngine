import React, { useRef, useState } from 'react';
import { msg } from '../i18n/index.js';
import CollapsiblePanel from './CollapsiblePanel.jsx';

function AssetsPanel({ assets, onImport, onSelectAsset, selectedAsset }) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

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

  const getAssetIcon = (type) => {
    switch (type) {
      case 'gltf':
      case 'glb':
        return '📦';
      case 'texture':
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
        return '🖼';
      default:
        return '📄';
    }
  };

  return (
    <CollapsiblePanel 
      title={msg('assets.title')} 
      className="assets-panel"
      storageKey="astra-panel-assets-collapsed"
      headerRight={
        <>
          <button className="btn btn-small" onClick={handleImportClick}>
            {msg('assets.import')}
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
      >
        {assets.length === 0 ? (
          <div className="assets-empty">
            {isDragging ? msg('assets.dragHint') : msg('assets.empty')}
          </div>
        ) : (
          <div className="assets-grid">
            {assets.map((asset, index) => (
              <div
                key={asset.id || index}
                className={`asset-item ${selectedAsset?.id === asset.id ? 'selected' : ''}`}
                onClick={() => onSelectAsset(asset)}
                title={asset.name}
              >
                <div className="asset-icon">{getAssetIcon(asset.type)}</div>
                <div className="asset-name">{asset.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CollapsiblePanel>
  );
}

export default AssetsPanel;
