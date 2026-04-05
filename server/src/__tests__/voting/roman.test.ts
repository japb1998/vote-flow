import { calculateRoman } from '../../voting/roman';
import { Vote } from '../../types';

function makeVote(vote: 'up' | 'down' | 'sideways', userId = 'user-1'): Vote {
  return {
    id: `vote-${userId}`,
    userId,
    userName: userId,
    selection: { type: 'roman', vote },
    timestamp: Date.now(),
  };
}

describe('calculateRoman', () => {
  it('returns zeroed results when there are no votes', () => {
    const result = calculateRoman([]);
    expect(result.method).toBe('roman');
    expect(result.totals).toEqual({ up: 0, down: 0, sideways: 0 });
    expect(result.passed).toBe(false);
  });

  it('passes when thumbs-up outnumber thumbs-down', () => {
    const votes = [
      makeVote('up', 'u1'),
      makeVote('up', 'u2'),
      makeVote('down', 'u3'),
    ];
    const result = calculateRoman(votes);
    expect(result.passed).toBe(true);
    expect(result.winner).toBe('up');
  });

  it('does not pass when thumbs-down outnumber thumbs-up', () => {
    const votes = [
      makeVote('up', 'u1'),
      makeVote('down', 'u2'),
      makeVote('down', 'u3'),
    ];
    const result = calculateRoman(votes);
    expect(result.passed).toBe(false);
    expect(result.winner).toBe('down');
  });

  it('does not pass when up and down are tied', () => {
    const votes = [
      makeVote('up', 'u1'),
      makeVote('down', 'u2'),
    ];
    const result = calculateRoman(votes);
    expect(result.passed).toBe(false);
  });

  it('sideways votes do not count toward up or down', () => {
    const votes = [
      makeVote('up', 'u1'),
      makeVote('sideways', 'u2'),
      makeVote('sideways', 'u3'),
      makeVote('sideways', 'u4'),
    ];
    const result = calculateRoman(votes);
    // up=1 > down=0 → passes
    expect(result.passed).toBe(true);
    expect(result.winner).toBe('sideways'); // most votes by count
  });

  it('calculates percentages based on total voters', () => {
    const votes = [
      makeVote('up', 'u1'),
      makeVote('up', 'u2'),
      makeVote('down', 'u3'),
      makeVote('sideways', 'u4'),
    ];
    const result = calculateRoman(votes);
    expect(result.percentages.up).toBe(50);
    expect(result.percentages.down).toBe(25);
    expect(result.percentages.sideways).toBe(25);
  });

  it('handles unanimous thumbs-up', () => {
    const votes = [
      makeVote('up', 'u1'),
      makeVote('up', 'u2'),
      makeVote('up', 'u3'),
    ];
    const result = calculateRoman(votes);
    expect(result.passed).toBe(true);
    expect(result.percentages.up).toBe(100);
  });

  it('handles unanimous thumbs-down', () => {
    const votes = [
      makeVote('down', 'u1'),
      makeVote('down', 'u2'),
    ];
    const result = calculateRoman(votes);
    expect(result.passed).toBe(false);
    expect(result.percentages.down).toBe(100);
  });

  it('ignores votes with wrong selection type', () => {
    const vote: Vote = {
      id: 'v1', userId: 'u1', userName: 'u1', timestamp: Date.now(),
      selection: { type: 'single', optionId: 'opt1' },
    };
    const result = calculateRoman([vote]);
    expect(result.totals).toEqual({ up: 0, down: 0, sideways: 0 });
  });
});
