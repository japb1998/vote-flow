import { calculateDot } from '../../voting/dot';
import { Vote } from '../../types';

function makeVote(allocations: Record<string, number>, userId = 'user-1'): Vote {
  return {
    id: `vote-${userId}`,
    userId,
    userName: userId,
    selection: { type: 'dot', allocations },
    timestamp: Date.now(),
  };
}

const OPTIONS = ['opt1', 'opt2', 'opt3'];

describe('calculateDot', () => {
  it('returns zeroed results when there are no votes', () => {
    const result = calculateDot([], OPTIONS);
    expect(result.method).toBe('dot');
    expect(result.totals).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
    expect(result.percentages).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
    expect(result.winner).toBeUndefined();
  });

  it('sums dot allocations across voters', () => {
    const votes = [
      makeVote({ opt1: 2, opt2: 1 }, 'u1'),
      makeVote({ opt1: 1, opt3: 2 }, 'u2'),
    ];
    const result = calculateDot(votes, OPTIONS);
    expect(result.totals).toEqual({ opt1: 3, opt2: 1, opt3: 2 });
  });

  it('picks the option with the most dots as winner', () => {
    const votes = [
      makeVote({ opt1: 1, opt2: 2 }, 'u1'),
      makeVote({ opt2: 3 }, 'u2'),
    ];
    const result = calculateDot(votes, OPTIONS);
    expect(result.winner).toBe('opt2');
    expect(result.totals.opt2).toBe(5);
  });

  it('calculates percentages based on total dots (not voter count)', () => {
    const votes = [
      makeVote({ opt1: 2, opt2: 1 }, 'u1'),  // 3 dots
      makeVote({ opt1: 1, opt3: 2 }, 'u2'),  // 3 dots
    ];
    const result = calculateDot(votes, OPTIONS);
    // total dots = 6, opt1=3, opt2=1, opt3=2
    expect(result.percentages.opt1).toBe(50);
    expect(result.percentages.opt2).toBeCloseTo(16.67, 1);
    expect(result.percentages.opt3).toBeCloseTo(33.33, 1);
  });

  it('allows concentrating all dots on one option', () => {
    const votes = [
      makeVote({ opt1: 3 }, 'u1'),
      makeVote({ opt1: 3 }, 'u2'),
    ];
    const result = calculateDot(votes, OPTIONS);
    expect(result.totals.opt1).toBe(6);
    expect(result.percentages.opt1).toBe(100);
    expect(result.winner).toBe('opt1');
  });

  it('ignores allocations to unknown option IDs', () => {
    const votes = [makeVote({ unknown: 3 }, 'u1')];
    const result = calculateDot(votes, OPTIONS);
    expect(result.totals).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
  });

  it('ignores votes with wrong selection type', () => {
    const vote: Vote = {
      id: 'v1', userId: 'u1', userName: 'u1', timestamp: Date.now(),
      selection: { type: 'single', optionId: 'opt1' },
    };
    const result = calculateDot([vote], OPTIONS);
    expect(result.totals).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
  });

  it('handles many voters with spread allocations', () => {
    const votes = [
      makeVote({ opt1: 1, opt2: 1, opt3: 1 }, 'u1'),
      makeVote({ opt1: 1, opt2: 1, opt3: 1 }, 'u2'),
      makeVote({ opt1: 1, opt2: 1, opt3: 1 }, 'u3'),
    ];
    const result = calculateDot(votes, OPTIONS);
    expect(result.totals).toEqual({ opt1: 3, opt2: 3, opt3: 3 });
  });
});
