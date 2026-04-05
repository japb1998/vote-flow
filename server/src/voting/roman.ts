import { Vote, Results } from '../types';

export type RomanVote = 'up' | 'down' | 'sideways';

const ROMAN_OPTIONS: RomanVote[] = ['up', 'down', 'sideways'];

export function calculateRoman(votes: Vote[]): Results {
  const totals: Record<string, number> = {};
  ROMAN_OPTIONS.forEach(opt => totals[opt] = 0);

  votes.forEach(vote => {
    if (vote.selection.type === 'roman') {
      const v = vote.selection.vote;
      if (totals[v] !== undefined) {
        totals[v]++;
      }
    }
  });

  const totalVoters = votes.length;
  const percentages: Record<string, number> = {};
  ROMAN_OPTIONS.forEach(opt => {
    percentages[opt] = totalVoters > 0 ? (totals[opt] / totalVoters) * 100 : 0;
  });

  // Passed if thumbs-up strictly outnumber thumbs-down
  const passed = totalVoters > 0 && totals['up'] > totals['down'];

  // Winner is the direction with most votes
  let winner: string | undefined;
  let maxCount = 0;
  ROMAN_OPTIONS.forEach(opt => {
    if (totals[opt] > maxCount) {
      maxCount = totals[opt];
      winner = opt;
    }
  });

  return {
    method: 'roman',
    totals,
    percentages,
    winner,
    passed,
  };
}
