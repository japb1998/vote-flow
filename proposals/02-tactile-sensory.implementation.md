# Proposal 2: Tactile Sensory / Neumorphism 2.0

> Pressable, embossed UI elements with haptic-inspired feedback. Buttons deform on click, cards feel stacked, and every interaction has physical weight.

---

## Overview

This proposal brings **Tactile Maximalism** to VoteFlow. Every interactive element — buttons, option cards, score selectors — gains physical depth through inset/outset shadows, subtle gradients, and spring-based press animations. The design borrows from **Neumorphism 2.0** (2026 revision): stronger contrast than the original, accessible color ratios, and intentional depth hierarchy.

### Why Tactile Sensory?

- **Engagement**: Voting is a physical act (raising hands, pressing buttons). The UI should feel the same.
- **Clarity**: Embossed/debossed states make "selected" vs "unselected" instantly obvious without relying on color alone.
- **2026 trend alignment**: Google's Material Expressive and the broader "squishy UI" movement make tactile design mainstream.

---

## Design Tokens (CSS Variables)

```css
/* ============================================================
   TACTILE SENSORY — Design Tokens

   Naming convention:
     --neu-<property>          (neumorphic surfaces)
     --press-<property>        (press/depress states)
     --surface-<level>         (background layers)

   The neumorphic effect relies on TWO shadows:
     - Light source shadow (top-left highlight)
     - Dark source shadow (bottom-right depth)
   These are defined per theme so the light angle is consistent.
   ============================================================ */

:root {
  /* --- Base surface (soft matte) --- */
  --surface-1: #e4e8ec;
  --surface-1-rgb: 228, 232, 236;

  /* --- Neumorphic shadows (light theme) --- */
  --neu-shadow-light: -6px -6px 14px rgba(255, 255, 255, 0.7);
  --neu-shadow-dark:   6px  6px 14px rgba(163, 177, 198, 0.5);
  --neu-shadow-inset-light: inset -3px -3px 7px rgba(255, 255, 255, 0.6);
  --neu-shadow-inset-dark:  inset  3px  3px 7px rgba(163, 177, 198, 0.45);

  /* --- Raised element (card, button default) --- */
  --neu-raised: var(--neu-shadow-light), var(--neu-shadow-dark);

  /* --- Pressed element (active button, selected option) --- */
  --neu-pressed: var(--neu-shadow-inset-light), var(--neu-shadow-inset-dark);

  /* --- Text --- */
  --color-text:       #2d3748;
  --color-text-muted: #718096;

  /* --- Semantic colors --- */
  --color-primary:       #6366f1;
  --color-primary-hover: #4f46e5;
  --color-primary-soft:  rgba(99, 102, 241, 0.12);
  --color-success:       #16a34a;
  --color-success-soft:  rgba(22, 163, 74, 0.12);
  --color-danger:        #dc2626;
  --color-danger-soft:   rgba(220, 38, 38, 0.12);
  --color-warning:       #d97706;

  /* --- Press animation --- */
  --press-scale: 0.97;
  --press-duration: 120ms;
  --press-easing: cubic-bezier(0.34, 1.56, 0.64, 1); /* spring bounce */
}

[data-theme="dark"] {
  --surface-1: #2a2d35;
  --surface-1-rgb: 42, 45, 53;

  --neu-shadow-light: -6px -6px 14px rgba(58, 62, 72, 0.6);
  --neu-shadow-dark:   6px  6px 14px rgba(18, 20, 25, 0.7);
  --neu-shadow-inset-light: inset -3px -3px 7px rgba(58, 62, 72, 0.5);
  --neu-shadow-inset-dark:  inset  3px  3px 7px rgba(18, 20, 25, 0.6);

  --neu-raised: var(--neu-shadow-light), var(--neu-shadow-dark);
  --neu-pressed: var(--neu-shadow-inset-light), var(--neu-shadow-inset-dark);

  --color-text:       #e2e8f0;
  --color-text-muted: #a0aec0;

  --color-primary:       #818cf8;
  --color-primary-hover: #6366f1;
  --color-primary-soft:  rgba(129, 140, 248, 0.15);
  --color-success:       #22c55e;
  --color-success-soft:  rgba(34, 197, 94, 0.15);
  --color-danger:        #ef4444;
  --color-danger-soft:   rgba(239, 68, 68, 0.15);
}
```

---

## Component Changes

### Card — Raised Surface

```css
/* Card.module.css */
.card {
  background: var(--surface-1);
  border-radius: var(--radius-lg);
  box-shadow: var(--neu-raised);
  padding: var(--space-lg);
  border: none; /* neumorphism uses shadows, not borders */
  transition: box-shadow 200ms ease, transform 200ms ease;
}

.card.hoverable:hover {
  transform: translateY(-2px);
  /* Slightly exaggerated raise on hover */
  box-shadow:
    -8px -8px 18px rgba(255, 255, 255, 0.7),
     8px  8px 18px rgba(163, 177, 198, 0.5);
}
```

### Button — Pressable

The key UX innovation: buttons **physically depress** when clicked.

```css
/* Button.module.css */
.button {
  background: var(--surface-1);
  box-shadow: var(--neu-raised);
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-weight: 600;
  cursor: pointer;
  transition:
    box-shadow var(--press-duration) var(--press-easing),
    transform var(--press-duration) var(--press-easing);
}

/* Hover: subtle raise */
.button:hover {
  transform: translateY(-1px);
}

/* Active: depress into surface */
.button:active {
  box-shadow: var(--neu-pressed);
  transform: scale(var(--press-scale));
}

/* Primary variant: colored raised surface */
.primary {
  background: var(--color-primary);
  color: #fff;
  box-shadow:
    -4px -4px 10px rgba(129, 140, 248, 0.3),
     4px  4px 10px rgba(79, 70, 229, 0.4);
}

.primary:active {
  box-shadow:
    inset -3px -3px 7px rgba(129, 140, 248, 0.3),
    inset  3px  3px 7px rgba(79, 70, 229, 0.4);
  transform: scale(var(--press-scale));
}

/* Danger variant */
.danger {
  background: var(--color-danger);
  color: #fff;
  box-shadow:
    -4px -4px 10px rgba(239, 68, 68, 0.2),
     4px  4px 10px rgba(185, 28, 28, 0.3);
}

/* Ghost: flat, no neumorphism — but gains pressed state */
.ghost {
  background: transparent;
  box-shadow: none;
}
.ghost:active {
  box-shadow: var(--neu-pressed);
  transform: scale(var(--press-scale));
}
```

### Option Cards — Toggle Press

Selected options look **physically pushed in**, unselected ones are raised.

```css
/* SessionPage.module.css — options */
.option {
  background: var(--surface-1);
  box-shadow: var(--neu-raised);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  cursor: pointer;
  transition:
    box-shadow var(--press-duration) var(--press-easing),
    transform var(--press-duration) var(--press-easing);
}

/* Unselected hover */
.option:hover {
  transform: translateY(-1px);
}

/* Selected = pressed in */
.option.selected {
  box-shadow: var(--neu-pressed);
  transform: scale(var(--press-scale));
  /* Soft color tint to reinforce selection */
  background: color-mix(in srgb, var(--surface-1) 88%, var(--color-primary));
}
```

### Score Buttons — Physical Dials

```css
/* Score buttons become raised circles that depress */
.scoreBtn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--surface-1);
  box-shadow: var(--neu-raised);
  border: none;
  font-weight: 700;
  color: var(--color-text-muted);
  transition: all var(--press-duration) var(--press-easing);
}

.scoreBtn:active,
.scoreBtn.activeScore {
  box-shadow: var(--neu-pressed);
  color: var(--color-score);
  transform: scale(0.95);
}
```

### Input / Select — Inset Fields

Form fields look **cut into** the surface (inset shadows = input wells).

```css
/* Input.module.css */
.input {
  background: var(--surface-1);
  box-shadow: var(--neu-pressed); /* inset = input well */
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  color: var(--color-text);
  min-height: 44px;
  transition: box-shadow 150ms ease;
}

.input:focus {
  box-shadow:
    var(--neu-pressed),
    0 0 0 3px var(--color-primary-soft);
}
```

---

## Page Background

```css
body {
  background: var(--surface-1);
  color: var(--color-text);
  min-height: 100vh;
}
```

Unlike Liquid Glass (which uses gradients), Tactile Sensory uses a **flat matte surface** — the depth comes entirely from shadows.

---

## Mobile Considerations

- **Touch targets**: All pressable elements are >= 44px (already the case).
- **Press feedback**: The `scale(0.97)` + shadow swap gives instant tactile feedback on touch — critical for mobile where hover doesn't exist.
- **Performance**: Box-shadow transitions are GPU-compositable when paired with `transform`. No layout thrashing.
- **Reduced motion**: Wrap press animations in `@media (prefers-reduced-motion: no-preference)` — users who opt out get instant shadow swaps without scale/transform.

```css
@media (prefers-reduced-motion: reduce) {
  .button, .option, .scoreBtn {
    transition-duration: 0ms;
    /* Shadows still swap (visual state), but no animation */
  }
}
```

---

## File Change Summary

| File | Change |
|---|---|
| `src/styles/global.css` | Add neumorphic tokens, theme selectors, body background |
| `src/components/ThemeToggle.tsx` | New component (same as Proposal 1) |
| `src/components/Card.module.css` | Raised neumorphic surface |
| `src/components/Button.module.css` | Press/depress states per variant |
| `src/components/Input.module.css` | Inset input wells |
| `src/components/Select.module.css` | Inset select wells |
| `src/components/Badge.module.css` | Subtle raised pills |
| `src/pages/SessionPage.module.css` | Pressable option cards, score dials |
| `src/pages/HomePage.module.css` | Raised hero cards |

---

## Accessibility Notes

The original neumorphism (2020) was widely criticized for low contrast. This proposal addresses that:

| Concern | Solution |
|---|---|
| Shadow-only depth cues | Selected options also get a **color tint** background shift |
| Low text contrast | All text uses `--color-text` (verified >= 4.5:1 on both themes) |
| Press states invisible to screen readers | `:active` is cosmetic only — `aria-pressed` / `aria-selected` attributes are added in TSX |
| Color-blind users | Selected state uses shadow inversion + color + checkmark icon (triple encoding) |

---

## Visual Summary

```
  Raised (default)          Pressed (selected/active)
  ┌──────────────┐          ┌──────────────┐
  │ ╔════════╗   │          │  ┌────────┐   │
  │ ║ Button ║   │   →→→    │  │ Button │   │
  │ ╚════════╝   │  click   │  └────────┘   │
  │  ↑ pops out  │          │  ↑ sinks in   │
  └──────────────┘          └──────────────┘

  Light source: top-left    Inset shadows flip the depth
```
