import { Vote, Results, VotingMethod, RankedRoundInfo } from '../types';

export function calculateResults(
  votes: Vote[],
  optionIds: string[],
  method: VotingMethod
): Results {
  switch (method) {
    case 'single':
      return calculateSingleChoice(votes, optionIds);
    case 'approval':
      return calculateApproval(votes, optionIds);
    case 'ranked':
      return calculateRankedChoice(votes, optionIds);
    case 'score':
      return calculateScore(votes, optionIds);
    default:
      return { method, totals: {}, percentages: {} };
  }
}

function calculateSingleChoice(votes: Vote[], optionIds: string[]): Results {
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

function calculateApproval(votes: Vote[], optionIds: string[]): Results {
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

function calculateRankedChoice(votes: Vote[], optionIds: string[]): Results {
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

function calculateScore(votes: Vote[], optionIds: string[]): Results {
  const scores: Record<string, number[]> = {};
  optionIds.forEach(id => scores[id] = []);

  votes.forEach(vote => {
    if (vote.selection.type === 'score') {
      Object.entries(vote.selection.scores).forEach(([optionId, score]) => {
        if (scores[optionId]) {
          scores[optionId].push(score);
        }
      });
    }
  });

  const totals: Record<string, number> = {};
  const averageScores: Record<string, number> = {};

  optionIds.forEach(id => {
    const optionScores = scores[id] || [];
    totals[id] = optionScores.reduce((sum, s) => sum + s, 0);
    averageScores[id] = optionScores.length > 0
      ? optionScores.reduce((sum, s) => sum + s, 0) / optionScores.length
      : 0;
  });

  const percentages: Record<string, number> = {};
  const maxPossibleScore = votes.length * 5;
  optionIds.forEach(id => {
    percentages[id] = maxPossibleScore > 0 ? (totals[id] / maxPossibleScore) * 100 : 0;
  });

  let winner: string | undefined;
  if (votes.length > 0) {
    let maxAvg = -1;
    optionIds.forEach(id => {
      if (averageScores[id] > maxAvg) {
        maxAvg = averageScores[id];
        winner = id;
      }
    });
  }

  return { method: 'score', totals, percentages, winner, averageScores };
}
