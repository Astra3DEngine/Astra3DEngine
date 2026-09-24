/**
 * @file components/modal/ModalHost.jsx
 * @description 模态框渲染宿主：订阅 ModalManager 单例并渲染当前栈中的模态框。
 * @module components/modal/ModalHost
 */

import React, { useEffect, useState } from 'react';
import { modal } from '../../lib/ModalManager.js';

export default function ModalHost() {
  const [stack, setStack] = useState(() => modal.stack);

  useEffect(() => modal.subscribe(setStack), []);

  return (
    <>
      {stack.map(({ id, Component, props, close }) => (
        <Component key={id} {...props} isOpen onClose={close} />
      ))}
    </>
  );
}
