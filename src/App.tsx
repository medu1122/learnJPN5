import { useState } from 'react';
import { useMatchingGame } from './hooks/useMatchingGame';
import { Board } from './components/Board';
import { SakuraPetals } from './components/SakuraPetals';
import { ALL_CATEGORIES } from './data/constants';

export default function App() {
  const [showFilter, setShowFilter] = useState(true);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);

  const game = useMatchingGame();

  const handleStart = () => {
    setShowFilter(false);
    game.handleStartSet(activeCategories);
  };

  const handleChangeSet = () => {
    setShowFilter(false);
    game.handleStartSet(activeCategories);
  };

  return (
    <div className="app">
      <SakuraPetals count={25} />

      <header className="header">
        <div className="header__title">
          <h1>Học Từ Vựng N5</h1>
          <p className="header__subtitle">Game nối từ</p>
        </div>
        <div className="header__stats">
          {game.learnedCount > 0 && (
            <span className="stat">Đã học: {game.learnedCount} từ</span>
          )}
        </div>
      </header>

      <main className="main">
        {showFilter ? (
          <div className="start-screen">
            <div className="start-screen__card">
              <h2>Chọn danh mục học</h2>
              <p className="start-screen__desc">
                Chọn danh mục bạn muốn luyện tập. Bỏ trống để học tất cả 497 từ.
              </p>
              <div className="category-grid">
                <button
                  className={`filter-tag ${activeCategories.length === 0 ? 'filter-tag--active' : ''}`}
                  onClick={() => setActiveCategories([])}
                >
                  Tất cả
                </button>
                {ALL_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className={`filter-tag ${activeCategories.includes(cat) ? 'filter-tag--active' : ''}`}
                    onClick={() => {
                      if (activeCategories.includes(cat)) {
                        setActiveCategories(activeCategories.filter((c) => c !== cat));
                      } else {
                        setActiveCategories([...activeCategories, cat]);
                      }
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <button className="btn btn--primary btn--large" onClick={handleStart}>
                Bắt đầu học
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="game-toolbar">
              <button className="btn btn--ghost" onClick={() => setShowFilter(true)}>
                ← Đổi danh mục
              </button>
              <button className="btn btn--outline" onClick={handleChangeSet}>
                🔄 Đổi bộ từ
              </button>
            </div>
            <Board
              board={game.board}
              onLeftClick={game.handleLeftClick}
              onRightClick={game.handleRightClick}
              lockInteraction={game.lockInteraction}
            />
          </>
        )}
      </main>
    </div>
  );
}
