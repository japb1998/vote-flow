import React from 'react';
import { Results, Option } from '../types';
import styles from './ResultsChart.module.css';

interface ResultsChartProps {
  results: Results;
  options: Option[];
}

export function ResultsChart({ results, options }: ResultsChartProps) {
  const getMaxValue = () => {
    if (results.averageScores) {
      const max = Math.max(...Object.values(results.averageScores));
      return max || 5;
    }
    const max = Math.max(...Object.values(results.totals));
    return max || 1;
  };

  const maxValue = getMaxValue();

  const getMethodColor = () => {
    switch (results.method) {
      case 'ranked': return 'var(--color-ranked)';
      case 'approval': return 'var(--color-approval)';
      case 'score': return 'var(--color-score)';
      default: return 'var(--color-primary)';
    }
  };

  return (
    <div className={styles.container}>
      {options.map(option => {
        const total = results.totals[option.id] || 0;
        const percentage = results.percentages[option.id] || 0;
        const averageScore = results.averageScores?.[option.id];
        const isWinner = results.winner === option.id;

        return (
          <div key={option.id} className={`${styles.bar} ${isWinner ? styles.winner : ''}`}>
            <div className={styles.label}>
              <span className={styles.name}>{option.name}</span>
              {isWinner && <span className={styles.winnerBadge}>Winner</span>}
            </div>
            <div className={styles.barContainer}>
              <div
                className={styles.barFill}
                style={{
                  width: `${percentage}%`,
                  backgroundColor: getMethodColor()
                }}
              />
            </div>
            <div className={styles.stats}>
              <span className={styles.count}>
                {averageScore !== undefined
                  ? `${averageScore.toFixed(1)} avg`
                  : `${total} votes`}
              </span>
              <span className={styles.percentage}>{percentage.toFixed(1)}%</span>
            </div>
          </div>
        );
      })}

      {results.roundInfo && (
        <div className={styles.roundInfo}>
          <h4>Round {results.roundInfo.round}</h4>
          {results.roundInfo.eliminated && (
            <p>Eliminated: {options.find(o => o.id === results.roundInfo?.eliminated)?.name}</p>
          )}
        </div>
      )}
    </div>
  );
}
