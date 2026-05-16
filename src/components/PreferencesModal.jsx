import React, { useState } from 'react';
import { msg, getLocale, languages } from '../i18n/index.js';
import IconClose from '../icons/close.svg?react';

function PreferencesModal({ isOpen, onClose, theme, onToggleTheme, onToggleLocale, onSetLocale }) {
  const [activeCategory, setActiveCategory] = useState('appearance');
  const currentLocale = getLocale();

  if (!isOpen) return null;

  const categories = [
    { id: 'appearance', label: msg('preferences.category.appearance') },
    { id: 'language', label: msg('preferences.category.language') }
  ];

  const renderContent = () => {
    if (activeCategory === 'appearance') {
      return (
        <div className="preferences-section">
          <h3 className="preferences-section-title">{msg('preferences.theme.title')}</h3>
          <p className="preferences-section-description">{msg('preferences.theme.description')}</p>
          <div className="preferences-options">
            <button 
              className={`preference-option-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => theme !== 'dark' && onToggleTheme()}
            >
              <span className="preference-option-label">{msg('menu.darkMode')}</span>
              {theme === 'dark' && <span className="preference-option-check">✓</span>}
            </button>
            <button 
              className={`preference-option-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => theme !== 'light' && onToggleTheme()}
            >
              <span className="preference-option-label">{msg('menu.lightMode')}</span>
              {theme === 'light' && <span className="preference-option-check">✓</span>}
            </button>
          </div>
        </div>
      );
    }

    if (activeCategory === 'language') {
      return (
        <div className="preferences-section">
          <h3 className="preferences-section-title">{msg('preferences.language.title')}</h3>
          <p className="preferences-section-description">{msg('preferences.language.description')}</p>
          <div className="preferences-options">
            {languages.map(lang => (
              <button 
                key={lang.code}
                className={`preference-option-btn ${currentLocale === lang.code ? 'active' : ''}`}
                onClick={() => {
                  if (currentLocale !== lang.code) {
                    onSetLocale(lang.code);
                  }
                }}
              >
                <span className="preference-option-label">{lang.nativeName}</span>
                {currentLocale === lang.code && <span className="preference-option-check">✓</span>}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content preferences-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{msg('menu.preferences')}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <IconClose className="modal-close-icon" />
          </button>
        </div>
        
        <div className="preferences-body">
          <div className="preferences-sidebar">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`preferences-category-btn ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
          
          <div className="preferences-content">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PreferencesModal;
