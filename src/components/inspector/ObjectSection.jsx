/**
 * @file components/inspector/ObjectSection.jsx
 * @description 对象基础属性区：预制件信息、名称/类型/父级/颜色。
 * @module components/inspector/ObjectSection
 */

import { msg } from '../../i18n/index.js';
import IconPrefabInstance from '../../assets/icons/tools/prefab-instance.svg?react';
import ColorPicker from '../primitives/ColorPicker.jsx';
import { getAllDescendantIds } from '../../engine/TreeMath.js';
import { tip } from '../../lib/tooltip.js';

/**
 * @param {Object} props
 * @param {Object|null} props.selectedObject
 * @param {Object|null} props.prefab
 * @param {boolean} props.isPrefabInstance
 * @param {Array<Object>} props.parentOptions
 * @param {Array<Object>} props.objects
 * @param {Function} props.onUpdateObject
 * @param {Function} props.onApplyToPrefab
 * @param {Function} props.onDisconnectPrefab
 */
function ObjectSection({
  selectedObject,
  prefab,
  isPrefabInstance,
  parentOptions,
  objects,
  onUpdateObject,
  onApplyToPrefab,
  onDisconnectPrefab,
}) {
  if (!selectedObject) return null;

  const handleNameChange = (name) => onUpdateObject(selectedObject.id, { name });
  const handleParentChange = (parentId) => {
    const newParentId = parentId === '' ? null : parentId;
    if (newParentId === selectedObject.id) return;

    const descendants = getAllDescendantIds(selectedObject.id, objects || []);
    if (newParentId && descendants.has(newParentId)) return;

    onUpdateObject(selectedObject.id, { parentId: newParentId });
  };
  const handleColorChange = (color) => onUpdateObject(selectedObject.id, { color });
  const handleOverrideToggle = (property) => {
    const currentOverrides = selectedObject.overrides || { scale: false, color: false };
    onUpdateObject(selectedObject.id, {
      overrides: { ...currentOverrides, [property]: !currentOverrides[property] },
    });
  };

  return (
    <>
      {isPrefabInstance && (
        <div className="inspector-section inspector-prefab-section">
          <div className="inspector-section-title">{msg('inspector.prefab')}</div>
          <div className="inspector-prefab-info">
            <IconPrefabInstance className="inspector-prefab-icon" />
            <span className="inspector-prefab-name">{prefab.name}</span>
          </div>
          <div className="inspector-prefab-actions">
            <button
              className="btn btn-small"
              onClick={() => onApplyToPrefab(selectedObject.id)}
              {...tip(msg('inspector.applyToPrefab'))}
            >
              {msg('inspector.applyToPrefab')}
            </button>
            <button
              className="btn btn-small btn-secondary"
              onClick={() => onDisconnectPrefab(selectedObject.id)}
              {...tip(msg('inspector.disconnectPrefab'))}
            >
              {msg('inspector.disconnectPrefab')}
            </button>
          </div>
        </div>
      )}

      <div className="inspector-section">
        <div className="inspector-section-title">{msg('inspector.object')}</div>
        <div className="inspector-row">
          <label className="inspector-label">{msg('inspector.name')}</label>
          <input
            type="text"
            className="inspector-input"
            value={selectedObject.name || ''}
            onChange={(e) => handleNameChange(e.target.value)}
          />
        </div>
        <div className="inspector-row">
          <label className="inspector-label">{msg('inspector.type')}</label>
          <input
            type="text"
            className="inspector-input"
            value={
              isPrefabInstance
                ? `${prefab.template.type} (Prefab)`
                : selectedObject.isLight
                  ? msg(`hierarchy.${selectedObject.type || 'light'}`)
                  : selectedObject.type || 'unknown'
            }
            disabled
            style={{ opacity: 0.6 }}
          />
        </div>
        <div className="inspector-row">
          <label className="inspector-label">{msg('inspector.parent')}</label>
          <select
            className="inspector-input inspector-select"
            value={selectedObject.parentId || ''}
            onChange={(e) => handleParentChange(e.target.value)}
          >
            <option value="">{msg('inspector.none')}</option>
            {parentOptions.map((obj) => (
              <option key={obj.id} value={obj.id}>
                {obj.name}
              </option>
            ))}
          </select>
        </div>
        <div className="inspector-row">
          <label className="inspector-label">{msg('inspector.color')}</label>
          <div className="inspector-color-row">
            <ColorPicker value={selectedObject.color || '#ffffff'} onChange={handleColorChange} />
            {isPrefabInstance && (
              <label className="inspector-override-label">
                <input
                  type="checkbox"
                  checked={selectedObject.overrides?.color || false}
                  onChange={() => handleOverrideToggle('color')}
                />
                <span>{msg('inspector.override')}</span>
              </label>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ObjectSection;
