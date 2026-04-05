import { calculateScore } from '../../voting/score';
import { Vote } from '../../types';

function makeVote(scores: Record<string, number>, userId = 'user-1'): Vote {
  return {
    id: `vote-${userId}`,
    userId,
    userName: userId,
    selection: { type: 'score', scores },
    timestamp: Date.now(),
  };
}

const OPTIONS = ['opt1', 'opt2', 'opt3'];

describe('calculateScore', () => {
  it('returns zeroed results when there are no votes', () => {
    const result = calculateScore([], OPTIONS);
    expect(result.method).toBe('score');
    expect(result.totals).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
    expect(result.averageScores).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
    // All averages are 0, so first option wins the tiebreak by iteration order
    expect(result.winner).toBe('opt1');
  });

  it('calculates totals and averages correctly', () => {
    const votes = [
      makeVote({ opt1: 5, opt2: 3, opt3: 1 }, 'u1'),
      makeVote({ opt1: 4, opt2: 4, opt3: 2 }, 'u2'),
    ];
    const result = calculateScore(votes, OPTIONS);
    expect(result.totals).toEqual({ opt1: 9, opt2: 7, opt3: 3 });
    expect(result.averageScores).toEqual({ opt1: 4.5, opt2: 3.5, opt3: 1.5 });
  });

  it('picks the option with highest average score as winner', () => {
    const votes = [
      makeVote({ opt1: 5, opt2: 3, opt3: 1 }, 'u1'),
      makeVote({ opt1: 4, opt2: 2, opt3: 5 }, 'u2'),
      makeVote({ opt1: 5, opt2: 1, opt3: 3 }, 'u3'),
    ];
    const result = calculateScore(votes, OPTIONS);
    // avg: opt1=4.67, opt2=2, opt3=3
    expect(result.winner).toBe('opt1');
  });

  it('calculates percentages relative to max possible score (voters * 5)', () => {
    const votes = [
      makeVote({ opt1: 5, opt2: 5, opt3: 5 }, 'u1'),
    ];
    const result = calculateScore(votes, OPTIONS);
    // max possible = 1 * 5 = 5
    expect(result.percentages.opt1).toBe(100);
    expect(result.percentages.opt2).toBe(100);
  });

  it('handles partial scoring (not all options scored)', () => {
    const votes = [
      makeVote({ opt1: 3 }, 'u1'),
    ];
    const result = calculateScore(votes, OPTIONS);
    expect(result.totals.opt1).toBe(3);
    expect(result.totals.opt2).toBe(0);
    expect(result.averageScores!.opt1).toBe(3);
    expect(result.averageScores!.opt2).toBe(0);
  });

  it('ignores scores for unknown option IDs', () => {
    const votes = [makeVote({ unknown: 5 }, 'u1')];
    const result = calculateScore(votes, OPTIONS);
    expect(result.totals).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
  });

  it('ignores votes with wrong selection type', () => {
    const vote: Vote = {
      id: 'v1', userId: 'u1', userName: 'u1', timestamp: Date.now(),
      selection: { type: 'single', optionId: 'opt1' },
    };
    const result = calculateScore([vote], OPTIONS);
    expect(result.totals).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
  });
});
