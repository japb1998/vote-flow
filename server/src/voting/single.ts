import { Vote, Results } from '../types';

export function calculateSingleChoice(votes: Vote[], optionIds: string[]): Results {
  const totals: Record<string, number> = {};
  optionIds.forEach(id => totals[id] = 0);

  votes.forEach(vote => {
    if (vote.selection.type === 'single') {
      const optionId = vote.selection.optionId;
      if (totals[optionId] !== undefined) {
        totals[optionId]++;
      }
    }
  });

  const totalVotes = votes.length;
  const percentages: Record<string, number> = {};
  let winner: string | undefined;

  let maxVotes = 0;
  optionIds.forEach(id => {
    percentages[id] = totalVotes > 0 ? (totals[id] / totalVotes) * 100 : 0;
    if (totals[id] > maxVotes) {
      maxVotes = totals[id];
      winner = id;
    }
  });

  if (totalVotes > 0 && maxVotes / totalVotes <= 0.5) {
    winner = undefined;
  }

  return { method: 'single', totals, percentages, winner };
}
