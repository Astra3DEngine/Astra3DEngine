# AGENTS.md

Astra 3D Engine（A3DE）项目 AI 协作指南。本文件供 AI 助手在处理本项目时代码时遵循。

## ⚠️ 最高优先级约束（必须遵守）

### 禁止启动服务器 / 守护进程

- **AI 不允许在任何控制台/终端中启动长期运行的服务器进程或开发服务器**。
- 明确禁止执行：`pnpm dev`、`pnpm start`、`pnpm preview`、`pnpm desktop`、`pnpm desktop:preview`、`vite`、`vite preview` 等任何会保持前台运行、等待连接或阻塞终端退回的命令。
- 也不要用后台方式（`&`、`Start-Process`、`nohup`、独立进程）启动上述命令——服务器应由用户自行启动。
- **验证代码只能通过一次性、会自行退出的命令**：`pnpm build`、`pnpm lint`、`pnpm test`、`pnpm check`、`pnpm format`。（这些命令执行完即退出，不会创建残留进程。）
- 若任务描述看似需要"看到运行效果"，忽略之；用 `pnpm build` 成功 + 测试通过作为完成标准，并把"运行预览"交给用户。

---

## 项目概览

基于 Three.js 的浏览器/Electron 3D 场景编辑器（VSCode/Godot 风格 UI）。

- 技术栈：React 18 + Vite + zustand + Three.js + @szhsin/react-menu + i18next
- 测试：vitest + jsdom + @testing-library
- 语言：React JSX（无 TypeScript，但 ESLint 用 @typescript-eslint 规则检查 .js/.jsx）
- 包管理：pnpm（`package.json` 中 `type: module`）

## 目录结构

```
src/
  App.jsx            # 顶层编排：布局、订阅、快捷键注册；仅做组合不写业务
  components/
    sidebar/         # ActivityBar（图标列）+ Sidebar + CreateObjectMenu
    dock/            # 底部 Dock：BottomPanel/ Dock/ TerminalPlaceholder
    tabs/            # 顶部 EditorTabBar（预览/代码切换）+ CodeEditorPlaceholder
    panels/          # panelMeta.js（可停靠面板元信息：图标/标题/组件）
    modal/           # ModalHost + Modal 基础
    toast/           # ToastHost
    primitives/      # RenameInput/ ColorPicker/ TooltipHost
    dropdown…        # DropdownMenu（基于 @szhsin/react-menu）
    inspector/       # 属性面板拆分块：ObjectSection/ LightSection/ TextureSection/ TransformSection/ Vector2Field
    fileBrowser/     # 文件浏览器拆分块：Toolbar/ Sidebar/ List/ Footer/ FileIcons
    hierarchy/       # HierarchyItem（层级树递归项）
    assets/          # AssetItem（资源网格项）
    toolbar/         # WindowControls + menuItems.jsx（菜单项定义）
  engine/            # three.js 纯逻辑层（禁止出现 React）
    TreeMath.js      # 层级树相对变换/后代传播（apply/extract/collect）
    materials.js     # 材质：createPrimitiveMaterial/ cloneTexture/ ensureStandardMaterial 等
    lights.js        # 光源：createLightFromObject/ createDefaultDirectionalLight 等
    ObjectFactory.js # 对象模板：createObject/ createXxxObject
    ModelLoader.js   # 模型：buildModelGroup/ buildMeshPart/ findMeshByPath
    ViewCube.js      # 视图立方体
  hooks/             # 自定义 hooks
    useAutoSave.js/ useDialog.jsx/ useDropdownMenu.js/ usePanelSearch.js/ useRecentProjects.js
    useViewportPick.js/ useSceneObjectSync.js/ useSelectionOutline.js/ useViewCubeMount.js
  i18n/              # 国际化：zh/en/ja/ru/la 五个 JSON（键严格对齐，各 317）
  lib/               # 非 React 服务单例
    ModalManager.js/ ToastManager.js/ ShortcutManager.js/ ProjectFileService.js/ tooltip.js
  settings/          # settingsRegistry.js：统一设置表（zustand），自带持久化
  stores/            # zustand stores（见下）
  styles/            # 按模块分 CSS，入口 main.css 用 @import
  tests/             # vitest 测试（见「测试」一节）
  utils/             # 纯工具
    id.js            # generateGUID/ generateId/ generatePrefixedId/ getBasename
    localstorage.js  # readRawLocalStorage/ writeRawLocalStorage（自带 try/catch）
    names.js         # generateUniqueName
    pathUtils.js     # normalizePath/ formatSize/ formatDate/ splitPathParts（文件浏览器用）
    fileImport.js    # getMimeType/ collectDirectoryInto/ importFileCollection（资产导入逻辑）
    projectSchema.js # editorObjectToEngineObject/ engineObjectToEditorObject
    projectExporter.js # .astra 导出/导入（ZIP）
    themeManager.js  # 主题注册/应用
```

## Stores（zustand）

| store                   | 职责                                                                   | 持久化                 |
| ----------------------- | ---------------------------------------------------------------------- | ---------------------- |
| `useScenesStore`        | 场景数组/当前场景/undo-redo 历史 + 对象 CRUD                           | 无（由文件服务负责）   |
| `useSelectionStore`     | 单选 `selectedObject` + 多选 `selectedObjects`（同源，多选首项即单选） | 无                     |
| `useAssetsStore`        | 资产库 + 导入（含 GLTF 解析）                                          | 无                     |
| `usePrefabsStore`       | 预制件库                                                               | 无                     |
| `useProjectStore`       | 项目文件名/unsaved 标记（自动保存/快照设置走 Settings）                | 无                     |
| `useEditorStore`        | 工具/播放/光渲染等编辑器态                                             | 无                     |
| `useUIStore`            | 侧栏 active 视图/折叠                                                  | `astra-sidebar-*`      |
| `useWorkspaceTabsStore` | 顶部 tab                                                               | `astra-active-tab`     |
| `useDockStore`          | 面板停靠区（left/bottom）                                              | `astra-dock-*`         |
| `useBottomPanelStore`   | 底栏高度/收起                                                          | `astra-bottom-panel-*` |

## 命令

```bash
pnpm dev           # ⚠️ 用户自行运行，AI 禁止执行
pnpm start         # ⚠️ 同上（= vite）
pnpm preview       # ⚠️ 同上（= vite preview）
pnpm desktop       # ⚠️ 同上（= vite 桌面配置）
pnpm build         # ✅ 生产构建（AI 验证用）
pnpm lint          # ✅ eslint . --max-warnings=0（必须零错误零警告）
pnpm test          # ✅ vitest run
pnpm check         # ✅ prettier --check .
pnpm format        # ✅ prettier --write .
pnpm desktop:build # 桌面端打包（较慢，仅在明确要求时）
pnpm typecheck     # tsc（对 .js 意义有限，一般不需要）
```

## 核心约定

### 状态管理（stores）

- 全部 zustand `create((set, get) => ...)`。
- 组件必须用 **selector 订阅**（`useXStore((s) => s.field)`），禁止整包订阅 `const store = useXStore()`（引发不必要重渲染）。
- 动作内调自身 action 用局部 `get()`，不要 `useXStore.getState()` 自引用（`getState()` 仅用于跨 store 或事件回调）。
- 跨 store 编排（如改场景后清 selection）保持现状直连即可，此规模不抽 coordinator（过度设计）。
- 撤销/重做由 `stores/history.js` 的 `createHistorySlice` 提供；`currentSceneId` 作为 snapshotField 一并入历史，undo/redo 后清空 selection 防悬垂。

### 持久化

- 一律走 `utils/localstorage.js` 的 `readRawLocalStorage`/`writeRawLocalStorage`（自带 try/catch），禁止裸写 `localStorage.getItem/setItem`。
- 业务数据（场景/资产/预制件）不进 localStorage，由 ProjectFileService 负责项目文件读写。

### 工具函数去重

- ID/GUID 统一用 `utils/id.js`；编辑器↔引擎对象转换统一用 `utils/projectSchema.js`。
- 发现重复实现时收敛到 utils，不要复制粘贴。

### Viewport 组件结构（重要）

- `Viewport.jsx` 是大型组件，已拆分出以下 hooks，**新增独立逻辑也应抽成 hook**：
  - `useViewportPick`：射线拾取 + 播放旋转
  - `useSelectionOutline`：选中高亮 + 轴心吸附
  - `useViewCubeMount`：ViewCube 挂载
  - `useSceneObjectSync`：对象数组 ↔ three mesh diff（导出 `CUBE_FACE_NAMES`/`FALLBACK_FACE_TEXTURES` 共享常量）
- 拆分模式：hook 通过**参数显式注入** refs + props（不做闭包捕获），便于复用与测试。
- 主初始化 effect 内部闭包耦合极深（camera/orbitControls/transformControls/keysPressed 互相引用），拆分需先将局部变量提为组件 refs 再传递，谨慎进行。
- three 纯逻辑（相对变换、材质、灯光、模型构建）一律放 `src/engine/`，不写进组件。

### i18n

- 所有用户可见文本必须走 `msg('key')`，禁止硬编码中文/英文。
- tooltip 用 `tip(msg('key'))`；Toast/对话框用 `msg('key', { param })` 插值。
- 新增 key 必须同步加到全部 5 个语言文件（zh/en/ja/ru/la），键须保持对齐（当前各 317）；改后跑 `pnpm test`（i18n 专项用例）验证。
- 语言以 i18n 为唯一来源（勿从 Settings 读取 language，该键已移除）。

### 样式

- 样式按模块分文件，入口 `styles/main.css` 用 @import。
- 颜色只用 `variables.css` 的 CSS 变量（规范名：`--bg-hover`/`--accent-active`/`--danger`/`--theme-color` 等），禁止硬编码色值。
- 按钮家族统一在 `buttons.css`（`.btn`/`.btn-primary`/`.btn-secondary`/`.btn-danger`）。
- 不用的样式类应删除（已有历史清理，勿让死 CSS 回流）。

### 代码卫生

- ESLint 零错误零警告（`--max-warnings=0`）；新增代码不得引入 `no-unused-vars`/`no-undef`/`no-console`。
- 禁用 `console.log`（允许 `console.warn`/`console.error`）。
- **不要改动现有注释**（项目保留中文"喵"等风格注释，用户明确要求不清理、不规范化）。
- 新增 TODO 注释需加 `/* eslint-disable-next-line no-warning-comments -- 说明 */` 防止 lint 报警。
- 新文件头部保留既有 JSDoc 风格（`@file`/`@description`/`@module`）。

### 文档维护（Wiki 页面）

- 设计文档（策划/多场景/项目格式/脚本/建模与动画）维护在 **GitHub Wiki**（仓库 `Astra3DEngine.wiki/`），主索引页为 `Design-Docs.md`（`Design-Docs-EN.md`），各章拆分为独立页面：`Design-01-Project(-EN).md`、`Design-02-MultiScene(-EN).md`、`Design-03-ProjectFormat(-EN).md`、`Design-04-ScriptSystem(-EN).md`、`Design-05-VoxelAnimation(-EN).md`。
- 可复用元素与代码模式速查（全局宿主/服务单例/store 约定/通用组件/面板体系/i18n/工具/拆分模式）维护在 **GitHub Wiki 的 `Element-Template` 系列页**（对应仓库 `Astra3DEngine.wiki/Element-Template.md` 及 `Element-Template-Foundations/Stores/Components/Panels/Patterns(-EN).md`），不在主仓库。
- 新增或修改可复用元素（组件、Hook、服务单例、store、工具函数、引擎模块、拆分模式）时，**必须同步更新 Wiki 的 `Element-Template` 对应分页**；若涉及章节不存在，先在索引页 `Element-Template.md` 中扩展链接。
- 内容必须与源码一致：路径、函数签名、props 表、store 键、i18n 用法都要核对真实实现后再写，禁止照搬过时描述（历史教训：`useModal`/`useModalManager` 已移除，文档曾保留死 API）。
- 该系列页含代码块无 ASCII 图，可跑 prettier 格式化；改动完跑 `pnpm check`。

## 测试

- engine 纯逻辑（TreeMath/ObjectFactory 等）必须具备测试（模式见 `src/tests/engine.test.js`）。
- Viewport 拆分 hooks（useViewportPick/useSelectionOutline/useViewCubeMount）有交互测试（`src/tests/viewportHooks.test.jsx`），用真实 three 数学 + mock ViewCube。
- 测试文件位于 `src/tests/`，命名 `*.test.js`/`*.test.jsx`。
- 涉及 WebGL/three 场景的组件测试需 mock；改 Viewport 逻辑时靠 hooks/engine 层测试 + `pnpm build` 成功兜底，最终交由用户手动验证。
- 测试用例用中文描述（遵循现有命名习惯），断言需明确；跑测试前先 `pnpm build` 确认可编译。

## 项目文件格式（.astra）

- 编辑器内部与 .astra 均使用**多场景 `{ scenes: [...] }`** 结构（v1.0.0）。
- 导出/导入的编辑器↔引擎对象转换统一走 `utils/projectSchema.js`，不要各自硬编码。
- 导入会做版本白名单校验（`0.1.0`/`1.0.0`），未知版本抛错。
- 前端存储端点（localStorage/IndexedDB）出现异常用 try/catch 静默降级，不抛到 UI。

## 已废弃（不要新增引用）

- `src/plugins/` 已删除（插件系统废弃），不要重新引入。
- 死 API 已清理：`Settings.use`/`useSettings`、`Settings.get('language')`、`settingsRegistry.unregisterByCategory` 等已移除。
- 历史死代码已删（`history.canUndo/canRedo`、`meta.getEngineInfo` 等），不要重新声明。
