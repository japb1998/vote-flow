import { Vote, Results } from '../types';

export function calculateApproval(votes: Vote[], optionIds: string[]): Results {
  const totals: Record<string, number> = {};
  optionIds.forEach(id => totals[id] = 0);

  votes.forEach(vote => {
    if (vote.selection.type === 'approval') {
      vote.selection.optionIds.forEach(optionId => {
        if (totals[optionId] !== undefined) {
          totals[optionId]++;
        }
      });
    }
  });

  const totalVoters = votes.length;
  const percentages: Record<string, number> = {};
  let winner: string | undefined;

  let maxVotes = 0;
  optionIds.forEach(id => {
    percentages[id] = totalVoters > 0 ? (totals[id] / totalVoters) * 100 : 0;
    if (totals[id] > maxVotes) {
      maxVotes = totals[id];
      winner = id;
    }
  });

  return { method: 'approval', totals, percentages, winner };
}
