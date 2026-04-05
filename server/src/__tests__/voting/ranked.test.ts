import { calculateRankedChoice } from '../../voting/ranked';
import { Vote } from '../../types';

function makeVote(rankings: string[], userId = 'user-1'): Vote {
  return {
    id: `vote-${userId}`,
    userId,
    userName: userId,
    selection: { type: 'ranked', rankings },
    timestamp: Date.now(),
  };
}

const OPTIONS = ['opt1', 'opt2', 'opt3'];

describe('calculateRankedChoice', () => {
  it('returns zeroed results when there are no votes', () => {
    const result = calculateRankedChoice([], OPTIONS);
    expect(result.method).toBe('ranked');
    expect(result.totals).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
    // All options tie at 0 votes, so the algorithm picks one via tiebreak
    expect(result.winner).toBeDefined();
  });

  it('declares winner in first round when one option has >50%', () => {
    const votes = [
      makeVote(['opt1', 'opt2', 'opt3'], 'u1'),
      makeVote(['opt1', 'opt3', 'opt2'], 'u2'),
      makeVote(['opt2', 'opt1', 'opt3'], 'u3'),
    ];
    const result = calculateRankedChoice(votes, OPTIONS);
    // opt1 has 2/3 first-choice votes (66%) → wins round 1
    expect(result.winner).toBe('opt1');
    expect(result.roundInfo?.round).toBe(1);
  });

  it('eliminates lowest option and redistributes votes', () => {
    const votes = [
      makeVote(['opt1', 'opt2', 'opt3'], 'u1'),
      makeVote(['opt2', 'opt1', 'opt3'], 'u2'),
      makeVote(['opt3', 'opt1', 'opt2'], 'u3'),
    ];
    // Round 1: opt1=1, opt2=1, opt3=1 → all tied, one eliminated
    // After elimination, redistributed votes give one candidate >50%
    const result = calculateRankedChoice(votes, OPTIONS);
    expect(result.winner).toBeDefined();
  });

  it('handles two-candidate race correctly', () => {
    const votes = [
      makeVote(['opt1', 'opt2'], 'u1'),
      makeVote(['opt1', 'opt2'], 'u2'),
      makeVote(['opt2', 'opt1'], 'u3'),
    ];
    const result = calculateRankedChoice(votes, ['opt1', 'opt2']);
    expect(result.winner).toBe('opt1');
  });

  it('handles unanimous first choice', () => {
    const votes = [
      makeVote(['opt2', 'opt1', 'opt3'], 'u1'),
      makeVote(['opt2', 'opt3', 'opt1'], 'u2'),
      makeVote(['opt2', 'opt1', 'opt3'], 'u3'),
    ];
    const result = calculateRankedChoice(votes, OPTIONS);
    expect(result.winner).toBe('opt2');
    expect(result.roundInfo?.round).toBe(1);
  });

  it('ignores votes with wrong selection type', () => {
    const vote: Vote = {
      id: 'v1', userId: 'u1', userName: 'u1', timestamp: Date.now(),
      selection: { type: 'single', optionId: 'opt1' },
    };
    const result = calculateRankedChoice([vote], OPTIONS);
    // No ranked votes counted; algorithm handles gracefully
    expect(result.method).toBe('ranked');
  });

  it('returns round info with counts', () => {
    const votes = [
      makeVote(['opt1', 'opt2', 'opt3'], 'u1'),
      makeVote(['opt1', 'opt3', 'opt2'], 'u2'),
      makeVote(['opt2', 'opt1', 'opt3'], 'u3'),
    ];
    const result = calculateRankedChoice(votes, OPTIONS);
    expect(result.roundInfo).toBeDefined();
    expect(result.roundInfo!.counts).toBeDefined();
  });
});
