import { calculateFistOfFive } from '../../voting/fist-of-five';
import { Vote } from '../../types';

function makeVote(value: 1 | 2 | 3 | 4 | 5, userId = 'user-1'): Vote {
  return {
    id: `vote-${userId}`,
    userId,
    userName: userId,
    selection: { type: 'fist-of-five', value },
    timestamp: Date.now(),
  };
}

describe('calculateFistOfFive', () => {
  it('returns zeroed results when there are no votes', () => {
    const result = calculateFistOfFive([]);
    expect(result.method).toBe('fist-of-five');
    expect(result.totals).toEqual({ '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 });
    expect(result.average).toBeUndefined();
    expect(result.median).toBeUndefined();
    expect(result.consensus).toBe(false);
  });

  it('calculates average and median correctly', () => {
    const votes = [
      makeVote(3, 'u1'),
      makeVote(4, 'u2'),
      makeVote(5, 'u3'),
    ];
    const result = calculateFistOfFive(votes);
    expect(result.average).toBe(4);
    expect(result.median).toBe(4);
  });

  it('reports consensus when all votes are 3 or above', () => {
    const votes = [
      makeVote(3, 'u1'),
      makeVote(4, 'u2'),
      makeVote(5, 'u3'),
    ];
    const result = calculateFistOfFive(votes);
    expect(result.consensus).toBe(true);
  });

  it('reports no consensus when any vote is 1', () => {
    const votes = [
      makeVote(5, 'u1'),
      makeVote(5, 'u2'),
      makeVote(1, 'u3'),
    ];
    const result = calculateFistOfFive(votes);
    expect(result.consensus).toBe(false);
  });

  it('reports no consensus when any vote is 2', () => {
    const votes = [
      makeVote(4, 'u1'),
      makeVote(4, 'u2'),
      makeVote(2, 'u3'),
    ];
    const result = calculateFistOfFive(votes);
    expect(result.consensus).toBe(false);
  });

  it('counts distribution correctly', () => {
    const votes = [
      makeVote(3, 'u1'),
      makeVote(3, 'u2'),
      makeVote(4, 'u3'),
      makeVote(5, 'u4'),
      makeVote(5, 'u5'),
    ];
    const result = calculateFistOfFive(votes);
    expect(result.totals).toEqual({ '1': 0, '2': 0, '3': 2, '4': 1, '5': 2 });
  });

  it('picks the most-voted level as winner', () => {
    const votes = [
      makeVote(4, 'u1'),
      makeVote(4, 'u2'),
      makeVote(4, 'u3'),
      makeVote(5, 'u4'),
    ];
    const result = calculateFistOfFive(votes);
    expect(result.winner).toBe('4');
  });

  it('calculates percentages based on total voters', () => {
    const votes = [
      makeVote(3, 'u1'),
      makeVote(4, 'u2'),
      makeVote(5, 'u3'),
      makeVote(5, 'u4'),
    ];
    const result = calculateFistOfFive(votes);
    expect(result.percentages['3']).toBe(25);
    expect(result.percentages['4']).toBe(25);
    expect(result.percentages['5']).toBe(50);
  });

  it('handles median with even number of votes', () => {
    const votes = [
      makeVote(2, 'u1'),
      makeVote(4, 'u2'),
    ];
    const result = calculateFistOfFive(votes);
    expect(result.median).toBe(3); // (2+4)/2
  });

  it('handles unanimous vote', () => {
    const votes = [
      makeVote(5, 'u1'),
      makeVote(5, 'u2'),
      makeVote(5, 'u3'),
    ];
    const result = calculateFistOfFive(votes);
    expect(result.consensus).toBe(true);
    expect(result.average).toBe(5);
    expect(result.median).toBe(5);
    expect(result.winner).toBe('5');
  });

  it('ignores votes with wrong selection type', () => {
    const vote: Vote = {
      id: 'v1', userId: 'u1', userName: 'u1', timestamp: Date.now(),
      selection: { type: 'single', optionId: 'opt1' },
    };
    const result = calculateFistOfFive([vote]);
    expect(result.totals).toEqual({ '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 });
  });
});
