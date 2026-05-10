import React from 'react';

function Toolbar({ isPlaying, setIsPlaying }) {
  const menus = [
    { id: 'file', label: '文件(F)' },
    { id: 'edit', label: '编辑(E)' },
    { id: 'view', label: '视图(V)' },
    { id: 'run', label: '运行(R)' }
  ];

  return (
    <div className="toolbar">
      <div className="toolbar-menus">
        {menus.map(menu => (
          <button key={menu.id} className="menu-btn">
            {menu.label}
          </button>
        ))}
      </div>

      <div className="toolbar-right">
        <button
          className={`toolbar-btn ${isPlaying ? 'stop' : 'play'}`}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? '■ Stop' : '▶ Play'}
        </button>
      </div>
    </div>
  );
}

export default Toolbar;