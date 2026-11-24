import crypto from 'crypto';
import { Session } from '../types';

export const VALID_VOTING_METHODS = ['single', 'approval', 'ranked', 'score', 'poker', 'dot', 'roman', 'fist-of-five'];

// Methods that don't require user-defined options (they use predefined selection values)
export const NO_OPTIONS_METHODS = ['poker', 'roman', 'fist-of-five'];
const MAX_TITLE_LENGTH = 200;
const MAX_OPTION_NAME_LENGTH = 100;
const MAX_OPTION_DESC_LENGTH = 200;
export const MAX_OPTIONS = 20;
const MAX_SESSIONS = 100;
const MAX_USERS_PER_SESSION = 50;

// Fibonacci sequence used for planning poker
export const FIBONACCI_SEQUENCE = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
const FIBONACCI_SET = new Set(FIBONACCI_SEQUENCE);

interface SessionPayload {
  title: string;
  votingMethod: string;
  options: { name: string; description?: string }[];
  config?: { pokerMin?: number; pokerMax?: number; dotsPerVoter?: number };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function generateSessionId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  const randomValues = new Uint8Array(6);
  crypto.randomFillSync(randomValues);
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(randomValues[i] % chars.length);
  }
  return result;
}

export function isValidVotingMethod(method: string): boolean {
  return VALID_VOTING_METHODS.includes(method);
}

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, MAX_TITLE_LENGTH);
}

export function sanitizeOptionName(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, MAX_OPTION_NAME_LENGTH);
}

export function sanitizeOptionDescription(input: string | undefined): string | undefined {
  if (!input || typeof input !== 'string') return undefined;
  const sanitized = input
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, MAX_OPTION_DESC_LENGTH);
  return sanitized || undefined;
}

export function validateSessionPayload(payload: unknown): { valid: boolean; error?: string } {
  if (!isPlainObject(payload)) {
    return { valid: false, error: 'Invalid payload' };
  }

  const p = payload as unknown as SessionPayload;
  const { title, votingMethod, options } = p;

  if (!title || typeof title !== 'string' || sanitizeInput(title).length === 0) {
    return { valid: false, error: 'Session title is required' };
  }

  if (typeof votingMethod !== 'string' || !isValidVotingMethod(votingMethod)) {
    return { valid: false, error: 'Invalid voting method' };
  }

  if (NO_OPTIONS_METHODS.includes(votingMethod)) {
    // These methods don't require user-defined options
  } else {
    if (!Array.isArray(options) || options.length < 2) {
      return { valid: false, error: 'At least 2 options are required' };
    }

    if (options.length > MAX_OPTIONS) {
      return { valid: false, error: `Maximum ${MAX_OPTIONS} options allowed` };
    }

    for (const opt of options) {
      if (!opt || typeof opt.name !== 'string' || sanitizeOptionName(opt.name).length === 0) {
        return { valid: false, error: 'All options must have a name' };
      }
    }
  }

  // Validate method-specific config
  const config = p.config;
  if (config !== undefined && config !== null) {
    if (!isPlainObject(config)) {
      return { valid: false, error: 'Invalid session config' };
    }
    if (votingMethod === 'poker') {
      const min = config.pokerMin;
      const max = config.pokerMax;
      if (min !== undefined && (typeof min !== 'number' || !FIBONACCI_SET.has(min))) {
        return { valid: false, error: 'Poker min must be a valid Fibonacci number' };
      }
      if (max !== undefined && (typeof max !== 'number' || !FIBONACCI_SET.has(max))) {
        return { valid: false, error: 'Poker max must be a valid Fibonacci number' };
      }
      if (min !== undefined && max !== undefined && min > max) {
        return { valid: false, error: 'Poker min must be less than or equal to max' };
      }
    }
    if (votingMethod === 'dot' && config.dotsPerVoter !== undefined) {
      if (typeof config.dotsPerVoter !== 'number' || !Number.isInteger(config.dotsPerVoter) || config.dotsPerVoter < 1 || config.dotsPerVoter > 10) {
        return { valid: false, error: 'Dots per voter must be between 1 and 10' };
      }
    }
  }

  return { valid: true };
}

/**
 * Strictly validates a vote selection payload against the session's voting method,
 * valid option IDs, and method-specific configuration.
 */
export function validateVoteSelection(selection: unknown, session: Session): { valid: boolean; error?: string } {
  if (!isPlainObject(selection)) {
    return { valid: false, error: 'Invalid vote selection' };
  }

  if (selection.type !== session.votingMethod) {
    return { valid: false, error: 'Selection type does not match session voting method' };
  }

  const validOptionIds = new Set(session.options.map(o => o.id));

  switch (session.votingMethod) {
    case 'single': {
      const { optionId } = selection;
      if (typeof optionId !== 'string' || !validOptionIds.has(optionId)) {
        return { valid: false, error: 'Invalid option selected' };
      }
      return { valid: true };
    }

    case 'approval': {
      const { optionIds } = selection;
      if (!Array.isArray(optionIds) || optionIds.length === 0) {
        return { valid: false, error: 'At least one option must be selected' };
      }
      const seen = new Set<string>();
      for (const id of optionIds) {
        if (typeof id !== 'string' || !validOptionIds.has(id)) {
          return { valid: false, error: 'Invalid option in approval selection' };
        }
        if (seen.has(id)) {
          return { valid: false, error: 'Duplicate options in approval selection' };
        }
        seen.add(id);
      }
      return { valid: true };
    }

    case 'ranked': {
      const { rankings } = selection;
      if (!Array.isArray(rankings) || rankings.length !== session.options.length) {
        return { valid: false, error: 'All options must be ranked' };
      }
      const seen = new Set<string>();
      for (const id of rankings) {
        if (typeof id !== 'string' || !validOptionIds.has(id)) {
          return { valid: false, error: 'Invalid option in rankings' };
        }
        if (seen.has(id)) {
          return { valid: false, error: 'Duplicate options in rankings' };
        }
        seen.add(id);
      }
      return { valid: true };
    }

    case 'score': {
      const { scores } = selection;
      if (!isPlainObject(scores)) {
        return { valid: false, error: 'Invalid scores object' };
      }
      for (const key of Object.keys(scores)) {
        if (!validOptionIds.has(key)) {
          return { valid: false, error: 'Unknown option in score selection' };
        }
      }
      for (const opt of session.options) {
        if (!Object.prototype.hasOwnProperty.call(scores, opt.id)) {
          return { valid: false, error: 'All options must be scored' };
        }
        const score = scores[opt.id];
        if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 5) {
          return { valid: false, error: 'Scores must be integers between 1 and 5' };
        }
      }
      return { valid: true };
    }

    case 'poker': {
      const { value } = selection;
      if (typeof value !== 'string') {
        return { valid: false, error: 'Invalid planning poker card value' };
      }
      const min = session.config?.pokerMin ?? FIBONACCI_SEQUENCE[0];
      const max = session.config?.pokerMax ?? FIBONACCI_SEQUENCE[FIBONACCI_SEQUENCE.length - 1];
      const allowedValues = FIBONACCI_SEQUENCE
        .filter(n => n >= min && n <= max)
        .map(String);
      if (!allowedValues.includes(value)) {
        return { valid: false, error: 'Planning poker card value is not allowed for this session' };
      }
      return { valid: true };
    }

    case 'dot': {
      const { allocations } = selection;
      if (!isPlainObject(allocations)) {
        return { valid: false, error: 'Invalid dot allocations object' };
      }
      const maxDots = session.config?.dotsPerVoter ?? 3;
      let total = 0;
      for (const key of Object.keys(allocations)) {
        if (!validOptionIds.has(key)) {
          return { valid: false, error: 'Unknown option in dot allocations' };
        }
        const count = allocations[key];
        if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
          return { valid: false, error: 'Dot allocations must be non-negative integers' };
        }
        if (count > maxDots || total + count > maxDots) {
          return { valid: false, error: `Total dots cannot exceed ${maxDots}` };
        }
        total += count;
      }
      if (total <= 0) {
        return { valid: false, error: 'At least one dot must be allocated' };
      }
      return { valid: true };
    }

    case 'roman': {
      const { vote } = selection;
      if (vote !== 'up' && vote !== 'down' && vote !== 'sideways') {
        return { valid: false, error: 'Invalid roman vote value' };
      }
      return { valid: true };
    }

    case 'fist-of-five': {
      const { value } = selection;
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) {
        return { valid: false, error: 'Fist of five value must be an integer between 1 and 5' };
      }
      return { valid: true };
    }

    default:
      return { valid: false, error: 'Unsupported voting method' };
  }
}

export function canCreateSession(currentSessions: number): boolean {
  return currentSessions < MAX_SESSIONS;
}

export function canJoinSession(currentUsers: number): boolean {
  return currentUsers < MAX_USERS_PER_SESSION;
}
