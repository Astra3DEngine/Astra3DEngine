import React from 'react';
import { msg, localeNames } from '../i18n/index.js';

function Toolbar({ isPlaying, setIsPlaying, onToggleLocale, currentLocale }) {
  const menus = [
    { id: 'file', labelKey: 'menu.file' },
    { id: 'edit', labelKey: 'menu.edit' },
    { id: 'view', labelKey: 'menu.view' },
    { id: 'run', labelKey: 'menu.run' }
  ];

  return (
    <div className="toolbar">
      <div className="toolbar-menus">
        {menus.map(menu => (
          <button key={menu.id} className="menu-btn">
            {msg(menu.labelKey)}
          </button>
        ))}
      </div>

      <div className="toolbar-right">
        <button
          className={`toolbar-btn ${isPlaying ? 'stop' : 'play'}`}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? msg('toolbar.stop') : msg('toolbar.play')}
        </button>
        <button
          className="menu-btn"
          onClick={onToggleLocale}
          title={localeNames[currentLocale === 'en' ? 'zh' : 'en']}
        >
          {currentLocale === 'en' ? '中文' : 'EN'}
        </button>
      </div>
    </div>
  );
}

export default Toolbar;