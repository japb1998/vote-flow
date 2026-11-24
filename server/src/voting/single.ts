import { Vote, Results } from '../types';

export function calculateSingleChoice(votes: Vote[], optionIds: string[]): Results {
  const validIds = new Set(optionIds);
  const totals: Record<string, number> = {};
  validIds.forEach(id => {
    totals[id] = 0;
  });

  let totalValidVotes = 0;
  votes.forEach(vote => {
    if (vote.selection.type === 'single') {
      const optionId = vote.selection.optionId;
      if (
        typeof optionId === 'string' &&
        validIds.has(optionId) &&
        Object.prototype.hasOwnProperty.call(totals, optionId)
      ) {
        totals[optionId]++;
        totalValidVotes++;
      }
    }
  });

  const percentages: Record<string, number> = {};
  let maxVotes = 0;
  let topOptions: string[] = [];

  validIds.forEach(id => {
    const count = totals[id];
    percentages[id] = totalValidVotes > 0 ? (count / totalValidVotes) * 100 : 0;
    if (count > maxVotes) {
      maxVotes = count;
      topOptions = [id];
    } else if (count === maxVotes && maxVotes > 0) {
      topOptions.push(id);
    }
  });

  const winner = maxVotes > 0 && topOptions.length === 1 ? topOptions[0] : undefined;

  return { method: 'single', totals, percentages, winner };
}
