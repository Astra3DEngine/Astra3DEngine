/**
 * @file hooks/useHistory.js
 * @description 撤销/重做历史记录管理 Hook，支持状态快照和深拷贝
 * @module hooks/useHistory
 */

import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY_SIZE = 50;

/**
 * 深拷贝状态对象，避免引用问题
 * 
 * JavaScript 对象是引用类型，直接赋值只是复制引用。如果历史记录里存的是引用，
 * 撤销时会出大问题——撤销后的状态会被后续操作修改，导致历史记录混乱。
 * 
 * 这个深拷贝实现很他妈的神，递归遍历所有属性。考虑到编辑器状态通常不复杂，
 * 性能影响可以接受。更好的方案是使用 structuredClone（现代浏览器支持），
 * 但为了兼容性，暂时用这个手写的版本。
 * 
 * ！这个函数不能处理特殊对象（Date、RegExp、Map 等），如果状态包含这些类型，需要特殊处理！！！
 * 
 * @param {*} state - 要拷贝的状态
 * @returns {*} 拷贝后的新对象
 */
const deepClone = (state) => {
  if (Array.isArray(state)) {
    return state.map(item => deepClone(item));
  }
  if (state && typeof state === 'object') {
    const cloned = {};
    for (const key in state) {
      cloned[key] = deepClone(state[key]);
    }
    return cloned;
  }
  return state;
};

/**
 * 撤销/重做历史记录管理 Hook
 * 
 * 这是编辑器主要的功能之一。不过原理很简单：维护三个数组——past（过去）、
 * present（现在）、future（未来）。每次操作时，把当前状态存入 past，清空 future。
 * 撤销时，把 present 存入 future，从 past 取出上一个状态。重做时反向操作。
 * 
 * 用 useRef 而不是 useState 存储 past 和 future，因为它们不需要触发重新渲染，
 * 只有 present 需要触发渲染，这样可以避免不必要的渲染，爽炸了。
 * 如果我是扣式咯我就直接到处乱渲染。
 * 
 * 限制历史记录大小为 50（MAX_HISTORY_SIZE），每次深拷贝状态，内存占用可能较大。
 * 如果状态很大，可以考虑增量快照或压缩。
 * 
 * 这里的 setState 和 recordCurrentState 都会记录历史，
 * 但是拖拽过程中频繁调用 setState 会直接撑爆历史记录。所以拖拽时用 recordCurrentState，
 * 它只在结束时记录一次。
 * 
 * @param {*} initialState - 初始状态值
 * @returns {Object} 包含状态和历史操作方法的对象
 * @property {*} state - 当前状态
 * @property {Function} setState - 设置新状态（可选是否记录历史）
 * @property {Function} recordCurrentState - 记录当前状态到历史
 * @property {Function} undo - 撤销操作
 * @property {Function} redo - 重做操作
 * @property {boolean} canUndo - 是否可撤销
 * @property {boolean} canRedo - 是否可重做
 * @property {Function} reset - 重置状态和历史
 */
export function useHistory(initialState) {
  const [present, setPresent] = useState(initialState);
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const presentRef = useRef(initialState);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  /**
   * 设置新状态
   * @param {*|Function} newStateOrUpdater - 新状态值或更新函数
   * @param {boolean} addToHistory - 是否添加到历史记录，默认 true
   */
  const setState = useCallback((newStateOrUpdater, addToHistory = true) => {
    const newState = typeof newStateOrUpdater === 'function' 
      ? newStateOrUpdater(presentRef.current) 
      : newStateOrUpdater;
    
    if (addToHistory) {
      const stateToSave = deepClone(presentRef.current);
      pastRef.current = [...pastRef.current, stateToSave].slice(-MAX_HISTORY_SIZE);
      futureRef.current = [];
    }
    presentRef.current = newState;
    setPresent(newState);
  }, []);

  /**
   * 记录当前状态到历史（不改变状态）
   * @description 用于拖拽结束时记录一次历史
   */
  const recordCurrentState = useCallback(() => {
    const stateToSave = deepClone(presentRef.current);
    pastRef.current = [...pastRef.current, stateToSave].slice(-MAX_HISTORY_SIZE);
    futureRef.current = [];
  }, []);

  /**
   * 撤销操作，恢复到上一个历史状态
   */
  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;

    const previous = pastRef.current[pastRef.current.length - 1];
    const newPast = pastRef.current.slice(0, -1);

    pastRef.current = newPast;
    futureRef.current = [deepClone(presentRef.current), ...futureRef.current];
    const previousCopy = deepClone(previous);
    presentRef.current = previousCopy;
    setPresent(previousCopy);
  }, []);

  /**
   * 重做操作，恢复到下一个未来状态
   * 人总是会后悔，后悔然后又接着这么做。
   */
  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;

    const next = futureRef.current[0];
    const newFuture = futureRef.current.slice(1);

    pastRef.current = [...pastRef.current, deepClone(presentRef.current)];
    futureRef.current = newFuture;
    const nextCopy = deepClone(next);
    presentRef.current = nextCopy;
    setPresent(nextCopy);
  }, []);

  /**
   * 重置状态和历史记录
   * @param {*} newState - 新的初始状态
   */
  const reset = useCallback((newState) => {
    pastRef.current = [];
    futureRef.current = [];
    presentRef.current = newState;
    setPresent(newState);
  }, []);

  return {
    state: present,
    setState,
    recordCurrentState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset
  };
}