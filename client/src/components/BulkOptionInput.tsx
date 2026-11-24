import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './Button';
// Code editor alternatives if more features needed:
// - @uiw/react-codemirror (CodeMirror 6): full-featured, ~100KB
// - @monaco-editor/react (VS Code editor): IDE-level, ~2MB
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import {
  parseDelimitedText,
  parseJSON,
  parseSessionJSON,
  parseSessionFile,
  parseSessionYAMLAsync,
  detectFormat,
  type ParsedOption,
  type ParsedSession,
  type InputFormat,
} from '../utils/optionParsers';
import styles from './BulkOptionInput.module.css';

interface BulkOptionInputProps {
  /** Called when user applies parsed options (options-only mode). */
  onParse: (options: ParsedOption[]) => void;
  /** Called when a full session file is imported (title + method + options). */
  onSessionImport?: (session: ParsedSession) => void;
  /** Current voting method — templates adapt to show relevant examples. */
  votingMethod?: string;
}

const VALID_METHODS = ['single', 'approval', 'ranked', 'score', 'poker', 'dot', 'roman', 'fist-of-five'];
const NO_OPTIONS_METHODS = ['poker', 'roman', 'fist-of-five'];

const FORMAT_LABELS: Record<InputFormat, string> = {
  text: 'Text',
  json: 'JSON',
  yaml: 'YAML',
};

const DEFAULT_PLACEHOLDERS: Record<InputFormat, string> = {
  text: 'Option A, Option B, Option C\n\nOr one per line:\nOption A\nOption B\n\nUse \\, or \\; to escape delimiters',
  json: '["Option A", "Option B"]\n\nor full session:\n{\n  "title": "What to eat?",\n  "votingMethod": "ranked",\n  "options": ["Pizza", "Tacos"]\n}',
  yaml: '- Option A\n- Option B\n\nor full session:\ntitle: What to eat?\nvotingMethod: ranked\noptions:\n  - Pizza\n  - name: Tacos\n    description: Mexican food',
};

const METHOD_PLACEHOLDERS: Record<string, Record<InputFormat, string>> = {
  dot: {
    text: 'Feature A\nFeature B\nFeature C\nFeature D\n\nOne item per line — voters allocate dots across these',
    json: '{\n  "title": "Sprint priorities",\n  "votingMethod": "dot",\n  "config": { "dotsPerVoter": 3 },\n  "options": [\n    { "name": "Auth refactor", "description": "Rewrite auth middleware" },\n    { "name": "API pagination", "description": "Add cursor pagination" },\n    { "name": "Dashboard redesign" }\n  ]\n}',
    yaml: 'title: Sprint priorities\nvotingMethod: dot\nconfig:\n  dotsPerVoter: 3\noptions:\n  - name: Auth refactor\n    description: Rewrite auth middleware\n  - name: API pagination\n    description: Add cursor pagination\n  - Dashboard redesign',
  },
  poker: {
    text: 'User login flow\nSearch feature\nCheckout redesign\nNotifications\n\nOne story/task per line — team estimates with Fibonacci cards',
    json: '{\n  "title": "Sprint 12 estimation",\n  "votingMethod": "poker",\n  "config": { "pokerMin": 1, "pokerMax": 21 }\n}',
    yaml: 'title: Sprint 12 estimation\nvotingMethod: poker\nconfig:\n  pokerMin: 1\n  pokerMax: 21',
  },
  roman: {
    text: 'This method does not use options.\n\nImport a full session instead:\nUse JSON or YAML with title + votingMethod',
    json: '{\n  "title": "Should we adopt TypeScript?",\n  "votingMethod": "roman"\n}',
    yaml: 'title: Should we adopt TypeScript?\nvotingMethod: roman',
  },
  'fist-of-five': {
    text: 'This method does not use options.\n\nImport a full session instead:\nUse JSON or YAML with title + votingMethod',
    json: '{\n  "title": "Confidence in release plan",\n  "votingMethod": "fist-of-five"\n}',
    yaml: 'title: Confidence in release plan\nvotingMethod: fist-of-five',
  },
  single: {
    text: 'Option A, Option B, Option C\n\nOr one per line:\nOption A\nOption B',
    json: '{\n  "title": "Best framework?",\n  "votingMethod": "single",\n  "options": ["React", "Vue", "Svelte"]\n}',
    yaml: 'title: Best framework?\nvotingMethod: single\noptions:\n  - React\n  - Vue\n  - Svelte',
  },
  approval: {
    text: 'Candidate A\nCandidate B\nCandidate C\n\nVoters approve all acceptable choices',
    json: '{\n  "title": "Approved tech stack",\n  "votingMethod": "approval",\n  "options": ["PostgreSQL", "MongoDB", "DynamoDB"]\n}',
    yaml: 'title: Approved tech stack\nvotingMethod: approval\noptions:\n  - PostgreSQL\n  - MongoDB\n  - DynamoDB',
  },
  ranked: {
    text: 'Option A\nOption B\nOption C\n\nVoters rank all options by preference',
    json: '{\n  "title": "Team offsite location",\n  "votingMethod": "ranked",\n  "options": ["Beach house", "Mountain cabin", "City hotel"]\n}',
    yaml: 'title: Team offsite location\nvotingMethod: ranked\noptions:\n  - Beach house\n  - Mountain cabin\n  - City hotel',
  },
  score: {
    text: 'Option A\nOption B\nOption C\n\nVoters rate each option from 1-5',
    json: '{\n  "title": "Rate the proposals",\n  "votingMethod": "score",\n  "options": [\n    { "name": "Proposal A", "description": "Incremental approach" },\n    { "name": "Proposal B", "description": "Full rewrite" }\n  ]\n}',
    yaml: 'title: Rate the proposals\nvotingMethod: score\noptions:\n  - name: Proposal A\n    description: Incremental approach\n  - name: Proposal B\n    description: Full rewrite',
  },
};

function getPlaceholders(votingMethod?: string): Record<InputFormat, string> {
  if (votingMethod && METHOD_PLACEHOLDERS[votingMethod]) {
    return METHOD_PLACEHOLDERS[votingMethod];
  }
  return DEFAULT_PLACEHOLDERS;
}

type SessionMeta = {
  title?: string;
  votingMethod?: string;
  config?: ParsedSession['config'];
};

function parseJsonInput(input: string):
  | { ok: true; options: ParsedOption[]; meta: SessionMeta | null }
  | { ok: false; error: string } {
  const sessionResult = parseSessionJSON(input);
  if (sessionResult.ok) {
    const { title, votingMethod, config, options } = sessionResult.session;
    const hasMeta = Boolean(title || votingMethod || config);
    return {
      ok: true,
      options,
      meta: hasMeta ? { title, votingMethod, config } : null,
    };
  }

  // Fallback for optionless session objects (poker, roman, fist-of-five)
  const trimmed = input.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const method = typeof parsed.votingMethod === 'string' ? parsed.votingMethod.trim() : undefined;
        if (method && !VALID_METHODS.includes(method)) {
          return { ok: false, error: sessionResult.error };
        }
        const hasNoOptions =
          parsed.options === undefined ||
          (Array.isArray(parsed.options) && parsed.options.length === 0);
        if (method && NO_OPTIONS_METHODS.includes(method) && hasNoOptions) {
          const title = typeof parsed.title === 'string' ? parsed.title.trim() || undefined : undefined;
          let config: ParsedSession['config'];
          if (parsed.config && typeof parsed.config === 'object') {
            const c = parsed.config as Record<string, unknown>;
            config = {};
            if (typeof c.pokerMin === 'number') config.pokerMin = c.pokerMin;
            if (typeof c.pokerMax === 'number') config.pokerMax = c.pokerMax;
            if (typeof c.dotsPerVoter === 'number') config.dotsPerVoter = c.dotsPerVoter;
          }
          return {
            ok: true,
            options: [],
            meta: { title, votingMethod: method, config },
          };
        }
      }
    } catch {
      return { ok: false, error: sessionResult.error };
    }
  }

  const optResult = parseJSON(input);
  if (optResult.ok) {
    return { ok: true, options: optResult.options, meta: null };
  }

  return { ok: false, error: sessionResult.error };
}

export function BulkOptionInput({ onParse, onSessionImport, votingMethod }: BulkOptionInputProps) {
  const [format, setFormat] = useState<InputFormat>(() =>
    votingMethod && NO_OPTIONS_METHODS.includes(votingMethod) ? 'json' : 'text'
  );
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ParsedOption[]>([]);
  const [sessionMeta, setSessionMeta] = useState<SessionMeta | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default to JSON when switching to an optionless voting method with an empty editor
  useEffect(() => {
    if (!value.trim() && votingMethod && NO_OPTIONS_METHODS.includes(votingMethod) && format === 'text') {
      setFormat('json');
    }
  }, [votingMethod, value, format]);

  // Syntax highlighting via Prism
  const highlightCode = useCallback((code: string) => {
    if (format === 'json') {
      return Prism.highlight(code, Prism.languages.json, 'json');
    }
    if (format === 'yaml') {
      return Prism.highlight(code, Prism.languages.yaml, 'yaml');
    }
    // Plain text — escape HTML
    return code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }, [format]);

  // Parse on every change for live preview (debounced for YAML)
  useEffect(() => {
    if (!value.trim()) {
      setPreview([]);
      setSessionMeta(null);
      setError('');
      return;
    }

    let cancelled = false;

    if (format === 'yaml') {
      // Debounce server-side YAML parsing and make a single session parse call
      const timer = setTimeout(async () => {
        const sessionResult = await parseSessionYAMLAsync(value);
        if (cancelled) return;
        if (sessionResult.ok) {
          setPreview(sessionResult.session.options);
          const { title, votingMethod: method, config } = sessionResult.session;
          if (title || method || config) {
            setSessionMeta({ title, votingMethod: method, config });
          } else {
            setSessionMeta(null);
          }
          setError('');
        } else {
          setPreview([]);
          setSessionMeta(null);
          setError(sessionResult.error);
        }
      }, 300);

      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    if (format === 'json') {
      const result = parseJsonInput(value);
      if (result.ok) {
        setPreview(result.options);
        setSessionMeta(result.meta);
        setError('');
      } else {
        setPreview([]);
        setSessionMeta(null);
        setError(result.error);
      }
      return;
    }

    // Delimited text is synchronous
    const result = parseDelimitedText(value);
    if (result.ok) {
      setPreview(result.options);
      setError('');
    } else {
      setPreview([]);
      setError(result.error);
    }
    setSessionMeta(null);
  }, [value, format]);

  // Auto-detect format when pasting or typing
  const handleChange = (newValue: string) => {
    setValue(newValue);

    // Auto-detect format on first substantial input
    if (newValue.trim().length > 3 && !value.trim()) {
      const detected = detectFormat(newValue);
      if (detected !== 'text') setFormat(detected);
    }
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const formatMap: Record<string, InputFormat> = {
        json: 'json', yaml: 'yaml', yml: 'yaml', txt: 'text',
      };

      // Try full session parse first (async for YAML)
      const sessionResult = await parseSessionFile(content, file.name);
      if (sessionResult.ok) {
        setFormat(formatMap[ext] ?? detectFormat(content));
        setValue(content);
        setPreview(sessionResult.session.options);

        const { title, votingMethod: method, config } = sessionResult.session;
        if (title || method || config) {
          setSessionMeta({ title, votingMethod: method, config });
        } else {
          setSessionMeta(null);
        }

        setError('');
        return;
      }

      // Fallback for optionless JSON session files
      if (ext === 'json' || content.trim().startsWith('{')) {
        const jsonFallback = parseJsonInput(content);
        if (jsonFallback.ok) {
          setFormat('json');
          setValue(content);
          setPreview(jsonFallback.options);
          setSessionMeta(jsonFallback.meta);
          setError('');
          return;
        }
      }

      setError(sessionResult.error);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const isOptionlessSession = Boolean(
    sessionMeta?.votingMethod &&
    VALID_METHODS.includes(sessionMeta.votingMethod) &&
    NO_OPTIONS_METHODS.includes(sessionMeta.votingMethod)
  );
  const hasValidMethod = !sessionMeta?.votingMethod || VALID_METHODS.includes(sessionMeta.votingMethod);
  const canApply = !error && hasValidMethod && (preview.length > 0 || isOptionlessSession);

  const handleApply = () => {
    if (!canApply) return;

    const validMethod =
      sessionMeta?.votingMethod && VALID_METHODS.includes(sessionMeta.votingMethod)
        ? sessionMeta.votingMethod
        : undefined;

    // If session metadata is present and handler exists, use full session import
    if (sessionMeta && (sessionMeta.title || validMethod || sessionMeta.config) && onSessionImport) {
      onSessionImport({
        title: sessionMeta.title,
        votingMethod: validMethod,
        options: preview,
        config: sessionMeta.config,
      });
    } else if (preview.length > 0) {
      onParse(preview);
    }
    setValue('');
    setPreview([]);
    setSessionMeta(null);
  };

  const configSummary = sessionMeta?.config
    ? [
        sessionMeta.config.pokerMin !== undefined ? `min: ${sessionMeta.config.pokerMin}` : null,
        sessionMeta.config.pokerMax !== undefined ? `max: ${sessionMeta.config.pokerMax}` : null,
        sessionMeta.config.dotsPerVoter !== undefined ? `dots: ${sessionMeta.config.dotsPerVoter}` : null,
      ].filter(Boolean).join(', ')
    : '';

  return (
    <div className={styles.container}>
      {/* Format tabs + load template */}
      <div className={styles.tabBar}>
        <div className={styles.tabs}>
          {(Object.keys(FORMAT_LABELS) as InputFormat[]).map((f) => (
            <button
              key={f}
              className={`${styles.tab} ${format === f ? styles.tabActive : ''}`}
              onClick={() => setFormat(f)}
              type="button"
            >
              {FORMAT_LABELS[f]}
            </button>
          ))}
        </div>
        {!value.trim() && (
          <button
            className={styles.templateBtn}
            onClick={() => handleChange(getPlaceholders(votingMethod)[format])}
            type="button"
          >
            Load template
          </button>
        )}
      </div>

      {/* Textarea with drop zone */}
      <div
        className={`${styles.inputArea} ${dragOver ? styles.dragOver : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <Editor
          value={value}
          onValueChange={handleChange}
          highlight={highlightCode}
          placeholder={getPlaceholders(votingMethod)[format]}
          className={styles.editor}
          textareaClassName={styles.editorTextarea}
          padding={12}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            lineHeight: '1.6',
          }}
        />
        {dragOver && (
          <div className={styles.dropOverlay}>
            Drop file here
          </div>
        )}
      </div>

      {/* File upload + actions */}
      <div className={styles.actions}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.yaml,.yml,.txt"
          className={styles.fileInput}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            e.target.value = '';
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          Upload file
        </Button>
        <div className={styles.hint}>
          .json, .yaml, .txt
        </div>
        {canApply && (
          <Button
            size="sm"
            onClick={handleApply}
            type="button"
          >
            {sessionMeta && (sessionMeta.title || sessionMeta.votingMethod)
              ? 'Import session'
              : `Apply ${preview.length} option${preview.length !== 1 ? 's' : ''}`}
          </Button>
        )}
      </div>

      {/* Error */}
      {error && <div className={styles.error}>{error}</div>}

      {/* Session metadata preview */}
      {sessionMeta && (sessionMeta.title || sessionMeta.votingMethod || configSummary) && (
        <div className={styles.sessionMeta}>
          {sessionMeta.title && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Title</span>
              <span className={styles.metaValue}>{sessionMeta.title}</span>
            </div>
          )}
          {sessionMeta.votingMethod && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Method</span>
              <span className={styles.metaValue}>{sessionMeta.votingMethod}</span>
            </div>
          )}
          {configSummary && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Config</span>
              <span className={styles.metaValue}>{configSummary}</span>
            </div>
          )}
        </div>
      )}

      {/* Live preview */}
      {preview.length > 0 && (
        <div className={styles.preview}>
          <div className={styles.previewLabel}>Options preview ({preview.length})</div>
          <div className={styles.previewList}>
            {preview.map((opt, i) => (
              <div key={i} className={styles.previewItem}>
                <span className={styles.previewIndex}>{i + 1}</span>
                <span className={styles.previewName}>{opt.name}</span>
                {opt.description && (
                  <span className={styles.previewDesc}>{opt.description}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
