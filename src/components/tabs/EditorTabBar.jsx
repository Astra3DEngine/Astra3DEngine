/**
 * @file components/tabs/EditorTabBar.jsx
 * @description 顶部编辑器 Tab 条：切换中心编辑区（预览 / 代码）。
 * @module components/tabs/EditorTabBar
 */

import React from 'react';
import { useWorkspaceTabsStore, WORKSPACE_TABS } from '../../stores/useWorkspaceTabsStore.js';
import { msg } from '../../i18n/index.js';
import IconPlay from '../../assets/icons/viewport/play.svg?react';
import IconCode from '../../assets/icons/misc/code.svg?react';

const TAB_ICONS = {
  preview: IconPlay,
  code: IconCode,
};

export default function EditorTabBar() {
  const activeTab = useWorkspaceTabsStore((s) => s.activeTab);
  const setActiveTab = useWorkspaceTabsStore((s) => s.setActiveTab);

  return (
    <div className="editor-tab-bar">
      {WORKSPACE_TABS.map((tab) => {
        const Icon = TAB_ICONS[tab.id];
        return (
          <button
            key={tab.id}
            className={`editor-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {Icon && <Icon className="editor-tab-icon" />}
            <span>{msg(tab.titleKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
