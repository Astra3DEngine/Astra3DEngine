import { describe, it, expect } from 'vitest';
import { resolveGltfResourceUrl, relativePathToDir } from '../utils/gltfResources.js';

const urlMap = new Map([
  ['model.bin', 'blob:1'],
  ['textures/wood.jpg', 'blob:2'],
  ['./nested/thing.png', 'blob:3'],
]);

describe('resolveGltfResourceUrl', () => {
  it('直接命中完全一致的路径', () => {
    expect(resolveGltfResourceUrl('model.bin', urlMap)).toBe('blob:1');
  });

  it('去掉 ./ 前缀后命中', () => {
    expect(resolveGltfResourceUrl('./model.bin', urlMap)).toBe('blob:1');
  });

  it('补上 ./ 前缀后命中', () => {
    expect(resolveGltfResourceUrl('nested/thing.png', urlMap)).toBe('blob:3');
  });

  it('按文件名兜底命中（不同目录层级）', () => {
    expect(resolveGltfResourceUrl('meshes/wood.jpg', urlMap)).toBe('blob:2');
  });

  it('完全找不到时原样返回', () => {
    expect(resolveGltfResourceUrl('missing.xyz', urlMap)).toBe('missing.xyz');
  });

  it('空 urlMap 时原样返回', () => {
    expect(resolveGltfResourceUrl('a.bin', new Map())).toBe('a.bin');
  });
});

describe('relativePathToDir', () => {
  it('根目录直接返回原路径', () => {
    expect(relativePathToDir('', 'model.bin')).toBe('model.bin');
  });

  it('剥离子目录前缀', () => {
    expect(relativePathToDir('models', 'models/scene.bin')).toBe('scene.bin');
  });
});
