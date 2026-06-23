/**
 * @file components/SceneSettingsPanel.jsx
 * @description 场景设置面板组件，显示和编辑当前场景的环境设置
 * @module components/SceneSettingsPanel
 */

import React from 'react';
import { msg } from '../i18n/index.js';

/**
 * 场景设置面板组件
 * 
 * 当没有选中对象时显示，用于配置当前场景的环境设置喵！
 * 包含环境光、背景色、雾效等设置项。
 * 
 * @param {Object} props - 组件属性
 * @param {Object} props.sceneSettings - 当前场景的设置对象
 * @param {Function} props.onUpdateSettings - 更新场景设置回调
 * @returns {JSX.Element} 场景设置面板组件
 */
function SceneSettingsPanel({ sceneSettings = {}, onUpdateSettings }) {
  // 默认设置值，防止 undefined 导致的报错喵！
  const settings = {
    ambientLight: { color: '#ffffff', intensity: 0.5 },
    backgroundColor: '#1a1a2e',
    fog: { enabled: false, color: '#ffffff', near: 1, far: 1000 },
    ...sceneSettings
  };

  /**
   * 处理环境光颜色变化
   */
  const handleAmbientColorChange = (color) => {
    onUpdateSettings({
      ...settings,
      ambientLight: { ...settings.ambientLight, color }
    });
  };

  /**
   * 处理环境光强度变化
   */
  const handleAmbientIntensityChange = (intensity) => {
    onUpdateSettings({
      ...settings,
      ambientLight: { ...settings.ambientLight, intensity: parseFloat(intensity) || 0 }
    });
  };

  /**
   * 处理背景颜色变化
   */
  const handleBackgroundColorChange = (color) => {
    onUpdateSettings({
      ...settings,
      backgroundColor: color
    });
  };

  /**
   * 处理雾效开关变化
   */
  const handleFogEnabledChange = (enabled) => {
    onUpdateSettings({
      ...settings,
      fog: { ...settings.fog, enabled }
    });
  };

  /**
   * 处理雾效颜色变化
   */
  const handleFogColorChange = (color) => {
    onUpdateSettings({
      ...settings,
      fog: { ...settings.fog, color }
    });
  };

  /**
   * 处理雾效近距变化
   */
  const handleFogNearChange = (near) => {
    onUpdateSettings({
      ...settings,
      fog: { ...settings.fog, near: parseFloat(near) || 0 }
    });
  };

  /**
   * 处理雾效远距变化
   */
  const handleFogFarChange = (far) => {
    onUpdateSettings({
      ...settings,
      fog: { ...settings.fog, far: parseFloat(far) || 0 }
    });
  };

  return (
    <div className="scene-settings-panel">
      {/* 环境光设置喵！ */}
      <div className="inspector-section">
        <div className="inspector-section-title">{msg('sceneSettings.ambientLight')}</div>
        <div className="inspector-row">
          <label className="inspector-label">{msg('sceneSettings.color')}</label>
          <div className="inspector-color-row">
            <input
              type="color"
              className="inspector-input inspector-color"
              value={settings.ambientLight.color}
              onChange={(e) => handleAmbientColorChange(e.target.value)}
            />
          </div>
        </div>
        <div className="inspector-row">
          <label className="inspector-label">{msg('sceneSettings.intensity')}</label>
          <input
            type="number"
            className="inspector-input inspector-number"
            value={settings.ambientLight.intensity}
            min={0}
            max={2}
            step={0.1}
            onChange={(e) => handleAmbientIntensityChange(e.target.value)}
          />
        </div>
      </div>

      {/* 背景颜色设置喵！ */}
      <div className="inspector-section">
        <div className="inspector-section-title">{msg('sceneSettings.background')}</div>
        <div className="inspector-row">
          <label className="inspector-label">{msg('sceneSettings.backgroundColor')}</label>
          <div className="inspector-color-row">
            <input
              type="color"
              className="inspector-input inspector-color"
              value={settings.backgroundColor}
              onChange={(e) => handleBackgroundColorChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 雾效设置喵！ */}
      <div className="inspector-section">
        <div className="inspector-section-title">{msg('sceneSettings.fog')}</div>
        <div className="inspector-row">
          <label className="inspector-label">{msg('sceneSettings.enabled')}</label>
          <input
            type="checkbox"
            checked={settings.fog.enabled}
            onChange={(e) => handleFogEnabledChange(e.target.checked)}
          />
        </div>
        
        {/* 只有启用雾效时才显示详细设置喵！ */}
        {settings.fog.enabled && (
          <>
            <div className="inspector-row">
              <label className="inspector-label">{msg('sceneSettings.color')}</label>
              <div className="inspector-color-row">
                <input
                  type="color"
                  className="inspector-input inspector-color"
                  value={settings.fog.color}
                  onChange={(e) => handleFogColorChange(e.target.value)}
                />
              </div>
            </div>
            <div className="inspector-row">
              <label className="inspector-label">{msg('sceneSettings.fogNear')}</label>
              <input
                type="number"
                className="inspector-input inspector-number"
                value={settings.fog.near}
                min={0}
                step={1}
                onChange={(e) => handleFogNearChange(e.target.value)}
              />
            </div>
            <div className="inspector-row">
              <label className="inspector-label">{msg('sceneSettings.fogFar')}</label>
              <input
                type="number"
                className="inspector-input inspector-number"
                value={settings.fog.far}
                min={0}
                step={1}
                onChange={(e) => handleFogFarChange(e.target.value)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SceneSettingsPanel;