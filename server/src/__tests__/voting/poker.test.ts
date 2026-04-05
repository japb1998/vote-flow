import { calculatePoker, getPokerCards } from '../../voting/poker';
import { Vote } from '../../types';

function makeVote(value: string, userId = 'user-1'): Vote {
  return {
    id: `vote-${userId}`,
    userId,
    userName: userId,
    selection: { type: 'poker', value },
    timestamp: Date.now(),
  };
}

describe('getPokerCards', () => {
  it('returns the full Fibonacci sequence with no config', () => {
    expect(getPokerCards()).toEqual([1, 2, 3, 5, 8, 13, 21, 34, 55, 89]);
  });

  it('filters by min', () => {
    expect(getPokerCards({ pokerMin: 5 })).toEqual([5, 8, 13, 21, 34, 55, 89]);
  });

  it('filters by max', () => {
    expect(getPokerCards({ pokerMax: 13 })).toEqual([1, 2, 3, 5, 8, 13]);
  });

  it('filters by min and max', () => {
    expect(getPokerCards({ pokerMin: 3, pokerMax: 21 })).toEqual([3, 5, 8, 13, 21]);
  });

  it('returns single card when min equals max', () => {
    expect(getPokerCards({ pokerMin: 8, pokerMax: 8 })).toEqual([8]);
  });
});

describe('calculatePoker', () => {
  it('returns zeroed results when there are no votes', () => {
    const result = calculatePoker([]);
    expect(result.method).toBe('poker');
    expect(result.average).toBeUndefined();
    expect(result.median).toBeUndefined();
    expect(result.consensus).toBe(false);
  });

  it('calculates average and median for Fibonacci cards', () => {
    const votes = [
      makeVote('3', 'u1'),
      makeVote('5', 'u2'),
      makeVote('8', 'u3'),
    ];
    const result = calculatePoker(votes);
    // avg = (3+5+8)/3 ≈ 5.333
    expect(result.average).toBeCloseTo(5.333, 2);
    // sorted: [3,5,8] → median = 5
    expect(result.median).toBe(5);
  });

  it('detects consensus when all voters pick the same card', () => {
    const votes = [
      makeVote('5', 'u1'),
      makeVote('5', 'u2'),
      makeVote('5', 'u3'),
    ];
    const result = calculatePoker(votes);
    expect(result.consensus).toBe(true);
    expect(result.winner).toBe('5');
    expect(result.average).toBe(5);
    expect(result.median).toBe(5);
  });

  it('reports no consensus when voters disagree', () => {
    const votes = [
      makeVote('1', 'u1'),
      makeVote('13', 'u2'),
    ];
    const result = calculatePoker(votes);
    expect(result.consensus).toBe(false);
  });

  it('picks the most-voted card as winner', () => {
    const votes = [
      makeVote('3', 'u1'),
      makeVote('5', 'u2'),
      makeVote('5', 'u3'),
      makeVote('8', 'u4'),
    ];
    const result = calculatePoker(votes);
    expect(result.winner).toBe('5');
    expect(result.totals['5']).toBe(2);
  });

  it('calculates percentages based on total voters', () => {
    const votes = [
      makeVote('3', 'u1'),
      makeVote('3', 'u2'),
      makeVote('5', 'u3'),
      makeVote('8', 'u4'),
    ];
    const result = calculatePoker(votes);
    expect(result.percentages['3']).toBe(50);
    expect(result.percentages['5']).toBe(25);
    expect(result.percentages['8']).toBe(25);
  });

  it('only includes cards within configured range', () => {
    const config = { pokerMin: 3, pokerMax: 13 };
    const result = calculatePoker([], config);
    expect(Object.keys(result.totals)).toEqual(['3', '5', '8', '13']);
  });

  it('ignores votes for cards outside the configured range', () => {
    const config = { pokerMin: 3, pokerMax: 13 };
    const votes = [
      makeVote('1', 'u1'),   // below range — ignored
      makeVote('5', 'u2'),   // in range
      makeVote('21', 'u3'),  // above range — ignored
    ];
    const result = calculatePoker(votes, config);
    expect(result.totals['5']).toBe(1);
    expect(result.totals['1']).toBeUndefined();
    expect(result.totals['21']).toBeUndefined();
  });

  it('handles median with even number of votes', () => {
    const votes = [
      makeVote('3', 'u1'),
      makeVote('8', 'u2'),
    ];
    const result = calculatePoker(votes);
    expect(result.median).toBe(5.5); // (3+8)/2
  });
});
