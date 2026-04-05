import { Vote, Results } from '../types';

const LEVELS = ['1', '2', '3', '4', '5'];

export function calculateFistOfFive(votes: Vote[]): Results {
  const totals: Record<string, number> = {};
  LEVELS.forEach(l => totals[l] = 0);

  const values: number[] = [];

  votes.forEach(vote => {
    if (vote.selection.type === 'fist-of-five') {
      const v = String(vote.selection.value);
      if (totals[v] !== undefined) {
        totals[v]++;
        values.push(vote.selection.value);
      }
    }
  });

  const totalVoters = votes.length;
  const percentages: Record<string, number> = {};
  LEVELS.forEach(l => {
    percentages[l] = totalVoters > 0 ? (totals[l] / totalVoters) * 100 : 0;
  });

  let average: number | undefined;
  let median: number | undefined;

  if (values.length > 0) {
    average = values.reduce((sum, v) => sum + v, 0) / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  // Consensus: no one voted 1 or 2 (all support at level 3+)
  const consensus = totalVoters > 0 && totals['1'] === 0 && totals['2'] === 0;

  // Winner is the level with most votes
  let winner: string | undefined;
  let maxCount = 0;
  LEVELS.forEach(l => {
    if (totals[l] > maxCount) {
      maxCount = totals[l];
      winner = l;
    }
  });

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
