# 更新日志

## 2026-05-16 预制件系统与右键菜单

### 新增功能
- **预制件系统**：
  - 创建 `PrefabsPanel` 组件显示预制件列表
  - 从层级面板右键菜单创建预制件
  - 双击预制件实例化到场景
  - 预制件实例显示链接图标和 P 徽章
  - 属性面板显示预制件源信息
  - 支持应用到预制件、断开预制件连接
  - 覆盖标记：勾选后实例属性不再跟随预制件更新
  - 预制件数据保存到项目文件
- **右键菜单功能增强**：
  - 复制：复制对象到剪贴板
  - 粘贴：从剪贴板粘贴对象（位置偏移 +1）
  - 副本：直接复制一份对象
  - 重命名：内联编辑对象名称（Enter 确认，Escape 取消）
  - 创建预制件：将对象转为预制件模板
  - 删除：删除对象
- **SVG 图标系统扩展**：
  - 新增 cube.svg、sphere.svg、plane.svg、model.svg 对象类型图标
  - 新增 prefab.svg、prefab-instance.svg 预制件图标
  - 新增 copy.svg、paste.svg、duplicate.svg、rename.svg、delete.svg、plus.svg 操作图标
  - 新增 chevron-down.svg、chevron-right.svg 折叠箭头图标
  - 替换所有 emoji 和特殊符号为 SVG 图标
- **面板折叠功能**：
  - 创建 `CollapsiblePanel` 可折叠面板组件
  - 点击标题栏折叠/展开面板
  - 折叠状态保存到 LocalStorage（刷新页面后保持）
  - 素材面板折叠后视口自动扩展
- **竖向折叠模式**：
  - 当侧边栏所有面板都折叠时，标题栏变成竖向显示
  - 左侧边栏：标题栏横向排列
  - 右侧边栏：标题栏纵向填满
  - 视口区域自动扩展变大
- **预览界面自适应大小**：
  - 使用 ResizeObserver 监听容器大小变化
  - 折叠面板后视口自动调整大小

### BUG修复
- **预制件面板滚动条不显示**：修复预制件列表超出高度后不显示滚动条的问题
  - 添加 `overflow: hidden` 到父容器
  - 添加 `min-height: 0` 允许 flex 子项收缩
- **图标按钮样式不统一**：创建通用图标按钮样式模板
  - `.icon-btn` 基础样式
  - `.icon-btn.icon-btn-danger` 删除按钮（红色高亮）
  - `.icon-btn.icon-btn-accent` 强调按钮（主题色高亮）

### 技术改进
- 预制件数据结构：`{ id, name, template: { type, color, scale, defaultPosition, defaultRotation, assetId, isModel } }`
- 预制件实例：`{ ...obj, prefabId, overrides: { scale, color } }`
- 复制/粘贴使用 clipboard 状态管理
- 重命名使用内联输入框，支持 Enter/Escape 键

### 新增文件
- `src/components/PrefabsPanel.jsx` - 预制件面板组件
- `src/components/CollapsiblePanel.jsx` - 可折叠面板组件
- `src/icons/cube.svg` - 立方体图标
- `src/icons/sphere.svg` - 球体图标
- `src/icons/plane.svg` - 平面图标
- `src/icons/model.svg` - 模型图标
- `src/icons/prefab.svg` - 预制件图标
- `src/icons/prefab-instance.svg` - 预制件实例图标
- `src/icons/copy.svg` - 复制图标
- `src/icons/paste.svg` - 粘贴图标
- `src/icons/duplicate.svg` - 副本图标
- `src/icons/rename.svg` - 重命名图标
- `src/icons/delete.svg` - 删除图标
- `src/icons/plus.svg` - 加号图标
- `src/icons/chevron-down.svg` - 向下箭头图标
- `src/icons/chevron-right.svg` - 向右箭头图标

### 修改文件
- `src/App.jsx` - 集成预制件系统、复制/粘贴/重命名功能、面板折叠状态管理
- `src/components/HierarchyPanel.jsx` - 右键菜单功能、SVG 图标、折叠功能
- `src/components/InspectorPanel.jsx` - 预制件实例信息显示、折叠功能
- `src/components/PrefabsPanel.jsx` - 折叠功能
- `src/components/AssetsPanel.jsx` - 折叠功能
- `src/components/Viewport.jsx` - ResizeObserver 自适应大小
- `src/styles/buttons.css` - 通用图标按钮样式
- `src/styles/panel.css` - 预制件面板样式、滚动条修复、折叠样式、竖向折叠样式
- `src/styles/hierarchy.css` - 右键菜单样式、重命名输入框样式、折叠样式
- `src/styles/inspector.css` - 预制件信息样式、折叠样式
- `src/styles/assets.css` - 折叠样式
- `src/i18n/zh.json` - 中文翻译
- `src/i18n/en.json` - 英文翻译

## 2026-05-16 撤销重做与首选项设置

### 新增功能
- **Undo/Redo 系统**：
  - 创建 `useHistory` 自定义 Hook 管理状态历史
  - 支持最多 50 条历史记录
  - 快捷键：`Ctrl+Z` 撤销、`Ctrl+Y` / `Ctrl+Shift+Z` 重做
  - 编辑菜单撤销/重做按钮已启用，状态动态变化
- **首选项设置面板**：
  - 模态对话框设计，点击背景可关闭
  - 主题切换（明亮/暗色模式）
  - 语言切换（中文/English）

### BUG修复
- **Undo/Redo 过度记录**：修复 TransformControls 拖动时每次微小移动都记录历史的问题
  - 拖拽过程中只更新状态不记录历史
  - 拖拽结束时才记录一次历史
- **点击工具时对象消失**：修复点击 TransformControls 时对象被删除的问题
  - 添加 `hasDragged` 标志防止非拖拽情况下记录历史
  - 修复 `useHistory` 闭包陷阱问题，使用 `presentRef` 替代闭包中的 `present`
  - 新增 `recordCurrentState` 方法，直接使用 ref 记录当前状态，避免闭包问题
  - **关键修复**：`useHistory.setState` 支持函数式更新，所有操作函数使用 `setSceneObjectsWithHistory(prev => ...)` 形式避免闭包陷阱
- **撤销/重做不能修改模型位置**：修复撤销/重做后模型位置不变的问题
  - 历史记录使用**深拷贝**存储状态，避免引用问题
  - 新增 `deepClone` 函数，递归深拷贝所有嵌套对象和数组
  - **关键修复**：修改历史记录时机，在**拖拽开始时**保存历史，而不是结束时，这样撤销能恢复到拖拽前的状态
- **F5 快捷键刷新浏览器**：修复 F5 快捷键不能运行的问题
  - 添加 F5 快捷键处理，阻止浏览器默认刷新行为
- **运行按钮双图标**：修复运行按钮显示两个图标的问题
  - 从 i18n 文本中移除图标字符（▶ 和 ■），让图标单独显示
- **工具栏菜单快捷键**：添加 Alt+F、Alt+E、Alt+V、Alt+R 快捷键打开工具栏下拉菜单
  - DropdownMenu 组件使用 forwardRef 暴露控制方法
  - Toolbar 组件添加快捷键监听
- **快捷键冲突**：修复 Alt+R 同时激活运行菜单和拉伸工具的问题
  - 工具快捷键（Q、W、E、R）添加修饰键检查，排除 Alt、Ctrl、Meta 键
- **多个下拉框同时展开**：修复快捷键可以同时展开多个下拉框的问题
  - 快捷键先关闭所有菜单再打开目标菜单
- **首选项模态框透明**：修复首选项模态框透明的问题
  - `modal.css` 使用了未定义的 CSS 变量，替换为已定义的变量
- **首选项模态框布局**：重新设计为顶部标题、左侧分类、右侧详细设置的布局
  - 类似 VS Code 设置界面的设计风格
  - 左侧显示分类列表（外观、语言）
  - 右侧显示对应分类的详细设置
- **语言设置持久化**：将语言设置保存到 LocalStorage，刷新页面后设置不会丢失
  - 新增 `astra-locale` localStorage 键
  - 自动检测浏览器语言并设置默认语言
- **多语言支持**：新增日语、俄语、拉丁语支持
  - 创建 ja.json、ru.json、la.json 翻译文件
  - 语言子菜单：视图菜单中的语言选项支持鼠标悬停展开子菜单
  - DropdownMenu 组件支持子菜单展开功能
- **语言切换错误**：修复点击语言选项切换到错误语言的问题
  - 新增 `handleSetLocale` 函数直接设置指定语言
  - 避免调用 `toggleLocale()` 导致语言被切换两次

### 技术改进
- 新建/加载项目时重置历史记录
- 添加对象、删除对象时自动记录历史
- `handleUpdateObject` 新增 `recordHistory` 参数控制是否记录历史

### 新增文件
- `src/hooks/useHistory.js` - 历史管理 Hook
- `src/components/PreferencesModal.jsx` - 首选项模态框
- `src/styles/modal.css` - 模态框样式
- `src/icons/close.svg` - 关闭图标

## 2026-05-15 工具栏菜单与主题系统

### 新增功能
- **下拉菜单组件**：创建可复用的 `DropdownMenu` 组件，支持自定义圆角、向上/向下展开
- **工具栏菜单系统**：
  - 文件菜单：新建、打开、保存、另存为
  - 编辑菜单：撤销、重做（预留）
  - 视图菜单：明亮/暗色模式切换、语言切换、首选项
  - 运行菜单：播放/停止
- **快捷键系统**：
  - `Ctrl+S` 保存、`Ctrl+Shift+S` 另存为、`Ctrl+O` 打开、`Ctrl+Alt+N` 新建、`F5` 运行
- **明亮/暗色主题切换**：
  - CSS变量定义两套主题色
  - 主题保存到 localStorage
  - 3D场景背景色随主题变化
- **SVG图标系统**：
  - 安装 `vite-plugin-svgr` 支持SVG作为React组件
  - 所有图标使用 `currentColor` 自动适配主题颜色
- **File System Access API**：支持直接保存到已选择的文件

### BUG修复
- **快捷键冲突**：将新建项目快捷键改为 `Ctrl+Alt+N` 避免浏览器拦截
- **正交视角定向球点击**：修复正交视角下点击定向球无法定位的问题（raycaster使用正确的相机）
- **下拉框被遮挡**：dock栏下拉框改为向上展开

### UI优化
- 下拉框样式改为只有底部圆角
- 预览界面工具按钮使用SVG图标
- 相机模式下拉框使用统一组件
- 删除工具栏右侧冗余按钮
- 网格颜色固定为浅灰色

### 技术改进
- 国际化新增主题、语言、首选项等翻译键
- 删除冗余的 `localeNames` 导出


## 2025-05-13 视口与定向球功能完善

### 新增功能
- **透视/正交视角切换**：在视口底部工具条添加下拉框，支持切换透视和正交视角
- **底部工具条**：新增视口底部 dock 区域，用于放置视角切换等控制选项

### BUG修复
- **定向球相对面变色**：修复点击定向球某个面时，相对的另一个面也同时变色的问题（原因：三角形分组时使用了绝对值导致正反两面被分配到同一索引）
- **定向球方向偏转**：修复右键拖拽改变摄像机位置后，定向球方向发生奇怪偏转的问题（改用四元数同步相机旋转状态）
- **工具条遮挡定向球**：调整定向球位置，避免被底部工具条遮挡
- **正交视角缩放**：修复正交视角下无法滚轮缩放的问题（根据相机距离动态调整正交相机 frustum 大小）
- **正交视角 TransformControls**：修复正交视角下变换工具大小不正确、无法点击拖动的问题（动态更新 TransformControls 的相机引用）
- **万向节锁问题**：修复相机在极点（正上/正下）时定向球和视角切换的异常行为（正确处理 up 向量和四元数同步）

### 技术改进
- 定向球相机同步方式改为直接复制主相机四元数，保留完整旋转状态
- 正交相机 frustum 大小根据透视相机距离动态计算
- 国际化支持新增"正交"、"视角模式"文本
