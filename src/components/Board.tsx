import { memo } from 'react';
import { WordCard } from './WordCard';
import type { CardEntry } from '../types';

interface BoardProps {
  leftCards: CardEntry[];
  rightCards: CardEntry[];
  onLeftClick: (index: number) => void;
  onRightClick: (index: number) => void;
  lockInteraction: boolean;
}

function BoardComponent({ leftCards, rightCards, onLeftClick, onRightClick, lockInteraction }: BoardProps) {
  return (
    <div className="board">
      <div className="board__column board__column--left">
        {leftCards.map((card, index) => (
          <WordCard
            key={card.key}
            pairId={card.pairId}
            type="left"
            word={card.word}
            status={card.status}
            onClick={() => !lockInteraction && card.status !== 'matched' && onLeftClick(index)}
          />
        ))}
      </div>
      <div className="board__column board__column--right">
        {rightCards.map((card, index) => (
          <WordCard
            key={card.key}
            pairId={card.pairId}
            type="right"
            word={card.word}
            status={card.status}
            onClick={() => !lockInteraction && card.status !== 'matched' && onRightClick(index)}
          />
        ))}
      </div>
    </div>
  );
}

export const Board = memo(BoardComponent);
