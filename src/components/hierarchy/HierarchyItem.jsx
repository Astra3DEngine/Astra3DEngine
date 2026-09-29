/**
 * @file components/hierarchy/HierarchyItem.jsx
 * @description 层级面板单个对象项，支持递归渲染子树。
 * 依赖通过 props 显式注入（展开状态、拖拽状态、各回调），便于复用与测试。
 * @module components/hierarchy/HierarchyItem
 */

import React from 'react';
import { msg } from '../../i18n/index.js';
import RenameInput from '../primitives/RenameInput.jsx';
import { tip } from '../../lib/tooltip.js';
import { getAllDescendants } from '../../engine/TreeMath.js';
import IconCube from '../../assets/icons/tools/cube.svg?react';
import IconSphere from '../../assets/icons/tools/sphere.svg?react';
import IconPlane from '../../assets/icons/tools/plane.svg?react';
import IconModel from '../../assets/icons/tools/model.svg?react';
import IconFolder from '../../assets/icons/editor/folder.svg?react';
import IconPrefabInstance from '../../assets/icons/tools/prefab-instance.svg?react';
import IconDelete from '../../assets/icons/editor/delete.svg?react';
import IconChevronCollapsed from '../../assets/icons/nav/chevron-collapsed.svg?react';
import IconPointLight from '../../assets/icons/tools/light-point.svg?react';
import IconDirectionalLight from '../../assets/icons/tools/light-directional.svg?react';
import IconSpotLight from '../../assets/icons/tools/light-spot.svg?react';

/**
 * 按对象类型匹配层级图标。
 * @param {Object} obj - 场景对象
 * @returns {JSX.Element} 图标元素
 */
function getObjectIcon(obj) {
  if (obj.isFolder) return <IconFolder className="hierarchy-icon" />;
  if (obj.type === 'mesh') return <IconModel className="hierarchy-icon" />;
  if (obj.prefabId) return <IconPrefabInstance className="hierarchy-icon" />;
  if (obj.type === 'cube') return <IconCube className="hierarchy-icon" />;
  if (obj.type === 'sphere') return <IconSphere className="hierarchy-icon" />;
  if (obj.type === 'plane') return <IconPlane className="hierarchy-icon" />;
  if (obj.type === 'model') return <IconModel className="hierarchy-icon" />;
  if (obj.type === 'pointLight') return <IconPointLight className="hierarchy-icon" />;
  if (obj.type === 'directionalLight') return <IconDirectionalLight className="hierarchy-icon" />;
  if (obj.type === 'spotLight') return <IconSpotLight className="hierarchy-icon" />;
  return <IconCube className="hierarchy-icon" />;
}

/**
 * @param {Object} props
 * @param {Object} props.obj - 当前对象
 * @param {number} props.depth - 缩进深度
 * @param {Array<Object>} props.objects - 全部对象（用于找子级）
 * @param {Array<Object>} props.selectedObjects - 多选对象
 * @param {number|null} props.isRenaming - 正在重命名的对象 id
 * @param {Set<number>} props.expandedIds - 展开集合
 * @param {number|null} props.draggedId - 拖拽中的对象 id
 * @param {number|null} props.dropTarget - 放置目标对象 id
 * @param {string|null} props.dropPosition - 'before' | 'after' | 'inside'
 * @param {Function} props.getPrefabName - 预制件名解析
 * @param {Function} props.toggleExpanded - 展开/收起
 * @param {Function} props.onSelectObject - 选择回调
 * @param {Function} props.onDeleteObject - 删除回调
 * @param {Function} props.onRenameObject - 重命名提交
 * @param {Function} props.onRenameCancel - 取消重命名
 * @param {Function} props.onContextMenu - 右键菜单
 * @param {Function} props.onDragStart
 * @param {Function} props.onDragEnd
 * @param {Function} props.onDragOver
 * @param {Function} props.onDragLeave
 * @param {Function} props.onDrop
 */
function HierarchyItem({
  obj,
  depth = 0,
  objects,
  selectedObjects,
  isRenaming,
  expandedIds,
  draggedId,
  dropTarget,
  dropPosition,
  getPrefabName,
  toggleExpanded,
  onSelectObject,
  onDeleteObject,
  onRenameObject,
  onRenameCancel,
  onContextMenu,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}) {
  const isDropTarget = dropTarget === obj.id;
  const isDragged = draggedId === obj.id;
  const hasChildren = objects.some((o) => o.parentId === obj.id);
  const isSelected = selectedObjects.some((o) => o && o.id === obj.id);
  const isExpanded = expandedIds.has(obj.id);
  const isRenamingThis = isRenaming === obj.id;

  const children = objects
    .filter((o) => o.parentId === obj.id)
    .sort((a, b) => {
      const indexA = objects.findIndex((item) => item.id === a.id);
      const indexB = objects.findIndex((item) => item.id === b.id);
      return indexA - indexB;
    });

  return (
    <React.Fragment>
      <div
        className={`hierarchy-item ${isSelected ? 'selected' : ''} ${obj.prefabId ? 'prefab-instance' : ''} ${isDragged ? 'dragging' : ''} ${isDropTarget && dropPosition === 'before' ? 'drop-before' : ''} ${isDropTarget && dropPosition === 'after' ? 'drop-after' : ''} ${isDropTarget && dropPosition === 'inside' ? 'drop-inside' : ''}`}
        style={{ paddingLeft: `${6 + depth * 16}px` }}
        onClick={(e) => {
          if (isRenaming) return;
          if (obj.isFolder) {
            const descendants = getAllDescendants(obj.id, objects);
            onSelectObject(obj, e.ctrlKey || e.metaKey, [obj, ...descendants]);
          } else {
            onSelectObject(obj, e.ctrlKey || e.metaKey);
          }
        }}
        onDoubleClick={(e) => {
          if (hasChildren) {
            e.stopPropagation();
            toggleExpanded(obj.id);
          }
        }}
        onContextMenu={(e) => onContextMenu(e, obj)}
        draggable={true}
        onDragStart={(e) => onDragStart(e, obj)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => onDragOver(e, obj)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, obj)}
      >
        {hasChildren && (
          <span
            className={`hierarchy-expand-icon ${isExpanded ? 'expanded' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              toggleExpanded(obj.id);
            }}
          >
            <IconChevronCollapsed className="hierarchy-expand-svg" />
          </span>
        )}
        {!hasChildren && depth > 0 && <span className="hierarchy-expand-placeholder" />}
        <span className="hierarchy-item-icon">{getObjectIcon(obj)}</span>
        {isRenamingThis ? (
          <RenameInput
            value={obj.name}
            className="hierarchy-rename-input"
            onSubmit={(value) => {
              onRenameObject(obj.id, value);
              onRenameCancel();
            }}
            onCancel={onRenameCancel}
          />
        ) : (
          <span className="hierarchy-item-name">{obj.name}</span>
        )}
        {obj.prefabId && (
          <span className="hierarchy-prefab-badge" {...tip(getPrefabName(obj.prefabId))}>
            P
          </span>
        )}
        <button
          className="icon-btn icon-btn-danger"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteObject(obj.id);
          }}
          {...tip(msg('hierarchy.delete'))}
        >
          <IconDelete className="btn-icon" />
        </button>
      </div>
      {isExpanded &&
        children.map((child) => (
          <HierarchyItem
            key={child.id}
            obj={child}
            depth={depth + 1}
            objects={objects}
            selectedObjects={selectedObjects}
            isRenaming={isRenaming}
            expandedIds={expandedIds}
            draggedId={draggedId}
            dropTarget={dropTarget}
            dropPosition={dropPosition}
            getPrefabName={getPrefabName}
            toggleExpanded={toggleExpanded}
            onSelectObject={onSelectObject}
            onDeleteObject={onDeleteObject}
            onRenameObject={onRenameObject}
            onRenameCancel={onRenameCancel}
            onContextMenu={onContextMenu}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          />
        ))}
    </React.Fragment>
  );
}

export default HierarchyItem;
