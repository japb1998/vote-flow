import { useState, useEffect, useRef } from 'react';
import styles from './PalettePicker.module.css';

const PALETTES = [
  { id: 'pink',    label: 'Pink',    swatch: '#EC4899' },
  { id: 'indigo',  label: 'Indigo',  swatch: '#6366f1' },
  { id: 'teal',    label: 'Teal',    swatch: '#0d9488' },
  { id: 'rose',    label: 'Rose',    swatch: '#e11d48' },
  { id: 'amber',   label: 'Amber',   swatch: '#d97706' },
  { id: 'violet',  label: 'Violet',  swatch: '#7c3aed' },
  { id: 'emerald', label: 'Emerald', swatch: '#059669' },
  { id: 'sky',     label: 'Sky',     swatch: '#0284c7' },
  { id: 'slate',   label: 'Slate',   swatch: '#475569' },
] as const;

type PaletteId = typeof PALETTES[number]['id'];

function getInitialPalette(): PaletteId {
  const stored = localStorage.getItem('vf-palette');
  if (stored && PALETTES.some(p => p.id === stored)) return stored as PaletteId;
  return 'pink';
}

export function PalettePicker() {
  const [palette, setPalette] = useState<PaletteId>(getInitialPalette);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-palette', palette);
    localStorage.setItem('vf-palette', palette);
  }, [palette]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = PALETTES.find(p => p.id === palette)!;

  return (
    <div className={styles.container} ref={ref}>
      <button
        className={styles.trigger}
        onClick={() => setOpen(o => !o)}
        aria-label="Change color palette"
        title="Change color palette"
      >
        <span className={styles.swatch} style={{ background: current.swatch }} />
      </button>

      {open && (
        <div className={styles.dropdown}>
          {PALETTES.map(p => (
            <button
              key={p.id}
              className={`${styles.option} ${p.id === palette ? styles.active : ''}`}
              onClick={() => { setPalette(p.id); setOpen(false); }}
            >
              <span className={styles.optionSwatch} style={{ background: p.swatch }} />
              <span className={styles.optionLabel}>{p.label}</span>
              {p.id === palette && <span className={styles.check}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
