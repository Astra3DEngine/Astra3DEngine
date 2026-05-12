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
      <div className="toolbar-left">
        <div className="toolbar-logo">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"
              height="24" viewBox="0,0,69.99346,66.43688">
              <g transform="translate(-205.00327,-146.78156)">
                  <g stroke="#000000" strokeWidth="0" strokeMiterlimit="10">
                      <path d="M274.99673,190.93032l-11.95866,22.28812h-44.44009l13.31277,-22.10459z"
                          fill="#0073bf" />
                      <path d="M216.31868,212.14198l-11.31541,-21.28864l24.21416,-0.00471z" fill="#66ccff" />
                      <path d="M227.50821,146.78156l23.50249,0.00667l23.98603,44.14209l-11.95866,22.28812z"
                          fill="#0099ff" />
                      <path d="M205.06042,188.54619l22.44779,-41.76463l23.50249,0.00667l-20.58917,41.73314z"
                          fill="#66ccff" />
                  </g>
              </g>
          </svg>
        </div>
        <div className="toolbar-menus">
          {menus.map(menu => (
            <button key={menu.id} className="menu-btn">
              {msg(menu.labelKey)}
            </button>
          ))}
        </div>
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