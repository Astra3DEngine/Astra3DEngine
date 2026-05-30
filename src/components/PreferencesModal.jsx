/**
 * @file components/PreferencesModal.jsx
 * @description 首选项模态框组件，管理应用偏好设置
 * @module components/PreferencesModal
 */

import React, { useState, useEffect } from 'react';
import { msg, getLocale, languages } from '../i18n/index.js';
import IconClose from '../icons/close.svg?react';
import { getAllThemes, subscribe } from '../utils/themeManager.js';

/**
 * 设置模态框组件
 * @param {Object} props - 组件属性
 * @param {boolean} props.isOpen - 是否打开
 * @param {Function} props.onClose - 关闭回调
 * @param {string} props.theme - 当前主题
 * @param {Function} props.onSetTheme - 设置主题回调
 * @param {Function} props.onToggleLocale - 切换语言回调
 * @param {Function} props.onSetLocale - 设置语言回调
 * @param {boolean} props.autoSaveEnabled - 是否启用自动保存
 * @param {Function} props.onToggleAutoSave - 切换自动保存回调
 * @param {number} props.maxSnapshots - 最大快照数量
 * @param {Function} props.onSetMaxSnapshots - 设置最大快照数量回调
 * @returns {JSX.Element|null} 设置模态框组件
 */
function PreferencesModal({ 
  isOpen, 
  onClose, 
  theme, 
  onSetTheme,
  onToggleLocale, 
  onSetLocale,
  autoSaveEnabled,
  onToggleAutoSave,
  maxSnapshots,
  onSetMaxSnapshots
}) {
  const [activeCategory, setActiveCategory] = useState('appearance');
  const [localMaxSnapshots, setLocalMaxSnapshots] = useState(maxSnapshots);
  const [availableThemes, setAvailableThemes] = useState(getAllThemes());
  const currentLocale = getLocale();

  useEffect(() => {
    const unsubscribe = subscribe((themes) => {
      setAvailableThemes(themes);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const categories = [
    { id: 'appearance', label: msg('preferences.category.appearance') },
    { id: 'language', label: msg('preferences.category.language') },
    { id: 'autosave', label: msg('preferences.category.autosave') }
  ];

  const handleMaxSnapshotsChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (value >= 1 && value <= 50) {
      setLocalMaxSnapshots(value);
    }
  };

  const handleMaxSnapshotsBlur = () => {
    if (localMaxSnapshots !== maxSnapshots) {
      onSetMaxSnapshots(localMaxSnapshots);
    }
  };

  const renderContent = () => {
    if (activeCategory === 'appearance') {
      return (
        <div className="preferences-section">
          <h3 className="preferences-section-title">{msg('preferences.theme.title')}</h3>
          <p className="preferences-section-description">{msg('preferences.theme.description')}</p>
          <div className="preferences-options">
            {availableThemes.map(t => (
              <button 
                key={t.id}
                className={`preference-option-btn ${theme === t.id ? 'active' : ''}`}
                onClick={() => theme !== t.id && onSetTheme(t.id)}
              >
                <span className="preference-option-label">{t.name}</span>
                {theme === t.id && <span className="preference-option-check">✓</span>}
              </button>
            ))}
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

    if (activeCategory === 'autosave') {
      return (
        <div className="preferences-section">
          <h3 className="preferences-section-title">{msg('preferences.autosave.title')}</h3>
          <p className="preferences-section-description">{msg('preferences.autosave.description')}</p>
          
          <div className="preferences-options">
            <button 
              className={`preference-option-btn ${autoSaveEnabled ? 'active' : ''}`}
              onClick={onToggleAutoSave}
            >
              <span className="preference-option-label">{msg('preferences.autosave.enabled')}</span>
              {autoSaveEnabled && <span className="preference-option-check">✓</span>}
            </button>
          </div>
          
          <div className="preferences-section" style={{ marginTop: '20px' }}>
            <h3 className="preferences-section-title">{msg('preferences.snapshots.title')}</h3>
            <p className="preferences-section-description">{msg('preferences.snapshots.description')}</p>
            <div className="preferences-input-row">
              <label className="preferences-input-label">{msg('preferences.snapshots.maxCount')}</label>
              <input 
                type="number"
                className="preferences-input"
                value={localMaxSnapshots}
                onChange={handleMaxSnapshotsChange}
                onBlur={handleMaxSnapshotsBlur}
                min={1}
                max={50}
              />
              <span className="preferences-input-hint">1 - 50</span>
            </div>
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
