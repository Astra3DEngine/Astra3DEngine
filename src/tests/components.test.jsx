import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScenePanel from '../components/ScenePanel.jsx';
import HierarchyPanel from '../components/HierarchyPanel.jsx';

const noop = () => {};

const baseScene = {
  id: 'scene-main-001',
  name: 'Main Scene',
  objects: [],
  isMain: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  settings: { ambientLight: {}, backgroundColor: '#111', fog: { enabled: false } }
};

describe('ScenePanel', () => {
  it('渲染场景列表并显示主场景名称', () => {
    render(
      <ScenePanel
        scenes={[baseScene]}
        currentSceneId="scene-main-001"
        onSwitchScene={noop}
        onCreateScene={noop}
        onDeleteScene={noop}
        onRenameScene={noop}
        onSetMainScene={noop}
        vertical={false}
        onCollapseChange={noop}
      />
    );
    expect(screen.getAllByText('Main Scene').length).toBeGreaterThan(0);
  });
});

describe('HierarchyPanel', () => {
  it('渲染对象层级列表', () => {
    render(
      <HierarchyPanel
        objects={[{ id: 1, name: 'Cube', type: 'cube', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }]}
        selectedObjects={[]}
        onSelectObject={noop}
        onAddObject={noop}
        onDeleteObject={noop}
        onDeleteSelectedObjects={noop}
        onCreatePrefab={noop}
        prefabs={[]}
        onCopyObject={noop}
        onPasteObject={noop}
        onDuplicateObject={noop}
        onRenameObject={noop}
        clipboard={null}
        vertical={false}
        onCollapseChange={noop}
        onReorderObjects={noop}
      />
    );
    expect(screen.getByText('Cube')).toBeTruthy();
  });
});