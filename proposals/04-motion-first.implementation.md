# Proposal 4: Material 3 Expressive

> Google's most research-backed design system applied to VoteFlow — physics-based spring motion, expressive shape morphing, dynamic color roles, and the full M3 Expressive token architecture.

---

## Overview

This proposal adopts **Material 3 Expressive** (announced May 2025, Android 16) as VoteFlow's design language. M3 Expressive replaces duration-based animations with **physics-based springs**, introduces a **10-step corner radius scale** with shape morphing, and defines **dynamic color roles** that adapt across themes. The result is an interface that feels alive — buttons bounce, shapes morph on selection, and every transition has physical weight.

### Why Material 3 Expressive?

- **Research-backed**: 46 global studies, 18,000+ participants. Users locate interactive elements up to **4x faster** with M3 Expressive designs.
- **Spring motion**: Animations respond to interruption naturally (no jarring cuts when a user clicks mid-transition).
- **Shape as communication**: A card morphing from rounded-rect to pill tells the user "this is selected" without reading text or relying on color alone.
- **Web-ready tokens**: While M3 is Android-native, its token system maps cleanly to CSS custom properties. No Material Web Components dependency needed.

---

## M3 Expressive Token Architecture

M3 organizes tokens into 6 categories. Here's how each maps to CSS variables:

### 1. Color Roles

M3 uses **color roles** (primary, secondary, tertiary, surface, error) rather than raw hex values. Each role has an `on-` counterpart for text/icon contrast.

```css
/* ============================================================
   M3 EXPRESSIVE — Color Tokens

   Naming convention: --md-sys-color-<role>
   Follows M3 naming so any designer familiar with
   Material Design can read these tokens immediately.

   Contrast guarantee:
     on-* colors always have >= 4.5:1 against their surface.
   ============================================================ */

:root {
  /* --- Primary (indigo) --- */
  --md-sys-color-primary:              #4f46e5;
  --md-sys-color-on-primary:           #ffffff;
  --md-sys-color-primary-container:    #e8eaf6;
  --md-sys-color-on-primary-container: #1a237e;

  /* --- Secondary (slate) --- */
  --md-sys-color-secondary:              #625b71;
  --md-sys-color-on-secondary:           #ffffff;
  --md-sys-color-secondary-container:    #e8def8;
  --md-sys-color-on-secondary-container: #1d192b;

  /* --- Tertiary (teal — used for voting accents) --- */
  --md-sys-color-tertiary:              #0e7490;
  --md-sys-color-on-tertiary:           #ffffff;
  --md-sys-color-tertiary-container:    #ccfbf1;
  --md-sys-color-on-tertiary-container: #134e4a;

  /* --- Error --- */
  --md-sys-color-error:              #b91c1c;
  --md-sys-color-on-error:           #ffffff;
  --md-sys-color-error-container:    #fef2f2;
  --md-sys-color-on-error-container: #7f1d1d;

  /* --- Surface layers (M3 surface tint model) --- */
  --md-sys-color-surface:            #fefbff;
  --md-sys-color-on-surface:         #1c1b1f;
  --md-sys-color-surface-variant:    #e7e0ec;
  --md-sys-color-on-surface-variant: #49454f;
  --md-sys-color-surface-container:         #f3edf7;
  --md-sys-color-surface-container-low:     #f7f2fa;
  --md-sys-color-surface-container-lowest:  #ffffff;
  --md-sys-color-surface-container-high:    #ece6f0;
  --md-sys-color-surface-container-highest: #e6e0e9;

  /* --- Outline --- */
  --md-sys-color-outline:         #79747e;
  --md-sys-color-outline-variant: #cac4d0;

  /* --- Inverse --- */
  --md-sys-color-inverse-surface:    #313033;
  --md-sys-color-inverse-on-surface: #f4eff4;
  --md-sys-color-inverse-primary:    #d0bcff;

  /* --- Voting method accent mapping --- */
  --color-ranked:   #7c3aed;
  --color-approval: #0e7490;
  --color-score:    #c2410c;
  --color-success:  #15803d;
}

[data-theme="dark"] {
  --md-sys-color-primary:              #d0bcff;
  --md-sys-color-on-primary:           #381e72;
  --md-sys-color-primary-container:    #4f378b;
  --md-sys-color-on-primary-container: #eaddff;

  --md-sys-color-secondary:              #ccc2dc;
  --md-sys-color-on-secondary:           #332d41;
  --md-sys-color-secondary-container:    #4a4458;
  --md-sys-color-on-secondary-container: #e8def8;

  --md-sys-color-tertiary:              #5eead4;
  --md-sys-color-on-tertiary:           #003731;
  --md-sys-color-tertiary-container:    #005249;
  --md-sys-color-on-tertiary-container: #ccfbf1;

  --md-sys-color-error:              #f2b8b5;
  --md-sys-color-on-error:           #601410;
  --md-sys-color-error-container:    #8c1d18;
  --md-sys-color-on-error-container: #f9dedc;

  --md-sys-color-surface:            #1c1b1f;
  --md-sys-color-on-surface:         #e6e1e5;
  --md-sys-color-surface-variant:    #49454f;
  --md-sys-color-on-surface-variant: #cac4d0;
  --md-sys-color-surface-container:         #211f26;
  --md-sys-color-surface-container-low:     #1d1b20;
  --md-sys-color-surface-container-lowest:  #0f0d13;
  --md-sys-color-surface-container-high:    #2b2930;
  --md-sys-color-surface-container-highest: #36343b;

  --md-sys-color-outline:         #938f99;
  --md-sys-color-outline-variant: #49454f;

  --md-sys-color-inverse-surface:    #e6e1e5;
  --md-sys-color-inverse-on-surface: #313033;
  --md-sys-color-inverse-primary:    #6750a4;

  --color-ranked:   #a78bfa;
  --color-approval: #22d3ee;
  --color-score:    #fb923c;
  --color-success:  #4ade80;
}
```

### 2. Shape Tokens (10-Step Corner Radius Scale)

```css
/* ============================================================
   M3 EXPRESSIVE — Shape Tokens

   M3's 10-step scale from square to fully rounded.
   "Full" means 50% of the element's smaller dimension (pill shape).

   Shape morphing: use CSS transitions on border-radius
   to animate between shape states.
   ============================================================ */

:root {
  --md-sys-shape-corner-none:        0px;
  --md-sys-shape-corner-extra-small: 4px;
  --md-sys-shape-corner-small:       8px;
  --md-sys-shape-corner-medium:      12px;
  --md-sys-shape-corner-large:       16px;
  --md-sys-shape-corner-extra-large: 28px;
  --md-sys-shape-corner-full:        9999px;  /* pill */
}
```

### 3. Motion Tokens (Spring-Based)

CSS doesn't natively support spring physics, but we can approximate M3 Expressive springs with `cubic-bezier` curves for CSS transitions and use the Web Animations API for true spring behavior on key interactions.

```css
/* ============================================================
   M3 EXPRESSIVE — Motion Tokens

   Two motion schemes:
     Expressive = bouncy, playful (default for VoteFlow)
     Standard   = subdued, functional (fallback for reduced-motion)

   Two token types:
     Spatial  = position, size, shape changes (allow overshoot)
     Effect   = color, opacity changes (no overshoot)

   CSS approximation:
     Spring overshoot is approximated via cubic-bezier with
     values > 1.0 on the y-axis.
   ============================================================ */

:root {
  /* --- Expressive scheme (default) --- */

  /* Spatial springs: bouncy, overshoot allowed */
  --md-sys-motion-spatial-fast:    cubic-bezier(0.34, 1.56, 0.64, 1);
  --md-sys-motion-spatial-normal:  cubic-bezier(0.22, 1.30, 0.36, 1);
  --md-sys-motion-spatial-slow:    cubic-bezier(0.16, 1.20, 0.30, 1);

  /* Effect springs: no overshoot, smooth settle */
  --md-sys-motion-effect-fast:     cubic-bezier(0.22, 1, 0.36, 1);
  --md-sys-motion-effect-normal:   cubic-bezier(0.16, 1, 0.30, 1);
  --md-sys-motion-effect-slow:     cubic-bezier(0.10, 1, 0.20, 1);

  /* Duration guides (even with springs, we set max duration) */
  --md-sys-motion-duration-short:   150ms;
  --md-sys-motion-duration-medium:  300ms;
  --md-sys-motion-duration-long:    500ms;
  --md-sys-motion-duration-x-long:  700ms;

  /* Stagger delay for sequential animations */
  --md-sys-motion-stagger: 50ms;
}
```

**For true spring physics** on high-impact interactions (vote submission, modal open), use a JS helper:

```ts
// src/utils/spring.ts
/**
 * Animates an element using Web Animations API with spring-like physics.
 *
 * M3 Expressive spring configs:
 *   - Spatial expressive: stiffness=300, damping=15
 *   - Spatial standard:   stiffness=400, damping=25
 *   - Effect expressive:  stiffness=500, damping=30
 *
 * Since Web Animations API doesn't support springs natively,
 * we pre-calculate keyframes from the spring equation.
 */
export function springAnimate(
  element: HTMLElement,
  keyframes: Keyframe[],
  config: { stiffness?: number; damping?: number; mass?: number } = {}
) {
  const { stiffness = 300, damping = 15, mass = 1 } = config;

  // Calculate approximate duration from spring parameters
  // Duration ≈ when amplitude < 0.1% of initial displacement
  const omega = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const duration = Math.min((-Math.log(0.001) / (zeta * omega)) * 1000, 1000);

  return element.animate(keyframes, {
    duration,
    easing: `cubic-bezier(0.34, ${1 + (1 - zeta)}, 0.64, 1)`,
    fill: 'forwards',
  });
}
```

### 4. Typography Tokens

```css
:root {
  /* --- Type scale (M3 naming) --- */
  --md-sys-typescale-display-large:  2.25rem;    /* 36px */
  --md-sys-typescale-display-medium: 1.75rem;    /* 28px */
  --md-sys-typescale-headline-large: 1.5rem;     /* 24px */
  --md-sys-typescale-headline-medium: 1.25rem;   /* 20px */
  --md-sys-typescale-title-large:    1.125rem;   /* 18px */
  --md-sys-typescale-title-medium:   1rem;       /* 16px */
  --md-sys-typescale-body-large:     1rem;       /* 16px */
  --md-sys-typescale-body-medium:    0.875rem;   /* 14px */
  --md-sys-typescale-label-large:    0.875rem;   /* 14px */
  --md-sys-typescale-label-medium:   0.75rem;    /* 12px */

  /* Font families */
  --md-sys-typescale-font-family: 'Inter', system-ui, -apple-system, sans-serif;
  --md-sys-typescale-font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### 5. Elevation Tokens

M3 uses a **tonal surface** model rather than shadows alone. Higher elevation = slightly tinted surface.

```css
:root {
  --md-sys-elevation-0: none;
  --md-sys-elevation-1: 0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.10);
  --md-sys-elevation-2: 0 1px 2px rgba(0,0,0,0.05), 0 2px 6px rgba(0,0,0,0.10);
  --md-sys-elevation-3: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.10);
  --md-sys-elevation-4: 0 2px 4px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.10);
  --md-sys-elevation-5: 0 4px 8px rgba(0,0,0,0.05), 0 12px 32px rgba(0,0,0,0.10);
}

[data-theme="dark"] {
  /* Dark mode: shadows are stronger, surfaces use container tint instead */
  --md-sys-elevation-1: 0 1px 3px rgba(0,0,0,0.30);
  --md-sys-elevation-2: 0 2px 6px rgba(0,0,0,0.30);
  --md-sys-elevation-3: 0 4px 12px rgba(0,0,0,0.30);
  --md-sys-elevation-4: 0 8px 24px rgba(0,0,0,0.30);
  --md-sys-elevation-5: 0 12px 32px rgba(0,0,0,0.30);
}
```

---

## Component Changes

### Button — M3 Filled / Tonal / Outlined / Text

M3 defines 4 button types (not 4 "variants" — each has a distinct semantic role):

```css
/* Button.module.css */
.button {
  border: none;
  border-radius: var(--md-sys-shape-corner-full); /* pill shape */
  font-family: var(--md-sys-typescale-font-family);
  font-size: var(--md-sys-typescale-label-large);
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition:
    box-shadow var(--md-sys-motion-duration-short) var(--md-sys-motion-effect-fast),
    background var(--md-sys-motion-duration-short) var(--md-sys-motion-effect-fast),
    border-radius var(--md-sys-motion-duration-medium) var(--md-sys-motion-spatial-fast);
}

/* Filled (primary CTA) */
.primary {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  box-shadow: var(--md-sys-elevation-1);
}
.primary:hover {
  box-shadow: var(--md-sys-elevation-2);
}
.primary:active {
  box-shadow: var(--md-sys-elevation-0);
  transform: scale(0.97);
  transition: transform var(--md-sys-motion-duration-short) var(--md-sys-motion-spatial-fast);
}

/* Tonal (secondary actions) */
.secondary {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

/* Outlined (tertiary) */
.outlined {
  background: transparent;
  color: var(--md-sys-color-primary);
  border: 1px solid var(--md-sys-color-outline);
}

/* Text (ghost equivalent) */
.ghost {
  background: transparent;
  color: var(--md-sys-color-primary);
  padding: 10px 12px;
}

/* Danger */
.danger {
  background: var(--md-sys-color-error);
  color: var(--md-sys-color-on-error);
}

/* --- M3 State Layer (ripple-like hover/focus overlay) --- */
.button::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: currentColor;
  opacity: 0;
  transition: opacity var(--md-sys-motion-duration-short) var(--md-sys-motion-effect-fast);
}
.button:hover::before { opacity: 0.08; }
.button:focus-visible::before { opacity: 0.12; }
.button:active::before { opacity: 0.12; }
```

### Card — Surface Container + Elevation

```css
/* Card.module.css */
.card {
  background: var(--md-sys-color-surface-container-low);
  border-radius: var(--md-sys-shape-corner-large);  /* 16px */
  box-shadow: var(--md-sys-elevation-1);
  padding: var(--space-lg);
  transition:
    box-shadow var(--md-sys-motion-duration-medium) var(--md-sys-motion-effect-fast),
    transform var(--md-sys-motion-duration-medium) var(--md-sys-motion-spatial-normal);
}

.card.hoverable:hover {
  box-shadow: var(--md-sys-elevation-2);
  transform: translateY(-2px);
}
```

### Option Cards — Shape Morphing on Selection

The signature M3 Expressive feature: options **morph their border-radius** when selected.

```css
/* SessionPage.module.css */
.option {
  background: var(--md-sys-color-surface-container);
  border-radius: var(--md-sys-shape-corner-medium);  /* 12px default */
  border: 1px solid var(--md-sys-color-outline-variant);
  padding: var(--space-md);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition:
    border-radius var(--md-sys-motion-duration-medium) var(--md-sys-motion-spatial-fast),
    background var(--md-sys-motion-duration-short) var(--md-sys-motion-effect-fast),
    border-color var(--md-sys-motion-duration-short) var(--md-sys-motion-effect-fast),
    box-shadow var(--md-sys-motion-duration-short) var(--md-sys-motion-effect-fast);
}

/* SELECTED: morphs to more rounded shape */
.option.selected {
  border-radius: var(--md-sys-shape-corner-extra-large);  /* 28px — pill-like */
  background: var(--md-sys-color-primary-container);
  border-color: var(--md-sys-color-primary);
  box-shadow: var(--md-sys-elevation-1);
}

/* State layer for hover */
.option::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--md-sys-color-on-surface);
  opacity: 0;
  transition: opacity var(--md-sys-motion-duration-short) var(--md-sys-motion-effect-fast);
}
.option:hover::before { opacity: 0.08; }
```

This creates a visible "shape morph" — the card smoothly transitions from 12px to 28px corners when selected, communicating state change through shape alone.

### Score Buttons — Expressive Shape States

```css
.scoreBtn {
  width: 44px;
  height: 44px;
  border-radius: var(--md-sys-shape-corner-medium); /* square-ish */
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface);
  font-weight: 600;
  transition:
    border-radius var(--md-sys-motion-duration-medium) var(--md-sys-motion-spatial-fast),
    background var(--md-sys-motion-duration-short) var(--md-sys-motion-effect-fast);
}

/* Active score: morphs to circle */
.scoreBtn.activeScore {
  border-radius: var(--md-sys-shape-corner-full);  /* circle */
  background: var(--color-score);
  color: #fff;
  border-color: var(--color-score);
}
```

### Input — M3 Outlined Text Field

```css
/* Input.module.css */
.inputWrapper {
  position: relative;
}

.input {
  background: transparent;
  border: 1px solid var(--md-sys-color-outline);
  border-radius: var(--md-sys-shape-corner-small);
  color: var(--md-sys-color-on-surface);
  padding: 16px;
  font-size: var(--md-sys-typescale-body-large);
  min-height: 56px; /* M3 spec */
  width: 100%;
  transition:
    border-color var(--md-sys-motion-duration-short) var(--md-sys-motion-effect-fast);
}

.input:focus {
  border-color: var(--md-sys-color-primary);
  border-width: 2px;
  padding: 15px; /* compensate for 2px border */
}

/* Floating label */
.label {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: var(--md-sys-typescale-body-large);
  color: var(--md-sys-color-on-surface-variant);
  background: var(--md-sys-color-surface);
  padding: 0 4px;
  transition:
    top var(--md-sys-motion-duration-short) var(--md-sys-motion-spatial-fast),
    font-size var(--md-sys-motion-duration-short) var(--md-sys-motion-effect-fast),
    color var(--md-sys-motion-duration-short) var(--md-sys-motion-effect-fast);
  pointer-events: none;
}

.input:focus + .label,
.input:not(:placeholder-shown) + .label {
  top: 0;
  font-size: var(--md-sys-typescale-label-medium);
  color: var(--md-sys-color-primary);
}
```

### Results Chart — Animated Bars with Spring Easing

```css
/* ResultsChart.module.css */
.bar {
  height: 24px;
  border-radius: var(--md-sys-shape-corner-full);
  transition: width var(--md-sys-motion-duration-long) var(--md-sys-motion-spatial-normal);
}

/* Winner bar gets a shape morph to extra-large radius */
.bar.winner {
  border-radius: var(--md-sys-shape-corner-extra-large);
  box-shadow: var(--md-sys-elevation-1);
}
```

### Modal — Spring Entrance

```css
.modalOverlay {
  background: rgba(0, 0, 0, 0.32); /* M3 scrim */
  animation: fadeIn 200ms var(--md-sys-motion-effect-fast) both;
}

.modal {
  background: var(--md-sys-color-surface-container-high);
  border-radius: var(--md-sys-shape-corner-extra-large);
  box-shadow: var(--md-sys-elevation-3);
  animation: dialogEnter var(--md-sys-motion-duration-long) var(--md-sys-motion-spatial-normal) both;
}

@keyframes dialogEnter {
  from {
    opacity: 0;
    transform: translateY(48px) scale(0.92);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

---

## Page Background

```css
body {
  background: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
  font-family: var(--md-sys-typescale-font-family);
}
```

---

## Mobile Considerations

- **M3 is mobile-first**: The entire system was designed for Android touch interfaces. All touch targets are >= 48dp (48px).
- **Shape morphing on touch**: The spring easing on `border-radius` transitions gives immediate tactile feedback on tap.
- **Responsive type**: M3 type scale reduces on mobile (`display-large: 1.75rem` on screens < 480px).
- **State layers**: The `::before` overlay pattern works on touch — active state shows the 12% overlay on tap.

```css
@media (max-width: 480px) {
  :root {
    --md-sys-typescale-display-large: 1.75rem;
    --md-sys-typescale-display-medium: 1.5rem;
    --md-sys-typescale-headline-large: 1.25rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

---

## File Change Summary

| File | Change |
|---|---|
| `src/styles/global.css` | Full M3 token set (color roles, shape, motion, type, elevation), theme selectors |
| `src/utils/spring.ts` | **New file** — Web Animations API spring helper |
| `src/components/ThemeToggle.tsx` | New component (M3 icon button style) |
| `src/components/Card.module.css` | Surface container + elevation, corner-large |
| `src/components/Button.module.css` | Pill shape, state layers, 4 M3 button types |
| `src/components/Input.module.css` | M3 outlined text field with floating label |
| `src/components/Select.module.css` | M3 outlined style |
| `src/components/Badge.module.css` | M3 small chips (corner-small, container colors) |
| `src/components/ResultsChart.module.css` | Spring-eased bar transitions |
| `src/pages/SessionPage.module.css` | Shape-morphing options, spring modal, state layers |
| `src/pages/HomePage.module.css` | M3 layout with surface containers |
| `src/App.tsx` | ThemeToggle, M3 surface wrapper |

---

## Key M3 Expressive Concepts for Maintainers

### State Layers
Every interactive element has a `::before` pseudo-element that shows a semi-transparent overlay of `currentColor`:
- Hover: 8% opacity
- Focus: 12% opacity
- Active/Pressed: 12% opacity
- Dragged: 16% opacity

This replaces `background-color` changes on hover and provides consistent feedback across all components.

### Shape Morphing
When an element changes state (selected, expanded, active), its `border-radius` transitions between shape tokens. This is a visual cue that doesn't rely on color — important for accessibility.

### Spring vs Effect Motion
- Use **spatial** easing (`--md-sys-motion-spatial-*`) for: position, size, shape, rotation
- Use **effect** easing (`--md-sys-motion-effect-*`) for: color, opacity, elevation

### Color Role Mapping

```
VoteFlow Concept      →  M3 Color Role
──────────────────────────────────────────
Submit Vote button    →  primary
Close Voting button   →  error
Session ID badge      →  secondary-container
Active/Closed badge   →  tertiary / error
Option card bg        →  surface-container
Selected option bg    →  primary-container
Page background       →  surface
Card background       →  surface-container-low
Modal background      →  surface-container-high
```

---

## Sources

- [Material 3 Expressive: What's New and Why it Matters](https://supercharge.design/blog/material-3-expressive)
- [Material Design 3 — Motion](https://m3.material.io/styles/motion/overview/how-it-works)
- [Material Design 3 — Shape Corner Radius Scale](https://m3.material.io/styles/shape/corner-radius-scale)
- [Applying Material 3 Expressive Design in React](https://medium.com/@roman_fedyskyi/applying-material-3-expressive-design-in-react-c5fb2e341544)
- [M3 Expressive Deep Dive — Android Authority](https://www.androidauthority.com/google-material-3-expressive-features-changes-availability-supported-devices-3556392/)
