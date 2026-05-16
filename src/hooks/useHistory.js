import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY_SIZE = 50;

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

export function useHistory(initialState) {
  const [present, setPresent] = useState(initialState);
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const presentRef = useRef(initialState);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

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

  const recordCurrentState = useCallback(() => {
    const stateToSave = deepClone(presentRef.current);
    pastRef.current = [...pastRef.current, stateToSave].slice(-MAX_HISTORY_SIZE);
    futureRef.current = [];
  }, []);

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
