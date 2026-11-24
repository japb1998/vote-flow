import { Vote, Results } from '../types';

export type RomanVote = 'up' | 'down' | 'sideways';

const ROMAN_OPTIONS: RomanVote[] = ['up', 'down', 'sideways'];
const VALID_OPTIONS = new Set<string>(ROMAN_OPTIONS);

export function calculateRoman(votes: Vote[]): Results {
  const totals: Record<string, number> = {};
  ROMAN_OPTIONS.forEach(opt => {
    totals[opt] = 0;
  });

  votes.forEach(vote => {
    if (vote.selection.type === 'roman') {
      const v = vote.selection.vote;
      if (
        typeof v === 'string' &&
        VALID_OPTIONS.has(v) &&
        Object.prototype.hasOwnProperty.call(totals, v)
      ) {
        totals[v]++;
      }
    }
  });

  const validCount = totals['up'] + totals['down'] + totals['sideways'];
  const percentages: Record<string, number> = {};
  ROMAN_OPTIONS.forEach(opt => {
    percentages[opt] = validCount > 0 ? (totals[opt] / validCount) * 100 : 0;
  });

  // Passed if thumbs-up strictly outnumber thumbs-down
  const passed = validCount > 0 && totals['up'] > totals['down'];

  // Winner is the direction with strictly the most votes
  let maxCount = 0;
  let topOptions: string[] = [];
  ROMAN_OPTIONS.forEach(opt => {
    if (totals[opt] > maxCount) {
      maxCount = totals[opt];
      topOptions = [opt];
    } else if (totals[opt] === maxCount && maxCount > 0) {
      topOptions.push(opt);
    }
  });
  const winner = maxCount > 0 && topOptions.length === 1 ? topOptions[0] : undefined;

  return {
    method: 'roman',
    totals,
    percentages,
    winner,
    passed,
  };
}
