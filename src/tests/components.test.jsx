import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScenePanel from '../components/ScenePanel.jsx';
import HierarchyPanel from '../components/HierarchyPanel.jsx';
import { useScenesStore } from '../stores/useScenesStore.js';
import { useSelectionStore } from '../stores/useSelectionStore.js';
import { usePrefabsStore } from '../stores/usePrefabsStore.js';

function resetStores() {
  useScenesStore.getState().resetScenes();
  useScenesStore.setState({ clipboard: null });
  usePrefabsStore.getState().resetPrefabs();
  useSelectionStore.getState().clearSelection();
}

describe('ScenePanel', () => {
  beforeEach(resetStores);

  it('渲染场景列表并显示主场景名称', () => {
    render(<ScenePanel />);
    expect(screen.getAllByText('Main Scene').length).toBeGreaterThan(0);
  });
});

describe('HierarchyPanel', () => {
  beforeEach(resetStores);

  it('渲染对象层级列表', () => {
    useScenesStore.getState().addObject('cube');
    render(<HierarchyPanel />);
    expect(screen.getAllByText('Cube').length).toBeGreaterThan(0);
  });
});
