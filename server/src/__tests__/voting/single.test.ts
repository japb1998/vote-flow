import { calculateSingleChoice } from '../../voting/single';
import { Vote } from '../../types';

function makeVote(optionId: string, userId = 'user-1'): Vote {
  return {
    id: `vote-${userId}`,
    userId,
    userName: userId,
    selection: { type: 'single', optionId },
    timestamp: Date.now(),
  };
}

const OPTIONS = ['opt1', 'opt2', 'opt3'];

describe('calculateSingleChoice', () => {
  it('returns zeroed results when there are no votes', () => {
    const result = calculateSingleChoice([], OPTIONS);
    expect(result.method).toBe('single');
    expect(result.totals).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
    expect(result.percentages).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
    expect(result.winner).toBeUndefined();
  });

  it('declares a winner with a clear majority (>50%)', () => {
    const votes = [
      makeVote('opt1', 'u1'),
      makeVote('opt1', 'u2'),
      makeVote('opt1', 'u3'),
      makeVote('opt2', 'u4'),
    ];
    const result = calculateSingleChoice(votes, OPTIONS);
    expect(result.winner).toBe('opt1');
    expect(result.totals.opt1).toBe(3);
    expect(result.percentages.opt1).toBe(75);
  });

  it('does not declare a winner at exactly 50%', () => {
    const votes = [
      makeVote('opt1', 'u1'),
      makeVote('opt2', 'u2'),
    ];
    const result = calculateSingleChoice(votes, OPTIONS);
    expect(result.winner).toBeUndefined();
  });

  it('does not declare a winner when votes are split three ways', () => {
    const votes = [
      makeVote('opt1', 'u1'),
      makeVote('opt2', 'u2'),
      makeVote('opt3', 'u3'),
    ];
    const result = calculateSingleChoice(votes, OPTIONS);
    expect(result.winner).toBeUndefined();
  });

  it('ignores votes for unknown option IDs', () => {
    const votes = [makeVote('unknown', 'u1')];
    const result = calculateSingleChoice(votes, OPTIONS);
    expect(result.totals).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
  });

  it('ignores votes with wrong selection type', () => {
    const vote: Vote = {
      id: 'v1', userId: 'u1', userName: 'u1', timestamp: Date.now(),
      selection: { type: 'approval', optionIds: ['opt1'] },
    };
    const result = calculateSingleChoice([vote], OPTIONS);
    expect(result.totals).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
  });

  it('calculates correct percentages', () => {
    const votes = [
      makeVote('opt1', 'u1'),
      makeVote('opt1', 'u2'),
      makeVote('opt2', 'u3'),
      makeVote('opt3', 'u4'),
    ];
    const result = calculateSingleChoice(votes, OPTIONS);
    expect(result.percentages.opt1).toBe(50);
    expect(result.percentages.opt2).toBe(25);
    expect(result.percentages.opt3).toBe(25);
  });
});
