/**
 * @file components/SnapshotsModal.jsx
 * @description 快照管理模态框组件，显示和管理自动保存的快照
 * @module components/SnapshotsModal
 * 
 * 快照功能模仿 TurboWarp ，我觉得很有必要的东西。
 */

import React, { useState, useEffect } from 'react';
import { msg } from '../i18n/index.js';
import { useDialog } from '../hooks/useDialog.jsx';
import IconClose from '../icons/close.svg?react';
import IconDelete from '../icons/delete.svg?react';

/**
 * 快照管理模态框组件
 * @param {Object} props - 组件属性
 * @param {boolean} props.isOpen - 是否打开
 * @param {Function} props.onClose - 关闭回调
 * @param {Function} props.onLoadSnapshots - 加载快照列表回调
 * @param {Function} props.onLoadSnapshot - 加载单个快照回调
 * @param {Function} props.onDeleteSnapshot - 删除快照回调
 * @param {Function} props.onClearAll - 清除所有快照回调
 * @param {Function} props.onRestoreSnapshot - 恢复快照回调
 * @returns {JSX.Element|null} 快照管理模态框组件
 */
function SnapshotsModal({ 
  isOpen, 
  onClose, 
  onLoadSnapshots,
  onLoadSnapshot,
  onDeleteSnapshot,
  onClearAll,
  onRestoreSnapshot
}) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const dialog = useDialog();

  useEffect(() => {
    if (isOpen) {
      loadSnapshots();
    }
  }, [isOpen]);

  const loadSnapshots = async () => {
    setLoading(true);
    const snaps = await onLoadSnapshots();
    setSnapshots(snaps);
    setLoading(false);
  };

  const handleRestore = async (snapshot) => {
    const confirmRestore = await dialog.confirm(
      `"${snapshot.name}" (${new Date(snapshot.savedAt).toLocaleString()})`,
      msg('snapshots.confirmRestore')
    );
    if (confirmRestore) {
      onRestoreSnapshot(snapshot.data);
      onClose();
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = await dialog.confirm(msg('snapshots.confirmDelete'));
    if (confirmDelete) {
      await onDeleteSnapshot(id);
      await loadSnapshots();
    }
  };

  const handleClearAll = async () => {
    const confirmClear = await dialog.confirm(msg('snapshots.confirmClearAll'));
    if (confirmClear) {
      await onClearAll();
      setSnapshots([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content snapshots-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{msg('snapshots.title')}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <IconClose className="modal-close-icon" />
          </button>
        </div>
        
        <div className="snapshots-body">
          {loading ? (
            <div className="snapshots-loading">{msg('snapshots.loading')}</div>
          ) : snapshots.length === 0 ? (
            <div className="snapshots-empty">
              <p>{msg('snapshots.empty')}</p>
              <p className="snapshots-empty-hint">{msg('snapshots.emptyHint')}</p>
            </div>
          ) : (
            <div className="snapshots-list">
              {snapshots.map((snapshot, index) => (
                <div key={snapshot.id} className="snapshot-item">
                  <div className="snapshot-info">
                    <span className="snapshot-index">#{index + 1}</span>
                    <span className="snapshot-name">{snapshot.name}</span>
                    <span className="snapshot-time">
                      {new Date(snapshot.savedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="snapshot-actions">
                    <button 
                      className="btn btn-small btn-primary"
                      onClick={() => handleRestore(snapshot)}
                    >
                      {msg('snapshots.restore')}
                    </button>
                    <button 
                      className="icon-btn icon-btn-danger"
                      onClick={() => handleDelete(snapshot.id)}
                      title={msg('snapshots.delete')}
                    >
                      <IconDelete className="btn-icon" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {snapshots.length > 0 && (
          <div className="modal-footer">
            <span className="snapshots-count">
              {msg('snapshots.count').replace('{count}', snapshots.length)}
            </span>
            <button className="btn btn-small btn-danger" onClick={handleClearAll}>
              {msg('snapshots.clearAll')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SnapshotsModal;
