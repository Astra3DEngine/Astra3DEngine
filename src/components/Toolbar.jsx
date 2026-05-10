import React from 'react';

function Toolbar({ currentTool, setCurrentTool, isPlaying, setIsPlaying }) {
  const tools = [
    { id: 'select', label: 'Select', icon: '↖' },
    { id: 'move', label: 'Move', icon: '✥' },
    { id: 'rotate', label: 'Rotate', icon: '↻' },
    { id: 'scale', label: 'Scale', icon: '⤢' }
  ];

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <span style={{ fontWeight: 'bold', marginRight: '16px' }}>ASTRA 3D</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {tools.map(tool => (
            <button
              key={tool.id}
              className={`toolbar-btn tool-btn ${currentTool === tool.id ? 'active' : ''}`}
              onClick={() => setCurrentTool(tool.id)}
              title={tool.label}
            >
              {tool.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-section">
        <button
          className={`toolbar-btn ${isPlaying ? 'stop' : 'play'}`}
          onClick={handlePlayToggle}
        >
          {isPlaying ? '■ Stop' : '▶ Play'}
        </button>
      </div>
    </div>
  );
}

export default Toolbar;
