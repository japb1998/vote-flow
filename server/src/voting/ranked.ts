import { Vote, Results, RankedRoundInfo } from '../types';

export function calculateRankedChoice(votes: Vote[], optionIds: string[]): Results {
  const totals: Record<string, number> = {};
  optionIds.forEach(id => totals[id] = 0);

  const activeOptions = new Set(optionIds);
  let round = 1;
  let roundInfo: RankedRoundInfo | undefined;
  let winner: string | undefined;

  while (!winner && activeOptions.size > 0) {
    const roundCounts: Record<string, number> = {};
    activeOptions.forEach(id => roundCounts[id] = 0);

    votes.forEach(vote => {
      if (vote.selection.type === 'ranked') {
        const rankings = vote.selection.rankings;
        for (const optionId of rankings) {
          if (activeOptions.has(optionId)) {
            roundCounts[optionId]++;
            break;
          }
        }
      }
    });

    let minVotes = Infinity;
    let maxVotes = -1;
    let minOptions: string[] = [];
    let maxOption: string | undefined;

    activeOptions.forEach(id => {
      if (roundCounts[id] < minVotes) {
        minVotes = roundCounts[id];
        minOptions = [id];
      } else if (roundCounts[id] === minVotes) {
        minOptions.push(id);
      }
      if (roundCounts[id] > maxVotes) {
        maxVotes = roundCounts[id];
        maxOption = id;
      }
    });

    const totalActiveVotes = votes.length;
    if (maxVotes > totalActiveVotes / 2) {
      winner = maxOption;
      roundInfo = { round, counts: roundCounts };
      break;
    }

    if (minOptions.length === activeOptions.size) {
      winner = maxOption;
      roundInfo = { round, counts: roundCounts };
      break;
    }

    let eliminated: string;
    if (minOptions.length === 1) {
      eliminated = minOptions[0];
    } else {
      eliminated = minOptions[Math.floor(Math.random() * minOptions.length)];
    }

    activeOptions.delete(eliminated);
    roundInfo = { round, eliminated, counts: roundCounts };
    round++;
  }

  const totalsResult: Record<string, number> = {};
  optionIds.forEach(id => totalsResult[id] = roundInfo?.counts[id] || 0);

  const percentages: Record<string, number> = {};
  const totalVotes = votes.length;
  optionIds.forEach(id => {
    percentages[id] = totalVotes > 0 ? (totalsResult[id] / totalVotes) * 100 : 0;
  });

  return {
    method: 'ranked',
    totals: totalsResult,
    percentages,
    winner,
    roundInfo
  };
}
