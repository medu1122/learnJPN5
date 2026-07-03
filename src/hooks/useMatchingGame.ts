import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { CardEntry, CardStatus, GameState, VocabWord } from '../types';
import { ALL_WORDS, BOARD_SIZE, SET_SIZE, ANIMATION_DURATION } from '../data/constants';
import { shuffleArray } from '../utils/shuffle';

type Action =
  | { type: 'SELECT_LEFT'; index: number }
  | { type: 'SELECT_RIGHT'; index: number }
  | { type: 'ANIMATION_DONE' }
  | { type: 'START_NEW_SET'; categories: string[] };

const REFILL_THRESHOLD = 3;

let keyCounter = 0;
const nextKey = () => ++keyCounter;

function makeEntry(word: VocabWord): CardEntry {
  return {
    pairId: word.id,
    word,
    status: 'idle',
    key: nextKey(),
  };
}

/**
 * Mỗi cột là 5 từ shuffle hoàn toàn độc lập.
 * leftCards[i] và rightCards[j] ghép thành cặp khi pairId giống nhau.
 */
function buildColumns(
  leftWords: VocabWord[],
  rightWords: VocabWord[]
): { leftCards: CardEntry[]; rightCards: CardEntry[] } {
  return {
    leftCards: leftWords.map(makeEntry),
    rightCards: rightWords.map(makeEntry),
  };
}

/**
 * Shuffle 2 cột độc lập: không cặp nào trùng hàng sau shuffle.
 * Với BOARD_SIZE=5, xác suất trùng sau shuffle Fisher-Yates là thấp,
 * nhưng check + retry để đảm bảo 100%.
 */
function buildBoard(pairs: VocabWord[]): { leftCards: CardEntry[]; rightCards: CardEntry[] } {
  let leftWords = shuffleArray(pairs);
  let rightWords = shuffleArray(pairs);

  let attempts = 0;
  while (attempts < 200) {
    const hasMatch = leftWords.some((w, i) => w.id === rightWords[i].id);
    if (!hasMatch) break;
    leftWords = shuffleArray(pairs);
    rightWords = shuffleArray(pairs);
    attempts++;
  }

  return buildColumns(leftWords, rightWords);
}

function poolFromCategories(categories: string[]): VocabWord[] {
  if (categories.length === 0) return ALL_WORDS;
  return ALL_WORDS.filter((w) => categories.includes(w.category));
}

function startSet(categories: string[]): GameState {
  const pool = shuffleArray(poolFromCategories(categories));
  const setQueue = pool.slice(0, SET_SIZE);
  const boardPairs = setQueue.slice(0, BOARD_SIZE);

  const { leftCards, rightCards } = buildBoard(boardPairs);

  return {
    leftCards,
    rightCards,
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

function updateCard(
  cards: CardEntry[],
  index: number,
  status: CardStatus
): CardEntry[] {
  if (index === -1) {
    return cards.map((c) => ({ ...c, status }));
  }
  return cards.map((c, i) => (i === index ? { ...c, status } : c));
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SELECT_LEFT': {
      if (state.lockInteraction) return state;

      if (state.selectedLeft === action.index) {
        return { ...state, selectedLeft: null };
      }

      const leftCards = updateCard(state.leftCards, action.index, 'selected');
      return { ...state, selectedLeft: action.index, leftCards };
    }

    case 'SELECT_RIGHT': {
      if (state.lockInteraction || state.selectedLeft === null) return state;

      const lIdx = state.selectedLeft;
      const rIdx = action.index;

      const leftCard = state.leftCards[lIdx];
      const rightCard = state.rightCards[rIdx];

      if (leftCard.status === 'matched' || rightCard.status === 'matched') return state;

      const isCorrect = leftCard.pairId === rightCard.pairId;

      if (isCorrect) {
        const leftCards = updateCard(state.leftCards, lIdx, 'correct');
        const rightCards = updateCard(state.rightCards, rIdx, 'correct');

        return {
          ...state,
          leftCards,
          rightCards,
          selectedLeft: null,
          selectedRight: null,
          matchedCount: state.matchedCount + 1,
          setMatchedCount: state.setMatchedCount + 1,
          learnedCount: state.learnedCount + 1,
          emptyPool: [...state.emptyPool, lIdx, rIdx],
          pendingCount: state.pendingCount + 1,
          lockInteraction: true,
        };
      } else {
        const leftCards = updateCard(state.leftCards, lIdx, 'wrong');
        const rightCards = updateCard(state.rightCards, rIdx, 'wrong');
        return {
          ...state,
          leftCards,
          rightCards,
          selectedLeft: null,
          selectedRight: null,
          lockInteraction: true,
        };
      }
    }

    case 'ANIMATION_DONE': {
      if (!state.lockInteraction) return state;

      let { leftCards, rightCards, emptyPool, pendingCount, setQueue } = state;

      // Đủ 3 cặp đúng → refill 1 từ mới vào 1 vị trí trống ngẫu nhiên
      if (pendingCount >= REFILL_THRESHOLD && setQueue.length > 0) {
        const newWord = setQueue[0];
        const newQueue = setQueue.slice(1);

        const shuffledPool = shuffleArray(emptyPool);
        const fillIdx = shuffledPool[0];
        const remainingPool = shuffledPool.slice(1);

        // Tách side từ index gốc: index < BOARD_SIZE → trái, >= BOARD_SIZE → phải
        const isLeft = fillIdx < BOARD_SIZE;
        const cardIdx = fillIdx % BOARD_SIZE;

        if (isLeft) {
          leftCards = updateCard(leftCards, cardIdx, 'idle');
          leftCards[cardIdx] = makeEntry(newWord);
        } else {
          rightCards = updateCard(rightCards, cardIdx, 'idle');
          rightCards[cardIdx] = makeEntry(newWord);
        }

        return {
          ...state,
          leftCards,
          rightCards,
          setQueue: newQueue,
          emptyPool: remainingPool,
          pendingCount: pendingCount - 1,
          lockInteraction: false,
        };
      }

      // Chưa đủ 3 lần: reset trạng thái selected/wrong → idle
      leftCards = updateCard(leftCards, -1, 'idle');
      rightCards = updateCard(rightCards, -1, 'idle');
      return {
        ...state,
        leftCards,
        rightCards,
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
