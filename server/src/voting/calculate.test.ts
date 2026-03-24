import { describe, it, expect } from 'vitest';
import { calculateResults } from './calculate';
import { Vote, VotingMethod } from '../types';

// Helpers to build test votes
function makeSingleVote(id: string, userId: string, optionId: string): Vote {
  return {
    id,
    userId,
    userName: `User ${userId}`,
    selection: { type: 'single', optionId },
    timestamp: Date.now(),
  };
}

function makeApprovalVote(id: string, userId: string, optionIds: string[]): Vote {
  return {
    id,
    userId,
    userName: `User ${userId}`,
    selection: { type: 'approval', optionIds },
    timestamp: Date.now(),
  };
}

function makeRankedVote(id: string, userId: string, rankings: string[]): Vote {
  return {
    id,
    userId,
    userName: `User ${userId}`,
    selection: { type: 'ranked', rankings },
    timestamp: Date.now(),
  };
}

function makeScoreVote(id: string, userId: string, scores: Record<string, number>): Vote {
  return {
    id,
    userId,
    userName: `User ${userId}`,
    selection: { type: 'score', scores },
    timestamp: Date.now(),
  };
}

// ─── Single Choice ────────────────────────────────────────────────────────────
describe('calculateResults - single choice', () => {
  const options = ['opt1', 'opt2', 'opt3'];

  it('returns zero totals with no votes', () => {
    const result = calculateResults([], options, 'single');
    expect(result.method).toBe('single');
    expect(result.totals).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
    expect(result.percentages).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
    expect(result.winner).toBeUndefined();
  });

  it('counts votes correctly', () => {
    const votes = [
      makeSingleVote('v1', 'u1', 'opt1'),
      makeSingleVote('v2', 'u2', 'opt1'),
      makeSingleVote('v3', 'u3', 'opt2'),
    ];
    const result = calculateResults(votes, options, 'single');
    expect(result.totals.opt1).toBe(2);
    expect(result.totals.opt2).toBe(1);
    expect(result.totals.opt3).toBe(0);
  });

  it('sets winner when option has > 50% of votes', () => {
    const votes = [
      makeSingleVote('v1', 'u1', 'opt1'),
      makeSingleVote('v2', 'u2', 'opt1'),
      makeSingleVote('v3', 'u3', 'opt2'),
    ];
    const result = calculateResults(votes, options, 'single');
    // opt1 has 2/3 ≈ 66.7% > 50%
    expect(result.winner).toBe('opt1');
  });

  it('does NOT set winner when no option exceeds 50%', () => {
    const votes = [
      makeSingleVote('v1', 'u1', 'opt1'),
      makeSingleVote('v2', 'u2', 'opt2'),
      makeSingleVote('v3', 'u3', 'opt3'),
    ];
    const result = calculateResults(votes, options, 'single');
    // Each option has 33.3% — no majority
    expect(result.winner).toBeUndefined();
  });

  it('does NOT set winner at exactly 50%', () => {
    const twoOpts = ['opt1', 'opt2'];
    const votes = [
      makeSingleVote('v1', 'u1', 'opt1'),
      makeSingleVote('v2', 'u2', 'opt2'),
    ];
    const result = calculateResults(votes, twoOpts, 'single');
    // Each has exactly 50% — tie, no winner
    expect(result.winner).toBeUndefined();
  });

  it('calculates percentages correctly', () => {
    const votes = [
      makeSingleVote('v1', 'u1', 'opt1'),
      makeSingleVote('v2', 'u2', 'opt1'),
      makeSingleVote('v3', 'u3', 'opt2'),
      makeSingleVote('v4', 'u4', 'opt2'),
    ];
    const twoOpts = ['opt1', 'opt2'];
    const result = calculateResults(votes, twoOpts, 'single');
    expect(result.percentages.opt1).toBe(50);
    expect(result.percentages.opt2).toBe(50);
  });

  it('ignores votes for options not in the list', () => {
    const votes = [
      makeSingleVote('v1', 'u1', 'unknown-option'),
      makeSingleVote('v2', 'u2', 'opt1'),
    ];
    const result = calculateResults(votes, options, 'single');
    expect(result.totals.opt1).toBe(1);
    // The unknown vote still counts towards totalVotes (votes.length)
    // opt1 has 1/2 = 50% — no majority winner
    expect(result.winner).toBeUndefined();
  });

  it('sets winner with overwhelming majority', () => {
    const votes = [
      makeSingleVote('v1', 'u1', 'opt1'),
      makeSingleVote('v2', 'u2', 'opt1'),
      makeSingleVote('v3', 'u3', 'opt1'),
    ];
    const result = calculateResults(votes, options, 'single');
    expect(result.winner).toBe('opt1');
  });
});

// ─── Approval Voting ─────────────────────────────────────────────────────────
describe('calculateResults - approval', () => {
  const options = ['opt1', 'opt2', 'opt3'];

  it('returns zero totals with no votes', () => {
    const result = calculateResults([], options, 'approval');
    expect(result.method).toBe('approval');
    expect(result.totals).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
    expect(result.winner).toBeUndefined();
  });

  it('counts approvals correctly (multi-selection)', () => {
    const votes = [
      makeApprovalVote('v1', 'u1', ['opt1', 'opt2']),
      makeApprovalVote('v2', 'u2', ['opt1', 'opt3']),
      makeApprovalVote('v3', 'u3', ['opt2']),
    ];
    const result = calculateResults(votes, options, 'approval');
    expect(result.totals.opt1).toBe(2);
    expect(result.totals.opt2).toBe(2);
    expect(result.totals.opt3).toBe(1);
  });

  it('selects winner with highest approval count', () => {
    const votes = [
      makeApprovalVote('v1', 'u1', ['opt1', 'opt2']),
      makeApprovalVote('v2', 'u2', ['opt1']),
      makeApprovalVote('v3', 'u3', ['opt1']),
    ];
    const result = calculateResults(votes, options, 'approval');
    expect(result.winner).toBe('opt1');
  });

  it('calculates percentages relative to total voters', () => {
    const votes = [
      makeApprovalVote('v1', 'u1', ['opt1', 'opt2']),
      makeApprovalVote('v2', 'u2', ['opt1']),
    ];
    const twoOpts = ['opt1', 'opt2'];
    const result = calculateResults(votes, twoOpts, 'approval');
    // opt1 approved by 2/2 voters = 100%
    // opt2 approved by 1/2 voters = 50%
    expect(result.percentages.opt1).toBe(100);
    expect(result.percentages.opt2).toBe(50);
  });

  it('ignores approvals for unknown options', () => {
    const votes = [
      makeApprovalVote('v1', 'u1', ['opt1', 'unknown']),
    ];
    const result = calculateResults(votes, options, 'approval');
    expect(result.totals.opt1).toBe(1);
  });
});

// ─── Ranked Choice ───────────────────────────────────────────────────────────
describe('calculateResults - ranked choice', () => {
  const options = ['opt1', 'opt2', 'opt3'];

  it('returns empty result with no votes', () => {
    const result = calculateResults([], options, 'ranked');
    expect(result.method).toBe('ranked');
    expect(result.totals).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
  });

  it('declares winner immediately when option gets majority first-place votes', () => {
    // opt1 gets 3 first-place, opt2 gets 1, opt3 gets 1 — 3/5 = 60% > 50%
    const votes = [
      makeRankedVote('v1', 'u1', ['opt1', 'opt2', 'opt3']),
      makeRankedVote('v2', 'u2', ['opt1', 'opt2', 'opt3']),
      makeRankedVote('v3', 'u3', ['opt1', 'opt3', 'opt2']),
      makeRankedVote('v4', 'u4', ['opt2', 'opt1', 'opt3']),
      makeRankedVote('v5', 'u5', ['opt3', 'opt1', 'opt2']),
    ];
    const result = calculateResults(votes, options, 'ranked');
    expect(result.winner).toBe('opt1');
    expect(result.roundInfo?.round).toBe(1);
  });

  it('eliminates lowest and redistributes until majority', () => {
    // Round 1: opt1=2, opt2=2, opt3=1 → opt3 eliminated
    // Round 2: opt1=3, opt2=2 → opt1 wins (3/5=60% > 50%)
    const votes = [
      makeRankedVote('v1', 'u1', ['opt1', 'opt2', 'opt3']),
      makeRankedVote('v2', 'u2', ['opt1', 'opt2', 'opt3']),
      makeRankedVote('v3', 'u3', ['opt2', 'opt1', 'opt3']),
      makeRankedVote('v4', 'u4', ['opt2', 'opt1', 'opt3']),
      makeRankedVote('v5', 'u5', ['opt3', 'opt1', 'opt2']),
    ];
    const result = calculateResults(votes, options, 'ranked');
    expect(result.winner).toBe('opt1');
  });

  it('sets roundInfo with elimination details during runoff', () => {
    const votes = [
      makeRankedVote('v1', 'u1', ['opt1', 'opt2', 'opt3']),
      makeRankedVote('v2', 'u2', ['opt2', 'opt1', 'opt3']),
      makeRankedVote('v3', 'u3', ['opt3', 'opt1', 'opt2']),
    ];
    // 3 votes, each option gets 1 first place (33%) — all tied, pick winner from tied
    const result = calculateResults(votes, options, 'ranked');
    expect(result.roundInfo).toBeDefined();
    expect(result.roundInfo?.round).toBeGreaterThanOrEqual(1);
  });

  it('handles complete tie among all options', () => {
    const votes = [
      makeRankedVote('v1', 'u1', ['opt1', 'opt2']),
      makeRankedVote('v2', 'u2', ['opt2', 'opt1']),
    ];
    const twoOpts = ['opt1', 'opt2'];
    const result = calculateResults(votes, twoOpts, 'ranked');
    // Each gets 1 vote = 50%, no majority but all tied => picks winner
    expect(result.winner).toBeDefined();
  });

  it('skips eliminated options when counting second choices', () => {
    // opt3 eliminated first; voter who ranked opt3 first should have opt1 redistributed
    const votes = [
      makeRankedVote('v1', 'u1', ['opt1', 'opt2', 'opt3']),
      makeRankedVote('v2', 'u2', ['opt1', 'opt2', 'opt3']),
      makeRankedVote('v3', 'u3', ['opt2', 'opt1', 'opt3']),
      makeRankedVote('v4', 'u4', ['opt3', 'opt2', 'opt1']),
    ];
    const result = calculateResults(votes, options, 'ranked');
    // opt1: 2, opt2: 1, opt3: 1 → opt3 eliminated → opt4's vote goes to opt2
    // opt1: 2, opt2: 2 → all tied, pick from tied
    expect(result.winner).toBeDefined();
  });
});

// ─── Score Voting ─────────────────────────────────────────────────────────────
describe('calculateResults - score', () => {
  const options = ['opt1', 'opt2', 'opt3'];

  it('returns zero averages with no votes', () => {
    const result = calculateResults([], options, 'score');
    expect(result.method).toBe('score');
    expect(result.totals).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
    expect(result.averageScores).toEqual({ opt1: 0, opt2: 0, opt3: 0 });
    expect(result.winner).toBeUndefined();
  });

  it('calculates totals correctly', () => {
    const votes = [
      makeScoreVote('v1', 'u1', { opt1: 5, opt2: 3, opt3: 1 }),
      makeScoreVote('v2', 'u2', { opt1: 4, opt2: 2, opt3: 2 }),
    ];
    const result = calculateResults(votes, options, 'score');
    expect(result.totals.opt1).toBe(9);
    expect(result.totals.opt2).toBe(5);
    expect(result.totals.opt3).toBe(3);
  });

  it('calculates average scores correctly', () => {
    const votes = [
      makeScoreVote('v1', 'u1', { opt1: 5, opt2: 3, opt3: 1 }),
      makeScoreVote('v2', 'u2', { opt1: 3, opt2: 5, opt3: 3 }),
    ];
    const result = calculateResults(votes, options, 'score');
    expect(result.averageScores?.opt1).toBe(4);
    expect(result.averageScores?.opt2).toBe(4);
    expect(result.averageScores?.opt3).toBe(2);
  });

  it('selects winner with highest average score', () => {
    const votes = [
      makeScoreVote('v1', 'u1', { opt1: 5, opt2: 2, opt3: 1 }),
      makeScoreVote('v2', 'u2', { opt1: 4, opt2: 3, opt3: 2 }),
    ];
    const result = calculateResults(votes, options, 'score');
    expect(result.winner).toBe('opt1');
  });

  it('calculates percentages relative to max possible score (votes * 5)', () => {
    const votes = [
      makeScoreVote('v1', 'u1', { opt1: 5, opt2: 0 }),
      makeScoreVote('v2', 'u2', { opt1: 5, opt2: 0 }),
    ];
    const twoOpts = ['opt1', 'opt2'];
    const result = calculateResults(votes, twoOpts, 'score');
    // max = 2 votes * 5 = 10. opt1 total = 10, percentage = 100%
    expect(result.percentages.opt1).toBe(100);
    expect(result.percentages.opt2).toBe(0);
  });

  it('handles a single vote with score 0 for all', () => {
    const votes = [makeScoreVote('v1', 'u1', { opt1: 0, opt2: 0 })];
    const twoOpts = ['opt1', 'opt2'];
    const result = calculateResults(votes, twoOpts, 'score');
    expect(result.averageScores?.opt1).toBe(0);
    expect(result.averageScores?.opt2).toBe(0);
    // winner is the first with max avg >= 0, so opt1 (first evaluated)
    expect(result.winner).toBe('opt1');
  });

  it('ignores scores for unknown options', () => {
    const votes = [
      makeScoreVote('v1', 'u1', { opt1: 5, unknown: 5 }),
    ];
    const result = calculateResults(votes, options, 'score');
    expect(result.totals.opt1).toBe(5);
    // 'unknown' is not in options, averageScores won't have it
    expect(result.averageScores?.['unknown']).toBeUndefined();
  });
});

// ─── Default / Unknown Method ─────────────────────────────────────────────────
describe('calculateResults - unknown method', () => {
  it('returns empty result for unknown method', () => {
    const result = calculateResults([], ['opt1'], 'unknown' as VotingMethod);
    expect(result.method).toBe('unknown');
    expect(result.totals).toEqual({});
    expect(result.percentages).toEqual({});
    expect(result.winner).toBeUndefined();
  });
});
