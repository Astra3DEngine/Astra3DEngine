/**
 * @file components/sidebar/CreateObjectMenu.jsx
 * @description 新建对象菜单：常驻宿主（不依赖面板是否显示），通过 openCreateObjectMenu(x,y)
 * 从任意位置（标题栏按钮 / Alt+Q）弹出。侧栏折叠或切换面板时快捷键依然可用。
 * @module components/sidebar/CreateObjectMenu
 */

import React, { useEffect, useMemo } from 'react';
import useDropdownMenu from '../../hooks/useDropdownMenu.js';
import DropdownMenu from '../DropdownMenu.jsx';
import { useScenesStore } from '../../stores/useScenesStore.js';
import { msg } from '../../i18n/index.js';
import IconFolder from '../../assets/icons/editor/folder.svg?react';
import IconCube from '../../assets/icons/tools/cube.svg?react';
import IconSphere from '../../assets/icons/tools/sphere.svg?react';
import IconPlane from '../../assets/icons/tools/plane.svg?react';
import IconPointLight from '../../assets/icons/tools/light-point.svg?react';
import IconDirectionalLight from '../../assets/icons/tools/light-directional.svg?react';
import IconSpotLight from '../../assets/icons/tools/light-spot.svg?react';

/** 全局桥：由当前挂载的宿主接收打开请求 */
let openFn = null;

/**
 * 打开新建对象菜单（供标题栏按钮与 Alt+Q 命令调用）。
 * @param {number} x
 * @param {number} y
 */
export function openCreateObjectMenu(x, y) {
  openFn?.(x, y);
}

export default function CreateObjectMenu() {
  const menu = useDropdownMenu();

  // 常驻注册打开回调（组件始终挂载于侧栏根，折叠/切面板不影响）
  useEffect(() => {
    openFn = (x, y) => {
      menu.close();
      menu.openAt(x, y);
    };
    return () => {
      openFn = null;
    };
  }, [menu]);

  const items = useMemo(
    () => [
      {
        label: msg('hierarchy.folder'),
        icon: <IconFolder className="dropdown-icon" />,
        onClick: () => useScenesStore.getState().addObject('folder'),
      },
      { divider: true },
      {
        label: msg('hierarchy.cube'),
        icon: <IconCube className="dropdown-icon" />,
        onClick: () => useScenesStore.getState().addObject('cube'),
      },
      {
        label: msg('hierarchy.sphere'),
        icon: <IconSphere className="dropdown-icon" />,
        onClick: () => useScenesStore.getState().addObject('sphere'),
      },
      {
        label: msg('hierarchy.plane'),
        icon: <IconPlane className="dropdown-icon" />,
        onClick: () => useScenesStore.getState().addObject('plane'),
      },
      { divider: true },
      {
        label: msg('hierarchy.pointLight'),
        icon: <IconPointLight className="dropdown-icon" />,
        onClick: () => useScenesStore.getState().addObject('pointLight'),
      },
      {
        label: msg('hierarchy.directionalLight'),
        icon: <IconDirectionalLight className="dropdown-icon" />,
        onClick: () => useScenesStore.getState().addObject('directionalLight'),
      },
      {
        label: msg('hierarchy.spotLight'),
        icon: <IconSpotLight className="dropdown-icon" />,
        onClick: () => useScenesStore.getState().addObject('spotLight'),
      },
    ],
    []
  );

  return (
    <DropdownMenu
      isOpen={menu.isOpen}
      onClose={menu.close}
      position={menu.position}
      items={items}
      roundedCorners="all"
    />
  );
}