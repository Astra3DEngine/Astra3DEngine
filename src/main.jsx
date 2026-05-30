/**
 * @file main.jsx
 * @description 应用入口文件，负责初始化 React 应用并挂载到 DOM
 * @module main
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/main.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);