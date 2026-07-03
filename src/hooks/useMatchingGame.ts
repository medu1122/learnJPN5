import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { BoardSlot, CardStatus, VocabWord } from '../types';
import { ALL_WORDS, BOARD_SIZE, SET_SIZE, ANIMATION_DURATION } from '../data/constants';
import { shuffleArray } from '../utils/shuffle';

interface State {
  board: (BoardSlot | null)[];
  setQueue: VocabWord[];
  pendingEmptySlot: number | null;
  selectedLeft: number | null;
  selectedRight: number | null;
  matchedCount: number;
  setMatchedCount: number;
  learnedCount: number;
  lockInteraction: boolean;
  activeCategories: string[];
  showFilter: boolean;
}

type Action =
  | { type: 'SELECT_LEFT'; index: number }
  | { type: 'SELECT_RIGHT'; index: number }
  | { type: 'ANIMATION_DONE' }
  | { type: 'START_NEW_SET'; categories: string[] };

let keyCounter = 0;
const nextKey = () => ++keyCounter;

function makeSlot(pair: VocabWord): BoardSlot {
  return {
    pairId: pair.id,
    leftWord: pair,
    rightWord: pair,
    leftStatus: 'idle',
    rightStatus: 'idle',
    leftKey: nextKey(),
    rightKey: nextKey(),
  };
}

function buildBoard(pairs: VocabWord[]): (BoardSlot | null)[] {
  const leftOrder = shuffleArray(pairs);
  const rightOrder = shuffleArray(pairs);
  return pairs.map((pair, i) => ({
    ...makeSlot(pair),
    leftWord: leftOrder[i],
    rightWord: rightOrder[i],
    leftKey: nextKey(),
    rightKey: nextKey(),
  }));
}

function poolFromCategories(categories: string[]): VocabWord[] {
  if (categories.length === 0) return ALL_WORDS;
  return ALL_WORDS.filter((w) => categories.includes(w.category));
}

function startSet(categories: string[]): State {
  const pool = shuffleArray(poolFromCategories(categories));
  const setQueue = pool.slice(0, SET_SIZE);
  const boardPairs = setQueue.slice(0, BOARD_SIZE);
  return {
    board: buildBoard(boardPairs),
    setQueue: setQueue.slice(BOARD_SIZE),
    pendingEmptySlot: null,
    selectedLeft: null,
    selectedRight: null,
    matchedCount: 0,
    setMatchedCount: 0,
    learnedCount: 0,
    lockInteraction: false,
    activeCategories: categories,
    showFilter: false,
  };
}

function setCardStatus(
  slot: BoardSlot,
  side: 'left' | 'right',
  status: CardStatus
): BoardSlot {
  if (side === 'left') return { ...slot, leftStatus: status };
  return { ...slot, rightStatus: status };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SELECT_LEFT': {
      if (state.lockInteraction) return state;
      const idx = action.index;
      const slot = state.board[idx];
      if (!slot) return state;

      if (state.selectedLeft === idx) {
        return { ...state, selectedLeft: null };
      }

      const next: BoardSlot = { ...slot, leftStatus: 'selected' };
      const board = state.board.map((s, i) => (i === idx ? next : s));
      return { ...state, selectedLeft: idx, board };
    }

    case 'SELECT_RIGHT': {
      if (state.lockInteraction || state.selectedLeft === null) return state;
      const rIdx = action.index;
      const lIdx = state.selectedLeft;
      const lSlot = state.board[lIdx];
      const rSlot = state.board[rIdx];
      if (!lSlot || !rSlot) return state;

      const board1 = state.board.map((s, i) => {
        if (i === lIdx && s) return setCardStatus(s, 'left', 'selected');
        if (i === rIdx && s) return setCardStatus(s, 'right', 'selected');
        return s;
      });

      const isCorrect = lSlot.pairId === rSlot.pairId;

      if (isCorrect) {
        const board2 = board1.map((s, i) => {
          if (i === lIdx && s) {
            const tmp = setCardStatus(s, 'left', 'correct');
            return setCardStatus(tmp, 'right', 'correct');
          }
          if (i === rIdx && s) return setCardStatus(s, 'right', 'correct');
          return s;
        });
        const nextPending =
          state.pendingEmptySlot === null ? rIdx : state.pendingEmptySlot;
        return {
          ...state,
          board: board2,
          selectedLeft: null,
          selectedRight: null,
          matchedCount: state.matchedCount + 1,
          setMatchedCount: state.setMatchedCount + 1,
          learnedCount: state.learnedCount + 1,
          pendingEmptySlot: nextPending,
          lockInteraction: true,
        };
      } else {
        const board2 = board1.map((s, i) => {
          if (i === lIdx && s) return setCardStatus(s, 'left', 'wrong');
          if (i === rIdx && s) return setCardStatus(s, 'right', 'wrong');
          return s;
        });
        return {
          ...state,
          board: board2,
          selectedLeft: null,
          selectedRight: null,
          lockInteraction: true,
        };
      }
    }

    case 'ANIMATION_DONE': {
      if (!state.lockInteraction) return state;

      let { board, pendingEmptySlot, setMatchedCount } = state;

      if (state.pendingEmptySlot !== null) {
        const pending = state.pendingEmptySlot;
        const emptyNow = board.findIndex(
          (s, i) => s === null && i !== pending
        );
        const slotsToFill: number[] = emptyNow !== -1
          ? [pending, emptyNow]
          : [pending];
        const newPairs = state.setQueue.slice(0, slotsToFill.length);

        if (newPairs.length > 0) {
          const newBoard = [...board];
          newPairs.forEach((pair, i) => {
            const pos = slotsToFill[i];
            newBoard[pos] = makeSlot(pair);
          });
          board = newBoard;
          setMatchedCount = 0;
        }
        pendingEmptySlot = null;
      }

      const boardReset = board.map((s) =>
        s ? { ...s, leftStatus: 'idle' as CardStatus, rightStatus: 'idle' as CardStatus } : s
      );

      return { ...state, board: boardReset, pendingEmptySlot, setMatchedCount, lockInteraction: false };
    }

    case 'START_NEW_SET': {
      return startSet(action.categories);
    }

    default:
      return state;
  }
}

export function useMatchingGame() {
  const [state, dispatch] = useReducer(reducer, [], () => startSet([]));
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (state.lockInteraction) {
      animTimerRef.current = setTimeout(() => {
        dispatch({ type: 'ANIMATION_DONE' });
      }, ANIMATION_DURATION);
      return () => {
        if (animTimerRef.current) clearTimeout(animTimerRef.current);
      };
    }
    return undefined;
  }, [state.lockInteraction]);

  const handleLeftClick = useCallback((index: number) => {
    dispatch({ type: 'SELECT_LEFT', index });
  }, []);

  const handleRightClick = useCallback((index: number) => {
    dispatch({ type: 'SELECT_RIGHT', index });
  }, []);

  const handleStartSet = useCallback((categories: string[]) => {
    dispatch({ type: 'START_NEW_SET', categories });
  }, []);

  return {
    ...state,
    handleLeftClick,
    handleRightClick,
    handleStartSet,
  };
}
