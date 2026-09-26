import React, { useRef, useState, useMemo, useCallback } from 'react';
import { msg } from '../i18n/index.js';
import usePanelSearch from '../hooks/usePanelSearch.js';
import FileBrowserDialog from './FileBrowserDialog.jsx';
import { useAssetsStore } from '../stores/useAssetsStore.js';
import useDropdownMenu from '../hooks/useDropdownMenu.js';
import DropdownMenu from './DropdownMenu.jsx';
import RenameInput from './primitives/RenameInput.jsx';
import IconModel from '../assets/icons/tools/cube.svg?react';
import IconImage from '../assets/icons/misc/image.svg?react';
import IconFile from '../assets/icons/editor/file.svg?react';
import IconDelete from '../assets/icons/editor/delete.svg?react';
import IconRename from '../assets/icons/editor/rename.svg?react';
import IconPlus from '../assets/icons/editor/plus.svg?react';
import { tip } from '../lib/tooltip.js';
import { getBasename } from '../utils/id.js';

const getMimeType = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes = {
    gltf: 'model/gltf+json',
    glb: 'model/gltf-binary',
    obj: 'model/obj',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    bmp: 'image/bmp',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

/**
 * 递归收集 FileSystem 目录条目到 fileMap（相对路径 -> File）。
 * @param {FileSystemDirectoryEntry} entry
 * @param {Map<string, File>} fileMap
 * @param {string} [basePath='']
 */
async function collectDirectoryInto(entry, fileMap, basePath = '') {
  const reader = entry.createReader();

  const readEntriesBatch = async () => {
    const entries = await new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });

    for (const subEntry of entries) {
      const relPath = basePath ? `${basePath}/${subEntry.name}` : subEntry.name;
      if (subEntry.isDirectory) {
        await collectDirectoryInto(subEntry, fileMap, relPath);
      } else {
        const file = await new Promise((resolve, reject) => {
          subEntry.file(resolve, reject);
        });
        if (file) fileMap.set(relPath, file);
      }
    }

    // readEntries 可能一次只返回部分条目，需要循环读取直到空
    if (entries.length > 0) {
      await readEntriesBatch();
    }
  };

  await readEntriesBatch();
}

/**
 * 批量导入文件集合。
 *
 * - 若存在 .gltf：为每个 gltf 收集同目录资源（.bin/贴图）成 resourceMap 一起导入，
 *   .glb 自包含直接导入。
 * - 否则逐个导入所有文件。
 *
 * @param {Map<string, File>} fileMap - 相对路径 -> File
 * @param {(fileOrObject: File|Object) => void} onImport
 */
export function importFileCollection(fileMap, onImport) {
  const gltfFiles = [];
  for (const [relativePath, file] of fileMap) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'gltf' || ext === 'glb') {
      gltfFiles.push({ relativePath, file, ext });
    }
  }

  if (gltfFiles.length === 0) {
    for (const file of fileMap.values()) {
      onImport(file);
    }
    return;
  }

  for (const { relativePath, file, ext } of gltfFiles) {
    if (ext === 'glb') {
      onImport(file);
      continue;
    }

    // 收集同目录或子目录下的资源文件
    const resourceMap = new Map();
    const gltfDir = relativePath.substring(0, relativePath.lastIndexOf('/')) || '';

    for (const [resourcePath, resourceFile] of fileMap) {
      if (resourcePath === relativePath) continue;
      const resourceDir = resourcePath.substring(0, resourcePath.lastIndexOf('/')) || '';
      if (resourceDir === gltfDir || resourceDir.startsWith(gltfDir + '/')) {
        const relativeToGltf =
          gltfDir === '' ? resourcePath : resourcePath.substring(gltfDir.length + 1);
        resourceMap.set(relativeToGltf, resourceFile);
      }
    }

    onImport({ file, resourceMap, relativePath });
  }
}

function AssetsPanel() {
  // ===== store 驱动 =====
  const assets = useAssetsStore((s) => s.assets);
  const selectedAsset = useAssetsStore((s) => s.selectedAsset);
  const onImport = useAssetsStore.getState().importAsset;
  const onSelectAsset = useAssetsStore.getState().selectAsset;
  const onDeleteAsset = useAssetsStore.getState().deleteAsset;
  const onRenameAsset = useAssetsStore.getState().renameAsset;

  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenuAsset, setContextMenuAsset] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [filter, setFilter] = useState('all');
  const [isFileBrowserOpen, setIsFileBrowserOpen] = useState(false);
  const {
    containerRef: panelRef,
    inputRef: searchInputRef,
    searchText,
    setSearchText,
    searchVisible,
  } = usePanelSearch();

  const ctxMenu = useDropdownMenu({
    onClose: () => setContextMenuAsset(null),
  });

  const isElectron = typeof window !== 'undefined' && window.electronAPI?.fs;

  const handleImportClick = useCallback(() => {
    if (isElectron) {
      setIsFileBrowserOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  }, [isElectron]);

  /**
   * 导入单个文件
   *
   * 从文件路径读取内容并创建 File 对象，然后调用 onImport。
   */
  const importFile = useCallback(
    async (filePath) => {
      const result = await window.electronAPI.readFile(filePath);
      if (result.success) {
        const fileName = getBasename(filePath);
        let file;

        if (result.isBinary) {
          const binaryString = atob(result.content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          file = new File([bytes], fileName, {
            type: getMimeType(filePath),
          });
        } else {
          file = new File([result.content], fileName, {
            type: getMimeType(filePath),
          });
        }

        onImport(file);
      }
    },
    [onImport]
  );

  /**
   * 处理文件浏览器选择
   *
   * 支持选择文件和文件夹。文件夹会递归遍历所有文件并导入。
   * 这样用户可以一次性导入整个资源文件夹，爽飞了。
   */
  const handleFileBrowserSelect = useCallback(
    async (paths) => {
      if (!paths) return;

      const filePaths = Array.isArray(paths) ? paths : [paths];

      for (const filePath of filePaths) {
        try {
          // 检查是否是文件夹
          const pathInfo = await window.electronAPI.fs.getPathInfo(filePath);

          if (pathInfo.success && pathInfo.isDirectory) {
            // 递归读取文件夹中的所有文件
            const dirResult = await window.electronAPI.readDirectory(filePath, true);
            if (dirResult.success && dirResult.files) {
              for (const subFilePath of dirResult.files) {
                await importFile(subFilePath);
              }
            }
          } else {
            // 直接导入文件
            await importFile(filePath);
          }
        } catch (error) {
          console.error('Failed to import:', error);
        }
      }
      setIsFileBrowserOpen(false);
    },
    [importFile]
  );

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileMap = new Map();
      Array.from(files).forEach((file) => fileMap.set(file.name, file));
      importFileCollection(fileMap, onImport);
      e.target.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  /**
   * 处理拖拽放置
   *
   * 支持拖拽文件和文件夹（可混拖）。全部文件收集进一个 Map 后统一导入：
   * - 文件夹递归遍历（保持相对路径）
   * - 散文件按文件名归入
   * - 存在 GLTF 时自动组装 resourceMap（.bin/贴图），否则逐个导入
   */
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const fileMap = new Map();
    const items = e.dataTransfer.items;

    if (items && items.length > 0) {
      for (const item of items) {
        if (item.kind !== 'file') continue;

        const entry = item.webkitGetAsEntry?.() || item.getAsFileSystemEntry?.();
        if (entry && entry.isDirectory) {
          await collectDirectoryInto(entry, fileMap);
        } else {
          const file = item.getAsFile();
          if (file) fileMap.set(file.name, file);
        }
      }
    }

    if (fileMap.size === 0 && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file) => fileMap.set(file.name, file));
    }

    if (fileMap.size > 0) {
      importFileCollection(fileMap, onImport);
    }
  };

  const handleContextMenu = (e, asset) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuAsset(asset);
    ctxMenu.openAt(e.clientX, e.clientY);
  };

  const handleCloseContextMenu = () => {
    ctxMenu.close();
  };

  const handleDelete = (asset) => {
    if (onDeleteAsset) {
      onDeleteAsset(asset);
    }
    ctxMenu.close();
  };

  const handleStartRename = (asset) => {
    setEditingAsset(asset);
    ctxMenu.close();
  };

  /**
   * 资源拖拽开始处理
   *
   * 设置拖拽数据，让 Viewport 可以识别拖拽的是什么类型的资源。
   * 只有贴图资源可以被拖拽到场景中应用到模型。
   */
  const handleAssetDragStart = (e, asset) => {
    if (asset.assetType !== 'texture') {
      e.preventDefault();
      return;
    }

    e.dataTransfer.setData(
      'application/astra-texture',
      JSON.stringify({
        assetId: asset.id,
        assetName: asset.name,
        assetType: asset.assetType,
      })
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  const filteredAssets = useMemo(() => {
    let list = assets;
    if (filter !== 'all') {
      list = list.filter((asset) => asset.assetType === filter);
    }
    const kw = searchText.trim().toLowerCase();
    if (kw) {
      list = list.filter((asset) => asset.name.toLowerCase().includes(kw));
    }
    return list;
  }, [assets, filter, searchText]);

  const assetCounts = useMemo(() => {
    return {
      all: assets.length,
      model: assets.filter((a) => a.assetType === 'model').length,
      texture: assets.filter((a) => a.assetType === 'texture').length,
    };
  }, [assets]);

  const getAssetIcon = (asset) => {
    if (asset.assetType === 'model') {
      return <IconModel className="asset-type-icon" />;
    }
    if (asset.assetType === 'texture') {
      return null;
    }
    return <IconFile className="asset-type-icon" />;
  };

  const ctxMenuItems = useMemo(() => {
    if (!contextMenuAsset) return [];
    return [
      {
        label: msg('assets.rename'),
        icon: <IconRename className="dropdown-icon" />,
        onClick: () => handleStartRename(contextMenuAsset),
      },
      {
        label: msg('assets.delete'),
        icon: <IconDelete className="dropdown-icon" />,
        danger: true,
        onClick: () => handleDelete(contextMenuAsset),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextMenuAsset, msg]);

  return (
    <div className="assets-panel" ref={panelRef}>
      <div className="assets-toolbar">
        {searchVisible && (
          <input
            ref={searchInputRef}
            type="text"
            className="assets-search-input"
            placeholder={msg('assets.searchPlaceholder')}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        )}
        <div className="assets-filter">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            {...tip(msg('assets.filterAll'))}
          >
            {assetCounts.all}
          </button>
          <button
            className={`filter-btn ${filter === 'model' ? 'active' : ''}`}
            onClick={() => setFilter('model')}
            {...tip(msg('assets.filterModels'))}
          >
            <IconModel className="filter-icon" />
            {assetCounts.model}
          </button>
          <button
            className={`filter-btn ${filter === 'texture' ? 'active' : ''}`}
            onClick={() => setFilter('texture')}
            {...tip(msg('assets.filterTextures'))}
          >
            <IconImage className="filter-icon" />
            {assetCounts.texture}
          </button>
        </div>
        <button className="import-btn" onClick={handleImportClick} {...tip(msg('assets.import'))}>
          <IconPlus className="import-btn-icon" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".gltf,.glb,.obj,.png,.jpg,.jpeg,.webp"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
      <div
        className={`assets-content ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleCloseContextMenu}
      >
        {filteredAssets.length === 0 ? (
          <div className="assets-empty">
            {isDragging ? msg('assets.dragHint') : msg('assets.empty')}
          </div>
        ) : (
          <div className="assets-grid">
            {filteredAssets.map((asset, index) => (
              <div
                key={asset.id || index}
                className={`asset-item ${selectedAsset?.id === asset.id ? 'selected' : ''}`}
                onClick={() => onSelectAsset(asset)}
                onContextMenu={(e) => handleContextMenu(e, asset)}
                onDragStart={(e) => handleAssetDragStart(e, asset)}
                draggable={asset.assetType === 'texture'}
                {...tip(asset.name)}
              >
                <div className="asset-preview">
                  {asset.assetType === 'texture' && asset.url ? (
                    <img
                      src={asset.url}
                      alt={asset.name}
                      className="asset-thumbnail"
                      draggable={false}
                    />
                  ) : (
                    <div className="asset-icon-wrapper">{getAssetIcon(asset)}</div>
                  )}
                </div>
                {editingAsset?.id === asset.id ? (
                  <RenameInput
                    value={asset.name}
                    className="asset-name-input"
                    onSubmit={(value) => {
                      if (value !== asset.name && onRenameAsset) {
                        onRenameAsset(asset, value);
                      }
                      setEditingAsset(null);
                    }}
                    onCancel={() => setEditingAsset(null)}
                  />
                ) : (
                  <div className="asset-name">{asset.name}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <DropdownMenu
        isOpen={ctxMenu.isOpen}
        onClose={ctxMenu.close}
        position={ctxMenu.position}
        roundedCorners="all"
        items={ctxMenuItems}
      />

      <FileBrowserDialog
        isOpen={isFileBrowserOpen}
        onClose={() => setIsFileBrowserOpen(false)}
        onSelect={handleFileBrowserSelect}
        mode="open"
        {...tip(msg('assets.import'))}
        filters={[
          { name: msg('assets.filterAll'), extensions: ['*'] },
          { name: msg('assets.filterModels'), extensions: ['gltf', 'glb', 'obj'] },
          {
            name: msg('assets.filterTextures'),
            extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'],
          },
        ]}
        allowMultiple={true}
        allowSelectFolder={true}
      />
    </div>
  );
}

export default AssetsPanel;
