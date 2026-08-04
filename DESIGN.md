---
name: AI Shopify Builder
description: Describe a Shopify app in plain English; AI plans, builds, and previews it.
colors:
  ink: "#171717"
  paper: "#ffffff"
  spark-indigo: "#6366f1"
  amber-caution: "#b45309"
  emerald-ready: "#047857"
  red-failed: "#b91c1c"
typography:
  display:
    fontFamily: "Geist Sans, Arial, Helvetica, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist Sans, Arial, Helvetica, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist Sans, Arial, Helvetica, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist Sans, Arial, Helvetica, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
  mono:
    fontFamily: "Geist Mono, monospace"
rounded:
  pill: "9999px"
  lg: "16px"
  md: "8px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "rgba(23,23,23,0.85)"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "44px"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: AI Shopify Builder

## Overview

**Creative North Star: "The Quiet Workshop"**

The interface is a tool that gets out of the way. Black ink on white paper, one spark of indigo, and nothing else competing for attention — because the thing worth looking at is the app the AI is building, not the chrome around it. Density stays low: wide margins, generous line height, short bursts of copy. The workshop is quiet by design so that when the indigo accent appears — a badge, an icon glow, a focus ring — it reads unmistakably as "the AI is working here."

This is a restrained system, not a decorative one. Surfaces are nearly flat; depth is suggested rather than staged. Ornament is limited to a single hand-drawn logomark and a sparse set of line icons at 1.75px stroke. Nothing about the visual language distracts from the plain-English prompt box, which stays the compositional center of gravity on both the marketing page and the dashboard.

**Key Characteristics:**
- Monochrome ink-on-paper base, one indigo accent used sparingly
- Rounded-full (pill) buttons and badges throughout
- Ambient, barely-there elevation — cards float, they don't announce
- Geist Sans for everything; Geist Mono reserved for code/terminal surfaces
- Generous whitespace and low visual density at every breakpoint

## Colors

Two neutrals and one accent, plus three status hues borrowed strictly for state, never for branding.

### Primary
- **Spark Indigo** (`#6366f1`): The system's only accent. Used for the AI/sparkle badge, the logomark's signature dot, and focus rings. Never used for large fills or backgrounds — its rarity is the point.

### Neutral
- **Ink** (`#171717` / pure `#000000` on marketing surfaces): Primary text, primary button fill, headings.
- **Paper** (`#ffffff`): Page and card background.
- **Ink washes**: `black/60`, `black/50`, `black/40`, `black/25`, `black/10`, `black/[0.02]` — the entire secondary-text, border, and hairline-divider vocabulary is opacity steps of Ink, not separate gray tokens.

### Status (state only, not brand)
- **Amber Caution** (`#b45309` on `amber-50`): Planning / generating states.
- **Emerald Ready** (`#047857` on `emerald-50`): Ready state.
- **Red Failed** (`#b91c1c` on `red-50`): Failed state.

### Named Rules
**The One Spark Rule.** Spark Indigo appears at most once or twice per screen — an icon fill, a badge dot, a focus ring. It never becomes a background or a large surface color. If a screen needs more color than that, reach for the status hues, not more indigo.

## Typography

**Display Font:** Geist Sans (with Arial, Helvetica, sans-serif fallback)
**Label/Mono Font:** Geist Mono, reserved for code, terminal output, and IDs

**Character:** A single clean grotesk carries the entire system — confident and neutral, never decorative. Weight does the work of hierarchy (400 → 500 → 600), not typeface switching.

### Hierarchy
- **Display** (600, `clamp(1.875rem, 4vw, 3rem)`, tight leading, `-0.02em` tracking): Hero headline on marketing page only.
- **Title** (600, `1rem`–`1.5rem`, `-0.01em` tracking): Section headings, card titles, dashboard prompt heading.
- **Body** (400, `0.875rem`–`1rem`, 1.5 line-height): Paragraph copy, descriptions. Held to roughly 60ch max width in prose blocks.
- **Label** (500, `0.75rem`, occasionally uppercase with wide tracking for section eyebrows like "YOUR PROJECTS"): Badges, meta text, form labels.

### Named Rules
**The Weight-Not-Family Rule.** Hierarchy is built by moving between 400/500/600 weight and size, never by introducing a second typeface. Geist Mono is the one sanctioned exception, reserved strictly for code and terminal contexts.

## Layout

Centered, constrained containers at three widths depending on context: `max-w-3xl` for focused hero/CTA content, `max-w-5xl` for the dashboard and workspace body, `max-w-6xl` for the marketing page's wider feature grid. Content never runs edge-to-edge on desktop. Vertical rhythm is generous — sections take 16–28 units (`py-16` to `py-28`) of breathing room, and cards use consistent internal padding around 16–24px (`p-4` to `p-6`). Grids collapse from 3-column (feature cards, project cards) to single-column below `sm`.

## Elevation & Depth

Ambient and barely-there. Cards rest on a nearly imperceptible shadow (`0 1px 2px rgba(0,0,0,0.04), 0 12px 32px -16px rgba(0,0,0,0.08)`) — enough to separate paper from paper, not enough to feel staged. Depth is not a hierarchy signal here; a hairline border (`border-black/10`) does most of the separation work, with shadow only adding ambient lift. Interactive lift on hover (dashboard project cards translate up 2px and deepen border) is the one place shadow/position responds to state.

### Shadow Vocabulary
- **Ambient card** (`box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 12px 32px -16px rgba(0,0,0,0.08)`): Default resting state for feature and project cards.

### Named Rules
**The Ambient-Not-Staged Rule.** Shadow exists to soften the edge between surfaces, not to announce importance. If a shadow is doing the job a border and 2px of hover-lift could do instead, prefer the border.

## Shapes

Two silhouettes only: **fully rounded (pill, `9999px`)** for anything actionable — buttons, badges, the eyebrow chip — and **large soft corners (`16px`, `rounded-2xl`)** for containers — cards, dashed empty-states. Nothing in between; a sharp corner or a small 4–8px radius would read as foreign to this system. Borders are hairline (`1px`, `black/10`), never heavier.

## Components

Restrained and unornamented across the board — confidence expressed through restraint, not visual weight.

### Buttons
- **Shape:** Pill (`rounded-full`, `9999px`), height 44px (`h-11`), horizontal padding 24px.
- **Primary:** Ink background, paper text, `hover:bg-black/85`. Focus ring in Spark Indigo (`focus-visible:outline-[#6366f1]`).
- **Secondary / Ghost:** Transparent or `black/[0.03]` on hover, hairline `black/10` border, ink text. No fill at rest.
- **Small/inline actions** (e.g. "Log out"): text-only, `black/50` → `black` on hover, no border or fill at any state.

### Cards / Containers
- **Corner Style:** `16px` (`rounded-2xl`).
- **Background:** Paper.
- **Shadow Strategy:** Ambient card shadow at rest; hover adds `-translate-y-0.5` and deepens border to `black/20` on interactive (link) cards.
- **Border:** Hairline `black/10`.
- **Internal Padding:** 16–24px.

### Badges (Status)
- **Style:** Pill, `px-2.5 py-1`, `text-xs font-medium`, background/text pair scoped per status (amber/emerald/red/neutral washes — see Colors → Status).
- **State:** Pulsing states (Planning, Generating) show a small animated ping dot in the current color before the label.

### Inputs / Fields
- **Style:** Follows the hairline-border, low-fill convention established by buttons; no evidence yet of a dedicated input treatment beyond the prompt textarea — treat as inheriting card/button radius and border language until a form-heavy surface is built.

### Navigation
- **Style:** A flat header bar — logo left, text links + one pill CTA right. No background, no shadow, no active-state underline observed; relies on the pill CTA and plain text link color shift (`black/70` → `black`) for wayfinding.

### Logomark (Signature Component)
A rounded-square (`rx=8`) black tile containing a white padlock/pouch glyph, with a small solid Spark Indigo dot at the top-right corner — the one place the accent lives permanently in the UI. This dot is the system's signature: any new "AI is present" indicator elsewhere should echo it rather than invent a new motif.

## Do's and Don'ts

### Do:
- **Do** keep Spark Indigo to a single accent role per screen — icon, dot, or focus ring, never a fill.
- **Do** use pill shapes for anything clickable and `16px` soft corners for containers — no other radius values.
- **Do** lean on opacity steps of Ink (`black/5` through `black/70`) for secondary text and borders instead of introducing new grays.
- **Do** keep shadows ambient; let hairline borders carry most surface separation.

### Don't:
- **Don't** introduce a second typeface; Geist Mono is reserved strictly for code/terminal, never for UI chrome.
- **Don't** use heavy or high-contrast drop shadows — nothing in this system announces itself that loudly.
- **Don't** use sharp (0px) or small (4px) corner radii; they read as foreign to the pill/16px vocabulary.
- **Don't** let status colors (amber/emerald/red) leak into branding contexts — they're reserved for project/generation state only.
