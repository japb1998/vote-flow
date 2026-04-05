import { Vote, Results } from '../types';

export const DEFAULT_DOTS_PER_VOTER = 3;

export function calculateDot(votes: Vote[], optionIds: string[]): Results {
  const totals: Record<string, number> = {};
  optionIds.forEach(id => totals[id] = 0);

  votes.forEach(vote => {
    if (vote.selection.type === 'dot') {
      Object.entries(vote.selection.allocations).forEach(([optionId, dots]) => {
        if (totals[optionId] !== undefined) {
          totals[optionId] += dots;
        }
      });
    }
  });

  const totalDots = Object.values(totals).reduce((sum, d) => sum + d, 0);
  const percentages: Record<string, number> = {};
  let winner: string | undefined;
  let maxDots = 0;

  optionIds.forEach(id => {
    percentages[id] = totalDots > 0 ? (totals[id] / totalDots) * 100 : 0;
    if (totals[id] > maxDots) {
      maxDots = totals[id];
      winner = id;
    }
  });

  return { method: 'dot', totals, percentages, winner };
}
