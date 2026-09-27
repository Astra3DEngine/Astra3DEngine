import { describe, it, expect } from 'vitest';
import { importFileCollection } from '../components/AssetsPanel.jsx';

const mkFile = (name) => new File([`content-${name}`], name);

describe('importFileCollection', () => {
  it('有 gltf 时：仅导入 gltf，并组装含 .bin/贴图的 resourceMap', () => {
    const fileMap = new Map([
      ['model.gltf', mkFile('model.gltf')],
      ['1ec55f4117e84c0b9f784757b15c3cc8.bin', mkFile('1ec55f4117e84c0b9f784757b15c3cc8.bin')],
      ['baseColor_1.jpg', mkFile('baseColor_1.jpg')],
      ['note.txt', mkFile('note.txt')],
    ]);

    const imports = [];
    importFileCollection(fileMap, (obj) => imports.push(obj));

    expect(imports).toHaveLength(1);
    const entry = imports[0];
    expect(entry.file.name).toBe('model.gltf');
    expect(entry.relativePath).toBe('model.gltf');
    expect(entry.resourceMap.has('1ec55f4117e84c0b9f784757b15c3cc8.bin')).toBe(true);
    expect(entry.resourceMap.has('baseColor_1.jpg')).toBe(true);
  });

  it('gltf 在子目录时：resourceMap 键相对于 gltf 目录（含子目录）', () => {
    const fileMap = new Map([
      ['models/car/model.gltf', mkFile('model.gltf')],
      ['models/car/car.bin', mkFile('car.bin')],
      ['models/car/seat.jpg', mkFile('seat.jpg')],
      ['models/car/lod/rough.jpg', mkFile('rough.jpg')],
    ]);

    const imports = [];
    importFileCollection(fileMap, (obj) => imports.push(obj));

    expect(imports).toHaveLength(1);
    expect(imports[0].resourceMap.get('car.bin')).toBeTruthy();
    expect(imports[0].resourceMap.get('seat.jpg')).toBeTruthy();
    // 子目录资源保留相对路径
    expect(imports[0].resourceMap.get('lod/rough.jpg')).toBeTruthy();
  });

  it('glb 自包含：直接按文件导入', () => {
    const fileMap = new Map([['car.glb', mkFile('car.glb')]]);

    const imports = [];
    importFileCollection(fileMap, (obj) => imports.push(obj));

    expect(imports).toHaveLength(1);
    expect(imports[0]).toBeInstanceOf(File);
    expect(imports[0].name).toBe('car.glb');
  });

  it('无 gltf 时：逐个导入所有文件', () => {
    const fileMap = new Map([
      ['a.png', mkFile('a.png')],
      ['b.jpg', mkFile('b.jpg')],
    ]);

    const imports = [];
    importFileCollection(fileMap, (obj) => imports.push(obj));

    expect(imports.map((f) => f.name).sort()).toEqual(['a.png', 'b.jpg']);
  });

  it('空集合：不触发任何导入', () => {
    const imports = [];
    importFileCollection(new Map(), (obj) => imports.push(obj));
    expect(imports).toHaveLength(0);
  });
});
