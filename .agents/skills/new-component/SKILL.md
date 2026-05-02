---
name: new-component
description: Scaffold a new BakeryOS top-level feature component with correct React.FC pattern, paired Tailwind dark mode classes, amber/stone palette, and Sidebar + App.tsx registration. Invoke as /new-component <ComponentName> [tab-id] [Sidebar Label].
---

# New Component Skill

Scaffold a new BakeryOS top-level feature component and wire it into the nav.

## Arguments
- `$1` — PascalCase component name (e.g., `Analytics`)
- `$2` — tab ID in kebab-case (e.g., `analytics`) — defaults to lowercase of `$1`
- `$3` — Sidebar label (e.g., `Analytics Dashboard`) — defaults to `$1`

## Steps

### 1. Create `components/$1.tsx`

Use this exact template:

```tsx
import React, { useState, useEffect } from 'react';

interface $1Props {}

const $1: React.FC<$1Props> = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">$3</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Description goes here</p>
        </div>
      </div>

      {/* Main content card */}
      <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6">
        <p className="text-stone-600 dark:text-stone-300">Content goes here</p>
      </div>
    </div>
  );
};

export default $1;
```

### 2. Register in `components/Sidebar.tsx`

a. Import an appropriate icon at the top (reuse from `./icons/` — see existing imports).
b. Add `'$2'` to the `Tab` union type (line ~12).
c. Add to `mainNavItems` array:
```tsx
{ id: '$2', label: '$3', Icon: YourIcon },
```
d. Add sub-tab arrays and props if this feature has sub-pages (follow the `production` or `lab` pattern).

### 3. Register in `App.tsx`

a. Import the component: `import $1 from './components/$1';`
b. Add a render case in the tab switcher for `activeTab === '$2'`.

### 4. Verify TypeScript

Run: `npx tsc --noEmit`
Expected: no new errors.

## Common Patterns

### localStorage persistence
```tsx
useEffect(() => {
  const stored = localStorage.getItem('bakeryos_$2');
  if (stored) { try { setItems(JSON.parse(stored)); } catch {} }
}, []);

const save = (data: MyType[]) => {
  setItems(data);
  localStorage.setItem('bakeryos_$2', JSON.stringify(data));
};
```

### Action buttons
```tsx
// Primary
<button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium">
  Save
</button>

// Ghost / secondary
<button className="px-4 py-2 text-stone-600 dark:text-stone-400 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-sm">
  Cancel
</button>
```

### Status badges
```tsx
const BADGE: Record<Status, string> = {
  active:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  draft:    'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
  warning:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  error:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
```

### Table structure
```tsx
<table className="w-full text-sm">
  <thead>
    <tr className="border-b border-stone-200 dark:border-stone-700">
      <th className="text-left py-3 px-4 font-semibold text-stone-600 dark:text-stone-400">Column</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
    <tr className="hover:bg-stone-50 dark:hover:bg-stone-700/30 transition-colors">
      <td className="py-3 px-4 text-stone-900 dark:text-stone-100">Value</td>
    </tr>
  </tbody>
</table>
```
