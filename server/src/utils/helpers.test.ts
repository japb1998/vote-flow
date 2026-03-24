import { describe, it, expect } from 'vitest';
import {
  generateSessionId,
  isValidVotingMethod,
  sanitizeInput,
  sanitizeOptionName,
  sanitizeOptionDescription,
  validateSessionPayload,
  canCreateSession,
  canJoinSession,
} from './helpers';

describe('generateSessionId', () => {
  it('generates a 6-character string', () => {
    const id = generateSessionId();
    expect(id).toHaveLength(6);
  });

  it('only contains valid characters (no ambiguous chars)', () => {
    for (let i = 0; i < 50; i++) {
      const id = generateSessionId();
      expect(id).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
      // Excluded ambiguous chars: I, O, 0, 1 (L is valid in this charset)
      expect(id).not.toMatch(/[IO01]/);
    }
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateSessionId()));
    expect(ids.size).toBe(100);
  });
});

describe('isValidVotingMethod', () => {
  it('returns true for valid methods', () => {
    expect(isValidVotingMethod('single')).toBe(true);
    expect(isValidVotingMethod('approval')).toBe(true);
    expect(isValidVotingMethod('ranked')).toBe(true);
    expect(isValidVotingMethod('score')).toBe(true);
  });

  it('returns false for invalid methods', () => {
    expect(isValidVotingMethod('invalid')).toBe(false);
    expect(isValidVotingMethod('')).toBe(false);
    expect(isValidVotingMethod('SINGLE')).toBe(false);
    expect(isValidVotingMethod('plurality')).toBe(false);
    expect(isValidVotingMethod('range')).toBe(false);
  });
});

describe('sanitizeInput', () => {
  it('removes < and > characters', () => {
    expect(sanitizeInput('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
  });

  it('trims whitespace', () => {
    expect(sanitizeInput('  hello world  ')).toBe('hello world');
  });

  it('truncates to 200 characters', () => {
    const long = 'a'.repeat(300);
    expect(sanitizeInput(long)).toHaveLength(200);
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeInput(null as unknown as string)).toBe('');
    expect(sanitizeInput(undefined as unknown as string)).toBe('');
    expect(sanitizeInput(123 as unknown as string)).toBe('');
  });

  it('handles normal input unchanged', () => {
    expect(sanitizeInput('Hello, World!')).toBe('Hello, World!');
  });

  it('handles empty string', () => {
    expect(sanitizeInput('')).toBe('');
  });
});

describe('sanitizeOptionName', () => {
  it('removes < and > characters', () => {
    expect(sanitizeOptionName('<Option>')).toBe('Option');
  });

  it('trims whitespace', () => {
    expect(sanitizeOptionName('  Option A  ')).toBe('Option A');
  });

  it('truncates to 100 characters', () => {
    const long = 'x'.repeat(150);
    expect(sanitizeOptionName(long)).toHaveLength(100);
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeOptionName(null as unknown as string)).toBe('');
  });
});

describe('sanitizeOptionDescription', () => {
  it('removes < and > characters', () => {
    expect(sanitizeOptionDescription('<b>bold</b>')).toBe('bbold/b');
  });

  it('trims whitespace', () => {
    expect(sanitizeOptionDescription('  A good choice  ')).toBe('A good choice');
  });

  it('truncates to 200 characters', () => {
    const long = 'y'.repeat(300);
    const result = sanitizeOptionDescription(long);
    expect(result).toHaveLength(200);
  });

  it('returns undefined for undefined input', () => {
    expect(sanitizeOptionDescription(undefined)).toBeUndefined();
  });

  it('returns undefined for empty string after sanitization', () => {
    expect(sanitizeOptionDescription('')).toBeUndefined();
    expect(sanitizeOptionDescription('   ')).toBeUndefined();
  });

  it('returns undefined for non-string input', () => {
    expect(sanitizeOptionDescription(null as unknown as string)).toBeUndefined();
  });
});

describe('validateSessionPayload', () => {
  const validPayload = {
    title: 'My Poll',
    votingMethod: 'single',
    options: [{ name: 'Option A' }, { name: 'Option B' }],
  };

  it('returns valid for a correct payload', () => {
    expect(validateSessionPayload(validPayload)).toEqual({ valid: true });
  });

  it('returns invalid for null payload', () => {
    const result = validateSessionPayload(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid payload');
  });

  it('returns invalid for non-object payload', () => {
    expect(validateSessionPayload('string')).toEqual({ valid: false, error: 'Invalid payload' });
    expect(validateSessionPayload(42)).toEqual({ valid: false, error: 'Invalid payload' });
  });

  it('returns invalid for missing title', () => {
    const result = validateSessionPayload({ ...validPayload, title: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Session title is required');
  });

  it('returns invalid for whitespace-only title', () => {
    const result = validateSessionPayload({ ...validPayload, title: '   ' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Session title is required');
  });

  it('returns invalid for non-string title', () => {
    const result = validateSessionPayload({ ...validPayload, title: 123 });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Session title is required');
  });

  it('returns invalid for invalid voting method', () => {
    const result = validateSessionPayload({ ...validPayload, votingMethod: 'plurality' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid voting method');
  });

  it('returns invalid for fewer than 2 options', () => {
    const result = validateSessionPayload({ ...validPayload, options: [{ name: 'Only One' }] });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('At least 2 options are required');
  });

  it('returns invalid for empty options array', () => {
    const result = validateSessionPayload({ ...validPayload, options: [] });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('At least 2 options are required');
  });

  it('returns invalid for more than 20 options', () => {
    const options = Array.from({ length: 21 }, (_, i) => ({ name: `Option ${i}` }));
    const result = validateSessionPayload({ ...validPayload, options });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Maximum 20 options allowed');
  });

  it('accepts exactly 20 options', () => {
    const options = Array.from({ length: 20 }, (_, i) => ({ name: `Option ${i}` }));
    const result = validateSessionPayload({ ...validPayload, options });
    expect(result.valid).toBe(true);
  });

  it('returns invalid when an option has empty name', () => {
    const result = validateSessionPayload({
      ...validPayload,
      options: [{ name: 'Option A' }, { name: '' }],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('All options must have a name');
  });

  it('returns invalid when an option has whitespace-only name', () => {
    const result = validateSessionPayload({
      ...validPayload,
      options: [{ name: 'Option A' }, { name: '  ' }],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('All options must have a name');
  });

  it('accepts options with descriptions', () => {
    const result = validateSessionPayload({
      ...validPayload,
      options: [
        { name: 'Option A', description: 'First choice' },
        { name: 'Option B', description: 'Second choice' },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it('accepts all valid voting methods', () => {
    for (const method of ['single', 'approval', 'ranked', 'score']) {
      const result = validateSessionPayload({ ...validPayload, votingMethod: method });
      expect(result.valid).toBe(true);
    }
  });
});

describe('canCreateSession', () => {
  it('returns true when below max (100)', () => {
    expect(canCreateSession(0)).toBe(true);
    expect(canCreateSession(50)).toBe(true);
    expect(canCreateSession(99)).toBe(true);
  });

  it('returns false when at or above max (100)', () => {
    expect(canCreateSession(100)).toBe(false);
    expect(canCreateSession(101)).toBe(false);
  });
});

describe('canJoinSession', () => {
  it('returns true when below max (50)', () => {
    expect(canJoinSession(0)).toBe(true);
    expect(canJoinSession(25)).toBe(true);
    expect(canJoinSession(49)).toBe(true);
  });

  it('returns false when at or above max (50)', () => {
    expect(canJoinSession(50)).toBe(false);
    expect(canJoinSession(51)).toBe(false);
  });
});
