/**
 * @file components/inspector/TransformSection.jsx
 * @description 变换属性区：位置/旋转/缩放，支持相对父级变换。
 * @module components/inspector/TransformSection
 */

import { msg } from '../../i18n/index.js';
import {
  computeRelativeTransformData,
  computeWorldTransformFromRelativeData,
} from '../../engine/TreeMath.js';

/**
 * @param {Object} props
 * @param {Object} props.selectedObject
 * @param {Array<Object>} props.objects - 场景对象列表（用于查找父对象）
 * @param {boolean} props.isPrefabInstance
 * @param {Function} props.onUpdateObject
 */
function TransformSection({ selectedObject, objects, isPrefabInstance, onUpdateObject }) {
  if (!selectedObject) return null;

  const parentObject = selectedObject.parentId
    ? objects.find((obj) => obj.id === selectedObject.parentId)
    : null;

  // 有父对象时显示相对变换，否则显示世界变换
  const displayTransform = parentObject
    ? computeRelativeTransformData(selectedObject, parentObject)
    : {
        position: selectedObject.position,
        rotation: selectedObject.rotation,
        scale: selectedObject.scale,
      };

  const handleTransformChange = (property, index, value) => {
    const newValue = parseFloat(value) || 0;

    if (parentObject) {
      const newRelativeTransform = { ...displayTransform };
      newRelativeTransform[property] = [...displayTransform[property]];
      newRelativeTransform[property][index] = newValue;

      const worldTransform = computeWorldTransformFromRelativeData(
        newRelativeTransform,
        parentObject
      );
      onUpdateObject(selectedObject.id, { [property]: worldTransform[property] });
    } else {
      const newTransform = [...selectedObject[property]];
      newTransform[index] = newValue;
      onUpdateObject(selectedObject.id, { [property]: newTransform });
    }
  };

  const handleOverrideToggle = (property) => {
    const currentOverrides = selectedObject.overrides || { scale: false, color: false };
    onUpdateObject(selectedObject.id, {
      overrides: { ...currentOverrides, [property]: !currentOverrides[property] },
    });
  };

  const renderVector3 = (property, min, step) => (
    <div className="inspector-vector3">
      {['X', 'Y', 'Z'].map((axis, i) => (
        <div key={axis} className="vector-input">
          <span className="vector-label">{axis}</span>
          <input
            type="number"
            className="inspector-input"
            value={displayTransform[property][i]}
            onChange={(e) => handleTransformChange(property, i, e.target.value)}
            min={min}
            step={step}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="inspector-section">
      <div className="inspector-section-title">
        {msg('inspector.transform')}
        {parentObject && (
          <span className="inspector-relative-hint"> ({msg('window.relative')})</span>
        )}
      </div>

      <div className="inspector-row">
        <label className="inspector-label">{msg('inspector.position')}</label>
        {renderVector3('position')}
      </div>

      <div className="inspector-row">
        <label className="inspector-label">{msg('inspector.rotation')}</label>
        {renderVector3('rotation')}
      </div>

      <div className="inspector-row">
        <label className="inspector-label">{msg('inspector.scale')}</label>
        <div className="inspector-vector3-with-override">
          {renderVector3('scale', '0.01', '0.1')}
          {isPrefabInstance && (
            <label className="inspector-override-label">
              <input
                type="checkbox"
                checked={selectedObject.overrides?.scale || false}
                onChange={() => handleOverrideToggle('scale')}
              />
              <span>{msg('inspector.override')}</span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

export default TransformSection;
