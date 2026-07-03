import { memo, useMemo } from 'react';
import type { CardEntry, CardStatus } from '../types';

interface WordCardProps {
  pairId: number;
  type: 'left' | 'right';
  word: CardEntry['word'];
  status: CardStatus;
  onClick: () => void;
}

function WordCardComponent({ pairId, type, word, status, onClick }: WordCardProps) {
  const showFurigana = type === 'left' && word.kanji !== word.reading && word.kanji !== '';

  const className = useMemo(() => {
    const base = 'word-card';
    return `${base} word-card--${type} word-card--${status}`;
  }, [type, status]);

  if (status === 'matched') {
    return (
      <div
        className="word-card word-card--empty"
        aria-label={`matched ${type} card ${pairId}`}
      />
    );
  }

  return (
    <button
      className={className}
      onClick={onClick}
      aria-label={`${type} card ${pairId}`}
      data-status={status}
    >
      {type === 'left' && word.kanji !== '' && (
        <span className="word-card__kanji">{word.kanji}</span>
      )}
      {type === 'left' && showFurigana && (
        <span className="word-card__furigana">{word.reading}</span>
      )}
      {type === 'right' && word.meaning !== '' && (
        <span className="word-card__meaning">{word.meaning}</span>
      )}
    </button>
  );
}

export const WordCard = memo(WordCardComponent);
