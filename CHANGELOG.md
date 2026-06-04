# 更新日志

## 2026-06-04 文件浏览器优化 + 遗留待办清零

### BUG修复
- **文件浏览器打开时窗口卡死（无响应）**：
  - 原因：`execSync` 同步阻塞 Electron 主进程事件循环
  - 修复：改为异步 `exec` + Promise 包装，主进程不再冻结
- **调试日志残留**：
  - App.jsx `handleReorderObjects` 移除 ~25 条 console.log
  - InspectorPanel.jsx `handleParentChange` 移除 8 条 console.log
- **盘符只显示字母编号**：
  - 无卷标的盘符之前只显示 `"C:"`
  - 修复为有卷标显示 `本地磁盘 (C:)`，无卷标保持 `C:`

### 新增功能
- **盘符列表缓存**：
  - 模块级 TTL 缓存（60 秒），避免重复执行 PowerShell
- **跨平台盘符支持**：
  - macOS：读取 `/Volumes/` 目录获取挂载点
  - Linux：解析 `/proc/mounts` 获取挂载点（过滤虚拟文件系统）
- **文件浏览器路径记忆**：
  - localStorage 持久化记住上次浏览的目录
  - 每次打开自动跳转到上次位置，跨会话有效
  - 优先级：调用方指定 > 上次路径 > 用户主目录

### 功能验证
- **父子变换跟随代码验证通过**：
  - 移动/旋转/缩放三种模式均正确调用 `applyTransformToDescendants`
  - 单选 Pivot 模式和多选模式两条路径均覆盖
- **UV 缩放/偏移功能确认已实现**（InspectorPanel + Viewport 双端齐全）

### 修改文件
- `electron/main.js` — execSync→async exec + TTL缓存 + macOS/Linux跨平台 + label格式
- `src/App.jsx` — handleReorderObjects 清理调试日志
- `src/components/InspectorPanel.jsx` — handleParentChange 清理调试日志
- `src/components/FileBrowserDialog.jsx` — 路径记忆功能（getLastPath/saveLastPath）

## 2026-06-01 自定义文件浏览器

### 新增功能
- **自定义文件浏览器**：
  - 创建 `FileBrowserDialog.jsx` 组件，替代系统文件选择对话框
  - 支持导航功能：返回、前进、向上、主页
  - 路径框支持点击跳转和直接输入路径
  - 侧边栏显示快捷位置和硬盘列表
  - 文件类型筛选功能
  - 新建文件夹功能
  - 支持单选和多选模式
- **SVG图标系统**：
  - 将EMOJI图标替换为SVG图标，统一界面风格
  - 新增文件浏览器相关图标：folder、file、image-file、home、arrow-up、arrow-left、arrow-right
  - 图标颜色支持明暗模式自动切换

### 新增文件
- `src/components/FileBrowserDialog.jsx` - 自定义文件浏览器组件
- `src/styles/file-browser.css` - 文件浏览器样式
- `src/icons/folder.svg` - 文件夹图标
- `src/icons/file.svg` - 文件图标
- `src/icons/image-file.svg` - 图片文件图标
- `src/icons/home.svg` - 主页图标
- `src/icons/arrow-up.svg` - 向上箭头图标
- `src/icons/arrow-left.svg` - 向左箭头图标
- `src/icons/arrow-right.svg` - 向右箭头图标

### 修改文件
- `electron/main.js` - 添加文件系统操作IPC处理函数，区分文本和二进制文件读取
- `electron/preload.js` - 暴露文件系统操作API
- `src/App.jsx` - 项目打开/保存功能改用自定义文件浏览器
- `src/components/AssetsPanel.jsx` - 素材面板导入功能改用自定义文件浏览器
- `src/styles/variables.css` - 添加缺失的CSS变量，添加图标颜色变量
- `src/i18n/zh.json` - 添加文件浏览器中文翻译
- `src/i18n/en.json` - 添加文件浏览器英文翻译

### BUG修复
- **路径拼接错误**：修复点击路径框文件夹名称生成错误路径（如 "D:\C:\awa\"）的问题
  - 原因：Windows盘符路径拼接逻辑错误
  - 解决：修改 `buildSubPath` 函数，正确处理盘符路径
- **路径输入问题**：修复路径框无法输入其他路径的问题
  - 添加路径编辑模式，支持直接输入路径
  - 按 Enter 确认，按 Escape 取消
- **硬盘访问问题**：修复无法到达其他硬盘的问题
  - 在侧边栏添加硬盘列表，显示所有可用硬盘
- **材质文件导入失败**：修复导入材质文件失败的问题
  - 原因：Electron主进程使用文本方式读取二进制文件
  - 解决：区分文本和二进制文件，使用Buffer读取二进制文件并转换为base64
- **图片导入失败**：修复导入图片失败的问题
  - 同上，使用二进制方式读取图片文件
- **图标颜色问题**：修复图标颜色不能根据明暗模式自动改变的问题
  - 添加 `--icon-filter` 和 `--icon-opacity` CSS变量
  - 暗色模式使用 `invert(1)` 反转颜色
- **文件类型筛选无效**：修复文件类型筛选功能无效的问题
  - 原因：筛选逻辑使用所有筛选器而不是当前选中的筛选器
  - 解决：添加 `activeFilterIndex` 状态，只使用当前选中的筛选器
- **模态框样式不一致**：修复文件浏览器模态框与其他模态框样式不一致的问题
  - 统一使用 `--bg-panel`、`--border` 等CSS变量
  - 调整颜色、间距、边框样式

### 新BUG

- 路径问题还是没有被解决！怎么会这样！

## 2026-05-31 代码注释系统

### 新增
- **代码注释**：
  - 为所有核心代码文件添加了文件注释（@file、@description、@module）
  - 为所有函数/组件添加了详细的 @param 和 @returns 注释
  
## 2026-05-23 层级面板拖拽与父子关系修复

### BUG修复
- **拖拽排序问题**：
  - 修复拖拽对象调整顺序时跳到末尾的问题
  - 原因：事件冒泡导致 `handleDrop` 和 `handleDropOnEmpty` 都被触发
  - 解决：添加 `e.stopPropagation()` 阻止事件冒泡
- **展开/折叠问题**：
  - 修复父对象无法折叠的问题
  - 原因：`computedExpandedIds` 自动展开所有父对象
  - 解决：简化为只使用用户控制的展开状态

### 新增功能
- **双击展开/折叠**：双击父对象可展开/折叠子对象
- **展开图标**：
  - 新增 `chevron-collapsed.svg` 现代扁平风箭头图标
  - 替代原来的 `▶` 字符
  - 展开时通过 CSS 旋转 90 度

### 改进
- 添加调试日志帮助定位问题
- 展开图标尺寸增大（12px → 16px）
- 展开图标 hover 时显示背景色

### 修改文件
- `src/components/HierarchyPanel.jsx` - 拖拽修复、展开修复、双击功能
- `src/App.jsx` - 调试日志
- `src/components/InspectorPanel.jsx` - 调试日志
- `src/styles/hierarchy.css` - 图标样式
- `src/icons/chevron-collapsed.svg` - 新建

## 2026-05-22 小游戏完善

### 新增功能
- **山洞系统**：
  - 使用 3D 噪声函数生成地下山洞
  - 添加 3 个地表入口（圆形坑洞向下延伸）
  - 入口自动连接到地下山洞系统
- **背包系统**：
  - 按 E 键打开背包
  - 27 格背包空间（9×3 布局）
  - 点击物品可选择方块类型
  - MC 风格背包 UI

### 改进
- **地形生成**：
  - 世界基础高度从 8 提高到 12
  - 高度变化范围从 ±4 提高到 ±5
  - 泥土层从 3 层减少到 2 层（更快挖到石头）
- **树木外观**：
  - 更高的树干（4-5 格）
  - 更自然的树冠形状（多层、渐变半径）
  - 树木数量增加到 12 棵
- **UI 优化**：
  - 快捷栏从 64×64 缩小到 40×40
  - 暂停界面简化（去掉操作提示）
- **物理参数**：
  - 跳跃高度从 ~2 格降低到 ~1.2 格
  - 更接近 Minecraft 的跳跃手感

### 修改文件
- `public/game/controls.js` - 去掉平滑视角、添加背包功能
- `public/game/world.js` - 山洞入口、树木改进、世界高度
- `public/game/config.js` - 跳跃力调整
- `public/game/style.css` - 快捷栏变小、背包样式
- `public/game/main.js` - 初始化背包
- `public/game.html` - 简化暂停界面、添加背包容器
- `electron/main.js` - 游戏窗口大小

## 2026-05-20 Electron 桌面端支持

### 新增功能
- **Electron 桌面端支持**：
  - 新增 `pnpm desktop` 命令启动桌面应用调试
  - 新增 `pnpm desktop:build` 构建桌面端安装包
  - 新增 `pnpm desktop:preview` 预览已构建的桌面端
  - 自定义标题栏（使用项目工具栏）
  - 窗口控制按钮（最小化、最大化、关闭）
  - Logo 下拉菜单（隐私政策、源代码、检查更新、关于）
  - Alt+点击 Logo 打开小游戏窗口（独立系统窗口）
- **新增组件**：
  - `InfoModal.jsx` - 信息弹窗组件
- **新增页面**：
  - `public/game.html` - 小游戏页面
- **新增图标**：
  - `window-minimize.svg` - 最小化图标
  - `window-maximize.svg` - 最大化图标
  - `window-restore.svg` - 还原图标
  - `window-close.svg` - 关闭图标

### 新增文件
- `electron/main.js` - Electron 主进程
- `electron/preload.js` - Preload 脚本
- `vite.config.desktop.js` - 桌面端 Vite 配置
- `src/components/InfoModal.jsx` - 信息弹窗组件
- `public/game.html` - 小游戏页面
- `src/icons/window-minimize.svg` - 最小化图标
- `src/icons/window-maximize.svg` - 最大化图标
- `src/icons/window-restore.svg` - 还原图标
- `src/icons/window-close.svg` - 关闭图标

### 修改文件
- `package.json` - 添加 Electron 相关依赖和脚本
- `src/components/Toolbar.jsx` - Logo 点击功能、窗口控制按钮、Electron 环境检测
- `src/styles/toolbar.css` - Logo 按钮、下拉菜单、窗口控制按钮样式
- `src/styles/modal.css` - InfoModal 样式

### BUG修复
- **Preload 脚本格式错误**：改用 CommonJS 的 `require` 语法
- **vite-plugin-electron 配置**：使用数组形式配置多个入口
- **Electron 环境检测失败**：改为在 useEffect 中检测并使用 state
- **窗口拖动不工作**：正确设置 `-webkit-app-region: drag/no-drag`
- **窗口控制按钮图标不一致**：重新设计 SVG 图标，统一 12x12 viewBox

### 技术改进
- 使用 IPC 通信实现窗口控制
- Preload 脚本暴露 `electronAPI` 到渲染进程
- 支持最大化状态同步（窗口事件监听）

## 2026-05-18 插件系统 l10n 完善

### 问题描述
- 插件设置界面的多语言没有随编辑器语言切换
- 插件 manifest 信息（名称、描述）始终显示中文，切换到英文后仍显示中文
- PluginManager 的 locale 没有被正确初始化和同步

### 解决方案

#### l10n 文件结构重组
```
src/i18n/plugin-settings/     # 插件设置界面翻译（新增）
src/plugins/plugins/*/l10n/   # 插件自己的翻译
```

#### 翻译来源
| 内容 | 位置 | 获取方式 |
|------|------|----------|
| 插件设置界面 UI | `src/i18n/plugin-settings/` | `msg('pluginSettings.key')` |
| 插件名称/描述 | `src/plugins/plugins/[id]/l10n/` | `pluginMsg(pluginId, 'name')` |
| 插件内部文本 | `src/plugins/plugins/[id]/l10n/` | `ctx.msg('key')` |

### 关键修复
- **App.jsx**：初始化时和切换语言时同步 PluginManager locale
- **PluginManager.js**：添加 locale 订阅机制，支持组件响应语言变化
- **PluginSettingsModal.jsx**：订阅 locale 变化重新渲染
- **i18n/index.js**：合并插件设置界面翻译，添加 locale 订阅

### 新增文件
- `src/i18n/plugin-settings/en.json` - 插件设置界面英文翻译
- `src/i18n/plugin-settings/zh.json` - 插件设置界面中文翻译
- `src/plugins/plugins/*/l10n/en.json` - 各插件英文翻译
- `src/plugins/plugins/*/l10n/zh.json` - 各插件中文翻译

### 修改文件
- `src/App.jsx` - 初始化和切换语言时同步 PluginManager locale
- `src/i18n/index.js` - 合并插件设置界面翻译、添加 locale 订阅
- `src/plugins/PluginManager.js` - 添加 locale 订阅机制、修复 l10n 加载路径
- `src/plugins/index.js` - 导出 subscribePluginLocale
- `src/components/PluginSettingsModal.jsx` - 订阅 locale 变化重新渲染

## 2026-05-17 多视角布局与资源管理器完善

### 新增功能
- **多视角布局系统**：
  - 创建 `MultiViewport.jsx` 组件
  - 支持单视图和四视图模式切换（右上角按钮）
  - 四视图布局：顶视图、前视图、侧视图、透视视图
  - 点击小视图切换为活动视图（蓝色边框高亮）
  - 活动视图显示工具栏、定向球、底部栏
- **Toast 底部弹窗系统**：
  - 创建 `Toast.jsx` 组件和 `useToast.jsx` Hook
  - 支持 success/error/warning/info 四种类型
  - 自动消失（默认3秒）+ 进度条显示剩余时间
  - 弹出/收回动画效果
- **文件保存错误处理改进**：
  - 添加 `verifyFileHandle` 函数验证文件句柄权限
  - 处理 `InvalidStateError` 错误（文件被外部修改/移动）
  - 保存前检查权限，失效时提示用户选择新位置
- **资源管理器完善**：
  - 纹理预览：导入的图片资源显示缩略图
  - 分类过滤：顶部过滤器支持 全部/模型/纹理 分类
  - 右键菜单：支持重命名和删除资源
- **Viewport 组件增强**：
  - 新增 `initialCameraType`、`initialCameraPosition`、`initialCameraLookAt` props
  - 新增 `showToolbar`、`showDock`、`showViewCube`、`viewLabel` props
- **新增 SVG 图标**：image、file、folder、edit、trash、layout-single、layout-quad

### 新增文件
- `src/components/Toast.jsx` - Toast 弹窗组件
- `src/hooks/useToast.jsx` - ToastProvider 和 useToast Hook
- `src/components/MultiViewport.jsx` - 多视角布局组件

### BUG修复
- **快照恢复弹窗重复弹出**：使用 `useRef` 确保只执行一次
- **文件句柄失效后无限弹窗**：修复权限验证逻辑
- **视口不渲染内容**：修复单视图模式缺少 style、容器尺寸为 0
- **布局按钮遮挡 overlay**：将 overlay 移到左上角
- **四视图定向球消失**：定向球 div 始终存在，用 CSS 控制显示
- **模型选择框大小不匹配**：修复 outline 继承 scale 导致双重缩放
- **模型延迟加载不显示**：添加 assets 依赖，确保模型加载后正确渲染
- **导入模型预制件无法实例化**：实例化时添加 type、assetId、isModel 属性
- **素材面板右键菜单样式错误**：使用与层级面板一致的 context-menu 样式
- **右键菜单图标不一致**：统一使用 IconRename 和 IconDelete

### UI改进
- **层级面板添加按钮重构**：底部三个按钮改为标题栏右侧"+"下拉菜单
- **素材面板导入按钮改进**：文字按钮改为透明底"+"图标按钮
- **面板标题栏紧凑化**：减小 padding、font-size、按钮和图标尺寸

### 国际化
- 新增多视图翻译：俄语、拉丁语、日语
- 新增添加对象相关翻译：hierarchy.addObject、hierarchy.cube/sphere/plane

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
