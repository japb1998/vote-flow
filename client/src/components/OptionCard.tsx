import React from 'react';
import { Option } from '../types';
import styles from './OptionCard.module.css';

interface OptionCardProps {
  option: Option;
  isSelected: boolean;
  selectionMode: 'single' | 'multiple' | 'rank' | 'score';
  rank?: number;
  score?: number;
  onSelect: () => void;
  onRankChange?: (direction: 'up' | 'down') => void;
  onScoreChange?: (score: number) => void;
}

export function OptionCard({
  option,
  isSelected,
  selectionMode,
  rank,
  score,
  onSelect,
  onRankChange,
  onScoreChange
}: OptionCardProps) {
  const renderSelectionIndicator = () => {
    if (selectionMode === 'single' || selectionMode === 'multiple') {
      return (
        <div className={`${styles.checkbox} ${isSelected ? styles.checked : ''}`}>
          {isSelected && <span className={styles.checkmark}>✓</span>}
        </div>
      );
    }
    if (selectionMode === 'rank' && rank !== undefined) {
      return <div className={styles.rankBadge}>#{rank + 1}</div>;
    }
    if (selectionMode === 'score' && score !== undefined) {
      return <div className={styles.scoreBadge}>{score}</div>;
    }
    return null;
  };

  const renderScoreSelector = () => {
    if (selectionMode !== 'score') return null;
    
    return (
      <div className={styles.scoreSelector}>
        {[1, 2, 3, 4, 5].map(s => (
          <button
            key={s}
            className={`${styles.scoreButton} ${score === s ? styles.selectedScore : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onScoreChange?.(s);
            }}
          >
            {s}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.selected : ''}`}
      onClick={onSelect}
    >
      {renderSelectionIndicator()}
      <div className={styles.content}>
        <span className={styles.name}>{option.name}</span>
        {option.description && (
          <span className={styles.description}>{option.description}</span>
        )}
      </div>
      {renderScoreSelector()}
    </div>
  );
}
