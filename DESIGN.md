---
name: BakeryOS
description: Production intelligence platform for commercial artisan bakers
colors:
  amber-action: "#d97706"
  amber-hover: "#b45309"
  amber-signal: "#f59e0b"
  amber-tint: "#fef3c7"
  amber-border: "#fde68a"
  stone-ink: "#1c1917"
  stone-text: "#57534e"
  stone-muted: "#a8a29e"
  stone-surface: "#f5f5f4"
  stone-border: "#e7e5e4"
  stone-ground: "#fafaf9"
  amoled-bg: "#000000"
  amoled-surface: "#0a0a0a"
  amoled-elevated: "#111111"
  amoled-border: "#1a1a1a"
  state-success: "#15803d"
  state-danger: "#b91c1c"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 900
    lineHeight: 1.1
  headline:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 900
    letterSpacing: "0.1em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.amber-action}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.amber-hover}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.stone-text}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost-hover:
    backgroundColor: "{colors.stone-ground}"
    textColor: "{colors.stone-ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  nav-item-active:
    backgroundColor: "{colors.amber-tint}"
    textColor: "{colors.amber-hover}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  nav-item-default:
    backgroundColor: "transparent"
    textColor: "{colors.stone-text}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  card:
    backgroundColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  input:
    backgroundColor: "#ffffff"
    textColor: "{colors.stone-ink}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
---

# Design System: BakeryOS

## 1. Overview

**Creative North Star: "The Millstone"**

A millstone does not decorate grain; it transforms it through weight and exactness. BakeryOS applies the same logic to bakery operations. The interface holds shift starts, batch weights, inventory states, and cost margins without ornamentation. Every design choice is structural: it either makes the next action faster or it does not belong.

The system runs in two modes. Light is a warm-professional workspace: amber-parchment application background against white card surfaces, stone-ink text, amber accent reserved for active states and primary actions. The warmth is calibrated enough to distinguish this from a generic SaaS tool, without cosplaying a bakery aesthetic. AMOLED is true black with amber signal, for OLED hardware or low-light production environments where every wasted photon is noise. Neither mode should be identifiable as a "bakery app" by visual category. Both should read as a serious production ledger.

The design explicitly refuses: generic SaaS metric dashboards, AI-aesthetic soft shadows and gradient text, template-heavy layouts trading density for polish, decorative filler where operational data belongs, and warm-honey color schemes that obscure the professional character of the tool. The baker using this is working, not browsing.

**Key Characteristics:**
- Flat by default: tonal layering communicates depth; shadows signal state change only
- Amber restraint: the accent appears on active elements and primary actions, nowhere decorative
- System font only: no web font overhead; hierarchy built through weight contrast (400 / 700 / 900)
- Two operating modes: light (warm-professional) and AMOLED (true black)
- Dense and legible: information-forward layouts; the next action is always obvious

## 2. Colors: The Working Document Palette

One accent color across a stone-neutral base. Amber earns its place by appearing only where something requires attention or action.

### Primary

- **Amber Action** (`#d97706`): Primary interactive color. CTAs, active navigation states, focus rings. Its scarcity is the mechanism — overuse it and nothing stands out.
- **Amber Hover** (`#b45309`): Hover and pressed state for amber-action elements. Darker, more deliberate.
- **Amber Signal** (`#f59e0b`): AMOLED accent variant; brighter amber for contrast on true black. Active icons in both themes.
- **Amber Tint** (`#fef3c7`): Active navigation item background in light mode. Near-invisible saturation; warmth without noise.
- **Amber Border** (`#fde68a`): Conditional card borders when a work order or item is active or alert-adjacent.

### Neutral

- **Stone Ink** (`#1c1917`): Primary text, light mode. Warm-tinted near-black, never pure `#000`.
- **Stone Text** (`#57534e`): Body copy, labels, secondary content throughout.
- **Stone Muted** (`#a8a29e`): Placeholder text, inactive icons, timestamps, supporting metadata.
- **Stone Surface** (`#f5f5f4`): Table header backgrounds, elevated card surfaces.
- **Stone Border** (`#e7e5e4`): Default borders and horizontal dividers.
- **Stone Ground** (`#fafaf9`): Hover fill for ghost buttons and table rows.

### AMOLED Variants

- **True Black** (`#000000`): Application background. Hard requirement; approximations break OLED power savings.
- **Void Surface** (`#0a0a0a`): Panel and card backgrounds.
- **Lifted Dark** (`#111111`): Elements elevated above Void Surface.
- **Carbon Border** (`#1a1a1a`): All borders and dividers on dark backgrounds.

### Status

- **Mill Green** (`#15803d`): Completed work orders, success states.
- **Danger Red** (`#b91c1c`): Low stock, errors, destructive actions.

### Named Rules

**The Amber Restraint Rule.** Amber appears on interactive elements, active states, and critical data. It does not appear on decorative borders, background washes (except the amber-tint nav active state), or anywhere the intent is warmth rather than signal. If amber is on screen and nothing requires the user's attention, it is in the wrong place.

**The No-Pure-Extremes Rule.** Light mode primary text is stone-ink (`#1c1917`), not `#000`. The ink is warm. AMOLED backgrounds are an intentional exception: the background IS black; text stays near-white (`#fafafa`).

## 3. Typography

**Body Font:** System sans-serif (`ui-sans-serif, system-ui, sans-serif`)
**Data Font:** System monospace (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`)

**Character:** Single-family, system-native. Hierarchy is built through weight contrast, not typeface personality. Three weights in use: 400 (body), 700 (bold), 900 (black). Nothing between them. Monospace is reserved for operational data: IDs, weights, quantities, yields — wherever the number matters more than the prose.

### Hierarchy

- **Display** (900 weight, 30px, 1.1 line-height): KPI values, batch totals. Large and unambiguous.
- **Headline** (700 weight, 20px, 1.3 line-height): Page-level headings, major section titles.
- **Title** (700 weight, 14px, 1.4 line-height): Card headers, subsection titles. Bold at body size reads as a clear step without increasing size.
- **Body** (400 weight, 14px, 1.6 line-height): All content text. Column width and sidebar naturally cap line lengths.
- **Label** (900 weight, 10px, uppercase, 0.1em tracking): Section category markers ("HOME", "QUICK ACTIONS"). Extreme weight at minimum size creates navigational hierarchy without consuming vertical space.
- **Mono** (700 weight, 14px, monospace): Work order IDs, ingredient weights, yield calculations. Bold ensures legibility at data density; monospace aligns columns.

### Named Rules

**The Weight Contrast Rule.** Adjacent text elements at the same size require at least 200 weight difference to register as a hierarchy step. 400 to 700 is a step. 700 to 900 is a step. Never 500 to 600 or 600 to 700 — the eye cannot read those as hierarchy.

**The Label Protocol.** The 10px uppercase font-black label names a region of the interface, not a data point. It is not a substitute for small body text or fine-print copy.

## 4. Elevation

Flat by default. Surface identity comes from tonal layering (stone-ground to stone-surface to white in light mode; true black to void to lifted in AMOLED), not from shadows. Shadows appear as state change only.

### Shadow Vocabulary

- **Resting Card** (`0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`): Applied to cards and panels at rest. Confirms the surface exists above the page background without announcing it.
- **Hover Card** (`0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): Applied to interactive cards on hover. The lift communicates interactivity; it is a response, not a decoration.

### Named Rules

**The State-Only Shadow Rule.** A shadow that does not change on hover or focus is decoration. Apply shadows only when tonal layering cannot convey the depth, or as a response to interactive state.

## 5. Components

### Buttons

Confident and direct. Border radius (8px) is functional. No pill shapes. Text is semibold at 14px, not uppercase — readable and assertive without shouting.

- **Shape:** 8px radius
- **Primary:** Amber-action background, white text, 8px/16px padding. Reserved for the single most important action per view.
- **Hover:** Amber-hover background, 150ms ease. No transform or scale.
- **Focus:** 2px amber-signal ring, 2px offset.
- **Ghost:** Transparent, stone-border (1px), stone-text. Stone-ground fill on hover. Secondary actions alongside a primary CTA.

### Navigation (Sidebar)

Fixed 256px. Nav items match button radius (8px). Sub-navigation indents through margin and lighter weight, never through a colored side rule.

- **Default:** Transparent, stone-text, stone-muted icon. Stone-ground fill on hover.
- **Active:** Amber-tint background, amber-hover text, amber-signal icon.
- **Sub-items:** 28px left margin from main nav, smaller icon (16px), lighter text color (stone-500). Indent and weight contrast carry the hierarchy; no left rule needed.

### Cards and Section Panels

- **Corner Style:** 12px radius
- **Background:** White (light) / near-black (AMOLED)
- **Shadow:** Resting Card at rest; Hover Card on interactive panels.
- **Border:** Always present. stone-border light, amoled-border dark. The border does the heavy lifting when shadow is absent.
- **Internal Padding:** 20px for content regions; 24px for full page sections.

### Inputs and Search Fields

- **Style:** White background, stone-border (1px), 6px radius (tighter than buttons; readable as a different component class).
- **Focus:** 2px amber-signal ring, border shifts to amber-signal. Outline removed.
- **Placeholder:** Stone-muted. Icon prefix at 16px left-positioned with 36px left padding on the input.

### Status Badges

4px radius, inline. Color paired with text label always — color alone is not sufficient.

- **In Production:** Amber-tint background / amber-hover text
- **Complete:** Emerald-100 / emerald-700
- **Scheduled:** Blue-100 / blue-700
- **Draft:** Stone-surface / stone-text

### Data Tables

No alternating row backgrounds. Divide-y carries the rhythm alone. Full-row click targets.

- **Header:** Stone-surface background; stone-muted text; 10px uppercase medium tracking-wider.
- **Rows:** Divide-y stone-border (light) / amoled-border/40 (AMOLED); hover fill stone-ground / dark-hover.
- **Cell padding:** 20px horizontal, 12px vertical.
- **Data cells:** Stone-ink for primary values, stone-text for supporting values, mono font-bold for weights and IDs.

### KPI Cards (Interactive Dashboard)

Clickable summary cards. Border shifts to amber-border when the metric is active or alert-relevant; stays stone-border when neutral.

- **Structure:** Label (10px font-black uppercase) then value (display weight) then supporting text (xs stone-muted).
- **Hover:** Shadow lifts from resting to hover. No size change; the elevation is the response.
- **Value color:** Amber-action for active/alert counts; stone-muted for zero-state neutral values.

## 6. Do's and Don'ts

### Do

- **Do** use amber exclusively as signal: active states, primary CTAs, critical data, focus rings. Its scarcity is the point.
- **Do** use stone-ink (`#1c1917`) for primary text in light mode, never `#000`.
- **Do** reserve the 10px font-black uppercase label style for region names only, not microcopy or fine print.
- **Do** keep AMOLED backgrounds at true black (`#000000`); approximations defeat the purpose on OLED hardware.
- **Do** pair shadow-sm at rest with shadow-md on hover for interactive cards. Shadows must earn meaning by changing with state.
- **Do** use font-mono font-bold for all weights, IDs, quantities, and calculated numerical values.
- **Do** hold to the radius scale: 8px buttons/nav, 12px cards, 6px inputs/badges. It is intentional.
- **Do** use tonal layering (stone-ground, stone-surface, white) before reaching for borders or shadows.

### Don't

- **Don't** use AI UI aesthetics: gradient text, glassmorphism, hero-metric templates (large number with gradient accent), or identical icon-heading-text card grids.
- **Don't** build generic SaaS dashboards or add decorative filler where operational data belongs. If it reads as a recipe website rather than a production ledger, it has failed.
- **Don't** put amber on decorative borders, background washes, or anywhere its intent is warmth rather than signal.
- **Don't** use font weights between 400 and 700. The system has three: 400, 700, 900. Intermediate weights break the contrast doctrine.
- **Don't** use border-left or border-right greater than 1px as a colored stripe on any element. The system has no exceptions; sidebar sub-navigation indents through margin alone.
- **Don't** use scale transforms on hover. Visual feedback comes through shadow lift and color change, never through size change. The Millstone does not bounce when you look at it.
- **Don't** nest cards inside cards. Two surface levels per view is the maximum.
- **Don't** add shadows to static, non-interactive elements. Shadows are state, not depth decoration.
- **Don't** apply a bakery-themed visual aesthetic: rustic textures, bread illustration, wheat motifs, serif display fonts, or warm-honey palettes that make the tool look like a recipe site. The bakery character comes from operational purpose, not visual costume.
- **Don't** animate CSS layout properties (width, height, padding, margin). Transitions use background-color, box-shadow, and color only.
- **Don't** ship motion without `prefers-reduced-motion` support. All transitions must be suppressible.
