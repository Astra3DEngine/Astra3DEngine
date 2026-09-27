/**
 * @file stores/history.js
 * @description 撤销/重做历史切片：为 zustand store 注入 present/past/future 与操作。
 * 逻辑源自原 hooks/useHistory.js，改用 structuredClone 并去 React 化。
 * @module stores/history
 */

const MAX_HISTORY_SIZE = 50;

/** 深拷贝：优先使用 structuredClone，退化用手写实现 */
function deepClone(value) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // fall through
    }
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item));
  }
  if (value && typeof value === 'object') {
    const cloned = {};
    for (const key in value) {
      cloned[key] = deepClone(value[key]);
    }
    return cloned;
  }
  return value;
}

/**
 * 生成历史状态切片（供 store 展开）。
 * @param {Function} set - zustand set
 * @param {Function} get - zustand get
 * @param {*} initialState - 初始状态（已废弃，仅保留兼容参数）
 * @param {string} [field='present'] - 操作用的字段名（例如 'scenes'）
 * @param {string[]} [snapshotFields=[]] - 需要随历史一并记录/恢复的附加字段（如 'currentSceneId'）
 * @returns {Object} 历史切片
 */
export function createHistorySlice(set, get, initialState, field = 'present', snapshotFields = []) {
  const value = (s) => s[field];
  const write = (patch) => set(patch);

  /** 生成历史快照：主字段 + 附加字段 */
  const snapshot = (s) => {
    const snap = { value: deepClone(value(s)) };
    snapshotFields.forEach((f) => {
      snap[f] = deepClone(s[f]);
    });
    return snap;
  };

  /** 恢复快照到 store */
  const restore = (snap) => {
    const patch = { [field]: deepClone(snap.value) };
    snapshotFields.forEach((f) => {
      patch[f] = deepClone(snap[f]);
    });
    write(patch);
  };

  return {
    past: [],
    future: [],

    /** 设置新状态（可选是否记录历史） */
    setState: (newStateOrUpdater, addToHistory = true) => {
      const current = value(get());
      const next =
        typeof newStateOrUpdater === 'function' ? newStateOrUpdater(current) : newStateOrUpdater;

      if (addToHistory) {
        write((s) => ({
          [field]: next,
          past: [...s.past, snapshot(s)].slice(-MAX_HISTORY_SIZE),
          future: [],
        }));
      } else {
        write({ [field]: next });
      }
    },

    /** 记录当前状态到历史（不改变状态），用于拖拽结束等场景 */
    recordCurrentState: () => {
      write((s) => ({
        past: [...s.past, snapshot(s)].slice(-MAX_HISTORY_SIZE),
        future: [],
      }));
    },

    undo: () => {
      const { past, future } = get();
      if (past.length === 0) return;
      const previous = past[past.length - 1];
      write({
        past: past.slice(0, -1),
        future: [snapshot(get()), ...future],
      });
      restore(previous);
    },

    redo: () => {
      const { past, future } = get();
      if (future.length === 0) return;
      const next = future[0];
      write({
        past: [...past, snapshot(get())],
        future: future.slice(1),
      });
      restore(next);
    },

    reset: (newState) => {
      write({ [field]: newState, past: [], future: [] });
    },
  };
}
