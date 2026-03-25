/**
 * Option parsers for multiple input formats.
 *
 * Supported formats:
 *   - Delimited text (comma, semicolon, newline) with backslash escaping
 *   - JSON (array of strings or array of {name, description} objects)
 *   - YAML (list of strings or list of {name, description} mappings)
 *   - CSV  (columns: name, description — header row optional)
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
}

export type ParseError = { message: string };
export type ParseResult =
  | { ok: true; options: ParsedOption[] }
  | { ok: false; error: string };

export type SessionParseResult =
  | { ok: true; session: ParsedSession }
  | { ok: false; error: string };

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
// YAML (lightweight parser — no dependency)
// ---------------------------------------------------------------------------

/**
 * Accepts YAML lists:
 *   - Option A
 *   - Option B
 *
 * Or mapping lists:
 *   - name: Option A
 *     description: Some desc
 *   - name: Option B
 */
export function parseYAML(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'Empty input' };

  const lines = trimmed.split('\n');
  const options: ParsedOption[] = [];
  let current: Partial<ParsedOption> | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // List item: "- value" or "- name: value"
    const listMatch = line.match(/^(\s*)-\s+(.*)/);
    if (listMatch) {
      // Flush previous item
      if (current?.name) {
        options.push({ name: current.name, description: current.description ?? '' });
      }

      const value = listMatch[2].trim();

      // Check if it's a mapping key: "name: value"
      const kvMatch = value.match(/^name:\s*(.*)/);
      if (kvMatch) {
        current = { name: unquoteYAML(kvMatch[1].trim()), description: '' };
      } else {
        current = { name: unquoteYAML(value), description: '' };
      }
      continue;
    }

    // Continuation mapping key (indented under a list item): "  description: value"
    if (current && line.match(/^\s+/)) {
      const descMatch = line.match(/^\s+description:\s*(.*)/);
      if (descMatch) {
        current.description = unquoteYAML(descMatch[1].trim());
      }
      // Also allow "name:" on its own indented line
      const nameMatch = line.match(/^\s+name:\s*(.*)/);
      if (nameMatch && !current.name) {
        current.name = unquoteYAML(nameMatch[1].trim());
      }
      continue;
    }
  }

  // Flush last item
  if (current?.name) {
    options.push({ name: current.name, description: current.description ?? '' });
  }

  if (options.length === 0) {
    return { ok: false, error: 'No valid options found. Use YAML list syntax: "- Option Name"' };
  }

  return { ok: true, options };
}

/** Remove surrounding quotes from a YAML string value. */
function unquoteYAML(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/**
 * Parses CSV with optional header row.
 * If the first row contains "name" (case-insensitive), it's treated as a header.
 * Otherwise all rows are treated as data.
 *
 * Columns: name[, description]
 * Supports quoted fields with commas inside: "Option A, with comma", description
 */
export function parseCSV(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'Empty input' };

  const rows = parseCSVRows(trimmed);
  if (rows.length === 0) return { ok: false, error: 'No rows found' };

  let dataRows = rows;
  let nameCol = 0;
  let descCol = 1;

  // Detect header row
  const firstRow = rows[0].map(c => c.toLowerCase().trim());
  const nameIdx = firstRow.indexOf('name');
  if (nameIdx !== -1) {
    nameCol = nameIdx;
    const descIdx = firstRow.indexOf('description');
    descCol = descIdx !== -1 ? descIdx : -1;
    dataRows = rows.slice(1);
  }

  const options: ParsedOption[] = [];
  for (const row of dataRows) {
    const name = (row[nameCol] ?? '').trim();
    const desc = descCol >= 0 ? (row[descCol] ?? '').trim() : '';
    if (name) options.push({ name, description: desc });
  }

  if (options.length === 0) return { ok: false, error: 'No valid options found in CSV' };
  return { ok: true, options };
}

/** Simple CSV row parser supporting quoted fields. */
function parseCSVRows(input: string): string[][] {
  const rows: string[][] = [];
  const lines = input.split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          fields.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }
    fields.push(current);
    rows.push(fields);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Auto-detect format and parse
// ---------------------------------------------------------------------------

export type InputFormat = 'text' | 'json' | 'yaml' | 'csv';

export function detectFormat(input: string): InputFormat {
  const trimmed = input.trim();
  if (!trimmed) return 'text';

  // JSON: starts with [ or {
  if (trimmed[0] === '[' || trimmed[0] === '{') return 'json';

  // YAML: lines start with "- "
  const lines = trimmed.split('\n').filter(l => l.trim());
  const yamlLines = lines.filter(l => l.trim().startsWith('- '));
  if (yamlLines.length >= 2) return 'yaml';

  // CSV: first line contains "name" header or multiple comma-separated quoted fields
  const firstLine = lines[0];
  if (firstLine.toLowerCase().includes('name') && firstLine.includes(',')) return 'csv';
  // Multiple lines each containing commas with consistent field counts
  if (lines.length >= 2) {
    const fieldCounts = lines.map(l => parseCSVRows(l)[0]?.length ?? 0);
    if (fieldCounts[0] >= 2 && fieldCounts.every(c => c === fieldCounts[0])) return 'csv';
  }

  return 'text';
}

export function parseAuto(input: string): ParseResult {
  const format = detectFormat(input);
  switch (format) {
    case 'json': return parseJSON(input);
    case 'yaml': return parseYAML(input);
    case 'csv': return parseCSV(input);
    default: return parseDelimitedText(input);
  }
}

/** Parse file content based on file extension. */
export function parseFile(content: string, filename: string): ParseResult {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'json': return parseJSON(content);
    case 'yaml':
    case 'yml': return parseYAML(content);
    case 'csv': return parseCSV(content);
    case 'txt': return parseDelimitedText(content);
    default: return parseAuto(content);
  }
}

// ---------------------------------------------------------------------------
// Full session parsers (title + votingMethod + options from a single file)
// ---------------------------------------------------------------------------

const VALID_METHODS = ['single', 'approval', 'ranked', 'score'];

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

  return {
    ok: true,
    session: {
      title: title || undefined,
      votingMethod: method || undefined,
      options: optResult.options,
    },
  };
}

/**
 * Parse a full session from YAML.
 *
 * Accepted format:
 *   title: What to eat?
 *   votingMethod: ranked
 *   options:
 *     - Pizza
 *     - name: Tacos
 *       description: Mexican food
 */
export function parseSessionYAML(input: string): SessionParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'Empty input' };

  const lines = trimmed.split('\n');
  let title: string | undefined;
  let votingMethod: string | undefined;
  let optionsStartIndex = -1;

  // Look for top-level keys before the options list
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const titleMatch = line.match(/^title:\s*(.*)/);
    if (titleMatch) {
      title = unquoteYAML(titleMatch[1].trim()) || undefined;
      continue;
    }
    const methodMatch = line.match(/^votingMethod:\s*(.*)/);
    if (methodMatch) {
      votingMethod = unquoteYAML(methodMatch[1].trim()) || undefined;
      continue;
    }
    const optionsMatch = line.match(/^options:\s*$/);
    if (optionsMatch) {
      optionsStartIndex = i + 1;
      continue;
    }
  }

  if (votingMethod && !VALID_METHODS.includes(votingMethod)) {
    return { ok: false, error: `Invalid votingMethod: "${votingMethod}". Use: ${VALID_METHODS.join(', ')}` };
  }

  // If no "options:" key was found, try parsing the whole thing as a list
  const optionsText = optionsStartIndex >= 0
    ? lines.slice(optionsStartIndex).join('\n')
    : trimmed;

  const optResult = parseYAML(optionsText);
  if (!optResult.ok) return optResult;

  // If we found no top-level keys and just a list, return options only
  if (!title && !votingMethod && optionsStartIndex < 0) {
    return { ok: true, session: { options: optResult.options } };
  }

  return {
    ok: true,
    session: {
      title,
      votingMethod,
      options: optResult.options,
    },
  };
}

/**
 * Parse a full session from a file (auto-detects by extension).
 * Returns session metadata + options when available.
 */
export function parseSessionFile(content: string, filename: string): SessionParseResult {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';

  switch (ext) {
    case 'json': return parseSessionJSON(content);
    case 'yaml':
    case 'yml': return parseSessionYAML(content);
    case 'csv': {
      const r = parseCSV(content);
      return r.ok ? { ok: true, session: { options: r.options } } : r;
    }
    case 'txt': {
      const r = parseDelimitedText(content);
      return r.ok ? { ok: true, session: { options: r.options } } : r;
    }
    default: {
      // Try JSON first, then YAML, then CSV
      const jsonR = parseSessionJSON(content);
      if (jsonR.ok) return jsonR;
      const yamlR = parseSessionYAML(content);
      if (yamlR.ok) return yamlR;
      const csvR = parseCSV(content);
      if (csvR.ok) return { ok: true, session: { options: csvR.options } };
      return { ok: false, error: 'Could not parse file. Use .json, .yaml, or .csv format.' };
    }
  }
}
