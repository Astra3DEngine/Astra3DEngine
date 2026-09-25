/**
 * @file components/primitives/TooltipHost.jsx
 * @description 全局 Tooltip 宿主：事件委托监听 [data-astra-tip] / [data-astra-place]，
 * 气泡带箭头按方位指向元素。延迟显示：首次 hover 延时（~600ms），
 * 若近期显示过（warm）则快速出现（~120ms），带淡入动画。
 * @module components/primitives/TooltipHost
 */

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';

const PAD = 8;
/** 首次显示的延迟 */
const FIRST_DELAY = 600;
/** 显示过一次之后，后续 hover 的快速延迟 */
const WARM_DELAY = 120;

export default function TooltipHost() {
  const [tip, setTip] = useState(null); // { text, place, anchor }
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const elRef = useRef(null);
  const timerRef = useRef(null);
  const everShownRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    setTip(null);
  }, [clearTimer]);

  const showFrom = useCallback((el) => {
    const text = el.getAttribute('data-astra-tip');
    if (!text) return;
    everShownRef.current = true;
    const place = el.getAttribute('data-astra-place') || 'top';
    const r = el.getBoundingClientRect();
    setTip({ text, place, anchor: { x: r.left, y: r.top, w: r.width, h: r.height } });
  }, []);

  // 延迟显示：首次 hover 慢，显示过一次后快速
  const scheduleShow = useCallback(
    (el) => {
      clearTimer();
      const delay = everShownRef.current ? WARM_DELAY : FIRST_DELAY;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        showFrom(el);
      }, delay);
    },
    [clearTimer, showFrom]
  );

  useEffect(() => {
    const onMouseOver = (e) => {
      const el = e.target.closest && e.target.closest('[data-astra-tip]');
      if (el) {
        scheduleShow(el);
      } else {
        hide();
      }
    };
    const onScroll = () => hide();
    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('scroll', onScroll);
    window.addEventListener('resize', onScroll);
    return () => {
      clearTimer();
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [scheduleShow, hide, clearTimer]);

  // 渲染后读实际尺寸，按方位 + 自动翻转计算位置
  useLayoutEffect(() => {
    if (!tip || !elRef.current) return;
    const { place: p, anchor } = tip;
    const w = elRef.current.offsetWidth;
    const h = elRef.current.offsetHeight;

    const candidates = {
      top: { left: anchor.x + anchor.w / 2 - w / 2, top: anchor.y - h - PAD },
      bottom: { left: anchor.x + anchor.w / 2 - w / 2, top: anchor.y + anchor.h + PAD },
      left: { left: anchor.x - w - PAD, top: anchor.y + anchor.h / 2 - h / 2 },
      right: { left: anchor.x + anchor.w + PAD, top: anchor.y + anchor.h / 2 - h / 2 },
    };
    const inViewport = ({ left, top }) =>
      left >= 4 && top >= 4 && left + w <= window.innerWidth - 4 && top + h <= window.innerHeight - 4;

    let place = p;
    if (!inViewport(candidates[p])) {
      const fallback = {
        top: ['bottom', 'right', 'left'],
        bottom: ['top', 'right', 'left'],
        left: ['right', 'top', 'bottom'],
        right: ['left', 'top', 'bottom'],
      }[p];
      const found = fallback.find((f) => inViewport(candidates[f]));
      if (found) place = found;
    }

    const { left: l, top: t } = candidates[place];
    const x = Math.max(4, Math.min(l, window.innerWidth - w - 4));
    const y = Math.max(4, Math.min(t, window.innerHeight - h - 4));
    // 只更新 pos（含翻转后的方位），不再 setTip——避免 layout effect 依赖 [tip] 无限循环
    setPos({ left: x, top: y, place });
  }, [tip]);

  if (!tip) return null;

  return (
    <div
      ref={elRef}
      className={`astra-tooltip astra-tooltip-${pos.place || tip.place}`}
      style={{ left: pos.left, top: pos.top }}
    >
      {tip.text}
    </div>
  );
}