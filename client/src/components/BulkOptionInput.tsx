import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './Button';
import {
  parseDelimitedText,
  parseJSON,
  parseYAMLAsync,
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
}

const FORMAT_LABELS: Record<InputFormat, string> = {
  text: 'Text',
  json: 'JSON',
  yaml: 'YAML',
};

const FORMAT_PLACEHOLDERS: Record<InputFormat, string> = {
  text: 'Option A, Option B, Option C\n\nOr one per line:\nOption A\nOption B\n\nUse \\, or \\; to escape delimiters',
  json: '["Option A", "Option B"]\n\nor full session:\n{\n  "title": "What to eat?",\n  "votingMethod": "ranked",\n  "options": ["Pizza", "Tacos"]\n}',
  yaml: '- Option A\n- Option B\n\nor full session:\ntitle: What to eat?\nvotingMethod: ranked\noptions:\n  - Pizza\n  - name: Tacos\n    description: Mexican food',
};

export function BulkOptionInput({ onParse, onSessionImport }: BulkOptionInputProps) {
  const [format, setFormat] = useState<InputFormat>('text');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ParsedOption[]>([]);
  const [sessionMeta, setSessionMeta] = useState<{ title?: string; votingMethod?: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 320) + 'px';
  }, []);

  // Parse on every change for live preview
  useEffect(() => {
    if (!value.trim()) {
      setPreview([]);
      setSessionMeta(null);
      setError('');
      return;
    }

    let cancelled = false;

    async function parse() {
      if (format === 'yaml') {
        // YAML parsing is async (server-side)
        const result = await parseYAMLAsync(value);
        if (cancelled) return;
        if (result.ok) {
          setPreview(result.options);
          setError('');
        } else {
          setPreview([]);
          setError(result.error);
        }

        // Also try session metadata extraction
        const sessionResult = await parseSessionYAMLAsync(value);
        if (cancelled) return;
        if (sessionResult.ok && (sessionResult.session.title || sessionResult.session.votingMethod)) {
          setSessionMeta({
            title: sessionResult.session.title,
            votingMethod: sessionResult.session.votingMethod,
          });
        } else {
          setSessionMeta(null);
        }
      } else {
        // Text and JSON are synchronous
        const parser = format === 'json' ? parseJSON : parseDelimitedText;
        const result = parser(value);
        if (cancelled) return;
        if (result.ok) {
          setPreview(result.options);
          setError('');
        } else {
          setPreview([]);
          setError(result.error);
        }

        // For JSON, extract session metadata
        if (format === 'json') {
          try {
            const trimmed = value.trim();
            if (trimmed.startsWith('{')) {
              const obj = JSON.parse(trimmed);
              if (obj.title || obj.votingMethod) {
                setSessionMeta({
                  title: typeof obj.title === 'string' ? obj.title : undefined,
                  votingMethod: typeof obj.votingMethod === 'string' ? obj.votingMethod : undefined,
                });
              } else {
                setSessionMeta(null);
              }
            } else {
              setSessionMeta(null);
            }
          } catch {
            setSessionMeta(null);
          }
        } else {
          setSessionMeta(null);
        }
      }
    }

    parse();
    return () => { cancelled = true; };
  }, [value, format]);

  // Auto-detect format when pasting or typing
  const handleChange = (newValue: string) => {
    setValue(newValue);

    // Auto-detect format on first substantial input
    if (newValue.trim().length > 3 && !value.trim()) {
      const detected = detectFormat(newValue);
      if (detected !== 'text') setFormat(detected);
    }

    autoResize();
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      // Try full session parse first (async for YAML)
      const sessionResult = await parseSessionFile(content, file.name);
      if (sessionResult.ok) {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        const formatMap: Record<string, InputFormat> = {
          json: 'json', yaml: 'yaml', yml: 'yaml', txt: 'text',
        };
        setFormat(formatMap[ext] ?? 'text');
        setValue(content);
        setPreview(sessionResult.session.options);

        if (sessionResult.session.title || sessionResult.session.votingMethod) {
          setSessionMeta({
            title: sessionResult.session.title,
            votingMethod: sessionResult.session.votingMethod,
          });
        }

        setError('');
        autoResize();
      } else {
        setError(sessionResult.error);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleApply = () => {
    if (preview.length === 0) return;

    // If session metadata is present and handler exists, use full session import
    if (sessionMeta && (sessionMeta.title || sessionMeta.votingMethod) && onSessionImport) {
      onSessionImport({
        title: sessionMeta.title,
        votingMethod: sessionMeta.votingMethod,
        options: preview,
      });
    } else {
      onParse(preview);
    }
    setValue('');
    setPreview([]);
    setSessionMeta(null);
  };

  return (
    <div className={styles.container}>
      {/* Format tabs */}
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

      {/* Textarea with drop zone */}
      <div
        className={`${styles.inputArea} ${dragOver ? styles.dragOver : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={FORMAT_PLACEHOLDERS[format]}
          rows={3}
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
        {preview.length > 0 && (
          <Button
            size="sm"
            onClick={handleApply}
            type="button"
          >
            {sessionMeta?.title ? 'Import session' : `Apply ${preview.length} option${preview.length !== 1 ? 's' : ''}`}
          </Button>
        )}
      </div>

      {/* Error */}
      {error && <div className={styles.error}>{error}</div>}

      {/* Session metadata preview */}
      {sessionMeta && (sessionMeta.title || sessionMeta.votingMethod) && (
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
