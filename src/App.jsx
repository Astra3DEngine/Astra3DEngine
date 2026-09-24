/**
 * @file App.jsx
 * @description Astra 3D Engine 主应用组件：仅编排布局、订阅服务与快捷键注册。
 * 状态位于 src/stores/，文件 IO 位于 src/lib/ProjectFileService，快捷键位于 src/lib/ShortcutManager。
 * @module App
 */

import React, { useState, useCallback, useEffect } from 'react';
import MultiViewport from './components/MultiViewport.jsx';
import HierarchyPanel from './components/HierarchyPanel.jsx';
import InspectorPanel from './components/InspectorPanel.jsx';
import AssetsPanel from './components/AssetsPanel.jsx';
import PrefabsPanel from './components/PrefabsPanel.jsx';
import ScenePanel from './components/ScenePanel.jsx';
import Toolbar from './components/Toolbar.jsx';
import PreferencesModal from './components/PreferencesModal.jsx';
import SnapshotsModal from './components/SnapshotsModal.jsx';
import ResizablePanel from './components/ResizablePanel.jsx';
import { msg, toggleLocale, getLocale, setLocale } from './i18n/index.js';
import { ENGINE_VERSION } from './meta.js';
import { useAutoSave } from './hooks/useAutoSave.js';
import { useRecentProjects } from './hooks/useRecentProjects.js';
import { useRatioDrag } from './hooks/useRatioDrag.js';
import { DialogProvider, useDialog } from './hooks/useDialog.jsx';
import { ProjectFileService } from './lib/ProjectFileService.js';
import { modal } from './lib/ModalManager.js';
import { shortcuts } from './lib/ShortcutManager.js';
import ModalHost from './components/modal/ModalHost.jsx';
import ToastHost from './components/toast/ToastHost.jsx';
import { applyTheme } from './utils/themeManager.js';
import { useScenesStore } from './stores/useScenesStore.js';
import { useSelectionStore } from './stores/useSelectionStore.js';
import { useAssetsStore } from './stores/useAssetsStore.js';
import { usePrefabsStore } from './stores/usePrefabsStore.js';
import { useEditorStore } from './stores/useEditorStore.js';
import { useUIStore } from './stores/useUIStore.js';
import { useProjectStore } from './stores/useProjectStore.js';
import { Settings } from './settings/settingsRegistry.js';

function AppContent() {
  const dialog = useDialog();

  // ===== 主题 / 语言 =====
  const [theme, setTheme] = useState(() => Settings.get('theme') || 'dark');
  const [, setLocaleState] = useState(getLocale());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // ===== 绑定 stores =====
  const scenes = useScenesStore((s) => s.scenes);
  const currentSceneId = useScenesStore((s) => s.currentSceneId);
  const clipboard = useScenesStore((s) => s.clipboard);
  const sceneObjects = useScenesStore(
    (s) => s.scenes.find((sc) => sc.id === s.currentSceneId)?.objects || []
  );
  const currentScene = useScenesStore((s) => s.scenes.find((sc) => sc.id === s.currentSceneId));
  const canUndo = useScenesStore((s) => s.past.length > 0);
  const canRedo = useScenesStore((s) => s.future.length > 0);

  const selectedObject = useSelectionStore((s) => s.selectedObject);
  const selectedObjects = useSelectionStore((s) => s.selectedObjects);

  const assets = useAssetsStore((s) => s.assets);
  const selectedAsset = useAssetsStore((s) => s.selectedAsset);

  const prefabs = usePrefabsStore((s) => s.prefabs);
  const selectedPrefab = usePrefabsStore((s) => s.selectedPrefab);

  const currentTool = useEditorStore((s) => s.currentTool);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const lightRenderingEnabled = useEditorStore((s) => s.lightRenderingEnabled);

  const ui = useUIStore();
  const {
    isAssetsPanelCollapsed,
    hierarchyCollapsed,
    scenePanelCollapsed,
    prefabsCollapsed,
    scenePanelRatio,
    prefabsPanelRatio,
  } = ui;

  const leftSidebarAllCollapsed = hierarchyCollapsed && prefabsCollapsed && scenePanelCollapsed;

  const projectFileName = useProjectStore((s) => s.projectFileName);
  const autoSaveEnabled = useProjectStore((s) => s.autoSaveEnabled);
  const maxSnapshots = useProjectStore((s) => s.maxSnapshots);

  // ===== 面板拖拽 =====
  const sceneDrag = useRatioDrag(scenePanelRatio, ui.setScenePanelRatio, { min: 0.1, max: 0.4 });
  const prefabsDrag = useRatioDrag(prefabsPanelRatio, ui.setPrefabsPanelRatio, {
    min: 0.1,
    max: 0.35,
    inverted: true,
  });

  // ===== 语言 =====
  const handleToggleLocale = useCallback(() => {
    toggleLocale();
    const newLocale = getLocale();
    setLocaleState(newLocale);
  }, []);

  const handleSetLocale = useCallback((nextLocale) => {
    setLocale(nextLocale);
    setLocaleState(nextLocale);
  }, []);

  // ===== 主题 =====
  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      Settings.set('theme', next);
      return next;
    });
  }, []);

  const handleSetTheme = useCallback((next) => {
    setTheme(next);
    Settings.set('theme', next);
  }, []);

  // ===== 自动保存 =====
  const {
    scheduleSave,
    loadSnapshots,
    loadSnapshot,
    deleteSnapshot,
    clearAll: clearAutoSave,
  } = useAutoSave(() => projectFile.getProjectData(), 60000, maxSnapshots);

  // ===== 最近项目 =====
  const { recentProjects, addRecentProject, openRecentProject, removeRecentProject } =
    useRecentProjects();

  // ===== 文件服务 =====
  const hasFileSystemAccess = 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  const projectFileRef = React.useRef(null);
  if (!projectFileRef.current) {
    projectFileRef.current = new ProjectFileService({
      dialog,
      isElectron,
      hasFileSystemAccess,
      recent: {
        add: addRecentProject,
        open: openRecentProject,
        remove: removeRecentProject,
      },
      onClearAutoSave: clearAutoSave,
    });
  }
  const projectFile = projectFileRef.current;

  useEffect(() => {
    if (autoSaveEnabled && sceneObjects.length > 0) {
      scheduleSave();
    }
  }, [sceneObjects, prefabs, assets, autoSaveEnabled, scheduleSave]);

  // ===== 快捷键 =====
  useEffect(() => {
    const handleToolKeys = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      const selection = useSelectionStore.getState();
      const scenesStore = useScenesStore.getState();
      const editor = useEditorStore.getState();

      switch (e.key.toLowerCase()) {
        case 'q':
          editor.setCurrentTool('select');
          break;
        case 'w':
          editor.setCurrentTool('move');
          break;
        case 'e':
          editor.setCurrentTool('rotate');
          break;
        case 'r':
          editor.setCurrentTool('scale');
          break;
        case 'delete':
        case 'backspace':
          if (selection.selectedObjects.length > 1) {
            scenesStore.deleteSelectedObjects();
          } else if (selection.selectedObject) {
            scenesStore.deleteObject(selection.selectedObject.id);
          }
          break;
        default:
          break;
      }
    };

    const handleFileShortcuts = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'F5') {
        e.preventDefault();
        const editor = useEditorStore.getState();
        editor.setIsPlaying(!editor.isPlaying);
        return;
      }

      const modifier = e.ctrlKey || e.metaKey;
      if (!modifier) return;

      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          projectFile.saveAsProject();
        } else {
          projectFile.saveProject();
        }
      } else if (key === 'o') {
        e.preventDefault();
        projectFile.loadProject();
      } else if (key === 'z') {
        e.preventDefault();
        const scenesStore = useScenesStore.getState();
        if (e.shiftKey) scenesStore.redo();
        else scenesStore.undo();
      } else if (key === 'y') {
        e.preventDefault();
        useScenesStore.getState().redo();
      }

      if (e.altKey && key === 'n') {
        e.preventDefault();
        projectFile.newProject();
      }
    };

    shortcuts.register('tool', handleToolKeys);
    shortcuts.register('file', handleFileShortcuts);
    return () => {
      shortcuts.unregister('tool');
      shortcuts.unregister('file');
    };
  }, [projectFile]);

  const handleRestoreSnapshot = useCallback(
    (snapshotData) => projectFile.restoreSnapshot(snapshotData),
    [projectFile]
  );

  return (
    <div className="app-container">
      <Toolbar
        isPlaying={isPlaying}
        setIsPlaying={useEditorStore.getState().setIsPlaying}
        onSetLocale={handleSetLocale}
        onSaveProject={projectFile.saveProject.bind(projectFile)}
        onSaveAsProject={projectFile.saveAsProject.bind(projectFile)}
        onLoadProject={projectFile.loadProject.bind(projectFile)}
        onNewProject={projectFile.newProject.bind(projectFile)}
        projectFileName={projectFileName}
        onToggleTheme={handleToggleTheme}
        theme={theme}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={useScenesStore.getState().undo}
        onRedo={useScenesStore.getState().redo}
        recentProjects={isElectron ? recentProjects : []}
        onOpenRecentProject={isElectron ? projectFile.openRecentProject.bind(projectFile) : undefined}
        onExportAsAstra={projectFile.exportAsAstra.bind(projectFile)}
        onImportAstra={projectFile.importAstra.bind(projectFile)}
        onOpenSnapshots={() =>
          modal.open(SnapshotsModal, {
            onLoadSnapshots: loadSnapshots,
            onLoadSnapshot: loadSnapshot,
            onDeleteSnapshot: deleteSnapshot,
            onClearAll: clearAutoSave,
            onRestoreSnapshot: handleRestoreSnapshot,
          })
        }
        onOpenPreferences={() =>
          modal.open(PreferencesModal, {
            theme,
            onSetTheme: handleSetTheme,
            onToggleLocale: handleToggleLocale,
            onSetLocale: handleSetLocale,
            autoSaveEnabled,
            onToggleAutoSave: useProjectStore.getState().toggleAutoSave,
            maxSnapshots,
            onSetMaxSnapshots: useProjectStore.getState().setMaxSnapshots,
          })
        }
      />

      <div className="main-content-wrapper">
        <div className="main-content">
          <ResizablePanel
            side="left"
            minWidth={200}
            maxWidth={500}
            defaultWidth={280}
            storageKey="astra-left-sidebar"
            className={`left-sidebar ${leftSidebarAllCollapsed ? 'all-collapsed' : ''}`}
          >
            <ScenePanel
              scenes={scenes}
              currentSceneId={currentSceneId}
              onSwitchScene={useScenesStore.getState().switchScene}
              onCreateScene={useScenesStore.getState().createScene}
              onDeleteScene={useScenesStore.getState().deleteScene}
              onRenameScene={useScenesStore.getState().renameScene}
              onSetMainScene={useScenesStore.getState().setMainScene}
              vertical={leftSidebarAllCollapsed}
              onCollapseChange={ui.setScenePanelCollapsed}
              style={{
                flex: !scenePanelCollapsed && hierarchyCollapsed && prefabsCollapsed ? '1' : 'none',
                height:
                  !scenePanelCollapsed && !(hierarchyCollapsed && prefabsCollapsed)
                    ? `${scenePanelRatio * 100}%`
                    : undefined,
                minHeight: !scenePanelCollapsed ? '100px' : undefined,
              }}
            />

            {!scenePanelCollapsed && !hierarchyCollapsed && (
              <div className="panel-resize-handle" onMouseDown={sceneDrag.onDragStart} />
            )}

            <HierarchyPanel
              objects={sceneObjects}
              selectedObject={selectedObject}
              selectedObjects={selectedObjects}
              onSelectObject={useSelectionStore.getState().selectObject}
              onAddObject={useScenesStore.getState().addObject}
              onDeleteObject={useScenesStore.getState().deleteObject}
              onDeleteSelectedObjects={useScenesStore.getState().deleteSelectedObjects}
              onCreatePrefab={usePrefabsStore.getState().createPrefab}
              prefabs={prefabs}
              onCopyObject={useScenesStore.getState().copyObject}
              onPasteObject={useScenesStore.getState().pasteObject}
              onDuplicateObject={useScenesStore.getState().duplicateObject}
              onRenameObject={useScenesStore.getState().renameObject}
              clipboard={clipboard}
              vertical={leftSidebarAllCollapsed}
              onCollapseChange={ui.setHierarchyCollapsed}
              onReorderObjects={useScenesStore.getState().reorderObjects}
            />

            {!hierarchyCollapsed && !prefabsCollapsed && (
              <div className="panel-resize-handle" onMouseDown={prefabsDrag.onDragStart} />
            )}

            <PrefabsPanel
              prefabs={prefabs}
              sceneObjects={sceneObjects}
              selectedPrefab={selectedPrefab}
              onSelectPrefab={usePrefabsStore.getState().setSelectedPrefab}
              onInstantiatePrefab={usePrefabsStore.getState().instantiatePrefab}
              onDeletePrefab={usePrefabsStore.getState().deletePrefab}
              vertical={leftSidebarAllCollapsed}
              onCollapseChange={ui.setPrefabsCollapsed}
              style={{
                flex: !prefabsCollapsed && hierarchyCollapsed && scenePanelCollapsed ? '1' : 'none',
                height:
                  !prefabsCollapsed && !(hierarchyCollapsed && scenePanelCollapsed)
                    ? `${prefabsPanelRatio * 100}%`
                    : undefined,
                minHeight: !prefabsCollapsed ? '100px' : undefined,
              }}
            />
          </ResizablePanel>

          <div className="center-area">
            <MultiViewport
              objects={sceneObjects}
              assets={assets}
              selectedObject={selectedObject}
              selectedObjects={selectedObjects}
              onSelectObject={useSelectionStore.getState().selectObject}
              currentTool={currentTool}
              onToolChange={useEditorStore.getState().setCurrentTool}
              isPlaying={isPlaying}
              onUpdateObject={useScenesStore.getState().updateObject}
              onRecordHistory={useScenesStore.getState().recordCurrentState}
              theme={theme}
              lightRenderingEnabled={lightRenderingEnabled}
              onLightRenderingChange={useEditorStore.getState().setLightRenderingEnabled}
              sceneSettings={currentScene?.settings}
            />
          </div>

          <InspectorPanel
            selectedObject={selectedObject}
            onUpdateObject={useScenesStore.getState().updateObject}
            onDeleteObject={useScenesStore.getState().deleteObject}
            prefabs={prefabs}
            onDisconnectPrefab={usePrefabsStore.getState().disconnectPrefab}
            onApplyToPrefab={usePrefabsStore.getState().applyToPrefab}
            assets={assets}
            objects={sceneObjects}
            sceneSettings={currentScene?.settings}
            onUpdateSettings={useScenesStore.getState().updateSceneSettings}
            onClearSelection={useSelectionStore.getState().clearSelection}
          />
        </div>

        <ResizablePanel
          direction="vertical"
          minHeight={80}
          maxHeight={400}
          defaultHeight={150}
          storageKey="astra-bottom-panel"
          className="bottom-area"
          collapsed={isAssetsPanelCollapsed}
        >
          <AssetsPanel
            assets={assets}
            onImport={useAssetsStore.getState().importAsset}
            onSelectAsset={useAssetsStore.getState().selectAsset}
            selectedAsset={selectedAsset}
            onDeleteAsset={useAssetsStore.getState().deleteAsset}
            onRenameAsset={useAssetsStore.getState().renameAsset}
            onCollapseChange={ui.setAssetsPanelCollapsed}
          />
        </ResizablePanel>
      </div>

      <div className="status-bar">
        <span>
          {msg('app.title')} v{ENGINE_VERSION}
        </span>
        <span>{msg('status.objects', { count: sceneObjects.length })}</span>
        <span>
          {selectedObject
            ? msg('status.selected', { name: selectedObject.name })
            : msg('status.noSelection')}
        </span>
      </div>

      <ToastHost />
      <ModalHost />
    </div>
  );
}

function App() {
  return (
    <DialogProvider>
      <AppContent />
    </DialogProvider>
  );
}

export default App;
