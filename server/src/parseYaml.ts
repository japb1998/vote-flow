import yaml from 'js-yaml';

export interface ParsedOption {
  name: string;
  description: string;
}

export interface ParsedSession {
  title?: string;
  votingMethod?: string;
  options: ParsedOption[];
}

export type ParseResult =
  | { ok: true; options: ParsedOption[] }
  | { ok: false; error: string };

export type SessionParseResult =
  | { ok: true; session: ParsedSession }
  | { ok: false; error: string };

const VALID_METHODS = ['single', 'approval', 'ranked', 'score'];

function normalizeOptions(raw: unknown): ParsedOption[] | null {
  if (!Array.isArray(raw)) return null;

  const options: ParsedOption[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed) options.push({ name: trimmed, description: '' });
    } else if (item && typeof item === 'object' && 'name' in item) {
      const name = String((item as Record<string, unknown>).name).trim();
      const desc = String((item as Record<string, unknown>).description ?? '').trim();
      if (name) options.push({ name, description: desc });
    }
  }
  return options.length > 0 ? options : null;
}

/** Parse YAML as a list of options only. */
export function parseYAML(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'Empty input' };

  let data: unknown;
  try {
    data = yaml.load(trimmed);
  } catch (e) {
    return { ok: false, error: `Invalid YAML: ${(e as Error).message}` };
  }

  // Direct array
  if (Array.isArray(data)) {
    const options = normalizeOptions(data);
    if (!options) return { ok: false, error: 'No valid options found in YAML list' };
    return { ok: true, options };
  }

  // Object with options key
  if (data && typeof data === 'object' && 'options' in data) {
    const options = normalizeOptions((data as Record<string, unknown>).options);
    if (!options) return { ok: false, error: 'No valid options found in "options" field' };
    return { ok: true, options };
  }

  return { ok: false, error: 'Expected a YAML list (- item) or object with "options" key' };
}

/** Parse YAML as a full session (title + votingMethod + options). */
export function parseSessionYAML(input: string): SessionParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'Empty input' };

  let data: unknown;
  try {
    data = yaml.load(trimmed);
  } catch (e) {
    return { ok: false, error: `Invalid YAML: ${(e as Error).message}` };
  }

  // Plain array → options only
  if (Array.isArray(data)) {
    const options = normalizeOptions(data);
    if (!options) return { ok: false, error: 'No valid options found' };
    return { ok: true, session: { options } };
  }

  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Expected a YAML list or mapping' };
  }

  const obj = data as Record<string, unknown>;
  const title = typeof obj.title === 'string' ? obj.title.trim() || undefined : undefined;
  const votingMethod = typeof obj.votingMethod === 'string' ? obj.votingMethod.trim() || undefined : undefined;

  if (votingMethod && !VALID_METHODS.includes(votingMethod)) {
    return { ok: false, error: `Invalid votingMethod: "${votingMethod}". Use: ${VALID_METHODS.join(', ')}` };
  }

  const options = normalizeOptions(obj.options);
  if (!options) {
    // Maybe the whole thing is just a list format that yaml parsed as object
    return { ok: false, error: 'Missing or empty "options" list' };
  }

  return {
    ok: true,
    session: { title, votingMethod, options },
  };
}
