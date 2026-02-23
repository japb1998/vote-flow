import crypto from 'crypto';

const VALID_VOTING_METHODS = ['single', 'approval', 'ranked', 'score'];
const MAX_TITLE_LENGTH = 200;
const MAX_OPTION_NAME_LENGTH = 100;
const MAX_OPTION_DESC_LENGTH = 200;
const MAX_OPTIONS = 20;
const MAX_SESSIONS = 100;
const MAX_USERS_PER_SESSION = 50;

interface SessionPayload {
  title: string;
  votingMethod: string;
  options: { name: string; description?: string }[];
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
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Invalid payload' };
  }

  const p = payload as SessionPayload;
  const { title, votingMethod, options } = p;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return { valid: false, error: 'Session title is required' };
  }

  if (!isValidVotingMethod(votingMethod)) {
    return { valid: false, error: 'Invalid voting method' };
  }

  if (!Array.isArray(options) || options.length < 2) {
    return { valid: false, error: 'At least 2 options are required' };
  }

  if (options.length > MAX_OPTIONS) {
    return { valid: false, error: `Maximum ${MAX_OPTIONS} options allowed` };
  }

  for (const opt of options) {
    if (!opt || typeof opt.name !== 'string' || opt.name.trim().length === 0) {
      return { valid: false, error: 'All options must have a name' };
    }
  }

  return { valid: true };
}

export function canCreateSession(currentSessions: number): boolean {
  return currentSessions < MAX_SESSIONS;
}

export function canJoinSession(currentUsers: number): boolean {
  return currentUsers < MAX_USERS_PER_SESSION;
}
