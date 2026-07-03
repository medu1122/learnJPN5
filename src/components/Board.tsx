import { memo } from 'react';
import { WordCard } from './WordCard';
import type { BoardSlot } from '../types';

interface BoardProps {
  board: (BoardSlot | null)[];
  onLeftClick: (index: number) => void;
  onRightClick: (index: number) => void;
  lockInteraction: boolean;
}

function BoardComponent({ board, onLeftClick, onRightClick, lockInteraction }: BoardProps) {
  return (
    <div className="board">
      <div className="board__column board__column--left">
        {board.map((slot, index) =>
          slot ? (
            <WordCard
              key={slot.leftKey}
              pairId={slot.pairId}
              type="left"
              word={slot.leftWord}
              status={slot.leftStatus}
              onClick={() => !lockInteraction && onLeftClick(index)}
            />
          ) : (
            <div key={`empty-left-${index}`} className="word-card word-card--empty" />
          )
        )}
      </div>
      <div className="board__column board__column--right">
        {board.map((slot, index) =>
          slot ? (
            <WordCard
              key={slot.rightKey}
              pairId={slot.pairId}
              type="right"
              word={slot.rightWord}
              status={slot.rightStatus}
              onClick={() => !lockInteraction && onRightClick(index)}
            />
          ) : (
            <div key={`empty-right-${index}`} className="word-card word-card--empty" />
          )
        )}
      </div>
    </div>
  );
}

export const Board = memo(BoardComponent);
