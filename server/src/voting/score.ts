import { Vote, Results } from '../types';

export function calculateScore(votes: Vote[], optionIds: string[]): Results {
  const validIds = new Set(optionIds);
  const scores: Record<string, number[]> = {};
  validIds.forEach(id => {
    scores[id] = [];
  });

  let validVoters = 0;
  votes.forEach(vote => {
    if (
      vote.selection.type === 'score' &&
      vote.selection.scores &&
      typeof vote.selection.scores === 'object'
    ) {
      validVoters++;
      Object.entries(vote.selection.scores).forEach(([optionId, score]) => {
        if (
          validIds.has(optionId) &&
          Object.prototype.hasOwnProperty.call(scores, optionId) &&
          typeof score === 'number' &&
          Number.isFinite(score)
        ) {
          scores[optionId].push(score);
        }
      });
    }
  });

  const totals: Record<string, number> = {};
  const averageScores: Record<string, number> = {};

  validIds.forEach(id => {
    const optionScores = scores[id];
    const sum = optionScores.reduce((acc, s) => acc + s, 0);
    totals[id] = sum;
    averageScores[id] = optionScores.length > 0 ? sum / optionScores.length : 0;
  });

  const percentages: Record<string, number> = {};
  const maxPossibleScore = validVoters * 5;
  validIds.forEach(id => {
    percentages[id] = maxPossibleScore > 0 ? (totals[id] / maxPossibleScore) * 100 : 0;
  });

  let maxAvg = 0;
  let topOptions: string[] = [];
  validIds.forEach(id => {
    const avg = averageScores[id];
    if (avg > maxAvg) {
      maxAvg = avg;
      topOptions = [id];
    } else if (avg === maxAvg && maxAvg > 0) {
      topOptions.push(id);
    }
  });

  const winner = maxAvg > 0 && topOptions.length === 1 ? topOptions[0] : undefined;

  return { method: 'score', totals, percentages, winner, averageScores };
}
