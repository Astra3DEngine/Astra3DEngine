# Icons 图标目录

本目录包含 Astra 3D Engine 编辑器的所有 SVG 图标。

## 图标规范

- **格式**：SVG
- **尺寸**：16×16（viewBox="0 0 24 24"）
- **样式**：现代扁平风格
- **颜色**：使用 `currentColor` 继承父元素颜色
- **描边**：`stroke-width="2"`，圆角连接

## 使用方法

### 在 React 组件中使用

使用 Vite 的 `?react` 后缀导入 SVG 为 React 组件：

```jsx
import IconCube from '../icons/cube.svg?react';
import IconDelete from '../icons/delete.svg?react';

function MyComponent() {
  return (
    <div>
      <IconCube className="icon" />
      <button>
        <IconDelete className="btn-icon" />
        删除
      </button>
    </div>
  );
}
```

### 样式控制

图标颜色通过 CSS `color` 属性控制：

```css
.icon {
  width: 16px;
  height: 16px;
  color: var(--text-primary);
}

.icon:hover {
  color: var(--accent-active);
}
```

## 添加新图标

1. 创建 SVG 文件，遵循图标规范
2. 使用 `currentColor` 作为颜色
3. 设置 `viewBox="0 0 24 24"`
4. 在组件中导入使用

## SVG 模板

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <!-- 图标路径 -->
</svg>
```
