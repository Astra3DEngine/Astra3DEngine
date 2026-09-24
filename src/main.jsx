/**
 * @file main.jsx
 * @description 应用入口：先初始化设置注册表，再挂载 React 应用。
 * @module main
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { initBuiltInSettings } from './settings/settingsRegistry.js';
import './styles/main.css';

initBuiltInSettings();

import('./App.jsx').then(({ default: App }) => {
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
});
