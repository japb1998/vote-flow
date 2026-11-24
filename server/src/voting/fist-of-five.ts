import { Vote, Results } from '../types';

const LEVELS = ['1', '2', '3', '4', '5'];
const VALID_LEVELS = new Set(LEVELS);

export function calculateFistOfFive(votes: Vote[]): Results {
  const totals: Record<string, number> = {};
  LEVELS.forEach(l => {
    totals[l] = 0;
  });

  const values: number[] = [];

  votes.forEach(vote => {
    if (vote.selection.type === 'fist-of-five') {
      const raw = vote.selection.value;
      if (typeof raw === 'number' && Number.isInteger(raw)) {
        const v = String(raw);
        if (VALID_LEVELS.has(v) && Object.prototype.hasOwnProperty.call(totals, v)) {
          totals[v]++;
          values.push(raw);
        }
      }
    }
  });

  const validCount = values.length;
  const percentages: Record<string, number> = {};
  LEVELS.forEach(l => {
    percentages[l] = validCount > 0 ? (totals[l] / validCount) * 100 : 0;
  });

  let average: number | undefined;
  let median: number | undefined;

  if (validCount > 0) {
    average = values.reduce((sum, v) => sum + v, 0) / validCount;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  // Consensus: no one voted 1 or 2 (all valid votes support at level 3+)
  const consensus = validCount > 0 && totals['1'] === 0 && totals['2'] === 0;

  // Winner is the level with strictly the most votes
  let maxCount = 0;
  let topLevels: string[] = [];
  LEVELS.forEach(l => {
    if (totals[l] > maxCount) {
      maxCount = totals[l];
      topLevels = [l];
    } else if (totals[l] === maxCount && maxCount > 0) {
      topLevels.push(l);
    }
  });
  const winner = maxCount > 0 && topLevels.length === 1 ? topLevels[0] : undefined;

  return {
    method: 'fist-of-five',
    totals,
    percentages,
    winner,
    average,
    median,
    consensus,
  };
}
