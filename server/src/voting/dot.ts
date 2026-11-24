import { Vote, Results } from '../types';

export const DEFAULT_DOTS_PER_VOTER = 3;

export function calculateDot(votes: Vote[], optionIds: string[]): Results {
  const validIds = new Set(optionIds);
  const totals: Record<string, number> = {};
  validIds.forEach(id => {
    totals[id] = 0;
  });

  votes.forEach(vote => {
    if (
      vote.selection.type === 'dot' &&
      vote.selection.allocations &&
      typeof vote.selection.allocations === 'object'
    ) {
      Object.entries(vote.selection.allocations).forEach(([optionId, dots]) => {
        if (
          validIds.has(optionId) &&
          Object.prototype.hasOwnProperty.call(totals, optionId) &&
          typeof dots === 'number' &&
          Number.isFinite(dots) &&
          dots >= 0
        ) {
          totals[optionId] += dots;
        }
      });
    }
  });

  const totalDots = Object.values(totals).reduce((sum, d) => sum + d, 0);
  const percentages: Record<string, number> = {};
  let maxDots = 0;
  let topOptions: string[] = [];

  validIds.forEach(id => {
    const count = totals[id];
    percentages[id] = totalDots > 0 ? (count / totalDots) * 100 : 0;
    if (count > maxDots) {
      maxDots = count;
      topOptions = [id];
    } else if (count === maxDots && maxDots > 0) {
      topOptions.push(id);
    }
  });

  const winner = maxDots > 0 && topOptions.length === 1 ? topOptions[0] : undefined;

  return { method: 'dot', totals, percentages, winner };
}
