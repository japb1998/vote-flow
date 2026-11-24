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
  it('returns zeroed results and undefined winner when there are no votes', () => {
    const result = calculateRankedChoice([], OPTIONS);
    expect(result.method).toBe('ranked');
    expect(result.totals).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
    expect(result.percentages).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
    expect(result.winner).toBeUndefined();
    expect(result.roundInfo).toBeUndefined();
  });

  it('declares winner in first round when one option has >50%', () => {
    const votes = [
      makeVote(['opt1', 'opt2', 'opt3'], 'u1'),
      makeVote(['opt1', 'opt3', 'opt2'], 'u2'),
      makeVote(['opt2', 'opt1', 'opt3'], 'u3'),
    ];
    const result = calculateRankedChoice(votes, OPTIONS);
    // opt1 has 2/3 first-choice votes (66.67%) → wins round 1
    expect(result.winner).toBe('opt1');
    expect(result.roundInfo?.round).toBe(1);
  });

  it('eliminates lowest option via Borda tie-break and redistributes votes in Round 2', () => {
    const votes = [
      makeVote(['opt1', 'opt2', 'opt3'], 'u1'),
      makeVote(['opt2', 'opt1', 'opt3'], 'u2'),
      makeVote(['opt3', 'opt1', 'opt2'], 'u3'),
    ];
    // Round 1: opt1=1, opt2=1, opt3=1; Borda: opt1=4, opt2=3, opt3=2 → opt3 eliminated
    // Round 2: u3 transfers to opt1 → opt1=2, opt2=1 → opt1 wins with 2/3
    const result = calculateRankedChoice(votes, OPTIONS);
    expect(result.winner).toBe('opt1');
    expect(result.roundInfo?.round).toBe(2);
    expect(result.totals).toEqual({ opt1: 2, opt2: 1, opt3: 0 });
    expect(result.percentages.opt1).toBeCloseTo(66.67, 1);
    expect(result.percentages.opt2).toBeCloseTo(33.33, 1);
    expect(result.percentages.opt3).toBe(0);
  });

  it('returns undefined winner on a two-way symmetric tie', () => {
    const votes = [
      makeVote(['opt1', 'opt2'], 'u1'),
      makeVote(['opt2', 'opt1'], 'u2'),
    ];
    const result = calculateRankedChoice(votes, ['opt1', 'opt2']);
    expect(result.winner).toBeUndefined();
    expect(result.roundInfo?.round).toBe(1);
    expect(result.totals).toEqual({ opt1: 1, opt2: 1 });
    expect(result.percentages).toEqual({ opt1: 50, opt2: 50 });
  });

  it('returns undefined winner on a three-way symmetric Condorcet cycle tie', () => {
    const votes = [
      makeVote(['opt1', 'opt2', 'opt3'], 'u1'),
      makeVote(['opt2', 'opt3', 'opt1'], 'u2'),
      makeVote(['opt3', 'opt1', 'opt2'], 'u3'),
    ];
    const result = calculateRankedChoice(votes, OPTIONS);
    expect(result.winner).toBeUndefined();
    expect(result.roundInfo?.round).toBe(1);
    expect(result.totals).toEqual({ opt1: 1, opt2: 1, opt3: 1 });
  });

  it('produces 100% deterministic results across repeated calls with tied bottom candidates', () => {
    // opt1: 2, opt2: 1, opt3: 1 — opt2 and opt3 have identical first-choice & Borda scores
    const votes = [
      makeVote(['opt1'], 'u1'),
      makeVote(['opt1'], 'u2'),
      makeVote(['opt2', 'opt1'], 'u3'),
      makeVote(['opt3', 'opt1'], 'u4'),
    ];
    const baseline = calculateRankedChoice(votes, OPTIONS);
    expect(baseline.winner).toBe('opt1');
    expect(baseline.roundInfo?.round).toBe(2);
    for (let i = 0; i < 20; i++) {
      expect(calculateRankedChoice(votes, OPTIONS)).toEqual(baseline);
    }
  });

  it('handles exhausted ballots when computing active majority and percentages', () => {
    // Round 1: opt1=3, opt2=2, opt3=1 (6 active, no strict majority) → opt3 eliminated
    // Round 2: u6 is exhausted → opt1=3, opt2=2 (5 active) → opt1 wins with 3/5 = 60%
    const votes = [
      makeVote(['opt1'], 'u1'),
      makeVote(['opt1'], 'u2'),
      makeVote(['opt1'], 'u3'),
      makeVote(['opt2'], 'u4'),
      makeVote(['opt2'], 'u5'),
      makeVote(['opt3'], 'u6'),
    ];
    const result = calculateRankedChoice(votes, OPTIONS);
    expect(result.winner).toBe('opt1');
    expect(result.roundInfo?.round).toBe(2);
    expect(result.totals).toEqual({ opt1: 3, opt2: 2, opt3: 0 });
    expect(result.percentages).toEqual({ opt1: 60, opt2: 40, opt3: 0 });
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

  it('ignores prototype property keys and unknown options in rankings', () => {
    const allInvalid = calculateRankedChoice(
      [makeVote(['toString', 'constructor', '__proto__', 'unknown'], 'u1')],
      OPTIONS
    );
    expect(allInvalid.totals).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
    expect(allInvalid.percentages).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
    expect(allInvalid.winner).toBeUndefined();
    expect(allInvalid.roundInfo).toBeUndefined();

    const mixed = calculateRankedChoice(
      [makeVote(['toString', 'constructor', 'opt2'], 'u1')],
      OPTIONS
    );
    expect(mixed.winner).toBe('opt2');
    expect(mixed.totals).toEqual({ opt1: 0, opt2: 1, opt3: 0 });
    expect(mixed.percentages).toEqual({ opt1: 0, opt2: 100, opt3: 0 });
  });

  it('deduplicates repeated options within a ballot before Borda tie-breaking', () => {
    // If u3 duplicated opt3, it should NOT inflate opt3's Borda score
    const votes = [
      makeVote(['opt1', 'opt2', 'opt3'], 'u1'),
      makeVote(['opt2', 'opt1', 'opt3'], 'u2'),
      makeVote(['opt3', 'opt3', 'opt3', 'opt1', 'opt2'], 'u3'),
    ];
    const result = calculateRankedChoice(votes, OPTIONS);
    expect(result.winner).toBe('opt1');
    expect(result.roundInfo?.round).toBe(2);
  });

  it('ignores votes with wrong selection type', () => {
    const vote: Vote = {
      id: 'v1', userId: 'u1', userName: 'u1', timestamp: Date.now(),
      selection: { type: 'single', optionId: 'opt1' },
    };
    const result = calculateRankedChoice([vote], OPTIONS);
    expect(result.method).toBe('ranked');
    expect(result.totals).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
    expect(result.winner).toBeUndefined();
    expect(result.roundInfo).toBeUndefined();
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
