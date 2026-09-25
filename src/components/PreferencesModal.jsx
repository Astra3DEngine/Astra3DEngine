/**
 * @file components/PreferencesModal.jsx
 * @description 首选项模态框组件，管理应用偏好设置
 * @module components/PreferencesModal
 */

import React, { useState, useEffect } from 'react';
import { msg, getLocale, languages } from '../i18n/index.js';
import Modal from './Modal.jsx';
import { getAllThemes, subscribe } from '../utils/themeManager.js';
import { shortcuts, formatShortcut } from '../lib/ShortcutManager.js';

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
 * @returns {JSX.Element} 设置模态框组件
 */
function PreferencesModal({
  isOpen,
  onClose,
  theme,
  onSetTheme,
  onSetLocale,
  autoSaveEnabled,
  onToggleAutoSave,
  maxSnapshots,
  onSetMaxSnapshots,
}) {
  const [activeCategory, setActiveCategory] = useState('appearance');
  const [localMaxSnapshots, setLocalMaxSnapshots] = useState(maxSnapshots);
  const [availableThemes, setAvailableThemes] = useState(getAllThemes());
  const [recordingId, setRecordingId] = useState(null);
  const [conflictKey, setConflictKey] = useState(null);
  const [, setVersion] = useState(0);
  const currentLocale = getLocale();

  useEffect(() => {
    const unsubscribe = subscribe((themes) => {
      setAvailableThemes(themes);
    });
    return unsubscribe;
  }, []);

  // 订阅快捷键绑定变化以刷新显示
  useEffect(() => {
    const off = shortcuts.subscribe(() => setVersion((v) => v + 1));
    return off;
  }, []);

  // 录制新快捷键：capture 阶段拦截，避免触发其它快捷键
  useEffect(() => {
    if (!recordingId || !isOpen) return;
    const onKey = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setRecordingId(null);
        setConflictKey(null);
        return;
      }
      const combo = formatShortcut(e);
      if (!combo) return;
      const conflict = shortcuts
        .getCommands()
        .find(
          (c) =>
            c.id !== recordingId &&
            shortcuts
              .getBinding(c.id)
              .split('|')
              .includes(combo)
        );
      if (conflict) {
        setConflictKey(combo);
        return;
      }
      shortcuts.setBinding(recordingId, combo);
      setRecordingId(null);
      setConflictKey(null);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [recordingId, isOpen]);

  const categories = [
    { id: 'appearance', label: msg('preferences.category.appearance') },
    { id: 'language', label: msg('preferences.category.language') },
    { id: 'keybinds', label: msg('preferences.category.keybinds') },
    { id: 'autosave', label: msg('preferences.category.autosave') },
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
            {availableThemes.map((t) => (
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
          <p className="preferences-section-description">
            {msg('preferences.language.description')}
          </p>
          <div className="preferences-options">
            {languages.map((lang) => (
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

    if (activeCategory === 'keybinds') {
      // 按分类分组
      const groups = [];
      const map = new Map();
      for (const cmd of shortcuts.getCommands()) {
        if (!map.has(cmd.category)) map.set(cmd.category, []);
        map.get(cmd.category).push(cmd);
      }
      for (const [cat, commands] of map) {
        groups.push({ category: cat, commands });
      }

      return (
        <div className="preferences-section keybinds-section">
          <h3 className="preferences-section-title">{msg('preferences.keybinds.title')}</h3>
          <p className="preferences-section-description">
            {msg('preferences.keybinds.description')}
          </p>

          {groups.map((group) => (
            <div key={group.category || '_'} className="keybind-group">
              {group.category && (
                <div className="keybind-group-title">{msg(group.category)}</div>
              )}
              {group.commands.map((cmd) => {
                const recording = recordingId === cmd.id;
                return (
                  <div key={cmd.id} className="keybind-row">
                    <span className="keybind-label">{msg(cmd.label)}</span>
                    <button
                      className={`keybind-keys ${recording ? 'recording' : ''} ${
                        conflictKey && recording ? 'conflict' : ''
                      }`}
                      onClick={() => {
                        setConflictKey(null);
                        setRecordingId(recording ? null : cmd.id);
                      }}
                    >
                      {recording
                        ? conflictKey
                          ? `${conflictKey} ✗`
                          : msg('keybinds.press')
                        : shortcuts.getBinding(cmd.id)}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}

          <button className="btn keybinds-reset" onClick={() => shortcuts.resetAll()}>
            {msg('keybinds.resetAll')}
          </button>
        </div>
      );
    }

    if (activeCategory === 'autosave') {
      return (
        <div className="preferences-section">
          <h3 className="preferences-section-title">{msg('preferences.autosave.title')}</h3>
          <p className="preferences-section-description">
            {msg('preferences.autosave.description')}
          </p>

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
            <p className="preferences-section-description">
              {msg('preferences.snapshots.description')}
            </p>
            <div className="preferences-input-row">
              <label className="preferences-input-label">
                {msg('preferences.snapshots.maxCount')}
              </label>
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={msg('menu.preferences')}
      width={650}
      height={420}
    >
      <div className="preferences-body">
        <div className="preferences-sidebar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`preferences-category-btn ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="preferences-content">{renderContent()}</div>
      </div>
    </Modal>
  );
}

export default PreferencesModal;
