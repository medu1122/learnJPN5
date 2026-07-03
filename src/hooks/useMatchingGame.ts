import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { BoardSlot, CardStatus, VocabWord } from '../types';
import { ALL_WORDS, BOARD_SIZE, SET_SIZE, ANIMATION_DURATION } from '../data/constants';
import { shuffleArray } from '../utils/shuffle';

interface State {
  board: (BoardSlot | null)[];
  setQueue: VocabWord[];
  emptyPool: number[];
  pendingCount: number;
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

const REFILL_THRESHOLD = 3;

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

/**
 * Shuffle 2 cột ĐỘC LẬP.
 * Lặp shuffle Fisher-Yates cho rightPairIds cho đến khi không còn
 * cặp nào trùng hàng (leftPairIds[i] !== rightPairIds[i] với mọi i).
 */
function buildBoard(pairs: VocabWord[]): (BoardSlot | null)[] {
  const pairMap = new Map<number, VocabWord>(pairs.map((p) => [p.id, p]));

  const leftPairIds = shuffleArray(pairs).map((p) => p.id);
  let rightPairIds = shuffleArray(pairs).map((p) => p.id);

  // Thử shuffle cho đến khi không còn trùng hàng
  let attempts = 0;
  while (attempts < 100) {
    const hasMatch = leftPairIds.some((id, i) => id === rightPairIds[i]);
    if (!hasMatch) break;
    rightPairIds = shuffleArray(pairs).map((p) => p.id);
    attempts++;
  }

  return leftPairIds.map((pairId, i) => ({
    pairId,
    leftWord: pairMap.get(pairId)!,
    rightWord: pairMap.get(rightPairIds[i])!,
    leftStatus: 'idle' as CardStatus,
    rightStatus: 'idle' as CardStatus,
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
    emptyPool: [],
    pendingCount: 0,
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

      const board = state.board.map((s, i) =>
        i === idx && s ? { ...s, leftStatus: 'selected' as CardStatus } : s
      );
      return { ...state, selectedLeft: idx, board };
    }

    case 'SELECT_RIGHT': {
      if (state.lockInteraction || state.selectedLeft === null) return state;
      const rIdx = action.index;
      const lIdx = state.selectedLeft;
      const lSlot = state.board[lIdx];
      const rSlot = state.board[rIdx];
      if (!lSlot || !rSlot) return state;

      const isCorrect = lSlot.pairId === rSlot.pairId;

      if (isCorrect) {
        // Ẩn 2 ô vừa nối đúng → board slot = null
        const board = state.board.map((s, i) =>
          i === lIdx ? null : i === rIdx ? null : s
        );
        // Đẩy 2 vị trí vào pool trống
        const newEmptyPool = [...state.emptyPool, lIdx, rIdx];
        const newPendingCount = state.pendingCount + 1;

        return {
          ...state,
          board,
          selectedLeft: null,
          selectedRight: null,
          matchedCount: state.matchedCount + 1,
          setMatchedCount: state.setMatchedCount + 1,
          learnedCount: state.learnedCount + 1,
          emptyPool: newEmptyPool,
          pendingCount: newPendingCount,
          lockInteraction: true,
        };
      } else {
        // Sai: highlight 2 ô đỏ → reset về idle sau animation
        const board = state.board.map((s, i) => {
          if (i === lIdx && s) return { ...s, leftStatus: 'wrong' as CardStatus };
          if (i === rIdx && s) return { ...s, rightStatus: 'wrong' as CardStatus };
          return s;
        });
        return {
          ...state,
          board,
          selectedLeft: null,
          selectedRight: null,
          lockInteraction: true,
        };
      }
    }

    case 'ANIMATION_DONE': {
      if (!state.lockInteraction) return state;

      let { board, emptyPool, pendingCount } = state;

      // Đủ 3 cặp đúng → refill ngay 1 cặp mới vào 1 vị trí ngẫu nhiên trong pool
      if (pendingCount >= REFILL_THRESHOLD && state.setQueue.length > 0) {
        const newPair = state.setQueue[0];
        const newQueue = state.setQueue.slice(1);

        // Chọn ngẫu nhiên 1 vị trí trống từ pool để fill
        const shuffledPool = shuffleArray(emptyPool);
        const fillPos = shuffledPool[0];
        const remainingPool = shuffledPool.slice(1);

        const newBoard = [...board];
        newBoard[fillPos] = makeSlot(newPair);

        return {
          ...state,
          board: newBoard,
          setQueue: newQueue,
          emptyPool: remainingPool,
          pendingCount: pendingCount - 1,
          lockInteraction: false,
        };
      }

      // Chưa đủ 3 lần đúng: chỉ reset animation, giữ nguyên ô trống
      // (các slot đã bị set về null trong SELECT_RIGHT — không cần reset)
      return {
        ...state,
        pendingCount,
        lockInteraction: false,
      };
    }

    case 'START_NEW_SET': {
      return startSet(action.categories);
    }

    default:
      return state;
  }
}

export function useMatchingGame() {
  const [state, dispatch] = useReducer(reducer, undefined, () => startSet([]));
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
