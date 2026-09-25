/**
 * @file App.jsx
 * @description Astra 3D Engine 主应用组件：仅编排布局、订阅服务与快捷键注册。
 * 状态位于 src/stores/，文件 IO 位于 src/lib/ProjectFileService，快捷键位于 src/lib/ShortcutManager。
 * @module App
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import MultiViewport from './components/MultiViewport.jsx';
import HierarchyPanel from './components/HierarchyPanel.jsx';
import InspectorPanel from './components/InspectorPanel.jsx';
import AssetsPanel from './components/AssetsPanel.jsx';
import PrefabsPanel from './components/PrefabsPanel.jsx';
import ScenePanel from './components/ScenePanel.jsx';
import Toolbar from './components/Toolbar.jsx';
import Sidebar from './components/sidebar/Sidebar.jsx';
import { openCreateObjectMenu } from './components/sidebar/CreateObjectMenu.jsx';
import EditorTabBar from './components/tabs/EditorTabBar.jsx';
import CodeEditorPlaceholder from './components/tabs/CodeEditorPlaceholder.jsx';
import { registerSidebarViews } from './components/sidebar/sidebarViews.js';
import Dock from './components/dock/Dock.jsx';
import BottomPanel from './components/dock/BottomPanel.jsx';
import TerminalPlaceholder from './components/dock/TerminalPlaceholder.jsx';
import { registerDockPanels } from './components/dock/dockPanels.js';
import PreferencesModal from './components/PreferencesModal.jsx';
import SnapshotsModal from './components/SnapshotsModal.jsx';
import ResizablePanel from './components/ResizablePanel.jsx';
import { msg, toggleLocale, getLocale, setLocale } from './i18n/index.js';
import { ENGINE_VERSION } from './meta.js';
import { useAutoSave } from './hooks/useAutoSave.js';
import { useRecentProjects } from './hooks/useRecentProjects.js';
import { DialogProvider, useDialog } from './hooks/useDialog.jsx';
import { ProjectFileService } from './lib/ProjectFileService.js';
import { modal } from './lib/ModalManager.js';
import { shortcuts } from './lib/ShortcutManager.js';
import ModalHost from './components/modal/ModalHost.jsx';
import ToastHost from './components/toast/ToastHost.jsx';
import TooltipHost from './components/primitives/TooltipHost.jsx';
import { applyTheme } from './utils/themeManager.js';
import { useScenesStore } from './stores/useScenesStore.js';
import { useSelectionStore } from './stores/useSelectionStore.js';
import { useAssetsStore } from './stores/useAssetsStore.js';
import { usePrefabsStore } from './stores/usePrefabsStore.js';
import { useEditorStore } from './stores/useEditorStore.js';
import { useUIStore } from './stores/useUIStore.js';
import { useProjectStore } from './stores/useProjectStore.js';
import { useWorkspaceTabsStore } from './stores/useWorkspaceTabsStore.js';
import { useBottomPanelStore } from './stores/useBottomPanelStore.js';
import { Settings } from './settings/settingsRegistry.js';

// 装配侧栏视图（避免循环依赖）
registerSidebarViews({
  hierarchy: HierarchyPanel,
  scene: ScenePanel,
  prefabs: PrefabsPanel,
});

// 装配可停靠面板（底部/侧栏共用）
registerDockPanels({
  assets: AssetsPanel,
  terminal: TerminalPlaceholder,
});

function AppContent() {
  const dialog = useDialog();

  // 全局鼠标位置（Alt+Q 弹出新建对象菜单用）
  const mousePosRef = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // ===== 主题 / 语言 =====
  const [theme, setTheme] = useState(() => Settings.get('theme') || 'dark');
  const [, setLocaleState] = useState(getLocale());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // ===== 绑定 stores =====
  const sceneObjects = useScenesStore(
    (s) => s.scenes.find((sc) => sc.id === s.currentSceneId)?.objects || []
  );
  const currentScene = useScenesStore((s) => s.scenes.find((sc) => sc.id === s.currentSceneId));
  const canUndo = useScenesStore((s) => s.past.length > 0);
  const canRedo = useScenesStore((s) => s.future.length > 0);

  const selectedObject = useSelectionStore((s) => s.selectedObject);
  const selectedObjects = useSelectionStore((s) => s.selectedObjects);

  const assets = useAssetsStore((s) => s.assets);

  const prefabs = usePrefabsStore((s) => s.prefabs);

  const currentTool = useEditorStore((s) => s.currentTool);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const lightRenderingEnabled = useEditorStore((s) => s.lightRenderingEnabled);

  const ui = useUIStore();
  const { sidebarCollapsed } = ui;

  const projectFileName = useProjectStore((s) => s.projectFileName);
  const autoSaveEnabled = useProjectStore((s) => s.autoSaveEnabled);
  const maxSnapshots = useProjectStore((s) => s.maxSnapshots);

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

  // ===== 首选项 =====
  const openPreferences = useCallback(() => {
    modal.open(PreferencesModal, {
      theme,
      onSetTheme: handleSetTheme,
      onToggleLocale: handleToggleLocale,
      onSetLocale: handleSetLocale,
      autoSaveEnabled,
      onToggleAutoSave: useProjectStore.getState().toggleAutoSave,
      maxSnapshots,
      onSetMaxSnapshots: useProjectStore.getState().setMaxSnapshots,
    });
  }, [theme, handleSetTheme, handleToggleLocale, handleSetLocale, autoSaveEnabled, maxSnapshots]);

  // ===== 快捷键（命令式，可在首选项配置） =====
  useEffect(() => {
    shortcuts.define({
      id: 'file.save',
      label: 'keybinds.file.save',
      category: 'keybinds.cat.file',
      keys: 'ctrl+s',
      handler: () => projectFile.saveProject(),
    });
    shortcuts.define({
      id: 'file.saveAs',
      label: 'keybinds.file.saveAs',
      category: 'keybinds.cat.file',
      keys: 'ctrl+shift+s',
      handler: () => projectFile.saveAsProject(),
    });
    shortcuts.define({
      id: 'file.open',
      label: 'keybinds.file.open',
      category: 'keybinds.cat.file',
      keys: 'ctrl+o',
      handler: () => projectFile.loadProject(),
    });
    shortcuts.define({
      id: 'file.new',
      label: 'keybinds.file.new',
      category: 'keybinds.cat.file',
      keys: 'ctrl+alt+n',
      handler: () => projectFile.newProject(),
    });
    shortcuts.define({
      id: 'edit.undo',
      label: 'keybinds.edit.undo',
      category: 'keybinds.cat.edit',
      keys: 'ctrl+z',
      handler: () => useScenesStore.getState().undo(),
    });
    shortcuts.define({
      id: 'edit.redo',
      label: 'keybinds.edit.redo',
      category: 'keybinds.cat.edit',
      keys: 'ctrl+y|ctrl+shift+z',
      handler: () => useScenesStore.getState().redo(),
    });
    shortcuts.define({
      id: 'view.togglePlay',
      label: 'keybinds.view.togglePlay',
      category: 'keybinds.cat.view',
      keys: 'f5',
      handler: () => {
        const editor = useEditorStore.getState();
        editor.setIsPlaying(!editor.isPlaying);
      },
    });
    shortcuts.define({
      id: 'tool.select',
      label: 'keybinds.tool.select',
      category: 'keybinds.cat.tool',
      keys: 'q',
      handler: () => useEditorStore.getState().setCurrentTool('select'),
    });
    shortcuts.define({
      id: 'tool.move',
      label: 'keybinds.tool.move',
      category: 'keybinds.cat.tool',
      keys: 'w',
      handler: () => useEditorStore.getState().setCurrentTool('move'),
    });
    shortcuts.define({
      id: 'tool.rotate',
      label: 'keybinds.tool.rotate',
      category: 'keybinds.cat.tool',
      keys: 'e',
      handler: () => useEditorStore.getState().setCurrentTool('rotate'),
    });
    shortcuts.define({
      id: 'tool.scale',
      label: 'keybinds.tool.scale',
      category: 'keybinds.cat.tool',
      keys: 'r',
      handler: () => useEditorStore.getState().setCurrentTool('scale'),
    });
    shortcuts.define({
      id: 'object.delete',
      label: 'keybinds.object.delete',
      category: 'keybinds.cat.object',
      keys: 'delete|backspace',
      handler: () => {
        const selection = useSelectionStore.getState();
        const scenesStore = useScenesStore.getState();
        if (selection.selectedObjects.length > 1) {
          scenesStore.deleteSelectedObjects();
        } else if (selection.selectedObject) {
          scenesStore.deleteObject(selection.selectedObject.id);
        }
      },
    });
    shortcuts.define({
      id: 'preferences.open',
      label: 'keybinds.preferences.open',
      category: 'keybinds.cat.settings',
      keys: 'ctrl+,',
      handler: openPreferences,
    });
    shortcuts.define({
      id: 'object.add',
      label: 'keybinds.object.add',
      category: 'keybinds.cat.object',
      keys: 'alt+q',
      handler: () => openCreateObjectMenu(mousePosRef.current.x, mousePosRef.current.y),
    });
  }, [projectFile, openPreferences]);

  const handleRestoreSnapshot = useCallback(
    (snapshotData) => projectFile.restoreSnapshot(snapshotData),
    [projectFile]
  );

  // 状态栏上端手柄：向上拖动拉出底栏（VSCode 式）
  const statusGripDrag = useCallback((e) => {
    e.preventDefault();
    const startY = e.clientY;
    const store = useBottomPanelStore.getState();
    const startHeight = store.collapsed ? 0 : store.height;

    const onMove = (ev) => {
      const delta = startY - ev.clientY; // 向上为正
      useBottomPanelStore.getState().setHeight(startHeight + delta);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const activeTab = useWorkspaceTabsStore((s) => s.activeTab);

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
        onOpenRecentProject={
          isElectron ? projectFile.openRecentProject.bind(projectFile) : undefined
        }
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
        onOpenPreferences={openPreferences}
      />

      <div className="main-content-wrapper">
        <EditorTabBar />
        <div className="main-content">
          <ResizablePanel
            side="left"
            minWidth={200}
            maxWidth={500}
            defaultWidth={280}
            storageKey="astra-left-sidebar"
            className="left-sidebar"
            collapsed={sidebarCollapsed}
          >
            <Sidebar />
          </ResizablePanel>

          <div className="center-area">
            <div className="center-area-body">
              {activeTab === 'code' ? (
                <CodeEditorPlaceholder />
              ) : (
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
              )}
            </div>
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

        <BottomPanel>
          <Dock />
        </BottomPanel>
      </div>

      <div className="status-grip" onMouseDown={statusGripDrag} />
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
      <TooltipHost />
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
