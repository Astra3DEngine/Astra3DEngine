# DropdownMenu 统一组件使用文档

## 背景

项目中原本每个面板（Hierarchy、Assets、Toolbar、Viewport）都各自复制粘贴了 `useState` + `useRef` + `useEffect`（监听点击外部、Escape 键）来管理菜单开关，再加上各写各的 `<div className="context-menu">` / `<div className="add-menu-dropdown">` / `<div className="logo-dropdown-menu">` 渲染层。这些代码散落在多个组件中，维护成本极高，样式也不统一。

现在统一为：**`useDropdownMenu` 负责纯状态管理，`DropdownMenu` 负责统一渲染。**

---

## 1. useDropdownMenu Hook

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

## 2. DropdownMenu 组件

`src/components/DropdownMenu.jsx` 是**唯一**的菜单渲染组件，支持两种模式：

### 模式 A：Trigger 模式（菜单按钮触发）

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

### 模式 B：受控模式（外部 Hook 控制开关和位置）

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

## 3. 菜单项数据结构（items）

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

## 4. 圆角 API（roundedCorners）

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

## 5. 各面板当前使用方式

### Toolbar — Trigger 模式

File / Edit / View / Run 四个菜单使用 `ref` + `label` + `items`，快捷键通过 `ref.current?.open()` 控制。

Logo 菜单使用受控模式 + `items` 数组。

### HierarchyPanel — 受控模式

- **Add 菜单**：按钮点击 → `addMenu.openAt(x, y)` → `<DropdownMenu isOpen={addMenu.isOpen} ... items={...} />`
- **右键菜单**：`onContextMenu` → `ctxMenu.openAt(x, y)` → `<DropdownMenu isOpen={ctxMenu.isOpen} ... items={...} />`

### AssetsPanel — 受控模式

右键菜单通过 `ctxMenu.openAt(e.clientX, e.clientY)` 触发，渲染 `<DropdownMenu items={...} />`。

---

## 6. 样式规范

所有菜单项统一使用 `.dropdown-item` / `.dropdown-icon` / `.dropdown-divider` 样式，定义在 `src/styles/dropdown.css` 中。

图标统一使用 `className="dropdown-icon"`（16px × 16px，flex 居中）。

```jsx
// ✅ 正确
{ icon: <IconCopy className="dropdown-icon" /> }

// ❌ 错误 — 使用旧的自定义类名
{ icon: <IconCopy className="context-menu-icon" /> }
{ icon: <IconCopy className="add-menu-item-icon" /> }
```

---

## 7. 不再需要的代码（已删除）

以下写法已废弃，各面板已全部迁移：

- `useState(false)` + `useRef()` + `useEffect` 监听点击外部 / Escape → **改为 `useDropdownMenu()`**
- 手写的 `<div className="context-menu">` / `<div className="add-menu-dropdown">` / `<div className="logo-dropdown-menu">` → **改为 `<DropdownMenu>`**
- `ContextMenu.jsx` 组件 → **已删除，功能合并到 `DropdownMenu`**
- 旧的 `.context-menu-item` / `.add-menu-item` / `.logo-menu-item` 等 className → **改为 `.dropdown-item`**

---

## 8. 新增菜单的统一流程

1. 导入 Hook 和组件：`import { useDropdownMenu } from '../hooks/useDropdownMenu.js'; import DropdownMenu from '../components/DropdownMenu.jsx';`
2. 声明状态：`const menu = useDropdownMenu();`
3. 触发：`menu.openAt(x, y)` 或 `menu.toggle()`
4. 渲染：`<DropdownMenu isOpen={menu.isOpen} onClose={menu.close} position={menu.position} menuRef={menu.menuRef} items={[...]} />`
5. 图标统一：`className="dropdown-icon"`
6. 不要自己写 `useEffect` 监听点击外部和 Escape。

> **规则：任何新的菜单，都不要再手搓 `useState` + `useRef` + `useEffect` 了。**
