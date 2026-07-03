export interface VocabWord {
  id: number;
  kanji: string;
  reading: string;
  meaning: string;
  category: string;
}

export type CardStatus = 'idle' | 'selected' | 'correct' | 'wrong' | 'matched';

export interface BoardSlot {
  pairId: number;
  leftWord: VocabWord;
  rightWord: VocabWord;
  leftStatus: CardStatus;
  rightStatus: CardStatus;
  leftKey: number;
  rightKey: number;
}

export interface GameState {
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
