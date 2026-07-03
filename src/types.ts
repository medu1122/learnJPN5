export interface VocabWord {
  id: number;
  kanji: string;
  reading: string;
  meaning: string;
  category: string;
}

export type CardStatus = 'idle' | 'selected' | 'correct' | 'wrong' | 'matched';

export interface CardEntry {
  pairId: number;
  word: VocabWord;
  status: CardStatus;
  key: number;
}

export interface GameState {
  leftCards: CardEntry[];
  rightCards: CardEntry[];
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
