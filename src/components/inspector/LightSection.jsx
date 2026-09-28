/**
 * @file components/inspector/LightSection.jsx
 * @description 光源属性区：强度/距离/衰减/角度/半影。
 * @module components/inspector/LightSection
 */

import { msg } from '../../i18n/index.js';

/**
 * @param {Object} props
 * @param {Object} props.selectedObject
 * @param {Function} props.onUpdateObject
 */
function LightSection({ selectedObject, onUpdateObject }) {
  if (!selectedObject || !selectedObject.isLight) return null;

  const lightType = selectedObject.lightType;
  const update = (patch) => onUpdateObject(selectedObject.id, patch);

  return (
    <div className="inspector-section">
      <div className="inspector-section-title">{msg('inspector.light')}</div>
      <div className="inspector-row">
        <label className="inspector-label">{msg('inspector.intensity')}</label>
        <input
          type="number"
          className="inspector-input inspector-number"
          value={selectedObject.intensity || 2}
          min={0}
          step={0.1}
          onChange={(e) => update({ intensity: parseFloat(e.target.value) || 2 })}
        />
      </div>
      {(lightType === 'point' || lightType === 'spot') && (
        <>
          <div className="inspector-row">
            <label className="inspector-label">{msg('inspector.distance')}</label>
            <input
              type="number"
              className="inspector-input inspector-number"
              value={selectedObject.distance || 10}
              min={0}
              step={1}
              onChange={(e) => update({ distance: parseFloat(e.target.value) || 10 })}
            />
          </div>
          <div className="inspector-row">
            <label className="inspector-label">{msg('inspector.decay')}</label>
            <input
              type="number"
              className="inspector-input inspector-number"
              value={selectedObject.decay || 1}
              min={0}
              step={0.1}
              onChange={(e) => update({ decay: parseFloat(e.target.value) || 1 })}
            />
          </div>
        </>
      )}
      {lightType === 'spot' && (
        <>
          <div className="inspector-row">
            <label className="inspector-label">{msg('inspector.angle')}</label>
            <input
              type="number"
              className="inspector-input inspector-number"
              value={
                selectedObject.angle ? ((selectedObject.angle * 180) / Math.PI).toFixed(1) : 45
              }
              min={0}
              max={90}
              step={1}
              onChange={(e) =>
                update({ angle: (parseFloat(e.target.value) * Math.PI) / 180 || Math.PI / 4 })
              }
            />
          </div>
          <div className="inspector-row">
            <label className="inspector-label">{msg('inspector.penumbra')}</label>
            <input
              type="number"
              className="inspector-input inspector-number"
              value={selectedObject.penumbra || 0.3}
              min={0}
              max={1}
              step={0.1}
              onChange={(e) => update({ penumbra: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default LightSection;