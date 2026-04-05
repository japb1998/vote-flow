/**
 * Option parsers for multiple input formats.
 *
 * Supported formats:
 *   - Delimited text (comma, semicolon, newline) with backslash escaping
 *   - JSON (array of strings or array of {name, description} objects)
 *   - YAML (parsed server-side via js-yaml — POST /api/parse-yaml)
 *
 * Escaping rules for delimited text:
 *   \, → literal comma
 *   \; → literal semicolon
 *   \\ → literal backslash
 */

export interface ParsedOption {
  name: string;
  description: string;
}

/** Full session payload parsed from a file. */
export interface ParsedSession {
  title?: string;
  votingMethod?: string;
  options: ParsedOption[];
  config?: {
    pokerMin?: number;
    pokerMax?: number;
    dotsPerVoter?: number;
  };
}

export type ParseResult =
  | { ok: true; options: ParsedOption[] }
  | { ok: false; error: string };

export type SessionParseResult =
  | { ok: true; session: ParsedSession }
  | { ok: false; error: string };

export type InputFormat = 'text' | 'json' | 'yaml';

// ---------------------------------------------------------------------------
// Delimited text (comma, semicolon, or newline separated)
// ---------------------------------------------------------------------------

/**
 * Splits a string by a delimiter, respecting backslash escaping.
 *
 * Examples:
 *   "a, b, c"         → ["a", "b", "c"]
 *   "a\, b, c"        → ["a, b", "c"]
 *   "a\\, b"          → ["a\", "b"]
 *   "hello\;world; x" → (with ;) ["hello;world", "x"]
 */
function splitEscaped(input: string, delimiter: string): string[] {
  const results: string[] = [];
  let current = '';
  let i = 0;

  while (i < input.length) {
    // Backslash escape: check next char
    if (input[i] === '\\' && i + 1 < input.length) {
      const next = input[i + 1];
      if (next === delimiter || next === '\\') {
        current += next;
        i += 2;
        continue;
      }
    }

    if (input[i] === delimiter) {
      results.push(current);
      current = '';
      i++;
      continue;
    }

    current += input[i];
    i++;
  }

  results.push(current);
  return results;
}

/**
 * Auto-detects the delimiter in the input text.
 * Priority: newline > semicolon > comma
 * Only considers unescaped occurrences.
 */
function detectDelimiter(input: string): string {
  // If there are newlines with content, use newline
  const lines = input.split('\n').filter(l => l.trim());
  if (lines.length >= 2) return '\n';

  // Count unescaped semicolons and commas
  let semicolons = 0;
  let commas = 0;
  for (let i = 0; i < input.length; i++) {
    if (input[i] === '\\') { i++; continue; }
    if (input[i] === ';') semicolons++;
    if (input[i] === ',') commas++;
  }

  if (semicolons > 0) return ';';
  if (commas > 0) return ',';
  return '\n';
}

export function parseDelimitedText(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true, options: [] };

  const delimiter = detectDelimiter(trimmed);
  const parts = splitEscaped(trimmed, delimiter);
  const options = parts
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => ({ name: p, description: '' }));

  if (options.length === 0) {
    return { ok: false, error: 'No options found in text' };
  }

  return { ok: true, options };
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

/**
 * Accepts:
 *   ["Option A", "Option B"]
 *   [{"name": "Option A", "description": "desc"}, ...]
 *   {"options": [...]}   (unwraps the array)
 */
export function parseJSON(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'Empty input' };

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: 'Invalid JSON syntax' };
  }

  // Unwrap { options: [...] } wrapper
  if (data && typeof data === 'object' && !Array.isArray(data) && 'options' in data) {
    data = (data as Record<string, unknown>).options;
  }

  if (!Array.isArray(data)) {
    return { ok: false, error: 'Expected a JSON array of options' };
  }

  const options: ParsedOption[] = [];
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (typeof item === 'string') {
      if (item.trim()) options.push({ name: item.trim(), description: '' });
    } else if (item && typeof item === 'object' && 'name' in item) {
      const name = String((item as Record<string, unknown>).name).trim();
      const desc = String((item as Record<string, unknown>).description ?? '').trim();
      if (name) options.push({ name, description: desc });
    } else {
      return { ok: false, error: `Item ${i + 1} is not a string or {name, description} object` };
    }
  }

  if (options.length === 0) {
    return { ok: false, error: 'No valid options found in JSON' };
  }

  return { ok: true, options };
}

// ---------------------------------------------------------------------------
// YAML — parsed server-side via js-yaml (POST /api/parse-yaml)
// ---------------------------------------------------------------------------

/**
 * Calls the server endpoint to parse YAML using js-yaml.
 * This is the primary YAML parser — always async.
 */
export async function parseYAMLAsync(input: string): Promise<ParseResult> {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'Empty input' };

  try {
    const res = await fetch('/api/parse-yaml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: trimmed }),
    });
    return await res.json() as ParseResult;
  } catch {
    return { ok: false, error: 'Failed to reach server for YAML parsing' };
  }
}

/**
 * Parse a full session from YAML via the server endpoint.
 */
export async function parseSessionYAMLAsync(input: string): Promise<SessionParseResult> {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'Empty input' };

  try {
    const res = await fetch('/api/parse-yaml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: trimmed, mode: 'session' }),
    });
    return await res.json() as SessionParseResult;
  } catch {
    return { ok: false, error: 'Failed to reach server for YAML parsing' };
  }
}

// ---------------------------------------------------------------------------
// Auto-detect format
// ---------------------------------------------------------------------------

export function detectFormat(input: string): InputFormat {
  const trimmed = input.trim();
  if (!trimmed) return 'text';

  // JSON: starts with [ or {
  if (trimmed[0] === '[' || trimmed[0] === '{') return 'json';

  // YAML: lines start with "- " or contain "key: value" patterns
  const lines = trimmed.split('\n').filter(l => l.trim());
  const yamlLines = lines.filter(l => l.trim().startsWith('- '));
  if (yamlLines.length >= 2) return 'yaml';
  // Also detect top-level mapping keys like "title:", "options:"
  if (lines.some(l => /^(title|votingMethod|options):\s*/i.test(l))) return 'yaml';

  return 'text';
}

// ---------------------------------------------------------------------------
// Full session parsers (title + votingMethod + options from a single file)
// ---------------------------------------------------------------------------

const VALID_METHODS = ['single', 'approval', 'ranked', 'score', 'poker', 'dot', 'roman', 'fist-of-five'];

/**
 * Parse a full session from JSON.
 *
 * Accepted formats:
 *   {
 *     "title": "What to eat?",
 *     "votingMethod": "ranked",
 *     "options": ["Pizza", "Tacos"]
 *   }
 *
 * Options can be strings or {name, description} objects.
 * `title` and `votingMethod` are optional — the UI will use defaults.
 */
export function parseSessionJSON(input: string): SessionParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'Empty input' };

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: 'Invalid JSON syntax' };
  }

  // If it's a plain array, treat it as options only
  if (Array.isArray(data)) {
    const optResult = parseJSON(trimmed);
    if (!optResult.ok) return optResult;
    return { ok: true, session: { options: optResult.options } };
  }

  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Expected a JSON object or array' };
  }

  const obj = data as Record<string, unknown>;
  const title = typeof obj.title === 'string' ? obj.title.trim() : undefined;
  const method = typeof obj.votingMethod === 'string' ? obj.votingMethod.trim() : undefined;

  if (method && !VALID_METHODS.includes(method)) {
    return { ok: false, error: `Invalid votingMethod: "${method}". Use: ${VALID_METHODS.join(', ')}` };
  }

  // Parse options
  const optionsRaw = obj.options;
  if (!optionsRaw || !Array.isArray(optionsRaw)) {
    return { ok: false, error: 'Missing "options" array' };
  }

  const optResult = parseJSON(JSON.stringify(optionsRaw));
  if (!optResult.ok) return optResult;

  // Extract config if present
  let config: ParsedSession['config'];
  if (obj.config && typeof obj.config === 'object') {
    const c = obj.config as Record<string, unknown>;
    config = {};
    if (typeof c.pokerMin === 'number') config.pokerMin = c.pokerMin;
    if (typeof c.pokerMax === 'number') config.pokerMax = c.pokerMax;
    if (typeof c.dotsPerVoter === 'number') config.dotsPerVoter = c.dotsPerVoter;
  }

  return {
    ok: true,
    session: {
      title: title || undefined,
      votingMethod: method || undefined,
      options: optResult.options,
      config,
    },
  };
}

/**
 * Parse a full session from a file (auto-detects by extension).
 * Returns session metadata + options when available.
 * Async because YAML parsing is done server-side.
 */
export async function parseSessionFile(content: string, filename: string): Promise<SessionParseResult> {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';

  switch (ext) {
    case 'json': return parseSessionJSON(content);
    case 'yaml':
    case 'yml': return parseSessionYAMLAsync(content);
    case 'txt': {
      const r = parseDelimitedText(content);
      return r.ok ? { ok: true, session: { options: r.options } } : r;
    }
    default: {
      // Try JSON first, then YAML
      const jsonR = parseSessionJSON(content);
      if (jsonR.ok) return jsonR;
      const yamlR = await parseSessionYAMLAsync(content);
      if (yamlR.ok) return yamlR;
      return { ok: false, error: 'Could not parse file. Use .json or .yaml format.' };
    }
  }
}
