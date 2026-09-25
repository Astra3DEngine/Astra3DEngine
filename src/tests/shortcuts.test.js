import { describe, it, expect, beforeEach } from 'vitest';
import {
  matchesCombo,
  formatShortcut,
  formatShortcutDisplay,
  shortcuts,
} from '../lib/ShortcutManager.js';

const ev = (init) =>
  ({
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    key: 'x',
    target: { tagName: 'DIV' },
    ...init,
  });

describe('matchesCombo', () => {
  it('纯按键匹配', () => {
    expect(matchesCombo(ev({ key: 'q' }), 'q')).toBe(true);
    expect(matchesCombo(ev({ key: 'q', ctrlKey: true }), 'q')).toBe(false);
  });

  it('修饰组合匹配', () => {
    expect(matchesCombo(ev({ key: 's', ctrlKey: true }), 'ctrl+s')).toBe(true);
    expect(matchesCombo(ev({ key: 's' }), 'ctrl+s')).toBe(false);
    expect(matchesCombo(ev({ key: 'S', ctrlKey: true, shiftKey: true }), 'ctrl+shift+s')).toBe(true);
    expect(matchesCombo(ev({ key: 's', ctrlKey: true, shiftKey: true }), 'ctrl+s')).toBe(false);
  });

  it('meta 与 ctrl 等价', () => {
    expect(matchesCombo(ev({ key: 's', metaKey: true }), 'ctrl+s')).toBe(true);
  });

  it('功能键小写匹配', () => {
    expect(matchesCombo(ev({ key: 'F5' }), 'f5')).toBe(true);
    expect(matchesCombo(ev({ key: 'Delete' }), 'delete')).toBe(true);
  });
});

describe('formatShortcut', () => {
  it('组合键格式化为字符串', () => {
    expect(formatShortcut(ev({ key: 's', ctrlKey: true }))).toBe('ctrl+s');
    expect(formatShortcut(ev({ key: 'z', ctrlKey: true, shiftKey: true }))).toBe('ctrl+shift+z');
    expect(formatShortcut(ev({ key: 'F5' }))).toBe('f5');
  });

  it('纯修饰键返回 null', () => {
    expect(formatShortcut(ev({ key: 'Control', ctrlKey: true }))).toBeNull();
    expect(formatShortcut(ev({ key: 'Shift', shiftKey: true }))).toBeNull();
  });
});

describe('formatShortcutDisplay', () => {
  it('人类可读显示', () => {
    expect(formatShortcutDisplay('ctrl+shift+s')).toBe('Ctrl+Shift+S');
    expect(formatShortcutDisplay('ctrl+alt+n')).toBe('Ctrl+Alt+N');
    expect(formatShortcutDisplay('f5')).toBe('F5');
    expect(formatShortcutDisplay('delete')).toBe('Delete');
  });

  it('多组合用分隔符', () => {
    expect(formatShortcutDisplay('ctrl+y|ctrl+shift+z')).toBe('Ctrl+Y / Ctrl+Shift+Z');
  });
});

describe('shortcuts', () => {
  beforeEach(() => {
    shortcuts.resetAll();
    // 清理已注册命令避免跨测试污染
    shortcuts.commands.clear();
  });

  it('define + 触发 + 设置绑定', () => {
    let fired = 0;
    shortcuts.define({
      id: 't.test',
      label: 'keybinds.cat.file',
      category: 'x',
      keys: 'ctrl+t',
      handler: () => fired++,
    });
    expect(shortcuts.getBinding('t.test')).toBe('ctrl+t');
    // 直接调用 handler 模拟触发
    shortcuts.commands.get('t.test').handler();
    expect(fired).toBe(1);

    shortcuts.setBinding('t.test', 'ctrl+shift+t');
    expect(shortcuts.getBinding('t.test')).toBe('ctrl+shift+t');
    expect(localStorage.getItem('astra-keybindings')).toContain('ctrl+shift+t');
  });
});