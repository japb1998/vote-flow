import { Vote, Results } from '../types';

export function calculateScore(votes: Vote[], optionIds: string[]): Results {
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
  let maxAvg = -1;
  optionIds.forEach(id => {
    if (averageScores[id] > maxAvg) {
      maxAvg = averageScores[id];
      winner = id;
    }
  });

  return { method: 'score', totals, percentages, winner, averageScores };
}
