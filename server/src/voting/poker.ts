import { Vote, Results, SessionConfig } from '../types';
import { FIBONACCI_SEQUENCE } from '../utils/helpers';

/** Build the list of valid cards from session config (defaults: 1–89). */
export function getPokerCards(config?: SessionConfig): number[] {
  const min = config?.pokerMin ?? FIBONACCI_SEQUENCE[0];
  const max = config?.pokerMax ?? FIBONACCI_SEQUENCE[FIBONACCI_SEQUENCE.length - 1];
  return FIBONACCI_SEQUENCE.filter(n => n >= min && n <= max);
}

export function calculatePoker(votes: Vote[], config?: SessionConfig): Results {
  const cards = getPokerCards(config);
  const cardStrings = cards.map(String);

  const totals: Record<string, number> = {};
  cardStrings.forEach(c => totals[c] = 0);

  const numericVotes: number[] = [];

  votes.forEach(vote => {
    if (vote.selection.type === 'poker') {
      const card = vote.selection.value;
      if (totals[card] !== undefined) {
        totals[card]++;
        numericVotes.push(Number(card));
      }
    }
  });

  const totalVoters = votes.length;
  const percentages: Record<string, number> = {};
  cardStrings.forEach(c => {
    percentages[c] = totalVoters > 0 ? (totals[c] / totalVoters) * 100 : 0;
  });

  let average: number | undefined;
  let median: number | undefined;

  if (numericVotes.length > 0) {
    average = numericVotes.reduce((sum, v) => sum + v, 0) / numericVotes.length;
    const sorted = [...numericVotes].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  // Consensus: all voters picked the same card
  const votedCards = cardStrings.filter(c => totals[c] > 0);
  const consensus = totalVoters > 0 && votedCards.length === 1;

  // Winner is the card with most votes
  let winner: string | undefined;
  let maxCount = 0;
  cardStrings.forEach(c => {
    if (totals[c] > maxCount) {
      maxCount = totals[c];
      winner = c;
    }
  });

  return {
    method: 'poker',
    totals,
    percentages,
    winner,
    average,
    median,
    consensus,
  };
}
