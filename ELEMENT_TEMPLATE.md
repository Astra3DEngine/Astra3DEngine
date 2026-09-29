# 组件模板使用文档

> Astra 3D Engine 可复用元素与代码模式速查。新增组件时先查本文档：能复用全局宿主/服务/组件/Hook 的，不要手搓 `useState` + `useRef` + `useEffect`。

## 目录

- [1. 全局宿主（App.jsx 一次性挂载）](#1-全局宿主appjsx-一次性挂载)
  - [1.1 ModalHost（模态框宿主）](#11-modalhost模态框宿主)
  - [1.2 ToastHost（通知宿主）](#12-toasthost通知宿主)
  - [1.3 TooltipHost（Tooltip 宿主）](#13-tooltiphosttooltip-宿主)
  - [1.4 DialogProvider（确认/输入弹窗）](#14-dialogprovider确认输入弹窗)
- [2. 服务 / 单例](#2-服务--单例)
  - [2.1 ModalManager（模态框调度）](#21-modalmanager模态框调度)
  - [2.2 ToastManager（通知列表）](#22-toastmanager通知列表)
  - [2.3 ShortcutManager（快捷键）](#23-shortcutmanager快捷键)
  - [2.4 tooltip.tip()（Tooltip 声明）](#24-tooltiptip-tooltip-声明)
  - [2.5 SettingsRegistry（设置）](#25-settingsregistry设置)
- [3. 状态管理（zustand store）](#3-状态管理zustand-store)
  - [3.1 Store 写法约定](#31-store-写法约定)
  - [3.2 持久化约定](#32-持久化约定)
  - [3.3 撤销/重做（createHistorySlice）](#33-撤销重做createhistoryslice)
  - [3.4 Store 一览](#34-store-一览)
- [4. 通用组件](#4-通用组件)
  - [4.1 Modal（模态框外壳 / react-rnd）](#41-modal模态框外壳--react-rnd)
  - [4.2 DropdownMenu（下拉 / 右键菜单）](#42-dropdownmenu下拉--右键菜单)
  - [4.3 useDropdownMenu（菜单状态 Hook）](#43-usedropdownmenu菜单状态-hook)
  - [4.4 Dialog 组件（Alert/Confirm/Prompt）](#44-dialog-组件alertconfirmprompt)
  - [4.5 ColorPicker（取色器）](#45-colorpicker取色器)
  - [4.6 RenameInput（内联重命名）](#46-renameinput内联重命名)
  - [4.7 Toast（通知条目）](#47-toast通知条目)
  - [4.8 ResizablePanel（可调整尺寸面板）](#48-resizablepanel可调整尺寸面板)
- [5. 面板 / 布局体系](#5-面板--布局体系)
  - [5.1 面板注册表（panelMeta）](#51-面板注册表panelmeta)
  - [5.2 ActivityBar / Sidebar / sidebarViews](#52-activitybar--sidebar--sidebarviews)
  - [5.3 Dock / dockPanels / BottomPanel](#53-dock--dockpanels--bottompanel)
  - [5.4 EditorTabBar / workspaceTabs](#54-editortabbar--workspacetabs)
- [6. 国际化 / 工具 / 常量](#6-国际化--工具--常量)
  - [6.1 i18n（msg / setLocale）](#61-i18nmsg--setlocale)
  - [6.2 工具函数](#62-工具函数)
  - [6.3 meta.js 单一来源](#63-metajs-单一来源)
- [7. 大型组件拆分模式](#7-大型组件拆分模式)
  - [7.1 子目录拆分（inspector/fileBrowser/hierarchy/assets）](#71-子目录拆分)
  - [7.2 Viewport Hook 拆分（engine 层隔离）](#72-viewport-hook-拆分engine-层隔离)
- [8. 引擎层（src/engine）](#8-引擎层srcengine)
- [9. 通用规则清单](#9-通用规则清单)

---

## 1. 全局宿主（App.jsx 一次性挂载）

全局宿主都在 App 根部挂载一次，业务代码只管调用服务，不手动渲染这些宿主。

### 1.1 ModalHost（模态框宿主）

`src/components/modal/ModalHost.jsx`

订阅 `ModalManager` 单例，渲染当前栈中的全部模态框。

```jsx
import ModalHost from './components/modal/ModalHost.jsx';

<ModalHost />;
```

### 1.2 ToastHost（通知宿主）

`src/components/toast/ToastHost.jsx`

订阅 `ToastManager`，全局渲染通知列表。

```jsx
import ToastHost from './components/toast/ToastHost.jsx';

<ToastHost />;
```

### 1.3 TooltipHost（Tooltip 宿主）

`src/components/primitives/TooltipHost.jsx`

事件委托监听带 `data-astra-tip` 的元素，气泡带箭头、自动翻转防溢出。延迟显示：首次 hover 约 600ms，显示过一次后（warm）约 120ms。

```jsx
import TooltipHost from './components/primitives/TooltipHost.jsx';

<TooltipHost />;
```

> 业务组件**不需要**手动渲染 Tooltip，用 [`tip()`](#24-tooltiptip-tooltip-声明) 给元素挂 `data-*` 属性即可。

### 1.4 DialogProvider（确认/输入弹窗）

`src/hooks/useDialog.jsx`

alert / confirm / prompt 的 Promise 版本，替换浏览器原生弹窗。组件树根部挂一次。

```jsx
import { DialogProvider } from './hooks/useDialog.jsx';

<DialogProvider>
  <AppContent />
</DialogProvider>;
```

---

## 2. 服务 / 单例

### 2.1 ModalManager（模态框调度）

`src/lib/ModalManager.js` — 全局单例 `modal`，以 Promise 打开任意组件，与 React 解耦。由 `ModalHost` 订阅渲染。

```js
import { modal } from '../lib/ModalManager.js';

// 打开模态框组件（自动注入 isOpen + onClose），关闭时 resolve 结果
const result = await modal.open(FileBrowserDialog, {
  mode: 'save',
  filters: [...],
});
if (result) { /* 用户点了保存 */ }

// 关闭所有；重复打开同一组件会被忽略（resolve null）
modal.closeAll();
```

| 方法        | 签名                                 | 返回值         | 说明                                                                  |
| ----------- | ------------------------------------ | -------------- | --------------------------------------------------------------------- |
| `open`      | `(Component, props = {}) => Promise` | `Promise<any>` | 打开模态框（注入 `isOpen`/`onClose`）；相同组件重复打开返回已 resolve |
| `closeAll`  | `() => void`                         | `void`         | 关闭全部，pending Promise resolve `null`                              |
| `subscribe` | `(listener) => unsubscribe`          | `Function`     | 订阅栈变化（仅供 `ModalHost`）                                        |

用法示例（App.jsx 中从 Toolbar 打开）：

```js
import { modal } from '../lib/ModalManager.js';
import InfoModal from './components/InfoModal.jsx';

modal.open(InfoModal, { type: 'about' });
```

### 2.2 ToastManager（通知列表）

`src/lib/ToastManager.js` — 全局单例 `Toast`，由 `ToastHost` 订阅渲染。

```js
import { Toast } from '../lib/ToastManager.js';

Toast.success('保存成功');
Toast.error('操作失败');
Toast.warning('磁盘空间不足');
Toast.info('数据已加载');
Toast.show('自定义消息', 'info', 5000); // (message, type, duration)

Toast.close(id); // 关闭指定
Toast.closeAll(); // 全部关闭
```

| 方法                         | 签名                        | 说明                                 |
| ---------------------------- | --------------------------- | ------------------------------------ |
| `show`                       | `(message, type, duration)` | 基础方法，返回 toast id              |
| `success/error/warning/info` | `(message, duration=3000)`  | 快捷类型（error 4000，warning 3500） |
| `close` / `closeAll`         | `(id)` / `()`               | 关闭                                 |
| `subscribe`                  | `(listener) => unsubscribe` | 订阅列表变更                         |

### 2.3 ShortcutManager（快捷键）

`src/lib/ShortcutManager.js` — 全局单例 `shortcuts`，命令式 + 可配置热键，绑定持久化到 `localStorage('astra-keybindings')`。

```js
import { shortcuts, formatShortcutDisplay } from '../lib/ShortcutManager.js';

shortcuts.define({
  id: 'file.save', // 唯一 id
  label: '保存', // 显示名（可省略，默认取 id）
  category: 'file', // 分类（首选项界面分组）
  keys: 'ctrl+s', // 默认组合键；支持 'a|b' 多绑定
  handler: (e) => {
    saveProject();
  },
});

// 组件卸载时注销，避免残留误触发
useEffect(() => () => shortcuts.remove('file.save'), []);

// 读取显示格式（菜单快捷键提示用）
formatShortcutDisplay(shortcuts.getBinding('file.save')); // "Ctrl+S"

// 用户自定义绑定（首选项界面）
shortcuts.setBinding('file.save', 'ctrl+shift+s');
shortcuts.resetBinding('file.save');
shortcuts.resetAll();

// 订阅绑定变化（菜单提示跟随热设置）
useEffect(() => shortcuts.subscribe(() => setTick((t) => t + 1)), []);
```

组合键格式见 `matchesCombo(e, 'ctrl+s')` / `formatShortcut(e)`（录制用）。`ctrl` 与 `meta` 视为等价。

### 2.4 tooltip.tip()（Tooltip 声明）

`src/lib/tooltip.js`

给元素挂 Tooltip 的数据属性，配合全局 `TooltipHost`。

```jsx
import { tip } from '../lib/tooltip.js';

<button {...tip(msg('hierarchy.delete'))}>删除</button>

// 指定方位（空间不足自动翻转）
<button {...tip('朝上', 'top')}>打开</button>
```

```js
tip(content, (place = 'top')); // -> { 'data-astra-tip': content, 'data-astra-place': place }
```

### 2.5 SettingsRegistry（设置）

`src/settings/settingsRegistry.js` — 全局注册表 `Settings`，内置/插件设置的**定义、默认值、分类、持久化**统一管理，取代零散 `localStorage.getItem('astra-...')`。

```js
import { Settings, initBuiltInSettings } from '../settings/settingsRegistry.js';

// 应用启动时注册内置设置（theme / autosaveEnabled / maxSnapshots）
initBuiltInSettings();

// 新增设置：register 定义，build() 后可用
Settings.register({
  key: 'mySetting',
  defaultValue: 10,
  category: 'mine',
  label: 'settings.mySetting',
  type: 'number', // 'text' | 'number' | 'boolean' | 'select'
  options: [{ value: 'a', label: '选项A' }],
});

// 读写
Settings.get('theme');
Settings.set('theme', 'light');
Settings.reset('theme');
Settings.getDefinitionsByCategory(); // 首选项界面分组渲染
```

> 设置值统一持久化到 `localStorage('astra-settings')`。旧版本散落的 `astra-theme` 等键会在首次构建时迁移一次。

---

## 3. 状态管理（zustand store）

### 3.1 Store 写法约定

- 全部 `create((set, get) => ...)`。
- 组件**必须用 selector 订阅**：`useXStore((s) => s.field)`，禁止整包订阅 `const store = useXStore()`。
- action 内部调自身用局部 `get()`，跨 store 协调用 `useXStore.getState()`。`getState()` 仅用于跨 store 或事件回调。

```js
import { create } from 'zustand';

export const useExampleStore = create((set, get) => ({
  data: [],
  addItem: (item) => set((s) => ({ data: [...s.data, item] })),
}));
```

组件侧：

```jsx
const data = useExampleStore((s) => s.data); // ✅ selector
const addItem = useExampleStore((s) => s.addItem);
```

### 3.2 持久化约定

UI 状态（侧栏、tab、dock、bottom panel 等）一律走 `utils/localstorage.js`：

```js
import {
  readRawLocalStorage,
  writeRawLocalStorage,
  readLocalStorage,
  setItemToLocalStorage,
} from '../utils/localstorage.js';

// 原始字符串（UI 开关/数值）
const v = readRawLocalStorage('astra-active-tab', 'preview');
writeRawLocalStorage('astra-active-tab', 'code');

// JSON 对象
const obj = readLocalStorage('my-key'); // 解析失败返回 null
setItemToLocalStorage('my-key', { a: 1 });
```

禁止裸写 `localStorage.getItem/setItem`（业务数据除外，见 3.4 表）。

### 3.3 撤销/重做（createHistorySlice）

`src/stores/history.js` 提供历史切片，接入任意 zustand store：

```js
import { createHistorySlice } from './history.js';

export const useXStore = create((set, get) => {
  const history = createHistorySlice(set, get, [], 'scenes', ['currentSceneId']);
  return {
    scenes: [],
    currentSceneId: null,
    ...history,
    setState: (next, record = true) => history.setState(next, record), // 覆盖默认
    undo: () => {
      history.undo(); /* 清理下流状态 */
    },
    redo: () => {
      history.redo();
    },
  };
});
```

要点：

- `field`：历史作用的主字段（如 `scenes`）。
- `snapshotFields`：需随历史一并快照/恢复的附加字段（如 `currentSceneId`）。
- `setState` 默认记录历史；拖拽等高频场景结束时用 `recordCurrentState()` 手动记录一次。
- `undo/redo` 后应清理依赖该状态的其它 store（典型：`useSelectionStore.clearSelection()`），防悬垂。

### 3.4 Store 一览

| store                   | 职责                                                   | 持久化键               | 历史                  |
| ----------------------- | ------------------------------------------------------ | ---------------------- | --------------------- |
| `useScenesStore`        | 场景数组 / 当前场景 / 对象 CRUD / 剪贴板               | 无（文件服务负责）     | ✅ createHistorySlice |
| `useSelectionStore`     | 单选 `selectedObject` + 多选 `selectedObjects`（同源） | 无                     | —                     |
| `useAssetsStore`        | 资产库 + 导入（含 GLTF 解析）                          | 无                     | —                     |
| `usePrefabsStore`       | 预制件库                                               | 无                     | —                     |
| `useProjectStore`       | 项目文件名 / unsaved 标记                              | 无                     | —                     |
| `useEditorStore`        | 工具 / 播放 / 光渲染等编辑器态                         | 无                     | —                     |
| `useUIStore`            | 侧栏 active 视图 / 折叠                                | `astra-sidebar-*`      | —                     |
| `useWorkspaceTabsStore` | 顶部 tab（preview/code）                               | `astra-active-tab`     | —                     |
| `useDockStore`          | 面板停靠区（left/bottom）                              | `astra-dock-*`         | —                     |
| `useBottomPanelStore`   | 底栏高度 / 收起                                        | `astra-bottom-panel-*` | —                     |

跨场景/对象操作会联动 `useSelectionStore`（选中后清理/同步），遵循 store 内直接 `getState()` 协调即可，无需抽 coordinator。

---

## 4. 通用组件

### 4.1 Modal（模态框外壳 / react-rnd）

`src/components/Modal.jsx` — 统一外壳，基于 `react-rnd`，支持**拖拽移动 + 缩放**；默认居中。所有模态框内容组件用它包裹。

```jsx
import Modal from './components/Modal.jsx';

export function MyModal({ isOpen, onClose }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="设置"
      width={650}
      height={420}
      footer={
        <button className="btn btn-primary" onClick={onClose}>
          确定
        </button>
      }
    >
      <div>这里是内容</div>
    </Modal>
  );
}
```

| Prop                                               | 类型             | 默认                | 说明                                          |
| -------------------------------------------------- | ---------------- | ------------------- | --------------------------------------------- |
| `isOpen`                                           | `boolean`        | —                   | 是否显示（调度打开时自动注入 true）           |
| `onClose`                                          | `Function`       | —                   | 关闭回调（调度打开时自动注入）                |
| `title`                                            | `string`         | —                   | 标题（不传则不渲染 header）                   |
| `children`                                         | `ReactNode`      | —                   | body 内容                                     |
| `footer`                                           | `ReactNode`      | —                   | footer 内容（可选）                           |
| `width` / `height`                                 | `number\|string` | `480` / `360`       | 宽度/高度（数字 px，字符串支持 `60%`/`50vh`） |
| `maxWidth` / `maxHeight`                           | `number\|string` | `'90vw'` / `'85vh'` | 最大尺寸                                      |
| `className` / `bodyClassName` / `overlayClassName` | `string`         | `''`                | 各区域附加类                                  |
| `closeButton`                                      | `boolean`        | `true`              | 右上角 ×                                      |
| `closeOnOverlayClick`                              | `boolean`        | `true`              | 点遮罩关闭                                    |
| `closeOnEscape`                                    | `boolean`        | `true`              | Esc 关闭                                      |
| `modalRef`                                         | `ref`            | —                   | 绑定到 overlay                                |
| `...props`                                         | `Object`         | —                   | 透传 `Rnd`（如 `minWidth`/`enableResizing`）  |

> 尺寸换算 `toPx()` 支持数字及 `%`/`vw`/`vh` 字符串，最终受 `maxWidth/maxHeight` 约束。

### 4.2 DropdownMenu（下拉 / 右键菜单）

`src/components/DropdownMenu.jsx` — **唯一**菜单渲染组件（基于 `@szhsin/react-menu`），两种模式：

**模式 A：Trigger 模式**（Toolbar 菜单，组件自管开关）

```jsx
import DropdownMenu from '../components/DropdownMenu.jsx';
import { useRef } from 'react';

const menuRef = useRef(null);
// 快捷键控制：menuRef.current?.open() / close() / toggle()

<DropdownMenu
  ref={menuRef}
  label="文件"
  items={[
    {
      label: '新建',
      icon: <IconNew className="menu-icon" />,
      shortcut: 'Ctrl+N',
      onClick: handleNew,
    },
    { divider: true },
    {
      label: '删除',
      icon: <IconDelete className="menu-icon" />,
      danger: true,
      onClick: handleDelete,
    },
    {
      label: '语言',
      icon: <IconLang className="menu-icon" />,
      submenu: [
        { label: '中文', active: true, onClick: () => setLocale('zh') },
        { label: 'English', onClick: () => setLocale('en') },
      ],
    },
  ]}
  roundedCorners="bottom"
/>;
```

**模式 B：受控模式**（右键 / Add / Logo 菜单，"我是疯子" 级定位）

```jsx
import DropdownMenu from '../components/DropdownMenu.jsx';
import { useDropdownMenu } from '../hooks/useDropdownMenu.js';

const menu = useDropdownMenu({ onClose: () => setContextMenuObject(null) });

// 触发
<div onContextMenu={(e) => { e.preventDefault(); menu.openAt(e.clientX, e.clientY); }}>右键我</div>

<DropdownMenu
  isOpen={menu.isOpen}
  onClose={menu.close}
  position={menu.position}
  menuRef={menu.menuRef}
  roundedCorners="all"
  items={contextMenuItems}
/>
```

也支持 `children` 自定义内容（不推荐，破坏统一样式）。

**items 数据结构：**

| 字段                  | 类型                | 说明                                     |
| --------------------- | ------------------- | ---------------------------------------- |
| `label`               | `string\|ReactNode` | 显示文本                                 |
| `icon`                | `ReactNode`         | 图标（统一 `className="dropdown-icon"`） |
| `onClick`             | `Function`          | 点击回调（自动关闭）                     |
| `disabled` / `danger` | `boolean`           | 禁用 / 危险红                            |
| `shortcut`            | `string`            | 快捷键提示（Trigger 模式有样式）         |
| `submenu`             | `Array<Item>`       | 子菜单                                   |
| `active`              | `boolean`           | 选中（显示 ✓）                           |
| `divider`             | `boolean`           | 分隔线                                   |

**roundedCorners：**

```jsx
<DropdownMenu roundedCorners="all" />     {/* 或 bottom / top / none */}
<DropdownMenu roundedCorners={{ topLeft: true, topRight: false, bottomLeft: true, bottomRight: false }} />
```

### 4.3 useDropdownMenu（菜单状态 Hook）

`src/hooks/useDropdownMenu.js` — 纯状态，不做 DOM 监听（由组件处理）。

```js
import { useDropdownMenu } from '../hooks/useDropdownMenu.js';

const menu = useDropdownMenu({ onOpen, onClose });

// menu.isOpen / menu.position({x,y} | null) / menu.menuRef
// menu.open() / menu.close() / menu.toggle() / menu.openAt(x, y)
```

### 4.4 Dialog 组件（Alert/Confirm/Prompt）

`src/components/Dialog.jsx` — 三层便捷弹窗，均复用 `Modal` 外壳。通常不直接渲染，用 [`useDialog`](#14-dialogprovider确认输入弹窗)：

```js
const dialog = useDialog();
await dialog.alert('操作失败');
const ok = await dialog.confirm('确认删除？', '提示', { confirmText: '删除', cancelText: '取消' });
const name = await dialog.prompt('输入名字', '默认值', '标题', '占位符');
```

| 方法      | 签名                                                                      | 返回           |
| --------- | ------------------------------------------------------------------------- | -------------- |
| `alert`   | `(message, title?) => Promise<void>`                                      | 关闭后 resolve |
| `confirm` | `(message, title?, options?) => Promise<boolean>`                         | true / false   |
| `prompt`  | `(message, defaultValue?, title?, placeholder?) => Promise<string\|null>` | 值 / null      |

> `DialogProvider` 挂载时会把 `window.alert/confirm/prompt` 替换为自制实现；卸载时还原。

### 4.5 ColorPicker（取色器）

`src/components/primitives/ColorPicker.jsx` — 基于 react-colorful，弹层 portal 到 body，自动防溢出。

```jsx
import ColorPicker from './primitives/ColorPicker.jsx';

<ColorPicker value={color} onChange={setColor} title={msg('inspector.color')} />;
```

| Prop                  | 类型                      | 默认        | 说明                       |
| --------------------- | ------------------------- | ----------- | -------------------------- |
| `value`               | `string`                  | `'#ffffff'` | 当前颜色 hex（自动补 `#`） |
| `onChange`            | `(color: string) => void` | —           | 变化回调（hex）            |
| `className` / `title` | `string`                  | `''` / —    | 附加类 / Tooltip 提示      |

### 4.6 RenameInput（内联重命名）

`src/components/primitives/RenameInput.jsx` — 聚焦全选、Enter 提交、Escape/失焦取消、点击阻止冒泡。

```jsx
import RenameInput from './primitives/RenameInput.jsx';

{
  isRenaming ? (
    <RenameInput
      value={obj.name}
      className="hierarchy-rename-input"
      onSubmit={(value) => {
        onRenameObject(obj.id, value);
        stopRenaming();
      }}
      onCancel={stopRenaming}
    />
  ) : (
    <span className="hierarchy-item-name">{obj.name}</span>
  );
}
```

> 空值提交视为取消。

### 4.7 Toast（通知条目）

`src/components/Toast.jsx` — 单个通知条目 + 容器；正常通过 `ToastManager` 使用，组件不必手动渲染。

```jsx
import { ToastContainer } from './components/Toast.jsx';
<ToastContainer toasts={toasts} onClose={closeToast} />;
```

### 4.8 ResizablePanel（可调整尺寸面板）

`src/components/ResizablePanel.jsx` — 拖拽调整宽/高，尺寸持久化（`storageKey-width/height`）。

```jsx
import ResizablePanel from './components/ResizablePanel.jsx';

// 水平调宽
<ResizablePanel direction="horizontal" side="left"
  minWidth={200} maxWidth={500} defaultWidth={280}
  storageKey="astra-left-sidebar-width">
  <HierarchyPanel />
</ResizablePanel>

// 垂直调高
<ResizablePanel direction="vertical"
  minHeight={100} maxHeight={400} defaultHeight={150}
  storageKey="astra-bottom-panel-height">
  <AssetsPanel />
</ResizablePanel>
```

> 底部面板更推荐用专用 `BottomPanel`（见 5.3，状态收敛在 `useBottomPanelStore`）。

---

## 5. 面板 / 布局体系

### 5.1 面板注册表（panelMeta）

`src/components/panels/panelMeta.js` — 合并侧栏视图与 dock 面板的元信息（图标/标题/组件），供 ActivityBar / Sidebar / Dock 共用。

```js
import { PANEL_META } from './components/panels/panelMeta.js';
// PANEL_META = { ...SIDEBAR_VIEWS, ...DOCK_PANELS }
```

### 5.2 ActivityBar / Sidebar / sidebarViews

`src/components/sidebar/sidebarViews.js` — VSCode 活动栏模型注册表，**组件由 App 装配时注入**（避免循环依赖）：

```js
// sidebarViews.js
export const SIDEBAR_VIEWS = {
  hierarchy: { id: 'hierarchy', icon: IconList, titleKey: 'hierarchy.title', Component: null },
  scene: { id: 'scene', icon: IconScene, titleKey: 'scene.panelTitle', Component: null },
  prefabs: { id: 'prefabs', icon: IconPrefab, titleKey: 'prefabs.title', Component: null },
};
export function registerSidebarViews(views) {
  for (const [id, def] of Object.entries(views)) {
    if (SIDEBAR_VIEWS[id]) SIDEBAR_VIEWS[id].Component = def;
  }
}
```

App.jsx 装配：

```js
registerSidebarViews({
  hierarchy: HierarchyPanel,
  scene: ScenePanel,
  prefabs: PrefabsPanel,
});
```

### 5.3 Dock / dockPanels / BottomPanel

`src/components/dock/dockPanels.js` — 可停靠面板注册表（底部/侧栏共用），同样由 App 注入组件：

```js
export const DOCK_PANELS = {
  assets: { id: 'assets', icon: IconImage, titleKey: 'assets.title', Component: null },
  terminal: { id: 'terminal', icon: IconCode, titleKey: 'dock.terminal', Component: null },
};
export function registerDockPanels(views) {
  /* ... */
}
```

- `Dock.jsx`：底部横向 Tab 条 + 当前面板；Tab 可拖到 ActivityBar（拖出），侧栏标题也可拖回（拖入）。
- `BottomPanel.jsx`：VSCode 式底部面板，状态收敛于 `useBottomPanelStore`（收起/高度），向下拖到底收起，隐藏后从状态栏手柄展开。
- `TerminalPlaceholder.jsx`：终端占位。

### 5.4 EditorTabBar / workspaceTabs

`src/components/tabs/EditorTabBar.jsx` — 顶部编辑器 Tab（preview/code 切换），数据在 `useWorkspaceTabsStore`（`WORKSPACE_TABS` + `activeTab`）。

---

## 6. 国际化 / 工具 / 常量

### 6.1 i18n（msg / setLocale）

`src/i18n/index.js` — 所有用户可见文本必须走 `msg('key')`，禁止硬编码中英文。

```js
import { msg, getLocale, setLocale, toggleLocale, languages } from '../i18n/index.js';

msg('inspector.name'); // 取文本
msg('status.objects', { count: 5 }); // 插值 {count}（占位替换）
setLocale('en'); // zh/en/ja/ru/la
```

- 插值格式：`msg(key, { param })` 替换文本中的 `{param}`。
- tooltip 用 `tip(msg('key'))`；Toast/对话框用 `msg('key', { param })`。
- 新增 key 必须同步到 5 个语言文件（zh/en/ja/ru/la，键严格对齐），改后跑 `pnpm test`（i18n 用例）。
- 语言以 i18n 为唯一来源（勿从 Settings 读 `language`，该键已移除）。

### 6.2 工具函数

| 模块                        | 导出                                                                                                           | 用途                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `utils/id.js`               | `generateGUID()` / `generateId()` / `generatePrefixedId(prefix)` / `getBasename(path)`                         | 统一 ID 生成与路径基名              |
| `utils/localstorage.js`     | `readRawLocalStorage(key, fb)` / `writeRawLocalStorage(key, v)` / `readLocalStorage` / `setItemToLocalStorage` | 安全 localStorage 读写（try/catch） |
| `utils/names.js`            | `generateUniqueName(base, objects, excludeId?)`                                                                | 场景内唯一命名                      |
| `utils/pathUtils.js`        | `normalizePath` / `formatSize` / `formatDate` / `splitPathParts`                                               | 路径规范化与格式化                  |
| `utils/fileImport.js`       | `getMimeType` / `collectDirectoryInto` / `importFileCollection`                                                | 资产导入逻辑（GLTF 资源打包）       |
| `utils/projectSchema.js`    | `editorObjectToEngineObject` / `engineObjectToEditorObject`                                                    | 编辑器↔引擎对象转换                 |
| `utils/projectExporter.js`  | `exportProjectAsAstra` / `importProjectFromAstra`                                                              | .astra 导入导出（ZIP）              |
| `utils/themeManager.js`     | `applyTheme(theme)`                                                                                            | 主题应用                            |
| `utils/recentProjectsDB.js` | —                                                                                                              | 最近项目（IndexedDB）               |

> 发现重复实现时收敛到 `utils/`，不要复制粘贴（历史教训：ID/路径/导入逻辑均曾分散）。

### 6.3 meta.js 单一来源

`src/meta.js` — 版本号以 `package.json` 为唯一来源：

```js
import { ENGINE_VERSION, PROJECT_FORMAT_VERSION, ENGINE_META } from './meta.js';
```

---

## 7. 大型组件拆分模式

### 7.1 子目录拆分

大组件按**子目录**拆分，主文件组合子组件、持有状态与回调；子组件通过 **props 显式注入** 数据与回调，不做闭包捕获，便于复用与测试。

```
src/components/InspectorPanel.jsx      # 主文件
src/components/inspector/
  ├── ObjectSection.jsx                # 基础属性（预制件/名称/类型/父级/颜色）
  ├── LightSection.jsx                 # 光源属性
  ├── TextureSection.jsx               # 贴图/UV
  ├── TransformSection.jsx             # 变换 + 相对变换
  └── Vector2Field.jsx                 # UV 双轴输入
```

现有拆分：

| 组件                | 子目录                    | 说明                                              |
| ------------------- | ------------------------- | ------------------------------------------------- |
| `InspectorPanel`    | `components/inspector/`   | 属性分区抽组件                                    |
| `FileBrowserDialog` | `components/fileBrowser/` | Toolbar/Sidebar/List/Footer/FileIcons             |
| `HierarchyPanel`    | `components/hierarchy/`   | `HierarchyItem.jsx` 递归树节点                    |
| `AssetsPanel`       | `components/assets/`      | `AssetItem.jsx` 网格项                            |
| `Toolbar`           | `components/toolbar/`     | `WindowControls.jsx` + `menuItems.jsx`（builder） |

### 7.2 Viewport Hook 拆分（engine 层隔离）

Viewport 独立逻辑落 `src/hooks/`，通过**参数显式注入** refs + props：

```js
// src/hooks/useXxx.js
import { useEffect } from 'react';

export function useXxx(
  { containerRef, rendererRef /* refs */ },
  { objects, currentTool /* data & callbacks */ }
) {
  useEffect(
    () => {
      /* 逻辑 */
    },
    [/* deps */]
  );
}
```

现有 hooks：

| Hook                  | 职责                                                                          |
| --------------------- | ----------------------------------------------------------------------------- |
| `useViewportPick`     | 射线拾取选中 + 播放旋转动画                                                   |
| `useSelectionOutline` | 选中高亮 + 轴心吸附                                                           |
| `useViewCubeMount`    | ViewCube 挂载                                                                 |
| `useSceneObjectSync`  | 对象数组 ↔ three mesh diff（导出 `CUBE_FACE_NAMES`/`FALLBACK_FACE_TEXTURES`） |
| `usePanelSearch`      | 面板搜索（ref/文本/显隐）                                                     |
| `useRecentProjects`   | 最近项目（IndexedDB）                                                         |
| `useAutoSave`         | 自动保存定时器                                                                |
| `useDialog`           | alert/confirm/prompt Provider + Hook                                          |
| `useDropdownMenu`     | 菜单状态 Hook                                                                 |

---

## 8. 引擎层（src/engine）

three.js 纯逻辑层，**禁止出现 React**。相对变换、材质、灯光、模型构建一律放这里，不写进组件。

| 模块               | 导出                                                                                                                                                                                                                                                                                                                            | 用途                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `TreeMath.js`      | `getAllDescendants` / `getAllDescendantIds` / `computeRelativeTransform` / `computeWorldTransformFromRelative` / `computeRelativeTransformData` / `computeWorldTransformFromRelativeData` / `collectDescendantRelativeTransforms` / `applyTransformToDescendants` / `applyTransformToObject3D` / `extractTransformFromObject3D` | 层级树相对变换/后代传播（含数据版数组坐标） |
| `ObjectFactory.js` | `createObject` / `createXxxObject` / `createObjectDefaults` / `createDefaultScene`                                                                                                                                                                                                                                              | 对象/场景模板                               |
| `materials.js`     | `createPrimitiveMaterial` / `cloneTexture` / `ensureStandardMaterial` 等                                                                                                                                                                                                                                                        | 材质                                        |
| `lights.js`        | `createLightFromObject` / `createDefaultDirectionalLight` / `updateLightTargetFromObject`                                                                                                                                                                                                                                       | 光源                                        |
| `ModelLoader.js`   | `buildModelGroup` / `buildMeshPart` / `findMeshByPath`                                                                                                                                                                                                                                                                          | 模型构建                                    |
| `ViewCube.js`      | `ViewCube` / `animateCameraToDirection`                                                                                                                                                                                                                                                                                         | 视图立方体                                  |

---

## 9. 通用规则清单

1. **零手搓**：任何新菜单用 `useDropdownMenu` + `DropdownMenu`；新模态框用 `modal.open()` + `Modal`；新通知用 `Toast`；新确认/输入用 `useDialog`。不要 `useState`+`useRef`+`useEffect` 重写一遍。
2. **store selector**：组件用 `useXStore((s) => s.field)` 订阅，禁止整包订阅。
3. **localStorage**：一律走 `utils/localstorage.js`，禁止裸读 `getItem/setItem`。
4. **i18n**：所有 UI 文本走 `msg()`，新增 key 同步 5 语言。
5. **样式**：颜色只用 `variables.css` 的 CSS 变量；按钮用 `buttons.css`（`.btn`/`.btn-primary` 等）；菜单样式在 `dropdown.css`；图标统一 `className="dropdown-icon"`——禁止硬编码色值/旧类名。
6. **引擎逻辑**：three 纯逻辑放 `src/engine/`；Viewport 逻辑拆到 `src/hooks/`。
7. **工具去重**：ID/路径/导入等收敛到 `utils/`，不复制粘贴。
8. **大组件**：超过 400 行的组件按 7.1 子目录拆分，子组件 props 显式注入。
9. **代码卫生**：ESLint 零警告（`--max-warnings=0`），禁 `console.log`；不加无谓注释（保留既有"喵"风格注释）。
10. **测试**：engine 纯逻辑、stores、utils 要有测试；Viewport hooks 有测试（真实 three 数学 + mock）。

<small>该文档有部分内容由 AI 生成，有些东西仍然需要自己研究。</small>
