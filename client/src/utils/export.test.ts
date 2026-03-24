import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportToJson, exportToCsv, downloadFile } from './export';
import { Session, Results } from '../types';

const baseSession: Session = {
  id: 'ABC123',
  title: 'Test Poll',
  createdAt: 1700000000000,
  status: 'active',
  votingMethod: 'single',
  options: [
    { id: 'opt1', name: 'Option A', description: 'First choice' },
    { id: 'opt2', name: 'Option B' },
  ],
  votes: [
    {
      id: 'v1',
      userId: 'u1',
      userName: 'Alice',
      selection: { type: 'single', optionId: 'opt1' },
      timestamp: 1700000010000,
    },
    {
      id: 'v2',
      userId: 'u2',
      userName: 'Bob',
      selection: { type: 'single', optionId: 'opt2' },
      timestamp: 1700000020000,
    },
  ],
  creatorId: 'u1',
};

const baseResults: Results = {
  method: 'single',
  totals: { opt1: 1, opt2: 1 },
  percentages: { opt1: 50, opt2: 50 },
  winner: undefined,
};

// ─── exportToJson ─────────────────────────────────────────────────────────────
describe('exportToJson', () => {
  it('returns valid JSON string', () => {
    const json = exportToJson(baseSession, baseResults);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes session metadata', () => {
    const data = JSON.parse(exportToJson(baseSession, baseResults));
    expect(data.session.id).toBe('ABC123');
    expect(data.session.title).toBe('Test Poll');
    expect(data.session.votingMethod).toBe('single');
    expect(data.session.status).toBe('active');
    expect(data.session.createdAt).toBe(1700000000000);
  });

  it('includes options', () => {
    const data = JSON.parse(exportToJson(baseSession, baseResults));
    expect(data.options).toHaveLength(2);
    expect(data.options[0].id).toBe('opt1');
    expect(data.options[0].name).toBe('Option A');
  });

  it('includes results totals, percentages, winner', () => {
    const resultsWithWinner = { ...baseResults, winner: 'opt1' };
    const data = JSON.parse(exportToJson(baseSession, resultsWithWinner));
    expect(data.results.totals).toEqual({ opt1: 1, opt2: 1 });
    expect(data.results.percentages).toEqual({ opt1: 50, opt2: 50 });
    expect(data.results.winner).toBe('opt1');
  });

  it('includes votes with userId, userName, selection, timestamp', () => {
    const data = JSON.parse(exportToJson(baseSession, baseResults));
    expect(data.votes).toHaveLength(2);
    expect(data.votes[0].userId).toBe('u1');
    expect(data.votes[0].userName).toBe('Alice');
    expect(data.votes[0].selection).toEqual({ type: 'single', optionId: 'opt1' });
    expect(data.votes[0].timestamp).toBe(1700000010000);
  });

  it('does not include vote id in exported votes', () => {
    const data = JSON.parse(exportToJson(baseSession, baseResults));
    expect(data.votes[0].id).toBeUndefined();
  });

  it('includes exportedAt timestamp', () => {
    const data = JSON.parse(exportToJson(baseSession, baseResults));
    expect(data.exportedAt).toBeDefined();
    expect(new Date(data.exportedAt).getTime()).not.toBeNaN();
  });

  it('includes averageScores when present', () => {
    const results: Results = {
      ...baseResults,
      method: 'score',
      averageScores: { opt1: 4.5, opt2: 3.2 },
    };
    const data = JSON.parse(exportToJson(baseSession, results));
    expect(data.results.averageScores).toEqual({ opt1: 4.5, opt2: 3.2 });
  });

  it('includes roundInfo when present', () => {
    const results: Results = {
      ...baseResults,
      method: 'ranked',
      roundInfo: { round: 2, eliminated: 'opt2', counts: { opt1: 3, opt2: 1 } },
    };
    const data = JSON.parse(exportToJson(baseSession, results));
    expect(data.results.roundInfo).toEqual({ round: 2, eliminated: 'opt2', counts: { opt1: 3, opt2: 1 } });
  });

  it('handles session with no votes', () => {
    const emptySession = { ...baseSession, votes: [] };
    const data = JSON.parse(exportToJson(emptySession, baseResults));
    expect(data.votes).toEqual([]);
  });
});

// ─── exportToCsv ─────────────────────────────────────────────────────────────
describe('exportToCsv', () => {
  it('returns a non-empty string', () => {
    const csv = exportToCsv(baseSession, baseResults);
    expect(typeof csv).toBe('string');
    expect(csv.length).toBeGreaterThan(0);
  });

  it('includes session header info', () => {
    const csv = exportToCsv(baseSession, baseResults);
    expect(csv).toContain('Test Poll');
    expect(csv).toContain('ABC123');
    expect(csv).toContain('single');
    expect(csv).toContain('active');
  });

  it('includes results table header', () => {
    const csv = exportToCsv(baseSession, baseResults);
    expect(csv).toContain('Option,Votes,Percentage,Winner');
  });

  it('includes option rows in results table', () => {
    const csv = exportToCsv(baseSession, baseResults);
    expect(csv).toContain('"Option A"');
    expect(csv).toContain('"Option B"');
  });

  it('marks winner correctly', () => {
    const resultsWithWinner = { ...baseResults, winner: 'opt1' };
    const csv = exportToCsv(baseSession, resultsWithWinner);
    // Option A row should have Yes for winner
    const lines = csv.split('\n');
    const optionALine = lines.find(l => l.includes('"Option A"'))!;
    expect(optionALine).toContain('Yes');
    const optionBLine = lines.find(l => l.includes('"Option B"'))!;
    expect(optionBLine).toContain('No');
  });

  it('includes votes table', () => {
    const csv = exportToCsv(baseSession, baseResults);
    expect(csv).toContain('Votes');
    expect(csv).toContain('User,Vote,Timestamp');
    expect(csv).toContain('Alice');
    expect(csv).toContain('Bob');
  });

  it('formats single-choice vote as option name', () => {
    const csv = exportToCsv(baseSession, baseResults);
    expect(csv).toContain('Option A'); // Alice voted for opt1 = Option A
  });

  it('formats approval vote as semicolon-separated names', () => {
    const session: Session = {
      ...baseSession,
      votingMethod: 'approval',
      votes: [{
        id: 'v1',
        userId: 'u1',
        userName: 'Alice',
        selection: { type: 'approval', optionIds: ['opt1', 'opt2'] },
        timestamp: 1700000010000,
      }],
    };
    const csv = exportToCsv(session, baseResults);
    expect(csv).toContain('Option A; Option B');
  });

  it('formats ranked vote as numbered list', () => {
    const session: Session = {
      ...baseSession,
      votingMethod: 'ranked',
      votes: [{
        id: 'v1',
        userId: 'u1',
        userName: 'Alice',
        selection: { type: 'ranked', rankings: ['opt1', 'opt2'] },
        timestamp: 1700000010000,
      }],
    };
    const csv = exportToCsv(session, baseResults);
    expect(csv).toContain('1. Option A; 2. Option B');
  });

  it('formats score vote as name: score pairs', () => {
    const session: Session = {
      ...baseSession,
      votingMethod: 'score',
      votes: [{
        id: 'v1',
        userId: 'u1',
        userName: 'Alice',
        selection: { type: 'score', scores: { opt1: 5, opt2: 3 } },
        timestamp: 1700000010000,
      }],
    };
    const csv = exportToCsv(session, baseResults);
    expect(csv).toContain('Option A: 5');
    expect(csv).toContain('Option B: 3');
  });

  it('includes average scores section when averageScores present', () => {
    const results: Results = {
      ...baseResults,
      method: 'score',
      averageScores: { opt1: 4.5, opt2: 3.0 },
    };
    const csv = exportToCsv(baseSession, results);
    expect(csv).toContain('Average Scores');
    expect(csv).toContain('Option,Average Score');
    expect(csv).toContain('4.50');
    expect(csv).toContain('3.00');
  });

  it('does not include average scores section when not present', () => {
    const csv = exportToCsv(baseSession, baseResults);
    expect(csv).not.toContain('Average Scores');
  });
});

// ─── downloadFile ─────────────────────────────────────────────────────────────
describe('downloadFile', () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURLMock = vi.fn(() => 'blob:test-url');
    revokeObjectURLMock = vi.fn();
    Object.defineProperty(globalThis, 'URL', {
      value: { createObjectURL: createObjectURLMock, revokeObjectURL: revokeObjectURLMock },
      writable: true,
    });

    clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    appendChildSpy = vi.spyOn(document.body, 'appendChild');
    removeChildSpy = vi.spyOn(document.body, 'removeChild');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an object URL and triggers download', () => {
    downloadFile('content', 'test.json', 'application/json');
    expect(createObjectURLMock).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('appends and removes the link element', () => {
    downloadFile('content', 'test.json', 'application/json');
    expect(appendChildSpy).toHaveBeenCalledOnce();
    expect(removeChildSpy).toHaveBeenCalledOnce();
  });

  it('revokes the object URL after download', () => {
    downloadFile('content', 'test.json', 'application/json');
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:test-url');
  });
});
