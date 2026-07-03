# 组件模板使用文档

## Dropdown 下拉菜单 内容

### 1. useDropdownMenu Hook

纯状态管理，不做任何 DOM 事件监听（点击外部、Escape 都由 `DropdownMenu` 组件统一处理）。

```js
import { useDropdownMenu } from '../hooks/useDropdownMenu.js';

const menu = useDropdownMenu({
  onOpen: () => console.log('opened'),
  onClose: () => console.log('closed'),
});

// menu 提供以下属性和方法：
// menu.isOpen      — boolean，是否打开
// menu.position    — {x, y} | null，菜单位置（用于右键/坐标定位）
// menu.menuRef     — React.RefObject，菜单 DOM 引用
// menu.open()      — 打开菜单
// menu.close()     — 关闭菜单
// menu.toggle()    — 切换菜单
// menu.openAt(x, y) — 在指定坐标打开（用于右键菜单）
```

---

### 2. DropdownMenu 组件

`src/components/DropdownMenu.jsx` 是**唯一**的菜单渲染组件，支持两种模式：

#### 模式 A：Trigger 模式（菜单按钮触发）

适用于 Toolbar 的 File / Edit / View / Run 菜单等。组件内部自动管理 `isOpen` 状态，点击按钮开关，点击外部自动关闭。

```jsx
import DropdownMenu from '../components/DropdownMenu.jsx';
import { useRef } from 'react';

const menuRef = useRef(null);

// 快捷键通过 ref 控制
// menuRef.current?.open()
// menuRef.current?.close()
// menuRef.current?.toggle()

<DropdownMenu
  ref={menuRef}
  label="文件"
  items={[
    { label: '新建', icon: <IconNew className="menu-icon" />, shortcut: 'Ctrl+N', onClick: handleNew },
    { divider: true },
    { label: '保存', icon: <IconSave className="menu-icon" />, shortcut: 'Ctrl+S', onClick: handleSave },
    { label: '删除', icon: <IconDelete className="menu-icon" />, danger: true, onClick: handleDelete },
    {
      label: '语言',
      icon: <IconLang className="menu-icon" />,
      submenu: [
        { label: '中文', active: true, onClick: () => setLocale('zh') },
        { label: 'English', onClick: () => setLocale('en') },
      ]
    }
  ]}
  roundedCorners="bottom"      // 底部圆角（与顶栏按钮衔接）
/>
```

#### 模式 B：受控模式（外部 Hook 控制开关和位置）

适用于右键菜单、Add 菜单、Logo 菜单等需要**自定义触发方式**或**自定义位置**的场景。

```jsx
import DropdownMenu from '../components/DropdownMenu.jsx';
import { useDropdownMenu } from '../hooks/useDropdownMenu.js';

const menu = useDropdownMenu({
  onClose: () => setContextMenuObject(null) // 可选关闭回调
});

// 右键触发
<div onContextMenu={(e) => {
  e.preventDefault();
  menu.openAt(e.clientX, e.clientY);
}}>
  右键点击我
</div>

// 按钮触发（如 Logo 菜单）
<button onClick={(e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  menu.openAt(rect.left, rect.bottom);
}}>
  打开菜单
</button>

// 渲染
<DropdownMenu
  isOpen={menu.isOpen}        // 从 useDropdownMenu 获取
  onClose={menu.close}        // 由组件内部调用（点击外部 / Escape）
  position={menu.position}    // 从 useDropdownMenu 获取
  menuRef={menu.menuRef}      // 从 useDropdownMenu 获取
  roundedCorners="all"
  items={[                    // 菜单项配置数组
    { label: '复制', icon: <IconCopy className="dropdown-icon" />, onClick: handleCopy },
    { label: '粘贴', icon: <IconPaste className="dropdown-icon" />, disabled: !clipboard, onClick: handlePaste },
    { divider: true },
    { label: '删除', icon: <IconDelete className="dropdown-icon" />, danger: true, onClick: handleDelete },
  ]}
/>
```

也可以传入 `children` 自定义菜单内容（但不推荐，会打破统一样式）：

```jsx
<DropdownMenu
  isOpen={menu.isOpen}
  onClose={menu.close}
  position={menu.position}
  menuRef={menu.menuRef}
  roundedCorners="all"
>
  <div className="custom-item" onClick={() => { doSomething(); menu.close(); }}>
    自定义内容
  </div>
</DropdownMenu>
```

---

### 3. 菜单项数据结构（items）

| 字段 | 类型 | 说明 |
|------|------|------|
| `label` | `string \| ReactNode` | 显示文本 |
| `icon` | `ReactNode` | 图标（建议统一用 `className="dropdown-icon"`） |
| `onClick` | `Function` | 点击回调（自动关闭菜单） |
| `disabled` | `boolean` | 是否禁用 |
| `danger` | `boolean` | 危险操作（红色样式） |
| `shortcut` | `string` | 快捷键提示（仅 Trigger 模式有样式） |
| `submenu` | `Array<Item>` | 子菜单列表 |
| `active` | `boolean` | 子菜单项是否选中（显示 ✓） |
| `divider` | `boolean` | 分隔线（此时其他字段无效） |

---

### 4. 圆角 API（roundedCorners）

保留原有圆角配置能力，向下兼容。

```jsx
// 字符串快捷方式
<DropdownMenu roundedCorners="all" />      {/* 四角全部圆角 */}
<DropdownMenu roundedCorners="bottom" />   {/* 仅底部圆角（顶栏菜单贴按钮） */}
<DropdownMenu roundedCorners="top" />      {/* 仅顶部圆角 */}
<DropdownMenu roundedCorners="none" />     {/* 无圆角 */}

// 对象精确控制
<DropdownMenu roundedCorners={{
  topLeft: true,
  topRight: false,
  bottomLeft: true,
  bottomRight: false
}} />
```

---

### 5. 各面板当前使用方式

#### Toolbar — Trigger 模式

File / Edit / View / Run 四个菜单使用 `ref` + `label` + `items`，快捷键通过 `ref.current?.open()` 控制。

Logo 菜单使用受控模式 + `items` 数组。

#### HierarchyPanel — 受控模式

- **Add 菜单**：按钮点击 → `addMenu.openAt(x, y)` → `<DropdownMenu isOpen={addMenu.isOpen} ... items={...} />`
- **右键菜单**：`onContextMenu` → `ctxMenu.openAt(x, y)` → `<DropdownMenu isOpen={ctxMenu.isOpen} ... items={...} />`

#### AssetsPanel — 受控模式

右键菜单通过 `ctxMenu.openAt(e.clientX, e.clientY)` 触发，渲染 `<DropdownMenu items={...} />`。

---

### 6. 样式规范

所有菜单项统一使用 `.dropdown-item` / `.dropdown-icon` / `.dropdown-divider` 样式，定义在 `src/styles/dropdown.css` 中。

图标统一使用 `className="dropdown-icon"`（16px × 16px，flex 居中）。

```jsx
// ✅ 正确
{ icon: <IconCopy className="dropdown-icon" /> }

// ❌ 错误 — 使用旧的自定义类名
{ icon: <IconCopy className="context-menu-icon" /> }
{ icon: <IconCopy className="add-menu-item-icon" /> }
```

> **现有规则：任何新的菜单，都不要再手搓 `useState` + `useRef` + `useEffect` 了。**

---

## Modal 模态框 内容

### 1. 状态管理层：`useModal.js`

| 返回值 | 类型 | 说明 |
|---|---|---|
| `isOpen` | `boolean` | 当前模态框是否打开 |
| `open` | `() => void` | 打开模态框（触发 `onOpen` 回调） |
| `close` | `() => void` | 关闭模态框（触发 `onClose` 回调） |
| `toggle` | `() => void` | 切换模态框开关状态 |
| `modalRef` | `React.RefObject` | 绑定到 Modal 组件的 DOM ref |

```js
import { useModal } from '../hooks/useModal.js';

const { isOpen, open, close, toggle, modalRef } = useModal({
  onOpen: () => console.log('opened'),
  onClose: () => console.log('closed')
});
```

---

### 2. 渲染组件层：`Modal.jsx`

| Prop | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `isOpen` | `boolean` | — | 是否显示模态框（必填） |
| `onClose` | `Function` | — | 关闭回调（必填） |
| `title` | `string` | — | 标题（不传则不渲染 header） |
| `children` | `ReactNode` | — | body 内容 |
| `footer` | `ReactNode` | — | footer 内容（可选） |
| `width` | `number\|string` | — | 宽度（数字默认单位 px，字符串可写 `60%` 等） |
| `height` | `number\|string` | — | 高度（同上） |
| `maxWidth` | `number\|string` | `'90vw'` | 最大宽度 |
| `maxHeight` | `number\|string` | `'85vh'` | 最大高度 |
| `className` | `string` | `''` | content 额外类名 |
| `bodyClassName` | `string` | `''` | body 区域额外类名 |
| `overlayClassName` | `string` | `''` | overlay 额外类名 |
| `closeButton` | `boolean` | `true` | 是否显示右上角 × 关闭按钮 |
| `closeOnOverlayClick` | `boolean` | `true` | 点击遮罩是否关闭 |
| `closeOnEscape` | `boolean` | `true` | 按 Escape 是否关闭 |
| `modalRef` | `ref` | — | 绑定到 overlay 的 ref |

```jsx
<Modal
  isOpen={isOpen}
  onClose={close}
  title="设置"
  width={650}
  height={420}
  footer={<button onClick={close}>确定</button>}
  modalRef={modalRef}
>
  <div>这里是内容</div>
</Modal>
```

---

### 3. 全局调度层：`useModalManager.jsx`

| 方法 | 签名 | 返回值 | 说明 |
|---|---|---|---|
| `open` | `(Component, props = {}) => Promise` | `Promise<any>` | 打开一个模态框组件，自动注入 `isOpen` 和 `onClose` |
| `closeAll` | `() => void` | `void` | 关闭所有模态框，所有 pending Promise 以 `null` resolve |

```js
import { useModalManager } from '../hooks/useModalManager.jsx';

const modalManager = useModalManager();

// 打开单个模态框（获取结果）
const result = await modalManager.open(FileBrowserDialog, {
  mode: 'save',
  filters: [...]
});
if (result) { /* 用户点了保存 */ }

// 关闭所有模态框
modalManager.closeAll();
```

---

### 三层之间的关系

| 层级 | 用途 | 典型场景 |
|---|---|---|
| **`useModal.js`** | 单个模态框的局部状态管理 | 组件内部有模态框，用 `isOpen`/`open`/`close` 控制 |
| **`Modal.jsx`** | 统一渲染外壳（overlay + header + body + footer） | 所有模态框内容组件都用它包裹 |
| **`useModalManager.jsx`** | 跨组件/跨层级以 Promise 方式打开模态框 | App.jsx 从 Toolbar 打开 InfoModal，从菜单打开 PreferencesModal |

**三层的组合用法：**

```js
// 1. 局部状态管理
const { isOpen, open, close, modalRef } = useModal();

// 2. 渲染组件统一外壳
<Modal isOpen={isOpen} onClose={close} title="我的模态框" width={480}>
  <MyContent />
</Modal>

// 3. 全局调度（从任何地方一键打开）
const modalManager = useModalManager();
await modalManager.open(MyModalComponent, { someProp: 'value' });
```

> **现有规则：任何新的模态框，都不要再手搓 `useState` + `useRef` + `useEffect` 了。**

<small>该文档有部分内容由AI生成，有些东西仍然需要自己研究。</small>