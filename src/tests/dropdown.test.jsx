import { describe, it, expect } from 'vitest';
import { render, fireEvent, act, screen } from '@testing-library/react';
import React from 'react';
import DropdownMenu from '../components/DropdownMenu.jsx';

describe('DropdownMenu (controlled mode)', () => {
  it('open + position 时渲染菜单项（portal 到 body）', () => {
    render(
      <DropdownMenu
        isOpen
        onClose={() => {}}
        position={{ x: 100, y: 100 }}
        items={[
          { label: 'Right', onClick: () => {} },
          { divider: true },
          { label: 'Delete', danger: true },
        ]}
      />
    );
    const menu = document.body.querySelector('.szh-menu');
    expect(menu).toBeTruthy();
    expect(menu.textContent).toContain('Right');
    expect(menu.textContent).toContain('Delete');
  });

  it('未 open 时不渲染', () => {
    render(<DropdownMenu isOpen={false} onClose={() => {}} position={{ x: 1, y: 1 }} />);
    expect(document.body.querySelector('.szh-menu')).toBeFalsy();
  });
});

describe('DropdownMenu (trigger mode)', () => {
  it('渲染触发按钮并在点击后打开（portal 到 body）', () => {
    render(<DropdownMenu label="菜单" items={[{ label: 'A', onClick: () => {} }]} />);
    const btn = screen.getByRole('button', { name: '菜单' });
    expect(btn).toBeTruthy();
    act(() => {
      fireEvent.click(btn);
    });
    expect(document.body.textContent).toContain('A');
  });
});
