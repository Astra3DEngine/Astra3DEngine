/**
 * @file components/inspector/TextureSection.jsx
 * @description 贴图相关属性区：立方体面贴图、球/平面纹理、模型/网格贴图及 UV。
 * @module components/inspector/TextureSection
 */

import { msg } from '../../i18n/index.js';
import Vector2Field from './Vector2Field.jsx';

/**
 * @param {Object} props
 * @param {Object} props.selectedObject
 * @param {Array<Object>} props.textureAssets
 * @param {Function} props.onUpdateObject
 */
function TextureSection({ selectedObject, onUpdateObject, textureAssets }) {
  if (!selectedObject) return null;

  const update = (patch) => onUpdateObject(selectedObject.id, patch);
  const renderTextureSelect = (includeOriginal = false) => (
    <select
      className="inspector-input inspector-select"
      value={selectedObject.textureId || ''}
      onChange={(e) =>
        update({ textureId: e.target.value ? parseInt(e.target.value) : null })
      }
    >
      <option value="">{msg(includeOriginal ? 'inspector.originalTexture' : 'inspector.noTexture')}</option>
      {textureAssets.map((asset) => (
        <option key={asset.id} value={asset.id}>
          {asset.name}
        </option>
      ))}
    </select>
  );

  const renderUVFields = () => (
    <>
      <Vector2Field
        label={msg('inspector.uvScale')}
        values={selectedObject.uvScale}
        fallback={[1, 1]}
        onChange={(i, v) => {
          const newValue = parseFloat(v) || 0;
          const currentUV = selectedObject.uvScale || [1, 1];
          const newUV = [...currentUV];
          newUV[i] = newValue;
          update({ uvScale: newUV });
        }}
        min="0.01"
      />
      <Vector2Field
        label={msg('inspector.uvOffset')}
        values={selectedObject.uvOffset}
        fallback={[0, 0]}
        onChange={(i, v) => {
          const newValue = parseFloat(v) || 0;
          const currentUV = selectedObject.uvOffset || [0, 0];
          const newUV = [...currentUV];
          newUV[i] = newValue;
          update({ uvOffset: newUV });
        }}
      />
    </>
  );

  const faceTextures = selectedObject.faceTextures;

  return (
    <>
      {/* cube 面贴图 */}
      {selectedObject.type === 'cube' && faceTextures && (
        <div className="inspector-section">
          <div className="inspector-section-title">{msg('inspector.faceTextures')}</div>
          {['right', 'left', 'top', 'bottom', 'front', 'back'].map((faceName) => (
            <div key={faceName} className="inspector-row">
              <label className="inspector-label">{msg(`inspector.face.${faceName}`)}</label>
              <select
                className="inspector-input inspector-select"
                value={faceTextures[faceName] || ''}
                onChange={(e) =>
                  update({
                    faceTextures: {
                      ...faceTextures,
                      [faceName]: e.target.value ? parseInt(e.target.value) : null,
                    },
                  })
                }
              >
                <option value="">{msg('inspector.noTexture')}</option>
                {textureAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* 球/平面单纹理 */}
      {(selectedObject.type === 'sphere' || selectedObject.type === 'plane') && (
        <div className="inspector-row">
          <label className="inspector-label">{msg('inspector.texture')}</label>
          {renderTextureSelect()}
        </div>
      )}

      {/* 模型贴图 + UV */}
      {selectedObject.isModel && (
        <div className="inspector-section">
          <div className="inspector-section-title">{msg('inspector.modelTexture')}</div>
          <div className="inspector-row">
            <label className="inspector-label">{msg('inspector.texture')}</label>
            {renderTextureSelect()}
          </div>
          {selectedObject.textureId != null && (
            <div className="inspector-section">{renderUVFields()}</div>
          )}
        </div>
      )}

      {/* mesh 内部贴图 + UV */}
      {selectedObject.type === 'mesh' && (
        <div className="inspector-section">
          <div className="inspector-section-title">{msg('inspector.meshTexture')}</div>
          <div className="inspector-row">
            <label className="inspector-label">{msg('inspector.texture')}</label>
            {renderTextureSelect(true)}
          </div>
          {selectedObject.textureId != null && (
            <div className="inspector-section">{renderUVFields()}</div>
          )}
        </div>
      )}

      {/* 球/平面 UV 变换 */}
      {(selectedObject.type === 'sphere' || selectedObject.type === 'plane') &&
        selectedObject.textureId != null && (
          <div className="inspector-section">
            <div className="inspector-section-title">{msg('inspector.uvTransform')}</div>
            {renderUVFields()}
          </div>
        )}
    </>
  );
}

export default TextureSection;