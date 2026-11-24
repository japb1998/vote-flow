import { Vote, Results } from '../types';

export function calculateApproval(votes: Vote[], optionIds: string[]): Results {
  const validIds = new Set(optionIds);
  const totals: Record<string, number> = {};
  validIds.forEach(id => {
    totals[id] = 0;
  });

  let totalVoters = 0;
  votes.forEach(vote => {
    if (vote.selection.type === 'approval' && Array.isArray(vote.selection.optionIds)) {
      totalVoters++;
      const uniqueSelections = new Set(vote.selection.optionIds);
      uniqueSelections.forEach(optionId => {
        if (
          typeof optionId === 'string' &&
          validIds.has(optionId) &&
          Object.prototype.hasOwnProperty.call(totals, optionId)
        ) {
          totals[optionId]++;
        }
      });
    }
  });

  const percentages: Record<string, number> = {};
  let maxVotes = 0;
  let topOptions: string[] = [];

  validIds.forEach(id => {
    const count = totals[id];
    percentages[id] = totalVoters > 0 ? (count / totalVoters) * 100 : 0;
    if (count > maxVotes) {
      maxVotes = count;
      topOptions = [id];
    } else if (count === maxVotes && maxVotes > 0) {
      topOptions.push(id);
    }
  });

  const winner = maxVotes > 0 && topOptions.length === 1 ? topOptions[0] : undefined;

  return { method: 'approval', totals, percentages, winner };
}
