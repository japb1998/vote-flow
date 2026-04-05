import { calculateApproval } from '../../voting/approval';
import { Vote } from '../../types';

function makeVote(optionIds: string[], userId = 'user-1'): Vote {
  return {
    id: `vote-${userId}`,
    userId,
    userName: userId,
    selection: { type: 'approval', optionIds },
    timestamp: Date.now(),
  };
}

const OPTIONS = ['opt1', 'opt2', 'opt3'];

describe('calculateApproval', () => {
  it('returns zeroed results when there are no votes', () => {
    const result = calculateApproval([], OPTIONS);
    expect(result.method).toBe('approval');
    expect(result.totals).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
    expect(result.winner).toBeUndefined();
  });

  it('counts approvals correctly when voters approve multiple options', () => {
    const votes = [
      makeVote(['opt1', 'opt2'], 'u1'),
      makeVote(['opt1', 'opt3'], 'u2'),
      makeVote(['opt1'], 'u3'),
    ];
    const result = calculateApproval(votes, OPTIONS);
    expect(result.totals).toEqual({ opt1: 3, opt2: 1, opt3: 1 });
    expect(result.winner).toBe('opt1');
  });

  it('picks the option with the most approvals as winner', () => {
    const votes = [
      makeVote(['opt2'], 'u1'),
      makeVote(['opt2'], 'u2'),
      makeVote(['opt1'], 'u3'),
    ];
    const result = calculateApproval(votes, OPTIONS);
    expect(result.winner).toBe('opt2');
  });

  it('calculates percentages based on voter count, not approval count', () => {
    const votes = [
      makeVote(['opt1', 'opt2'], 'u1'),
      makeVote(['opt1'], 'u2'),
    ];
    const result = calculateApproval(votes, OPTIONS);
    // 2 voters: opt1 approved by 2/2 = 100%, opt2 by 1/2 = 50%
    expect(result.percentages.opt1).toBe(100);
    expect(result.percentages.opt2).toBe(50);
    expect(result.percentages.opt3).toBe(0);
  });

  it('ignores votes for unknown option IDs', () => {
    const votes = [makeVote(['unknown'], 'u1')];
    const result = calculateApproval(votes, OPTIONS);
    expect(result.totals).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
  });

  it('handles voter approving all options', () => {
    const votes = [makeVote(['opt1', 'opt2', 'opt3'], 'u1')];
    const result = calculateApproval(votes, OPTIONS);
    expect(result.totals).toEqual({ opt1: 1, opt2: 1, opt3: 1 });
  });

  it('ignores votes with wrong selection type', () => {
    const vote: Vote = {
      id: 'v1', userId: 'u1', userName: 'u1', timestamp: Date.now(),
      selection: { type: 'single', optionId: 'opt1' },
    };
    const result = calculateApproval([vote], OPTIONS);
    expect(result.totals).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
  });
});
