# Proposal 5: Zero-UI Minimal

> Strip the interface to its essence. Reduce chrome, maximize content, use whitespace as a design element. Inspired by the 2026 Zero-UI / Invisible Interfaces trend.

---

## Overview

This proposal removes visual noise — decorative borders, heavy shadows, colored badges — and replaces them with **whitespace, typography hierarchy, and subtle dividers**. The interface becomes almost invisible; the content (session title, voting options, results) is the UI. Interactive elements are discoverable through micro-cues (underlines, opacity shifts) rather than heavy styling.

### Why Zero-UI?

- **Focus on the task**: Voting should be fast and frictionless. Every pixel of chrome is a distraction from the decision at hand.
- **Timeless aesthetic**: Minimal design doesn't age. While glass effects and neumorphism may cycle in and out of fashion, clean typography and whitespace remain relevant.
- **Performance**: Fewer visual effects = faster renders, less CSS, better performance on all devices.
- **2026 alignment**: The Zero-UI trend prioritizes content over container, reducing visible interface elements to let the task speak for itself.

---

## Design Principles

1. **Content IS the interface** — The session title, options, and results are the visual anchors. No surrounding card needs to tell you they're important.
2. **Progressive disclosure** — Controls appear when needed. The share button appears on hover/focus. Export options appear after voting closes.
3. **Typography as hierarchy** — Size, weight, and spacing replace color and borders for establishing visual order.
4. **Monochrome + one accent** — A single primary accent color (indigo) is the only color in the neutral palette. Voting method colors remain for data visualization only.

---

## Design Tokens (CSS Variables)

```css
/* ============================================================
   ZERO-UI MINIMAL — Design Tokens

   Naming convention:
     --z-<property>            (zero-ui specific tokens)
     --type-<level>            (typography scale)
     --color-<semantic>        (minimal palette)

   Philosophy:
     Fewer variables = fewer decisions = more consistency.
     This token set is intentionally smaller than the others.
   ============================================================ */

:root {
  /* --- Surfaces (barely different from each other) --- */
  --z-bg:           #ffffff;
  --z-bg-subtle:    #fafafa;
  --z-bg-hover:     #f5f5f5;

  /* --- Borders (almost invisible — structural only) --- */
  --z-divider:      #e8e8e8;
  --z-divider-bold: #d4d4d4;

  /* --- Text (three levels only) --- */
  --z-text:         #171717;
  --z-text-secondary: #737373;
  --z-text-tertiary:  #a3a3a3;

  /* --- Accent (single color for all interactive elements) --- */
  --z-accent:       #6366f1;
  --z-accent-hover: #4f46e5;
  --z-accent-soft:  rgba(99, 102, 241, 0.08);
  --z-accent-focus: rgba(99, 102, 241, 0.12);

  /* --- Semantic (used sparingly — results chart, badges) --- */
  --color-success:  #16a34a;
  --color-danger:   #dc2626;
  --color-ranked:   #8b5cf6;
  --color-approval: #06b6d4;
  --color-score:    #f97316;

  /* --- Typography scale --- */
  --type-xs:   0.75rem;    /* 12px — labels, tertiary */
  --type-sm:   0.875rem;   /* 14px — body small, secondary */
  --type-base: 1rem;       /* 16px — body */
  --type-lg:   1.25rem;    /* 20px — section headings */
  --type-xl:   1.75rem;    /* 28px — page title */
  --type-2xl:  2.25rem;    /* 36px — hero (home page) */

  /* --- Spacing (generous whitespace) --- */
  --z-space-xs:  0.5rem;   /* 8px */
  --z-space-sm:  1rem;     /* 16px */
  --z-space-md:  1.5rem;   /* 24px */
  --z-space-lg:  2.5rem;   /* 40px */
  --z-space-xl:  4rem;     /* 64px */

  /* --- Transitions --- */
  --z-transition: 150ms ease;

  /* --- Max content width (narrower for readability) --- */
  --z-max-width: 960px;
}

[data-theme="dark"] {
  --z-bg:           #0a0a0a;
  --z-bg-subtle:    #111111;
  --z-bg-hover:     #1a1a1a;

  --z-divider:      #262626;
  --z-divider-bold: #333333;

  --z-text:         #fafafa;
  --z-text-secondary: #a3a3a3;
  --z-text-tertiary:  #666666;

  --z-accent:       #818cf8;
  --z-accent-hover: #6366f1;
  --z-accent-soft:  rgba(129, 140, 248, 0.10);
  --z-accent-focus: rgba(129, 140, 248, 0.15);
}
```

---

## Component Changes

### Card — Invisible Container

Cards lose their background, border, and shadow. They become transparent containers with optional top dividers.

```css
/* Card.module.css */
.card {
  background: transparent;
  border: none;
  box-shadow: none;
  border-radius: 0;
  padding: var(--z-space-md) 0;
  /* Divider between stacked cards */
  border-top: 1px solid var(--z-divider);
}

.card:first-child {
  border-top: none;
}

/* Hoverable variant gets a subtle background on hover */
.card.hoverable:hover {
  background: var(--z-bg-subtle);
  border-radius: 8px;
  margin: 0 calc(-1 * var(--z-space-sm));
  padding: var(--z-space-md) var(--z-space-sm);
}
```

### Button — Text-Forward

Primary buttons are solid. All other buttons are text-only with an underline or subtle background.

```css
/* Button.module.css */
.button {
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--z-transition);
  background: transparent;
  color: var(--z-text);
}

/* Primary: solid accent — the ONLY heavy element on screen */
.primary {
  background: var(--z-accent);
  color: #fff;
  padding: 12px 24px;
}
.primary:hover {
  background: var(--z-accent-hover);
}
.primary:active {
  transform: scale(0.98);
}

/* Secondary: subtle background */
.secondary {
  background: var(--z-bg-subtle);
  color: var(--z-text);
  padding: 10px 20px;
}
.secondary:hover {
  background: var(--z-bg-hover);
}

/* Ghost: text only, underline on hover */
.ghost {
  background: transparent;
  color: var(--z-text-secondary);
  padding: 8px 4px;
  text-decoration: none;
}
.ghost:hover {
  color: var(--z-text);
  text-decoration: underline;
}

/* Danger: text-red, no background */
.danger {
  background: transparent;
  color: var(--color-danger);
  padding: 10px 20px;
}
.danger:hover {
  background: rgba(220, 38, 38, 0.06);
}
```

### Input — Borderless Until Focus

```css
/* Input.module.css */
.input {
  background: transparent;
  border: none;
  border-bottom: 1.5px solid var(--z-divider);
  border-radius: 0;
  color: var(--z-text);
  padding: 12px 0;
  font-size: var(--type-base);
  min-height: 44px;
  width: 100%;
  transition: border-color var(--z-transition);
}

.input:focus {
  outline: none;
  border-bottom-color: var(--z-accent);
}

.input::placeholder {
  color: var(--z-text-tertiary);
}

/* Label: small, above the line */
.label {
  font-size: var(--type-xs);
  color: var(--z-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}
```

### Option Cards — Clean List Items

Options become simple rows with generous spacing. Selection is indicated by accent color + a subtle left border.

```css
/* SessionPage.module.css */
.option {
  display: flex;
  align-items: center;
  gap: var(--z-space-sm);
  padding: var(--z-space-sm) var(--z-space-sm);
  margin: 0 calc(-1 * var(--z-space-sm));
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--z-transition);
  border-left: 3px solid transparent;
}

.option:hover {
  background: var(--z-bg-subtle);
}

.option.selected {
  background: var(--z-accent-soft);
  border-left-color: var(--z-accent);
}

/* Checkbox: minimal circle/check */
.checkbox {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid var(--z-divider-bold);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--z-transition);
}

.checkbox.checked {
  background: var(--z-accent);
  border-color: var(--z-accent);
  color: #fff;
}

/* Option name: just text */
.optionName {
  font-size: var(--type-base);
  color: var(--z-text);
}
```

### Badge — Minimal Pill

```css
/* Badge.module.css */
.badge {
  font-size: var(--type-xs);
  font-weight: 500;
  color: var(--z-text-secondary);
  background: transparent;
  border: 1px solid var(--z-divider);
  padding: 2px 8px;
  border-radius: 999px;
}

.badge.success {
  color: var(--color-success);
  border-color: var(--color-success);
}
```

### Results Chart — Clean Bars

```css
/* ResultsChart.module.css */
.barContainer {
  display: flex;
  align-items: center;
  gap: var(--z-space-sm);
  padding: var(--z-space-xs) 0;
}

.barLabel {
  width: 120px;
  font-size: var(--type-sm);
  color: var(--z-text);
  text-align: right;
  flex-shrink: 0;
}

.barTrack {
  flex: 1;
  height: 8px;
  background: var(--z-bg-subtle);
  border-radius: 4px;
  overflow: hidden;
}

.barFill {
  height: 100%;
  border-radius: 4px;
  transition: width 300ms ease;
  /* Color comes from voting method */
}

.barValue {
  width: 48px;
  font-size: var(--type-xs);
  color: var(--z-text-tertiary);
  text-align: left;
}
```

### Header — Minimal

```css
/* SessionPage.module.css */
.header {
  display: flex;
  align-items: baseline;
  gap: var(--z-space-sm);
  padding: var(--z-space-md) 0;
  border-bottom: 1px solid var(--z-divider);
}

.title {
  font-size: var(--type-xl);
  font-weight: 600;
  color: var(--z-text);
  font-family: var(--font-sans); /* drop monospace for headings */
}

.sessionId {
  font-size: var(--type-xs);
  color: var(--z-text-tertiary);
  font-family: var(--font-mono);
}
```

---

## Layout Changes

### Narrower Max Width

```css
.container {
  max-width: var(--z-max-width); /* 960px instead of 1200px */
  margin: 0 auto;
  padding: 0 var(--z-space-md);
}
```

### More Generous Vertical Spacing

```css
.content {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: var(--z-space-xl); /* 64px gap instead of 24px */
}

@media (max-width: 900px) {
  .content {
    grid-template-columns: 1fr;
    gap: var(--z-space-lg);
  }
}
```

---

## Progressive Disclosure Patterns

### Share/Copy Controls

Currently always visible. In Zero-UI, they appear on hover or focus of the session ID.

```css
.meta {
  position: relative;
}

.shareControls {
  opacity: 0;
  transition: opacity var(--z-transition);
}

.meta:hover .shareControls,
.meta:focus-within .shareControls {
  opacity: 1;
}

/* Always visible on touch devices */
@media (hover: none) {
  .shareControls { opacity: 1; }
}
```

### Export Buttons

Only visible when session is closed (results are final).

```css
.exportButtons {
  display: none;
}
.exportButtons.visible {
  display: flex;
  gap: var(--z-space-xs);
  padding-top: var(--z-space-sm);
  border-top: 1px solid var(--z-divider);
}
```

---

## Mobile Considerations

- **Generous touch targets**: All interactive elements remain >= 44px tall despite minimal styling.
- **Bottom-line inputs**: Underline-only inputs work naturally on mobile — no need for box borders that feel cramped on small screens.
- **Reduced whitespace on mobile**: `--z-space-xl: 2.5rem` and `--z-space-lg: 1.5rem` on screens below 480px.

```css
@media (max-width: 480px) {
  :root {
    --z-space-xl: 2.5rem;
    --z-space-lg: 1.5rem;
    --type-xl: 1.5rem;
    --type-2xl: 1.75rem;
  }
}
```

---

## File Change Summary

| File | Change |
|---|---|
| `src/styles/global.css` | Minimal token set, typography scale, theme selectors |
| `src/components/ThemeToggle.tsx` | New component (icon only, no label) |
| `src/components/Card.module.css` | Transparent container, divider borders only |
| `src/components/Button.module.css` | Text-forward: solid primary, ghost/text variants |
| `src/components/Input.module.css` | Bottom-border-only inputs |
| `src/components/Select.module.css` | Bottom-border selects |
| `src/components/Badge.module.css` | Thin-border pills, transparent bg |
| `src/components/ResultsChart.module.css` | Slim bars (8px), clean labels |
| `src/pages/SessionPage.module.css` | List-style options, progressive disclosure |
| `src/pages/HomePage.module.css` | Large typography hero, minimal forms |

---

## What Gets Removed

This proposal is unique in that it **removes** more CSS than it adds:

| Removed | Reason |
|---|---|
| Card box-shadow | Unnecessary decoration |
| Card background color | Content doesn't need a container |
| Button border-radius on ghost | Text buttons don't need pill shapes |
| Heavy modal overlay | Replaced with a subtle dimmer |
| Gradient hero background | Replaced with large typography |
| Monospace font on headings | Sans-serif is cleaner for minimal aesthetic |
| Badge text-transform uppercase | Calmer without shouting |

---

## Visual Summary

```
Current Design                    Zero-UI Design
┌─────────────────────┐
│ ┌─ Card ──────────┐ │          Session Title
│ │ ● Option A      │ │          ─────────────────────────
│ │ ○ Option B      │ │          │ ● Option A
│ │ ○ Option C      │ │            Option B
│ │ [Submit Vote]   │ │            Option C
│ └─────────────────┘ │
│ ┌─ Card ──────────┐ │          [Submit Vote]
│ │ Results          │ │
│ │ ████████ 60%    │ │          ─────────────────────────
│ │ ████ 30%        │ │          Results
│ │ ██ 10%          │ │
│ └─────────────────┘ │          Option A  ████████  60%
└─────────────────────┘          Option B  ████      30%
                                 Option C  ██        10%
   Heavy chrome,
   boxes everywhere                 Whitespace IS the design
```
