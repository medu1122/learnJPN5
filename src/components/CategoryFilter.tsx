import { memo } from 'react';
import { ALL_CATEGORIES } from '../data/constants';

interface CategoryFilterProps {
  activeCategories: string[];
  onChange: (categories: string[]) => void;
  onClose: () => void;
}

function CategoryFilterComponent({ activeCategories, onChange, onClose }: CategoryFilterProps) {
  const toggleCategory = (cat: string) => {
    if (activeCategories.includes(cat)) {
      onChange(activeCategories.filter((c) => c !== cat));
    } else {
      onChange([...activeCategories, cat]);
    }
  };

  const isAllSelected = activeCategories.length === 0;

  return (
    <div className="filter-overlay">
      <div className="filter-panel">
        <div className="filter-panel__header">
          <h2>Chọn danh mục</h2>
          <button className="filter-panel__close" onClick={onClose} aria-label="Đóng">×</button>
        </div>
        <div className="filter-panel__body">
          <button
            className={`filter-tag ${isAllSelected ? 'filter-tag--active' : ''}`}
            onClick={() => onChange([])}
          >
            Tất cả
          </button>
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`filter-tag ${activeCategories.includes(cat) ? 'filter-tag--active' : ''}`}
              onClick={() => toggleCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="filter-panel__footer">
          <span className="filter-panel__count">
            {activeCategories.length === 0
              ? '497 từ'
              : `${activeCategories.length} danh mục`}
          </span>
          <button className="btn btn--primary" onClick={onClose}>
            Bắt đầu
          </button>
        </div>
      </div>
    </div>
  );
}

export const CategoryFilter = memo(CategoryFilterComponent);
