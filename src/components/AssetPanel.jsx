import React from 'react';

function AssetPanel() {
  const assets = [
    { name: 'Cube', icon: '◼', type: 'primitive' },
    { name: 'Sphere', icon: '●', type: 'primitive' },
    { name: 'Plane', icon: '▬', type: 'primitive' },
    { name: 'Cylinder', icon: '⬭', type: 'primitive' },
    { name: 'Torus', icon: '◎', type: 'primitive' },
    { name: 'Cone', icon: '△', type: 'primitive' }
  ];

  return (
    <div className="panel asset-panel">
      <div className="panel-header">
        <span>Assets</span>
      </div>
      <div className="panel-content">
        <div className="asset-grid">
          {assets.map((asset, index) => (
            <div key={index} className="asset-item">
              <span className="asset-item-icon">{asset.icon}</span>
              <span className="asset-item-name">{asset.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AssetPanel;
