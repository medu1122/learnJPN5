import { memo, useMemo } from 'react';
import type { BoardSlot } from '../types';

interface WordCardProps {
  pairId: number;
  type: 'left' | 'right';
  word: BoardSlot['leftWord'];
  status: BoardSlot['leftStatus'];
  onClick: () => void;
}

function WordCardComponent({ pairId, type, word, status, onClick }: WordCardProps) {
  const showFurigana = type === 'left' && word.kanji !== word.reading;

  const className = useMemo(() => {
    const base = 'word-card';
    return `${base} word-card--${type} word-card--${status}`;
  }, [type, status]);

  return (
    <button
      className={className}
      onClick={onClick}
      aria-label={`${type} card ${pairId}`}
      data-status={status}
    >
      {type === 'left' && <span className="word-card__kanji">{word.kanji}</span>}
      {type === 'left' && showFurigana && <span className="word-card__furigana">{word.reading}</span>}
      {type === 'right' && <span className="word-card__meaning">{word.meaning}</span>}
    </button>
  );
}

export const WordCard = memo(WordCardComponent);
