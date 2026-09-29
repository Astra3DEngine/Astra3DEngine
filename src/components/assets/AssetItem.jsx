/**
 * @file components/assets/AssetItem.jsx
 * @description 资源网格项：缩略图/类型图标 + 名称（支持内联重命名）。
 * @module components/assets/AssetItem
 */

import RenameInput from '../primitives/RenameInput.jsx';
import { tip } from '../../lib/tooltip.js';
import IconModel from '../../assets/icons/tools/cube.svg?react';
import IconFile from '../../assets/icons/editor/file.svg?react';

/**
 * @param {Object} props
 * @param {Object} props.asset - 资源对象
 * @param {Object|null} props.selectedAsset - 当前选中资源
 * @param {Object|null} props.editingAsset - 正在重命名的资源
 * @param {boolean} props.isSelected - 是否选中
 * @param {Function} props.onSelect - 选择回调
 * @param {Function} props.onContextMenu - 右键回调
 * @param {Function} props.onDragStart - 拖拽开始回调
 * @param {Function} props.onRenameSubmit - 重命名提交
 * @param {Function} props.onRenameCancel - 取消重命名
 */
function AssetItem({
  asset,
  isSelected,
  editingAsset,
  onSelect,
  onContextMenu,
  onDragStart,
  onRenameSubmit,
  onRenameCancel,
}) {
  const isEditing = editingAsset?.id === asset.id;

  const renderIcon = () => {
    if (asset.assetType === 'model') {
      return <IconModel className="asset-type-icon" />;
    }
    if (asset.assetType === 'texture') {
      return null;
    }
    return <IconFile className="asset-type-icon" />;
  };

  return (
    <div
      className={`asset-item ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      onDragStart={onDragStart}
      draggable={asset.assetType === 'texture'}
      {...tip(asset.name)}
    >
      <div className="asset-preview">
        {asset.assetType === 'texture' && asset.url ? (
          <img src={asset.url} alt={asset.name} className="asset-thumbnail" draggable={false} />
        ) : (
          <div className="asset-icon-wrapper">{renderIcon()}</div>
        )}
      </div>
      {isEditing ? (
        <RenameInput
          value={asset.name}
          className="asset-name-input"
          onSubmit={(value) => onRenameSubmit(asset, value)}
          onCancel={onRenameCancel}
        />
      ) : (
        <div className="asset-name">{asset.name}</div>
      )}
    </div>
  );
}

export default AssetItem;
