/**
 * @file plugins/api.js
 * @description 插件 API 创建函数，为插件提供访问编辑器核心功能的接口
 * @module plugins/api
 * 
 * 现在，即刻创建插件！
 */

/**
 * 创建插件 API
 * @param {Object} options - API 配置选项
 * @param {Array} options.sceneObjects - 场景对象列表
 * @param {Function} options.setSceneObjects - 设置场景对象函数
 * @param {number} options.selectedObjectId - 选中的对象 ID
 * @param {Function} options.setSelectedObjectId - 设置选中对象函数
 * @param {Array} options.assets - 资源列表
 * @param {Function} options.setAssets - 设置资源函数
 * @param {Array} options.prefabs - 预制件列表
 * @param {Function} options.setPrefabs - 设置预制件函数
 * @param {string} options.theme - 当前主题
 * @param {Function} options.setTheme - 设置主题函数
 * @param {string} options.locale - 当前语言
 * @param {Function} options.setLocale - 设置语言函数
 * @param {Function} options.showNotification - 显示通知函数
 * @param {Object} options.viewportRef - 视口引用
 * @param {Object} options.sceneRef - 场景引用
 * @param {Object} options.cameraRef - 相机引用
 * @param {Object} options.rendererRef - 渲染器引用
 * @returns {Object} 插件 API 对象
 */
const createPluginApi = ({
  sceneObjects,
  setSceneObjects,
  selectedObjectId,
  setSelectedObjectId,
  assets,
  setAssets,
  prefabs,
  setPrefabs,
  theme,
  setTheme,
  locale,
  setLocale,
  showNotification,
  viewportRef,
  sceneRef,
  cameraRef,
  rendererRef,
}) => {
  return {
    /**
     * 场景操作 API
     */
    scene: {
      getObjects: () => sceneObjects,
      setObjects: setSceneObjects,
      getSelectedId: () => selectedObjectId,
      setSelectedId: setSelectedObjectId,
      
      addObject: (object) => {
        setSceneObjects(prev => [...prev, object]);
      },
      
      removeObject: (id) => {
        setSceneObjects(prev => prev.filter(obj => obj.id !== id));
      },
      
      updateObject: (id, updates) => {
        setSceneObjects(prev => prev.map(obj => 
          obj.id === id ? { ...obj, ...updates } : obj
        ));
      },
      
      getObject: (id) => {
        return sceneObjects.find(obj => obj.id === id);
      },
    },
    
    /**
     * 资源管理 API
     */
    assets: {
      getAll: () => assets,
      setAll: setAssets,
      
      add: (asset) => {
        setAssets(prev => [...prev, asset]);
      },
      
      remove: (id) => {
        setAssets(prev => prev.filter(a => a.id !== id));
      },
      
      get: (id) => {
        return assets.find(a => a.id === id);
      },
    },
    
    /**
     * 预制件管理 API
     */
    prefabs: {
      getAll: () => prefabs,
      setAll: setPrefabs,
      
      add: (prefab) => {
        setPrefabs(prev => [...prev, prefab]);
      },
      
      remove: (id) => {
        setPrefabs(prev => prev.filter(p => p.id !== id));
      },
      
      get: (id) => {
        return prefabs.find(p => p.id === id);
      },
    },
    
    /**
     * UI 操作 API
     */
    ui: {
      getTheme: () => theme,
      setTheme: setTheme,
      getLocale: () => locale,
      setLocale: setLocale,
      showNotification,
    },
    
    /**
     * 视口操作 API
     */
    viewport: {
      getRef: () => viewportRef,
      getScene: () => sceneRef?.current,
      getCamera: () => cameraRef?.current,
      getRenderer: () => rendererRef?.current,
    },
    
    /**
     * 工具函数 API
     */
    utils: {
      generateId: () => Date.now() + Math.random(),
      
      deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
      
      debounce: (fn, delay) => {
        let timer;
        return (...args) => {
          clearTimeout(timer);
          timer = setTimeout(() => fn(...args), delay);
        };
      },
      
      throttle: (fn, limit) => {
        let inThrottle;
        return (...args) => {
          if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
          }
        };
      },
    },
  };
};

export default createPluginApi;

// 还有个有关主题的 API 不在这。