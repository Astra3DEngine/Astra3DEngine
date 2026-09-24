/**
 * @file components/toast/ToastHost.jsx
 * @description Toast 渲染宿主：订阅 ToastManager 单例并在全局渲染通知。
 * @module components/toast/ToastHost
 */

import React, { useEffect, useState } from 'react';
import { Toast } from '../../lib/ToastManager.js';
import { ToastContainer } from '../Toast.jsx';

export default function ToastHost() {
  const [toasts, setToasts] = useState(() => Toast.toasts);

  useEffect(() => Toast.subscribe(setToasts), []);

  return <ToastContainer toasts={toasts} onClose={Toast.close} />;
}
