import { describe, it, expect, beforeEach } from 'vitest';
import { useDockStore } from '../stores/useDockStore.js';
import { useWorkspaceTabsStore } from '../stores/useWorkspaceTabsStore.js';
import { ENGINE_VERSION } from '../meta.js';
import pkg from '../../package.json';

describe('useDockStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useDockStore.setState({
      panels: { assets: { zone: 'bottom' }, terminal: { zone: 'bottom' } },
      activeBottomTab: 'assets',
    });
  });

  it('默认面板在 bottom 区', () => {
    expect(useDockStore.getState().panels.assets.zone).toBe('bottom');
  });

  it('movePanel 移动面板到 sidebar 区并持久化', () => {
    useDockStore.getState().movePanel('assets', 'sidebar');
    expect(useDockStore.getState().panels.assets.zone).toBe('sidebar');
    expect(localStorage.getItem('astra-dock-assets-zone')).toBe('sidebar');
  });
});

describe('useWorkspaceTabsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useWorkspaceTabsStore.setState({ activeTab: 'preview' });
  });

  it('默认激活 preview 编辑器', () => {
    expect(useWorkspaceTabsStore.getState().activeTab).toBe('preview');
  });

  it('setActiveTab 切换并持久化', () => {
    useWorkspaceTabsStore.getState().setActiveTab('code');
    expect(useWorkspaceTabsStore.getState().activeTab).toBe('code');
    expect(localStorage.getItem('astra-active-tab')).toBe('code');
  });
});

describe('meta 版本单一来源', () => {
  it('ENGINE_VERSION 等于 package.json version', () => {
    expect(ENGINE_VERSION).toBe(pkg.version);
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
