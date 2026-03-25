# Proposal 1: Liquid Glass

> Translucent, depth-layered UI inspired by Apple's Liquid Glass aesthetic and the 2026 trend toward fluid, light-refracting surfaces.

---

## Overview

This proposal replaces the current flat dark-only theme with a **translucent glass** design system. Cards, modals, and panels become semi-transparent surfaces with backdrop blur, layered over a subtle animated gradient background. Light refracts through elements, creating a sense of depth without 3D rendering. Both dark and light modes are supported via CSS custom properties.

### Why Liquid Glass?

- **Modern feel**: Glassmorphism has matured in 2026 — sharper blur radii, better contrast ratios, and purposeful layering make it production-ready.
- **Dark + Light native**: Translucent surfaces adapt naturally to both themes — dark glass over dark gradients, frosted glass over light gradients.
- **Depth without complexity**: No 3D libraries needed. Pure CSS `backdrop-filter`, layered `box-shadow`, and gradient backgrounds.

---

## Design Tokens (CSS Variables)

All new variables are added to `global.css` under `:root` (light) and `[data-theme="dark"]` (dark).

### Color System

```css
/* ============================================================
   LIQUID GLASS — Design Tokens

   Naming convention:
     --glass-<property>-<variant>
     --surface-<level>          (background layers, 1 = lowest)
     --color-<semantic>         (inherited from current system)

   Usage:
     Surface levels control z-depth:
       surface-1 = page background (gradient)
       surface-2 = primary cards (glass)
       surface-3 = elevated panels, modals (thicker glass)
   ============================================================ */

:root {
  /* --- Theme flag (consumed by JS for toggle) --- */
  color-scheme: light dark;

  /* --- Page background gradient --- */
  --surface-1: linear-gradient(135deg, #e8eaf6 0%, #f5f5f5 50%, #e0f2f1 100%);

  /* --- Glass surfaces --- */
  --glass-bg:            rgba(255, 255, 255, 0.55);
  --glass-bg-elevated:   rgba(255, 255, 255, 0.72);
  --glass-bg-hover:      rgba(255, 255, 255, 0.80);
  --glass-border:        rgba(255, 255, 255, 0.40);
  --glass-shadow:        0 8px 32px rgba(0, 0, 0, 0.08);
  --glass-shadow-hover:  0 12px 40px rgba(0, 0, 0, 0.12);
  --glass-blur:          16px;
  --glass-blur-elevated: 24px;

  /* --- Text --- */
  --color-text:       #1a1a2e;
  --color-text-muted: #64748b;

  /* --- Semantic (unchanged names, new values) --- */
  --color-primary:       #6366f1;
  --color-primary-hover: #4f46e5;
  --color-success:       #16a34a;
  --color-warning:       #d97706;
  --color-danger:        #dc2626;

  /* --- Voting method accent (unchanged) --- */
  --color-ranked:   #8b5cf6;
  --color-approval: #06b6d4;
  --color-score:    #f97316;
}

[data-theme="dark"] {
  --surface-1: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f172a 100%);

  --glass-bg:            rgba(255, 255, 255, 0.06);
  --glass-bg-elevated:   rgba(255, 255, 255, 0.10);
  --glass-bg-hover:      rgba(255, 255, 255, 0.14);
  --glass-border:        rgba(255, 255, 255, 0.10);
  --glass-shadow:        0 8px 32px rgba(0, 0, 0, 0.30);
  --glass-shadow-hover:  0 12px 40px rgba(0, 0, 0, 0.40);
  --glass-blur:          20px;
  --glass-blur-elevated: 28px;

  --color-text:       #f1f5f9;
  --color-text-muted: #94a3b8;

  --color-primary:       #818cf8;
  --color-primary-hover: #6366f1;
  --color-success:       #22c55e;
  --color-warning:       #f59e0b;
  --color-danger:        #ef4444;
}
```

### Spacing & Radius (no changes needed)

The current `--space-*` and `--radius-*` tokens remain. Glass surfaces use `--radius-lg: 12px` for cards and `--radius-md: 8px` for inputs.

---

## Theme Toggle Implementation

### Where it lives

A `ThemeToggle` component is added to the app header (or footer). It sets `data-theme` on `<html>` and persists the choice in `localStorage`.

### Component: `ThemeToggle.tsx`

```tsx
// src/components/ThemeToggle.tsx
import { useEffect, useState } from 'react';
import styles from './ThemeToggle.module.css';

/**
 * Reads the user's OS preference on first load, then defers
 * to localStorage for subsequent visits.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('vf-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vf-theme', theme);
  }, [theme]);

  return (
    <button
      className={styles.toggle}
      onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
```

---

## Component Changes

### Card (primary glass surface)

```css
/* Card.module.css — replace current styles */
.card {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--glass-shadow);
  padding: var(--space-lg);
  transition: box-shadow 200ms ease, transform 200ms ease,
              background 200ms ease;
}

.card.hoverable:hover {
  background: var(--glass-bg-hover);
  box-shadow: var(--glass-shadow-hover);
  transform: translateY(-2px);
}
```

### Modal overlay (elevated glass)

```css
/* SessionPage.module.css — modal */
.modalOverlay {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
}

.modal {
  background: var(--glass-bg-elevated);
  backdrop-filter: blur(var(--glass-blur-elevated));
  -webkit-backdrop-filter: blur(var(--glass-blur-elevated));
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow-hover);
}
```

### Button

```css
/* Button.module.css — primary variant */
.primary {
  background: var(--color-primary);
  color: #fff;
  /* Subtle glass reflection on top */
  background-image: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.15) 0%,
    rgba(255, 255, 255, 0) 50%
  );
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
}

/* Ghost variant becomes glass */
.ghost {
  background: var(--glass-bg);
  backdrop-filter: blur(8px);
  border: 1px solid var(--glass-border);
}
```

### Input / Select

```css
.input, .select {
  background: var(--glass-bg);
  backdrop-filter: blur(8px);
  border: 1px solid var(--glass-border);
  color: var(--color-text);
}

.input:focus, .select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}
```

### Page background

```css
/* global.css */
body {
  background: var(--surface-1);
  min-height: 100vh;
  color: var(--color-text);
}
```

---

## Mobile Considerations

- `backdrop-filter` is well-supported in 2026 on iOS Safari and Chrome.
- On low-end Android, fall back gracefully: if `backdrop-filter` is unsupported, the `background` opacity alone provides sufficient contrast (the semi-transparent rgba values still work without blur).
- No layout changes — the current responsive grid (2-col → 1-col at 900px) is preserved.
- Glass panels stack cleanly in single-column because their borders and shadows provide clear visual separation.

---

## File Change Summary

| File | Change |
|---|---|
| `src/styles/global.css` | Add light/dark CSS variables, `data-theme` selectors, body gradient |
| `src/components/ThemeToggle.tsx` | New component |
| `src/components/ThemeToggle.module.css` | New stylesheet |
| `src/components/Card.module.css` | Replace background/shadow with glass tokens |
| `src/components/Button.module.css` | Add glass reflection, update ghost variant |
| `src/components/Input.module.css` | Glass background + blur |
| `src/components/Select.module.css` | Glass background + blur |
| `src/components/Badge.module.css` | Update to use semi-transparent glass backgrounds |
| `src/pages/HomePage.module.css` | Gradient hero, glass form sections |
| `src/pages/SessionPage.module.css` | Glass modal, glass option cards |
| `src/App.tsx` | Add `<ThemeToggle />` to layout |

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `backdrop-filter` perf on old devices | Graceful degradation: opaque fallback via `@supports` |
| Low contrast on translucent surfaces | All text meets WCAG AA (4.5:1) — verified by using solid-enough rgba values |
| Theme flash on load | Inline `<script>` in `index.html` reads `localStorage` before first paint |

---

## Visual Summary

```
┌─────────────────────────────────────────────┐
│  Gradient background (surface-1)            │
│                                             │
│  ┌─── Glass Card (surface-2) ────────────┐  │
│  │  ░░░ frosted glass ░░░░░░░░░░░░░░░░░  │  │
│  │  Title text (high contrast)            │  │
│  │  ┌── Glass Input ──────────────────┐   │  │
│  │  │  ░░ lighter glass ░░░░░░░░░░░░  │   │  │
│  │  └────────────────────────────────-┘   │  │
│  │  [ Primary Button with reflection ]    │  │
│  └────────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```
