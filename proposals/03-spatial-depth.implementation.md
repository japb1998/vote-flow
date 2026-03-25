# Proposal 3: Spatial Depth

> Layered, z-axis UI with floating panels, atmospheric shadows, and dimensional transitions. Inspired by Apple Vision Pro's "windows in space" and the 2026 spatial computing movement.

---

## Overview

This proposal introduces a **layered depth system** where UI elements exist at distinct z-levels. Cards float above the background with perspective-aware shadows. Modals rise from below. Panels overlap with parallax-like offsets. The goal is to create a calm, organized environment where **depth communicates hierarchy** — the most important element is always the closest to the user.

### Why Spatial Depth?

- **Natural hierarchy**: Voting sessions have clear information layers — session info (far), voting options (mid), results (near). Spatial depth maps these to z-levels intuitively.
- **Reduced cognitive load**: Instead of relying on font size and color alone, depth provides an additional axis for organizing information.
- **2026 alignment**: With spatial computing becoming mainstream, users expect depth cues in 2D interfaces too.

---

## Design Tokens (CSS Variables)

```css
/* ============================================================
   SPATIAL DEPTH — Design Tokens

   Naming convention:
     --depth-<level>           (z-elevation: 0-4)
     --shadow-<level>          (matching atmospheric shadow)
     --surface-<level>         (background at each depth)
     --perspective-*           (3D transform properties)

   Depth levels:
     0 = page canvas (flat background)
     1 = section containers (subtle lift)
     2 = cards, panels (primary content)
     3 = floating elements, active cards (elevated)
     4 = modals, toasts, overlays (top layer)
   ============================================================ */

:root {
  /* --- Page canvas --- */
  --surface-0: #f8f9fb;

  /* --- Depth surfaces (progressively lighter/brighter) --- */
  --surface-1: #ffffff;
  --surface-2: #ffffff;
  --surface-3: #ffffff;
  --surface-4: #ffffff;

  /* --- Atmospheric shadows (larger + more diffuse at higher depth) --- */
  --shadow-0: none;
  --shadow-1: 0 1px 3px rgba(0, 0, 0, 0.04),
              0 2px 8px rgba(0, 0, 0, 0.03);
  --shadow-2: 0 2px 8px rgba(0, 0, 0, 0.06),
              0 8px 24px rgba(0, 0, 0, 0.04);
  --shadow-3: 0 4px 16px rgba(0, 0, 0, 0.08),
              0 16px 48px rgba(0, 0, 0, 0.06);
  --shadow-4: 0 8px 32px rgba(0, 0, 0, 0.12),
              0 24px 64px rgba(0, 0, 0, 0.08);

  /* --- Perspective (for 3D transforms on hover/open) --- */
  --perspective: 1200px;
  --tilt-amount: 1deg;

  /* --- Depth transition --- */
  --depth-duration: 250ms;
  --depth-easing: cubic-bezier(0.22, 1, 0.36, 1);

  /* --- Border (subtle, depth-reinforcing) --- */
  --border-depth: 1px solid rgba(0, 0, 0, 0.06);

  /* --- Text --- */
  --color-text:       #1e293b;
  --color-text-muted: #64748b;

  /* --- Semantic colors (same names as current) --- */
  --color-primary:       #6366f1;
  --color-primary-hover: #4f46e5;
  --color-success:       #16a34a;
  --color-danger:        #dc2626;
  --color-warning:       #d97706;
  --color-ranked:        #8b5cf6;
  --color-approval:      #06b6d4;
  --color-score:         #f97316;
}

[data-theme="dark"] {
  --surface-0: #0c0d10;

  --surface-1: #151720;
  --surface-2: #1a1d28;
  --surface-3: #1f2233;
  --surface-4: #252940;

  --shadow-1: 0 1px 3px rgba(0, 0, 0, 0.20),
              0 2px 8px rgba(0, 0, 0, 0.15);
  --shadow-2: 0 2px 8px rgba(0, 0, 0, 0.30),
              0 8px 24px rgba(0, 0, 0, 0.20);
  --shadow-3: 0 4px 16px rgba(0, 0, 0, 0.35),
              0 16px 48px rgba(0, 0, 0, 0.25);
  --shadow-4: 0 8px 32px rgba(0, 0, 0, 0.45),
              0 24px 64px rgba(0, 0, 0, 0.30);

  --border-depth: 1px solid rgba(255, 255, 255, 0.06);

  --color-text:       #e2e8f0;
  --color-text-muted: #94a3b8;

  --color-primary:       #818cf8;
  --color-primary-hover: #6366f1;
  --color-success:       #22c55e;
  --color-danger:        #ef4444;
}
```

### Key Difference from Other Proposals

In dark mode, surfaces get **progressively lighter** as they rise (depth-4 is the lightest dark surface). This matches how objects closer to a light source appear brighter — a natural spatial metaphor.

---

## Component Changes

### Card — Depth Level 2

```css
/* Card.module.css */
.card {
  background: var(--surface-2);
  border: var(--border-depth);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-2);
  padding: var(--space-lg);
  transition:
    box-shadow var(--depth-duration) var(--depth-easing),
    transform var(--depth-duration) var(--depth-easing);
}

/* Hoverable cards rise to depth-3 */
.card.hoverable:hover {
  box-shadow: var(--shadow-3);
  transform: translateY(-4px);
}
```

### Session Header — Depth Level 1 (pinned)

```css
/* SessionPage.module.css */
.header {
  background: var(--surface-1);
  box-shadow: var(--shadow-1);
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: var(--border-depth);
  /* Header is always behind cards (depth-1 < depth-2) */
}
```

### Option Cards — Depth 2 → 3 on Select

```css
.option {
  background: var(--surface-2);
  box-shadow: var(--shadow-2);
  border: var(--border-depth);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  cursor: pointer;
  transition:
    box-shadow var(--depth-duration) var(--depth-easing),
    transform var(--depth-duration) var(--depth-easing),
    border-color var(--depth-duration) ease;
}

/* Selected options float UP one level */
.option.selected {
  box-shadow: var(--shadow-3);
  transform: translateY(-3px);
  border-color: var(--color-primary);
}

/* Hover hint */
.option:hover:not(.selected) {
  box-shadow: var(--shadow-2), 0 0 0 2px rgba(99, 102, 241, 0.1);
  transform: translateY(-1px);
}
```

### Modal — Depth Level 4 (top layer)

```css
.modalOverlay {
  background: rgba(0, 0, 0, 0.4);
  /* Perspective container for modal entrance */
  perspective: var(--perspective);
}

.modal {
  background: var(--surface-4);
  box-shadow: var(--shadow-4);
  border: var(--border-depth);
  border-radius: var(--radius-lg);

  /* Entrance: rises from below with slight tilt */
  animation: modalRise 350ms var(--depth-easing) forwards;
}

@keyframes modalRise {
  from {
    opacity: 0;
    transform: translateY(40px) rotateX(4deg) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotateX(0deg) scale(1);
  }
}
```

### Results Panel — Sticky Depth 2 with Floating Header

```css
.resultsSection {
  position: sticky;
  top: calc(80px + var(--space-md)); /* below header */
}

.resultsHeader {
  background: var(--surface-3);
  box-shadow: var(--shadow-1);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  /* Floats slightly above the results card */
  position: relative;
  z-index: 1;
  margin-bottom: calc(-1 * var(--space-sm));
}
```

### Button — Depth-Aware

```css
.button {
  border: var(--border-depth);
  border-radius: var(--radius-md);
  transition:
    box-shadow var(--depth-duration) var(--depth-easing),
    transform var(--depth-duration) var(--depth-easing);
}

.primary {
  background: var(--color-primary);
  color: #fff;
  box-shadow: var(--shadow-2);
  border: none;
}

.primary:hover {
  box-shadow: var(--shadow-3);
  transform: translateY(-2px);
}

.primary:active {
  box-shadow: var(--shadow-1);
  transform: translateY(0px);
}

.secondary {
  background: var(--surface-2);
  box-shadow: var(--shadow-1);
}

.ghost {
  background: transparent;
  box-shadow: none;
  border: none;
}
```

### Input — Inset Depth (below surface)

```css
.input {
  background: var(--surface-0); /* drops below the card */
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.04);
  border: var(--border-depth);
  border-radius: var(--radius-md);
  color: var(--color-text);
}

.input:focus {
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.04),
    0 0 0 3px rgba(99, 102, 241, 0.15);
  border-color: var(--color-primary);
}
```

---

## Layout: Staggered Depths on Desktop

On desktop (2-column layout), the voting column and results column are at slightly different depths, creating a sense of overlapping layers:

```css
.content {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: var(--space-lg);
  /* Perspective container for subtle tilt on children */
  perspective: var(--perspective);
}

.votingSection {
  transform: translateZ(0); /* depth-2 baseline */
}

.resultsSection {
  transform: translateZ(10px); /* slightly forward */
}
```

On mobile (single column), perspective is removed and sections stack normally.

---

## Mobile Considerations

- **Perspective disabled on mobile**: `perspective` and 3D transforms are removed below 768px to avoid disorienting scroll behavior on touch devices.
- **Shadow scale reduced on mobile**: Use `--shadow-1` and `--shadow-2` only (skip `--shadow-3` for non-modal elements) to reduce visual noise on small screens.
- **Touch feedback**: `:active` states drop elements to a lower depth level (shadow-2 → shadow-1) for tactile press response.

```css
@media (max-width: 768px) {
  .content {
    perspective: none;
  }
  .votingSection, .resultsSection {
    transform: none;
  }
  .option.selected {
    transform: none; /* no float on mobile, use border + color */
    box-shadow: var(--shadow-2);
  }
}

@media (prefers-reduced-motion: reduce) {
  .modal {
    animation: none;
    opacity: 1;
  }
  .option, .card, .button {
    transition-duration: 0ms;
  }
}
```

---

## File Change Summary

| File | Change |
|---|---|
| `src/styles/global.css` | Depth tokens (5 levels), perspective vars, theme selectors |
| `src/components/ThemeToggle.tsx` | New component |
| `src/components/Card.module.css` | Depth-2 surface with hover to depth-3 |
| `src/components/Button.module.css` | Depth-aware press: depth-2 → depth-1 on active |
| `src/components/Input.module.css` | Inset (below-surface) input wells |
| `src/components/Select.module.css` | Same as Input |
| `src/components/Badge.module.css` | Depth-1 pills |
| `src/pages/SessionPage.module.css` | Sticky header at depth-1, options depth-2→3, modal at depth-4 |
| `src/pages/HomePage.module.css` | Hero section at depth-1, action cards at depth-2 |
| `src/App.tsx` | Add ThemeToggle, perspective wrapper on main content |

---

## Depth Map Reference

```
Depth 4 ─── Modal overlay, toasts              (closest to user)
          │
Depth 3 ─── Selected option cards, active elements
          │
Depth 2 ─── Cards, panels, primary content     (default content level)
          │
Depth 1 ─── Header, section containers         (background structure)
          │
Depth 0 ─── Page canvas                        (furthest from user)
```

This hierarchy is consistent across all pages. Any contributor can look at an element's `--surface-N` / `--shadow-N` to know exactly where it sits in the depth stack.
