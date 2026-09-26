/**
 * @file lib/ProjectFileService.js
 * @description 项目文件服务：保存/打开/新建/导出/导入 的统一封装。
 * 支持 Electron / File System Access / 浏览器降级下载三种后端。
 * @module lib/ProjectFileService
 */

import FileBrowserDialog from '../components/FileBrowserDialog.jsx';
import { exportProjectAsAstra, importProjectFromAstra } from '../utils/projectExporter.js';
import { PROJECT_FORMAT_VERSION } from '../meta.js';
import { useScenesStore } from '../stores/useScenesStore.js';
import { usePrefabsStore } from '../stores/usePrefabsStore.js';
import { useAssetsStore } from '../stores/useAssetsStore.js';
import { useProjectStore } from '../stores/useProjectStore.js';
import { msg } from '../i18n/index.js';
import { modal } from './ModalManager.js';
import { Toast } from './ToastManager.js';
import { getBasename } from '../utils/id.js';

/**
 * @typedef {Object} ProjectFileServiceOptions
 * @property {Function} dialog.confirm - 确认框
 * @property {Function} dialog.alert - 警告框
 * @property {boolean} isElectron - 是否运行于 Electron
 * @property {boolean} hasFileSystemAccess - 是否支持 File System Access API
 * @property {Object} recent - 最近项目适配器 { add, open, remove }
 * @property {Function} [onClearAutoSave] - 加载/新建后清除自动保存快照
 */

export class ProjectFileService {
  constructor(options) {
    this.dialog = options.dialog;
    this.isElectron = options.isElectron;
    this.hasFileSystemAccess = options.hasFileSystemAccess;
    this.recent = options.recent;
    this.onClearAutoSave = options.onClearAutoSave || (() => {});
    this.fileHandle = null;
  }

  get fileHandleRef() {
    return this.fileHandle;
  }

  setFileHandle(handle) {
    this.fileHandle = handle;
  }

  /** 序列化当前项目为可保存的数据结构 */
  getProjectData() {
    const scenesState = useScenesStore.getState();
    const prefabsState = usePrefabsStore.getState();
    const assetsState = useAssetsStore.getState();
    const projectName = useProjectStore.getState().projectFileName;

    const mainScene = scenesState.scenes.find((s) => s.isMain);
    return {
      version: PROJECT_FORMAT_VERSION,
      name: projectName || 'Untitled Project',
      timestamp: new Date().toISOString(),
      mainScene: mainScene?.id || scenesState.currentSceneId,
      scenes: scenesState.scenes.map((scene) => ({
        id: scene.id,
        name: scene.name,
        isMain: scene.isMain,
        createdAt: scene.createdAt,
        updatedAt: scene.updatedAt,
        settings: scene.settings,
        objects: scene.objects.map((obj) => ({
          id: obj.id,
          name: obj.name,
          type: obj.type,
          position: obj.position,
          rotation: obj.rotation,
          scale: obj.scale,
          color: obj.color,
          assetId: obj.assetId,
          isModel: obj.isModel,
          prefabId: obj.prefabId,
          parentId: obj.parentId || null,
          overrides: obj.overrides,
        })),
      })),
      prefabs: prefabsState.prefabs.map((prefab) => ({
        id: prefab.id,
        name: prefab.name,
        template: prefab.template,
      })),
      assets: assetsState.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        assetType: asset.assetType,
      })),
    };
  }

  /** 加载项目数据到 store（兼容新旧格式） */
  loadProjectData(projectData, projectName) {
    const scenesStore = useScenesStore.getState();

    if (projectData.scenes && Array.isArray(projectData.scenes)) {
      scenesStore.loadScenes(projectData.scenes, projectData.mainScene);
      usePrefabsStore.getState().loadPrefabs(projectData.prefabs || []);
      useAssetsStore.setState({ assets: projectData.assets || [] });
    } else if (projectData.scene && projectData.scene.objects) {
      const convertedScenes = [
        {
          id: 'scene-main-001',
          name: 'Main Scene',
          objects: projectData.scene.objects || [],
          isMain: true,
          createdAt: projectData.timestamp || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          settings: {
            ambientLight: { color: '#ffffff', intensity: 0.5 },
            backgroundColor: '#1a1a2e',
            fog: { enabled: false },
          },
        },
      ];
      scenesStore.loadScenes(convertedScenes, 'scene-main-001');
      usePrefabsStore.getState().loadPrefabs(projectData.prefabs || []);
      useAssetsStore.setState({ assets: projectData.assets || [] });
    } else {
      throw new Error('Invalid project file format');
    }

    useProjectStore.getState().setProjectFileName(projectName);
    useProjectStore.getState().setHasUnsavedChanges(false);
    this.onClearAutoSave();
  }

  async _writeToFile(handle, data) {
    try {
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
    } catch (error) {
      if (error.name === 'InvalidStateError') {
        throw new Error('FILE_HANDLE_INVALID', { cause: error });
      }
      throw error;
    }
  }

  async _verifyFileHandle(handle) {
    try {
      const permission = await handle.queryPermission({ mode: 'readwrite' });
      if (permission === 'granted') return true;
      const requestPermission = await handle.requestPermission({ mode: 'readwrite' });
      return requestPermission === 'granted';
    } catch {
      return false;
    }
  }

  _openFileBrowser(mode, options = {}) {
    return modal.open(FileBrowserDialog, { mode, ...options });
  }

  async saveAsProject() {
    const projectData = this.getProjectData();
    const projectFileName = useProjectStore.getState().projectFileName;

    if (this.isElectron) {
      try {
        const filePath = await this._openFileBrowser('save', {
          title: '保存项目',
          defaultPath: projectFileName || 'astra_project.json',
          filters: [
            { name: 'Astra Project', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
        if (!filePath) return;

        const fileName = getBasename(filePath);
        const writeResult = await window.electronAPI.writeFile(
          filePath,
          JSON.stringify(projectData, null, 2)
        );
        if (!writeResult.success) {
          Toast.error('保存失败: ' + writeResult.error);
          return;
        }

        this.fileHandle = filePath;
        useProjectStore.getState().setProjectFileName(fileName);
        useProjectStore.getState().setHasUnsavedChanges(false);
        Toast.success(`已保存: ${fileName}`);
      } catch (error) {
        console.error('Error saving file:', error);
        Toast.error('保存失败: ' + error.message);
      }
      return;
    }

    if (this.hasFileSystemAccess) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: projectFileName || 'astra_project.json',
          types: [
            {
              description: 'Astra Project',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        this.fileHandle = handle;
        useProjectStore.getState().setProjectFileName(handle.name);
        await this._writeToFile(handle, projectData);
        useProjectStore.getState().setHasUnsavedChanges(false);
        Toast.success(`已保存: ${handle.name}`);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error saving file:', error);
        }
      }
    } else {
      const jsonString = JSON.stringify(projectData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = projectFileName || `astra_project_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      useProjectStore.getState().setHasUnsavedChanges(false);
      Toast.success(`已保存: ${projectFileName || 'astra_project.json'}`);
    }
  }

  async saveProject() {
    const projectData = this.getProjectData();
    const projectFileName = useProjectStore.getState().projectFileName;

    if (this.isElectron && this.fileHandle) {
      const writeResult = await window.electronAPI.writeFile(
        this.fileHandle,
        JSON.stringify(projectData, null, 2)
      );
      if (!writeResult.success) {
        Toast.error('保存失败: ' + writeResult.error);
        return;
      }
      useProjectStore.getState().setHasUnsavedChanges(false);
      Toast.success(`已保存: ${projectFileName}`);
      return;
    }

    if (this.hasFileSystemAccess && this.fileHandle) {
      const hasPermission = await this._verifyFileHandle(this.fileHandle);
      if (!hasPermission) {
        const shouldReselect = await this.dialog.confirm(
          '文件访问权限已失效。是否选择新的保存位置？',
          '保存失败'
        );
        if (shouldReselect) {
          this.fileHandle = null;
          await this.saveAsProject();
        }
        return;
      }

      try {
        await this._writeToFile(this.fileHandle, projectData);
        useProjectStore.getState().setHasUnsavedChanges(false);
        Toast.success(`已保存: ${projectFileName}`);
        return;
      } catch (error) {
        if (error.message === 'FILE_HANDLE_INVALID') {
          const shouldReselect = await this.dialog.confirm(
            '文件可能已被外部修改或移动。是否选择新的保存位置？',
            '保存失败'
          );
          if (shouldReselect) {
            this.fileHandle = null;
            await this.saveAsProject();
          }
          return;
        }
        console.error('Error saving file:', error);
        Toast.error('保存失败: ' + error.message);
        return;
      }
    }

    await this.saveAsProject();
  }

  async loadProject() {
    if (this.isElectron) {
      try {
        const filePath = await this._openFileBrowser('open', {
          title: '打开项目',
          filters: [
            { name: 'Astra Project', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
        if (!filePath) return;

        const readResult = await window.electronAPI.readFile(filePath);
        if (!readResult.success) {
          Toast.error('读取失败: ' + readResult.error);
          return;
        }
        const projectData = JSON.parse(readResult.content);
        const fileName = getBasename(filePath);
        const projectName = projectData.name || fileName.replace('.json', '');

        this.fileHandle = filePath;
        this.loadProjectData(projectData, projectName);
        Toast.success(`已打开: ${projectName}`);
      } catch (error) {
        console.error('Error loading file:', error);
        Toast.error('打开失败: ' + error.message);
      }
      return;
    }

    if (this.hasFileSystemAccess) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: 'Astra Project',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        const file = await handle.getFile();
        const text = await file.text();
        const projectData = JSON.parse(text);
        const projectName = projectData.name || handle.name.replace('.json', '');

        this.fileHandle = handle;
        this.loadProjectData(projectData, projectName);
        this.recent?.add(projectName, handle);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error loading file:', error);
        }
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const projectData = JSON.parse(text);
          const projectName = projectData.name || file.name.replace('.json', '');
          this.loadProjectData(projectData, projectName);
        } catch (error) {
          console.error('Error parsing project file:', error);
        }
      };
      input.click();
    }
  }

  async newProject() {
    const scenesState = useScenesStore.getState();
    const hasUnsavedChanges = useProjectStore.getState().hasUnsavedChanges;
    if (hasUnsavedChanges || scenesState.scenes.some((s) => s.objects.length > 0)) {
      const confirmed = await this.dialog.confirm(msg('menu.confirmNew'), msg('menu.newProject'));
      if (!confirmed) return;
    }

    this.fileHandle = null;
    useScenesStore.getState().resetScenes();
    usePrefabsStore.getState().resetPrefabs();
    useAssetsStore.setState({ assets: [], selectedAsset: null });
    useProjectStore.getState().resetProject();
    this.onClearAutoSave();
  }

  async openRecentProject(project) {
    if (!this.hasFileSystemAccess) {
      await this.dialog.alert('File System Access API not supported', 'Error');
      return;
    }

    const handle = await this.recent?.open(project.id);
    if (!handle) {
      const shouldRemove = await this.dialog.confirm(
        `文件可能已被移动或删除。是否从最近项目列表中移除？`,
        `无法访问 "${project.name}"`
      );
      if (shouldRemove) {
        await this.recent?.remove(project.id);
      }
      return;
    }

    try {
      const file = await handle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);
      this.fileHandle = handle;
      this.loadProjectData(data, project.name);
      this.recent?.add(project.name, handle);
    } catch (error) {
      console.error('Failed to open recent project:', error);
    }
  }

  async exportAsAstra() {
    try {
      const projectData = this.getProjectData();
      await exportProjectAsAstra(projectData, projectData.name + '.astra');
    } catch (error) {
      console.error('Export failed:', error);
      await this.dialog.alert('导出失败: ' + error.message, 'Error');
    }
  }

  async importAstra() {
    if (this.isElectron) {
      try {
        const filePath = await this._openFileBrowser('open', {
          title: '导入 .astra 项目',
          filters: [
            { name: 'Astra Package', extensions: ['astra'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
        if (!filePath) return;

        const readResult = await window.electronAPI.readFile(filePath);
        if (!readResult.success) {
          Toast.error('导入失败: ' + readResult.error);
          return;
        }
        const fileName = getBasename(filePath);
        const file = new File([readResult.content], fileName, { type: 'application/octet-stream' });
        const projectData = await importProjectFromAstra(file);
        this.loadProjectData(projectData, projectData.name + '.astra');
        Toast.success(`已导入: ${projectData.name}.astra`);
      } catch (error) {
        console.error('Import failed:', error);
        Toast.error('导入失败: ' + error.message);
      }
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.astra';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const projectData = await importProjectFromAstra(file);
        this.loadProjectData(projectData, projectData.name + '.astra');
        this.recent?.add({
          name: projectData.name,
          path: file.name,
        });
      } catch (error) {
        console.error('Import failed:', error);
        await this.dialog.alert('导入失败: ' + error.message, 'Error');
      }
    };
    input.click();
  }

  /** 恢复快照 */
  restoreSnapshot(snapshotData) {
    if (snapshotData) {
      this.loadProjectData(snapshotData, snapshotData.name || null);
    }
  }
}

export default ProjectFileService;
