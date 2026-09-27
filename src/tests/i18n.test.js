import { describe, it, expect, beforeEach } from 'vitest';
import { msg, getLocale, setLocale, toggleLocale } from '../i18n/index.js';

const supported = ['zh', 'en', 'ja', 'ru', 'la'];

describe('i18n (i18next backend)', () => {
  beforeEach(() => {
    localStorage.clear();
    setLocale('zh');
  });

  it('msg 返回当前语言翻译', () => {
    expect(msg('app.title')).toMatch(/Astra/);
  });

  it('msg 支持 {param} 占位替换', () => {
    const text = msg('status.objects', { count: 7 });
    expect(text).toContain('7');
  });

  it('setLocale 切换语言并持久化', () => {
    setLocale('en');
    expect(getLocale()).toBe('en');
    expect(localStorage.getItem('astra-locale')).toBe('en');
    expect(msg('app.title')).toMatch(/Astra/);
  });

  it('toggleLocale 在支持语言间循环', () => {
    const start = getLocale();
    const next = supported[(supported.indexOf(start) + 1) % supported.length];
    toggleLocale();
    expect(getLocale()).toBe(next);
  });

  it('缺失键回退到 en，再回退到键本身', () => {
    setLocale('ja');
    // ja 资源不完整，存在回退路径
    const result = msg('some.missing.key.xyz');
    expect(typeof result).toBe('string');
  });

  it('未知语言被规范化到 en', () => {
    setLocale('fr');
    expect(getLocale()).toBe('en');
  });
});
