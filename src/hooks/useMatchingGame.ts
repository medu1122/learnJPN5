import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { BoardSlot, CardStatus, VocabWord } from '../types';
import { ALL_WORDS, BOARD_SIZE, SET_SIZE, ANIMATION_DURATION } from '../data/constants';
import { shuffleArray } from '../utils/shuffle';

interface State {
  board: (BoardSlot | null)[];
  setQueue: VocabWord[];
  emptySlots: number[];
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

function makeSlot(leftWord: VocabWord, rightWord: VocabWord): BoardSlot {
  return {
    pairId: leftWord.id,
    leftWord,
    rightWord,
    leftStatus: 'idle',
    rightStatus: 'idle',
    leftKey: nextKey(),
    rightKey: nextKey(),
  };
}

/**
 * Shuffle cột trái & phải ĐỘC LẬP.
 * leftOrder và rightOrder là 2 thứ tự hoàn toàn khác nhau.
 */
function buildBoard(pairs: VocabWord[]): (BoardSlot | null)[] {
  const leftOrder = shuffleArray(pairs);
  const rightOrder = shuffleArray(pairs);
  return leftOrder.map((lw, i) => makeSlot(lw, rightOrder[i]));
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
    emptySlots: [],
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
        const board = state.board.map((s, i) => {
          if (i === lIdx && s) {
            const tmp = setCardStatus(s, 'left', 'correct');
            return setCardStatus(tmp, 'right', 'correct');
          }
          if (i === rIdx && s) return setCardStatus(s, 'right', 'correct');
          return s;
        });

        const newEmptySlots = [...state.emptySlots, lIdx, rIdx];
        return {
          ...state,
          board,
          selectedLeft: null,
          selectedRight: null,
          matchedCount: state.matchedCount + 1,
          setMatchedCount: state.setMatchedCount + 1,
          learnedCount: state.learnedCount + 1,
          emptySlots: newEmptySlots,
          lockInteraction: true,
        };
      } else {
        const board = state.board.map((s, i) => {
          if (i === lIdx && s) return setCardStatus(s, 'left', 'wrong');
          if (i === rIdx && s) return setCardStatus(s, 'right', 'wrong');
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

      let { board, emptySlots } = state;

      // Khi đã đúng đủ 3 lần (6 ô trống) → fill tất cả cùng lúc
      if (emptySlots.length === 6 && state.setQueue.length > 0) {
        const pairsToFill = state.setQueue.slice(0, 6);
        const newQueue = state.setQueue.slice(6);

        // Shuffle vị trí fill — hoàn toàn ngẫu nhiên
        const shuffledPositions = shuffleArray(emptySlots);
        // Shuffle thứ tự cặp mới — không theo thứ tự cũ
        const shuffledPairs = shuffleArray(pairsToFill);

        const newBoard = [...board];
        shuffledPairs.forEach((pair, i) => {
          newBoard[shuffledPositions[i]] = makeSlot(pair, pair);
        });

        return {
          ...state,
          board: newBoard,
          setQueue: newQueue,
          emptySlots: [],
          lockInteraction: false,
        };
      }

      // Chưa đủ 3 lần đúng → chỉ reset animation, giữ nguyên ô trống
      const boardReset = board.map((s) =>
        s
          ? {
              ...s,
              leftStatus: 'idle' as CardStatus,
              rightStatus: 'idle' as CardStatus,
            }
          : s
      );

      return {
        ...state,
        board: boardReset,
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
