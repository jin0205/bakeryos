# Claude Code Automations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up hooks, skills, a subagent, and CLAUDE.md so Claude Code is tuned to the BakeryOS project.

**Architecture:** All config lives in `.claude/` at the repo root (tracked by git). The existing `.gitignore` blanket-ignores `.claude/` — we fix that first so hooks/skills/agents are committed. No MCP installs needed: context7 and Kapture are already available globally.

**Tech Stack:** React 19, Vite 6, TypeScript 5.8, Tailwind CSS (dark mode via `dark:` prefix), Gemini AI (`@google/genai`), localStorage for persistence.

---

### Task 1: Fix .gitignore — track `.claude/` config selectively

**Why first:** Every subsequent file we create in `.claude/` needs to be committed. Right now `.claude/` is fully gitignored.

**Files:**
- Modify: `.gitignore`

**Step 1: Replace the blanket ignore with selective ignores**

Open `.gitignore` and replace the `# Claude Code` block (last 3 lines) with:

```
# Claude Code — ignore local state, track project config
.claude/worktrees/
.claude/memory/
.claude/settings.local.json
```

**Step 2: Verify git now sees `.claude/` as trackable**

Run:
```bash
git -C /Users/kevin/sourdough-pro-ai status
```
Expected: `.claude/` no longer appears under "untracked files" once we add config files inside it.

**Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: selectively gitignore .claude local state, track project config"
```

---

### Task 2: Create CLAUDE.md — project memory for Claude

**Why:** Claude reads this at the start of every session. Without it, Claude re-discovers the stack, conventions, and domain every time.

**Files:**
- Create: `CLAUDE.md`

**Step 1: Write the file**

Create `CLAUDE.md` at the repo root with this content:

```markdown
# BakeryOS — Claude Project Memory

## What This Is
BakeryOS is a sourdough/artisan bakery ERP web app for commercial baker Kevin. It manages formulas (recipes), production scheduling, inventory, cost analysis, and R&D. AI features use Google Gemini.

## Tech Stack
- **React 19** + **TypeScript 5.8** + **Vite 6**
- **Tailwind CSS** — dark mode via `dark:` prefix, amber/stone color palette
- **Google Gemini** (`@google/genai`) — accessed via `services/geminiService.ts`
- **localStorage** — all data persistence (no backend, no database)
- No test suite yet

## Project Structure
```
components/          # All UI — one file per feature, React.FC pattern
  Sidebar.tsx        # Nav: registers all top-level tabs + sub-tabs
  App.tsx (root)     # Tab routing, dark mode state, top-level layout
services/
  geminiService.ts   # All Gemini API calls, prompt templates
types.ts             # Shared TypeScript types (Recipe, WorkOrder, etc.)
```

## UI Conventions
- Components are `React.FC` with explicit prop interfaces
- Dark mode classes always paired: `bg-white dark:bg-stone-900`
- Amber palette for active/brand elements: `text-amber-600`, `bg-amber-50 dark:bg-amber-900/20`
- Stone palette for neutral/chrome: `text-stone-600 dark:text-stone-400`
- localStorage keys prefixed: `bakeryos_<feature>`
- No CSS modules, no styled-components — Tailwind only

## Adding a New Top-Level Feature Tab
1. Create `components/MyFeature.tsx` as `React.FC`
2. Add tab ID to the `Tab` union type in `Sidebar.tsx`
3. Add entry to `mainNavItems` array in `Sidebar.tsx` (id, label, Icon)
4. Add prop types to `SidebarProps` if sub-tabs needed
5. Add render case in `App.tsx`

## Gemini Prompt Conventions
- All weights must be in **grams** — include unit normalization instructions
- Use Baker's Percentages where relevant
- Structured JSON output preferred for recipe data
- See `services/geminiService.ts` for the `NORMALIZATION_INSTRUCTIONS` template

## Skills Available
- `/new-component <ComponentName>` — scaffold a new bakery component
- `/gemini-prompt` — write Gemini prompts consistent with this app (Claude-invoked)

## Agents Available
- `ui-reviewer` — reviews components for dark mode coverage and Tailwind consistency
```

**Step 2: Verify it looks right**

```bash
cat CLAUDE.md | head -20
```
Expected: First 20 lines show the project header.

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md project memory"
```

---

### Task 3: Create `.claude/settings.json` — TypeScript type-check hook

**Why:** No linter or type-check runs automatically. Silent type errors are common with 18+ components. This hook runs `tsc --noEmit` after every file edit and surfaces errors immediately in Claude's output.

**Files:**
- Create: `.claude/settings.json`

**Step 1: Create the settings file**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "npx tsc --noEmit 2>&1 | head -30"
          }
        ]
      }
    ]
  }
}
```

**Step 2: Verify the hook fires correctly**

Make a trivial edit to any `.tsx` file (e.g., add a blank line), then undo it. The hook output should appear — either clean (`exit 0`) or TypeScript errors.

Run manually to confirm:
```bash
cd /Users/kevin/sourdough-pro-ai && npx tsc --noEmit 2>&1 | head -30
```
Expected: Clean output (no errors) or a list of existing type errors.

**Step 3: Commit**

```bash
git add .claude/settings.json
git commit -m "chore: add PostToolUse tsc type-check hook"
```

---

### Task 4: Add API key protection hook to `.claude/settings.json`

**Why:** The Gemini API key is injected via env var in `vite.config.ts`. One accidental hardcode in a component would expose it in git history permanently.

**Files:**
- Modify: `.claude/settings.json`

**Step 1: Add PreToolUse hook**

Update `.claude/settings.json` to add a `PreToolUse` section alongside the existing `PostToolUse`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"$CLAUDE_TOOL_INPUT\" | python3 -c \"import sys,json,re; d=json.load(sys.stdin); content=d.get('new_string','') or d.get('content',''); bad=re.search(r'(AIza[0-9A-Za-z_-]{35}|GEMINI_API_KEY\\s*=\\s*[\\\"\\'][A-Za-z0-9_-]{10,})', content); sys.exit(2) if bad else sys.exit(0)\" 2>&1 && echo 'OK' || echo 'BLOCKED: potential API key hardcode detected'"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "npx tsc --noEmit 2>&1 | head -30"
          }
        ]
      }
    ]
  }
}
```

**Step 2: Verify it parses as valid JSON**

```bash
python3 -m json.tool .claude/settings.json > /dev/null && echo "Valid JSON"
```
Expected: `Valid JSON`

**Step 3: Commit**

```bash
git add .claude/settings.json
git commit -m "chore: add PreToolUse API key protection hook"
```

---

### Task 5: Create `.claude/skills/new-component/SKILL.md`

**Why:** Every new component follows the same pattern (React.FC, Tailwind dark mode, amber/stone palette, localStorage prefix, Sidebar registration). This skill encodes that so Claude scaffolds correctly every time.

**Files:**
- Create: `.claude/skills/new-component/SKILL.md`

**Step 1: Create the skill**

```markdown
---
name: new-component
description: Scaffold a new BakeryOS feature component with correct React.FC pattern, Tailwind dark mode classes, and Sidebar registration. Invoke as /new-component <ComponentName> [tab-id] [label].
disable-model-invocation: false
---

# New Component Skill

Scaffold a new BakeryOS top-level feature component.

## Arguments
- `$1` — PascalCase component name (e.g., `Analytics`)
- `$2` — tab ID kebab-case (e.g., `analytics`) — defaults to lowercase of $1
- `$3` — Sidebar label (e.g., `Analytics`) — defaults to $1

## Steps

### 1. Create `components/$1.tsx`

Use this template exactly:

```tsx
import React, { useState } from 'react';

interface $1Props {}

const $1: React.FC<$1Props> = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">$3</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Description here</p>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6">
        <p className="text-stone-600 dark:text-stone-300">Content goes here</p>
      </div>
    </div>
  );
};

export default $1;
```

### 2. Register in `components/Sidebar.tsx`

a. Add import for an appropriate icon at the top of the file.
b. Add `'$2'` to the `Tab` union type.
c. Add entry to `mainNavItems`:
```tsx
{ id: '$2', label: '$3', Icon: YourIcon },
```
d. Add to `SidebarProps` if sub-tabs are needed.

### 3. Register in `App.tsx`

a. Import the new component.
b. Add a render case in the tab switcher for `'$2'`.

### 4. Verify TypeScript passes

Run: `npx tsc --noEmit`

### 5. Common patterns to follow

- State: `const [items, setItems] = useState<MyType[]>([])`
- localStorage load in `useEffect`: `localStorage.getItem('bakeryos_$2')`
- localStorage save helper: `localStorage.setItem('bakeryos_$2', JSON.stringify(data))`
- Action buttons: `className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"`
- Section cards: `className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6"`
```

**Step 2: Verify file exists**

```bash
cat .claude/skills/new-component/SKILL.md | head -5
```
Expected: Frontmatter header visible.

**Step 3: Commit**

```bash
git add .claude/skills/new-component/
git commit -m "feat: add new-component skill for BakeryOS scaffolding"
```

---

### Task 6: Create `.claude/skills/gemini-prompt/SKILL.md`

**Why:** The Gemini prompt patterns in `geminiService.ts` are sophisticated (unit normalization, Baker's %, structured JSON). A Claude-invoked skill ensures consistency whenever AI features are extended.

**Files:**
- Create: `.claude/skills/gemini-prompt/SKILL.md`

**Step 1: Create the skill**

```markdown
---
name: gemini-prompt
description: Background knowledge for writing Gemini AI prompts consistent with BakeryOS conventions — unit normalization, Baker's percentages, structured JSON output. Claude invokes this automatically when editing geminiService.ts or adding new AI features.
user-invocable: false
---

# Gemini Prompt Conventions for BakeryOS

When writing or editing prompts in `services/geminiService.ts`, follow these rules:

## Always Include Unit Normalization

All recipe weights must be in grams. Paste the `NORMALIZATION_INSTRUCTIONS` constant (already defined in geminiService.ts) into any prompt that accepts user recipe text.

## Output Format

For recipe/formula data, always request structured JSON:
```
Return ONLY a valid JSON object. No markdown fences, no explanation.
Schema: { name: string, ingredients: { name: string, weight_g: number }[], hydration: number, baker_percentages: Record<string, number> }
```

## Baker's Percentage Rule

Total flour = 100%. All other ingredients as % of flour weight. If only percentages given, assume 1000g total flour.

## Model Selection

- Vision tasks (image analysis): use `gemini-2.0-flash-preview` or current preview model
- Text/analysis tasks: use `gemini-2.0-flash` for speed and cost

## Error Handling Pattern

Always wrap Gemini calls in try/catch. On error, throw a user-readable message, not the raw Gemini error object.

## Streaming vs Non-Streaming

- Chat (`AiBakersChat`) uses streaming via `generateContentStream`
- Single-shot analysis (RecipeImporter, RecipeCost) uses `generateContent`

## Prompt Structure Template

```
[ROLE]: You are an expert baker / bakery ERP assistant...
[TASK]: ...
[CONSTRAINTS]:
- All weights in grams
- [any domain-specific constraints]
[OUTPUT FORMAT]:
Return ONLY valid JSON matching this schema: ...
[INPUT]:
${userInput}
```
```

**Step 2: Verify**

```bash
cat .claude/skills/gemini-prompt/SKILL.md | head -5
```

**Step 3: Commit**

```bash
git add .claude/skills/gemini-prompt/
git commit -m "feat: add gemini-prompt skill for AI feature consistency"
```

---

### Task 7: Create `.claude/agents/ui-reviewer.md`

**Why:** 18 components all need consistent dark mode coverage and Tailwind patterns. A specialized subagent can do parallel review without cluttering the main context.

**Files:**
- Create: `.claude/agents/ui-reviewer.md`

**Step 1: Create the agent**

```markdown
---
name: ui-reviewer
description: Reviews BakeryOS React components for dark mode coverage, Tailwind class consistency, and accessibility. Triggered after significant UI changes or when explicitly requested.
---

# UI Reviewer Agent

You are a UI quality reviewer for BakeryOS, a bakery ERP built with React 19 and Tailwind CSS.

## What to Check

### 1. Dark Mode Coverage
Every color class must have a dark: counterpart. Flag any bare colors:
- `bg-white` without `dark:bg-stone-800` or `dark:bg-stone-900`
- `text-stone-900` without `dark:text-stone-50` or `dark:text-stone-100`
- `border-stone-200` without `dark:border-stone-700` or `dark:border-stone-800`
- Any hardcoded hex colors

### 2. Color Palette Consistency
BakeryOS uses:
- **Amber** for brand/active: `amber-50`, `amber-400`, `amber-600`, `amber-700`, `amber-900/20`
- **Stone** for chrome/neutral: `stone-50` through `stone-900`
- **Semantic**: `emerald` for success, `red` for errors, `blue` for info, `amber` for warnings

Flag any components using off-palette colors (purple, pink, cyan, etc.) without a clear reason.

### 3. Interactive States
All clickable elements should have:
- `hover:` variant
- `transition-colors` or `transition-all`
- `focus:outline-none focus:ring-2 focus:ring-amber-500` for keyboard accessibility

### 4. Typography
- Headings: `font-bold` or `font-black`, `text-stone-900 dark:text-stone-50`
- Body: `text-stone-600 dark:text-stone-300` or `text-stone-500 dark:text-stone-400`
- Labels/meta: `text-xs` or `text-sm`, `text-stone-400 dark:text-stone-500`

### 5. Layout Patterns
- Section cards: `bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6`
- Page padding: `p-6 space-y-6`
- Tables: `bg-white dark:bg-stone-800` with `divide-y divide-stone-200 dark:divide-stone-700`

## Output Format

For each issue found, output:
```
FILE: components/Foo.tsx
LINE: ~42
ISSUE: `bg-white` missing `dark:` counterpart
FIX: Change to `bg-white dark:bg-stone-800`
```

Then a summary count: `X issues found in Y files.`

If no issues: `✓ Dark mode and styling look consistent.`
```

**Step 2: Verify**

```bash
cat .claude/agents/ui-reviewer.md | head -5
```

**Step 3: Commit**

```bash
git add .claude/agents/
git commit -m "feat: add ui-reviewer subagent for dark mode and Tailwind consistency"
```

---

### Task 8: Final verification

**Step 1: Confirm all files exist**

```bash
ls .claude/settings.json .claude/skills/new-component/SKILL.md .claude/skills/gemini-prompt/SKILL.md .claude/agents/ui-reviewer.md CLAUDE.md
```
Expected: All 5 paths listed without errors.

**Step 2: Confirm git tracks them**

```bash
git status
```
Expected: Clean working tree (all committed).

**Step 3: Confirm .gitignore is correct**

```bash
git check-ignore -v .claude/settings.json
```
Expected: No output (file is NOT ignored).

```bash
git check-ignore -v .claude/worktrees/
```
Expected: `.gitignore:NN:.claude/worktrees/ .claude/worktrees/` (IS ignored).

---

## Notes

- **context7 MCP** — already installed globally, no action needed
- **Playwright MCP** — Kapture already covers browser automation for this project
- The `new-component` skill is user-invocable: `/new-component Analytics analytics "Analytics"`
- The `gemini-prompt` skill is Claude-invoked only (background knowledge)
- The `ui-reviewer` agent can be triggered: "run the ui-reviewer on the BatchPlanner component"
