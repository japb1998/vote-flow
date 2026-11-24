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
  const validCards = new Set(cardStrings);

  const totals: Record<string, number> = {};
  cardStrings.forEach(c => {
    totals[c] = 0;
  });

  const numericVotes: number[] = [];

  votes.forEach(vote => {
    if (vote.selection.type === 'poker') {
      const card = vote.selection.value;
      if (
        typeof card === 'string' &&
        validCards.has(card) &&
        Object.prototype.hasOwnProperty.call(totals, card)
      ) {
        totals[card]++;
        numericVotes.push(Number(card));
      }
    }
  });

  const validCount = numericVotes.length;
  const percentages: Record<string, number> = {};
  cardStrings.forEach(c => {
    percentages[c] = validCount > 0 ? (totals[c] / validCount) * 100 : 0;
  });

  let average: number | undefined;
  let median: number | undefined;

  if (validCount > 0) {
    average = numericVotes.reduce((sum, v) => sum + v, 0) / validCount;
    const sorted = [...numericVotes].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  // Consensus: all valid voters picked the same card
  const votedCards = cardStrings.filter(c => totals[c] > 0);
  const consensus = validCount > 0 && votedCards.length === 1;

  // Winner is the card with strictly the most votes
  let maxCount = 0;
  let topCards: string[] = [];
  cardStrings.forEach(c => {
    if (totals[c] > maxCount) {
      maxCount = totals[c];
      topCards = [c];
    } else if (totals[c] === maxCount && maxCount > 0) {
      topCards.push(c);
    }
  });
  const winner = maxCount > 0 && topCards.length === 1 ? topCards[0] : undefined;

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
