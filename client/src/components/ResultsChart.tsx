import React from 'react';
import { Results, Option } from '../types';
import styles from './ResultsChart.module.css';

interface ResultsChartProps {
  results: Results;
  options: Option[];
}

const ROMAN_LABELS: Record<string, string> = { up: '👍 Support', down: '👎 Oppose', sideways: '👊 Neutral' };
const FIST_LABELS: Record<string, string> = { '1': '1 — Blocking', '2': '2 — Reservations', '3': '3 — Neutral', '4': '4 — Good', '5': '5 — Strong' };

export function ResultsChart({ results, options }: ResultsChartProps) {
  const getMethodColor = () => {
    switch (results.method) {
      case 'ranked': return 'var(--color-ranked)';
      case 'approval': return 'var(--color-approval)';
      case 'score': return 'var(--color-score)';
      default: return 'var(--color-primary)';
    }
  };

  // For non-option methods, build entries from totals keys
  const isOptionBased = options.length > 0;
  const entries: { key: string; label: string }[] = isOptionBased
    ? options.map(o => ({ key: o.id, label: o.name }))
    : Object.keys(results.totals).map(key => ({
        key,
        label: results.method === 'roman' ? (ROMAN_LABELS[key] || key)
             : results.method === 'fist-of-five' ? (FIST_LABELS[key] || key)
             : key,
      }));

  return (
    <div className={styles.container}>
      {entries.map(({ key, label }) => {
        const total = results.totals[key] || 0;
        const percentage = results.percentages[key] || 0;
        const averageScore = results.averageScores?.[key];
        const isWinner = results.winner === key;

        return (
          <div key={key} className={`${styles.bar} ${isWinner ? styles.winner : ''}`}>
            <div className={styles.label}>
              <span className={styles.name}>{label}</span>
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
                  : results.method === 'dot' ? `${total} dots` : `${total} votes`}
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

      {/* Summary stats for poker / fist-of-five */}
      {(results.method === 'poker' || results.method === 'fist-of-five') && (
        <div className={styles.summaryStats}>
          {results.average !== undefined && (
            <div className={styles.stat}>
              <span className={styles.statLabel}>Average</span>
              <span className={styles.statValue}>{results.average.toFixed(1)}</span>
            </div>
          )}
          {results.median !== undefined && (
            <div className={styles.stat}>
              <span className={styles.statLabel}>Median</span>
              <span className={styles.statValue}>{results.median}</span>
            </div>
          )}
          {results.consensus !== undefined && (
            <div className={styles.stat}>
              <span className={styles.statLabel}>Consensus</span>
              <span className={`${styles.statValue} ${results.consensus ? styles.consensusYes : styles.consensusNo}`}>
                {results.consensus ? 'Yes' : 'No'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Roman voting result */}
      {results.method === 'roman' && results.passed !== undefined && (
        <div className={styles.summaryStats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Result</span>
            <span className={`${styles.statValue} ${results.passed ? styles.consensusYes : styles.consensusNo}`}>
              {results.passed ? 'Passed' : 'Did not pass'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
