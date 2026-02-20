# Layout Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the floating-card + horizontal-tabs shell with a full-viewport left sidebar app shell, add a split-panel recipe management view, restructure the batch planner queue, and consolidate Baking Lab's sub-navigation into the main sidebar.

**Architecture:** `App.tsx` owns all navigation state (`activeTab`, `activeLabTab`, `isDarkMode`) and passes them down as props. A new `Sidebar.tsx` component replaces `Header.tsx` and `Tabs.tsx`. The main content area is a plain flex-grow div — no outer card wrapper. Each tab component receives only the props it needs.

**Tech Stack:** React 19, TypeScript, Tailwind CSS (CDN, class-based dark mode)

---

## Context for the Implementer

This is a pure layout/structure refactor. No data model changes. No `localStorage` key changes. All business logic in components stays identical — only JSX structure and Tailwind classes change.

**Key files:**
- `App.tsx` — shell, navigation state, theme
- `components/Header.tsx` — will be deleted (logo + toggle move to Sidebar)
- `components/Tabs.tsx` — will be deleted (replaced by Sidebar)
- `components/Sidebar.tsx` — NEW: left sidebar with all nav
- `components/RecipeManagement.tsx` — split panel layout
- `components/RecipeLibrary.tsx` — compact list items (replaces card grid)
- `components/BatchPlanner.tsx` — Recipe Queue layout
- `components/BakingLab.tsx` — internal sidebar removed
- `components/BakersAssistant.tsx` — placeholder text added to response area

**There are no tests** in this project. TypeScript type checking (`tsc --noEmit`) is the only static analysis. Run it after each task.

**Run the app:** `~/.bun/bin/bun run dev` (starts at http://localhost:3000)

**Check types:** `npx tsc --noEmit` from project root

---

### Task 1: Lift LabTab state to App.tsx and add shared types

The `LabTab` type currently lives inside `BakingLab.tsx`. We need to move it up so the Sidebar can control which Baking Lab sub-tab is active.

**Files:**
- Modify: `App.tsx`
- Modify: `components/BakingLab.tsx`

**Step 1: Add `activeLabTab` state and `LabTab` type to App.tsx**

In `App.tsx`, add the `LabTab` type and new state. The full updated file:

```tsx
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Tabs from './components/Tabs';
import RecipeManagement from './components/RecipeManagement';
import BakingLab from './components/BakingLab';
import BatchPlanner from './components/BatchPlanner';
import InventoryManagement from './components/InventoryManagement';
import CostAnalysis from './components/CostAnalysis';

export type Tab = 'management' | 'planner' | 'inventory' | 'cost' | 'lab';
export type LabTab = 'assistant' | 'analyzer' | 'science' | 'pdf' | 'converter' | 'ddt' | 'showcase';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('management');
  const [activeLabTab, setActiveLabTab] = useState<LabTab>('assistant');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('sourdough_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sourdough_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sourdough_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const renderContent = () => {
    switch (activeTab) {
      case 'management': return <RecipeManagement />;
      case 'planner':    return <BatchPlanner />;
      case 'inventory':  return <InventoryManagement />;
      case 'cost':       return <CostAnalysis />;
      case 'lab':        return <BakingLab activeTab={activeLabTab} />;
      default:           return <RecipeManagement />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-800 dark:text-stone-100 font-sans transition-colors duration-300">
      <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-lg overflow-hidden border border-stone-200 dark:border-stone-800">
          <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="p-6 md:p-10">
            {renderContent()}
          </div>
        </div>
        <footer className="text-center text-stone-500 dark:text-stone-400 mt-8 text-sm">
          <p>&copy; {new Date().getFullYear()} Sourdough Pro AI. Elevate your baking.</p>
        </footer>
      </main>
    </div>
  );
};

export default App;
```

**Step 2: Update BakingLab.tsx to accept `activeTab` as a prop**

Replace the internal `useState<LabTab>` with a prop. The updated signature and component:

```tsx
import React from 'react';
import { LabTab } from '../App';
// ... all existing imports unchanged ...

interface BakingLabProps {
  activeTab: LabTab;
}

const BakingLab: React.FC<BakingLabProps> = ({ activeTab }) => {
  // Remove: const [activeTab, setActiveTab] = useState<LabTab>('assistant');
  // Remove the entire sub-navigation sidebar div
  // Keep only the content area rendering
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-1">Baking Lab</h2>
        <p className="text-stone-600 dark:text-stone-400">Your AI-powered research and development center.</p>
      </div>
      <div className="bg-white dark:bg-stone-900/40 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800/60 p-6 min-h-[600px] transition-colors duration-300">
        {activeTab === 'assistant' && <div className="animate-fade-in"><BakersAssistant /></div>}
        {activeTab === 'analyzer'  && <div className="animate-fade-in"><ImageAnalyzer /></div>}
        {activeTab === 'science'   && <div className="animate-fade-in"><RecipeLab /></div>}
        {activeTab === 'ddt'       && <div className="animate-fade-in"><DDTCalculator /></div>}
        {activeTab === 'pdf'       && <div className="animate-fade-in"><RecipeImporter /></div>}
        {activeTab === 'converter' && <div className="animate-fade-in"><MeasurementConverter /></div>}
        {activeTab === 'showcase'  && <div className="animate-fade-in"><DesignShowcase /></div>}
      </div>
    </div>
  );
};

export default BakingLab;
```

**Step 3: Verify types pass**

```bash
npx tsc --noEmit
```
Expected: no errors (or only pre-existing errors unrelated to these files).

**Step 4: Commit**

```bash
git add App.tsx components/BakingLab.tsx
git commit -m "refactor: lift LabTab state to App.tsx, BakingLab accepts activeTab prop"
```

---

### Task 2: Create the Sidebar component

New file that replaces `Header.tsx` + `Tabs.tsx`. Receives all navigation state as props.

**Files:**
- Create: `components/Sidebar.tsx`

**Step 1: Create `components/Sidebar.tsx`**

```tsx
import React from 'react';
import { Tab, LabTab } from '../App';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { LabIcon } from './icons/LabIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { BoxIcon } from './icons/BoxIcon';
import { CameraIcon } from './icons/CameraIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { DocumentIcon } from './icons/DocumentIcon';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  activeLabTab: LabTab;
  setActiveLabTab: (tab: LabTab) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const mainNavItems: { id: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'management', label: 'Recipe Management', Icon: CalculatorIcon },
  { id: 'planner',    label: 'Batch Planner',     Icon: ClipboardIcon },
  { id: 'inventory',  label: 'Inventory',          Icon: BoxIcon },
  { id: 'cost',       label: 'Cost Analysis',
    Icon: ({ className }) => <span className={`font-bold text-base leading-none ${className}`}>$</span> },
];

const labSubItems: { id: LabTab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'assistant', label: "Baker's Assistant", Icon: SparklesIcon },
  { id: 'analyzer',  label: 'Crumb Analyzer',   Icon: CameraIcon },
  { id: 'science',   label: 'Dev & Fermentation',
    Icon: ({ className }) => (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    )
  },
  { id: 'ddt',       label: 'DDT Water Temp',
    Icon: ({ className }) => (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  { id: 'pdf',       label: 'Recipe Importer',   Icon: DocumentIcon },
  { id: 'converter', label: 'Converter',          Icon: CalculatorIcon },
  { id: 'showcase',  label: 'Design Themes',      Icon: SparklesIcon },
];

const Sidebar: React.FC<SidebarProps> = ({
  activeTab, setActiveTab,
  activeLabTab, setActiveLabTab,
  isDarkMode, toggleTheme,
}) => {
  const isLabActive = activeTab === 'lab';

  const handleMainNav = (id: Tab) => {
    setActiveTab(id);
  };

  const handleLabNav = (id: LabTab) => {
    setActiveTab('lab');
    setActiveLabTab(id);
  };

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col h-screen sticky top-0 bg-stone-900 dark:bg-stone-950 border-r border-stone-800 dark:border-stone-800 transition-colors">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-stone-800">
        <h1 className="text-lg font-bold text-stone-50 tracking-tight leading-tight">
          Sourdough <span className="text-amber-500">Pro AI</span>
        </h1>
        <p className="text-[10px] text-stone-500 mt-0.5 uppercase tracking-widest">Baking Partner</p>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {mainNavItems.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => handleMainNav(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
              activeTab === id && !isLabActive
                ? 'bg-amber-600/20 text-amber-400 border-l-2 border-amber-500'
                : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800'
            }`}
          >
            <Icon className={`w-4 h-4 flex-shrink-0 ${activeTab === id && !isLabActive ? 'text-amber-500' : 'text-stone-500'}`} />
            {label}
          </button>
        ))}

        {/* Baking Lab Group */}
        <div className="pt-3">
          <p className="px-3 mb-1 text-[10px] font-black uppercase tracking-widest text-stone-600">
            Baking Lab
          </p>
          {labSubItems.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => handleLabNav(id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                isLabActive && activeLabTab === id
                  ? 'bg-amber-600/20 text-amber-400 border-l-2 border-amber-500'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isLabActive && activeLabTab === id ? 'text-amber-500' : 'text-stone-500'}`} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Dark Mode Toggle */}
      <div className="px-3 py-4 border-t border-stone-800">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
          {isDarkMode ? 'Light mode' : 'Dark mode'}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
```

**Step 2: Verify types**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add components/Sidebar.tsx
git commit -m "feat: add Sidebar component with full app navigation"
```

---

### Task 3: Rewire App.tsx to use the new shell

Replace Header + Tabs + floating card with Sidebar + full-viewport layout. Delete the old components.

**Files:**
- Modify: `App.tsx`
- Delete: `components/Header.tsx`
- Delete: `components/Tabs.tsx`

**Step 1: Replace App.tsx entirely**

```tsx
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import RecipeManagement from './components/RecipeManagement';
import BakingLab from './components/BakingLab';
import BatchPlanner from './components/BatchPlanner';
import InventoryManagement from './components/InventoryManagement';
import CostAnalysis from './components/CostAnalysis';

export type Tab = 'management' | 'planner' | 'inventory' | 'cost' | 'lab';
export type LabTab = 'assistant' | 'analyzer' | 'science' | 'pdf' | 'converter' | 'ddt' | 'showcase';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('management');
  const [activeLabTab, setActiveLabTab] = useState<LabTab>('assistant');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('sourdough_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sourdough_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sourdough_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const renderContent = () => {
    switch (activeTab) {
      case 'management': return <RecipeManagement />;
      case 'planner':    return <BatchPlanner />;
      case 'inventory':  return <InventoryManagement />;
      case 'cost':       return <CostAnalysis />;
      case 'lab':        return <BakingLab activeTab={activeLabTab} />;
      default:           return <RecipeManagement />;
    }
  };

  return (
    <div className="flex h-screen bg-stone-950 text-stone-100 font-sans overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeLabTab={activeLabTab}
        setActiveLabTab={setActiveLabTab}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />
      <main className="flex-1 overflow-y-auto bg-stone-950 dark:bg-stone-950">
        <div className="px-8 py-8 min-h-full">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
```

**Step 2: Delete old components**

```bash
rm /Users/kevin/sourdough-pro-ai/components/Header.tsx
rm /Users/kevin/sourdough-pro-ai/components/Tabs.tsx
```

**Step 3: Verify types**

```bash
npx tsc --noEmit
```
Expected: no errors about missing Header or Tabs imports (we removed those imports in step 1).

**Step 4: Check in browser** — http://localhost:3000 should show the sidebar on the left, content on the right. Dark mode toggle in sidebar bottom should work.

**Step 5: Commit**

```bash
git add App.tsx components/Sidebar.tsx
git commit -m "feat: replace floating card shell with left sidebar app layout"
```

---

### Task 4: Refactor RecipeLibrary to compact list

The card grid becomes a scrollable list of single-row items. Active item gets an amber left border.

**Files:**
- Modify: `components/RecipeLibrary.tsx`

**Step 1: Add `selectedId` prop to RecipeLibraryProps**

The library needs to know which recipe is currently active in the workbench so it can highlight it.

Update the interface:

```tsx
interface RecipeLibraryProps {
  recipes: SavedRecipe[];
  selectedId: string | null;       // NEW
  onSelect: (recipe: SavedRecipe) => void;  // replaces onEdit
  onCreate: () => void;
  onDelete: (id: string) => void;
}
```

**Step 2: Replace the full RecipeLibrary.tsx**

```tsx
import React, { useState, useMemo } from 'react';
import { SavedRecipe, PlannerItem } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';

interface RecipeLibraryProps {
  recipes: SavedRecipe[];
  selectedId: string | null;
  onSelect: (recipe: SavedRecipe) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

const RecipeLibrary: React.FC<RecipeLibraryProps> = ({
  recipes, selectedId, onSelect, onCreate, onDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'az'>('newest');

  const getHydration = (recipe: SavedRecipe): string => {
    const water = recipe.ingredients.find(i => i.name.toLowerCase().includes('water'));
    if (!water) return '?';
    return `${water.percentage}%`;
  };

  const handleAddToPlan = (e: React.MouseEvent, recipe: SavedRecipe) => {
    e.stopPropagation();
    try {
      const existingStr = localStorage.getItem('sourdough_planner_items');
      const existing: PlannerItem[] = existingStr ? JSON.parse(existingStr) : [];
      const newItem: PlannerItem = {
        uniqueId: Date.now().toString() + Math.random().toString().slice(2, 5),
        recipe,
        count: recipe.numberOfLoaves,
      };
      localStorage.setItem('sourdough_planner_items', JSON.stringify([...existing, newItem]));
      alert(`Added "${recipe.name}" to Batch Planner`);
    } catch (err) {
      console.error('Failed to add to planner', err);
    }
  };

  const filtered = useMemo(() => {
    let result = [...recipes];
    if (searchTerm) result = result.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    result.sort((a, b) => {
      if (sortOrder === 'newest') return parseInt(b.id) - parseInt(a.id);
      if (sortOrder === 'oldest') return parseInt(a.id) - parseInt(b.id);
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [recipes, searchTerm, sortOrder]);

  return (
    <div className="flex flex-col h-full">
      {/* Search + Sort */}
      <div className="p-3 space-y-2 border-b border-stone-800">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-3.5 w-3.5 text-stone-500" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search recipes..."
            className="block w-full pl-8 pr-3 py-2 text-xs bg-stone-800 border border-stone-700 rounded-md text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <select
          value={sortOrder}
          onChange={e => setSortOrder(e.target.value as any)}
          className="block w-full px-2 py-1.5 text-xs bg-stone-800 border border-stone-700 rounded-md text-stone-300 focus:outline-none focus:border-amber-500"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="az">Name (A–Z)</option>
        </select>
      </div>

      {/* Recipe List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center">
            <CalculatorIcon className="mx-auto h-8 w-8 text-stone-700 mb-2" />
            <p className="text-xs text-stone-500">
              {searchTerm ? 'No recipes match your search.' : 'Your library is empty.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-800">
            {filtered.map(recipe => {
              const isSelected = recipe.id === selectedId;
              return (
                <li
                  key={recipe.id}
                  onClick={() => onSelect(recipe)}
                  className={`group flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-amber-600/10 border-l-2 border-amber-500'
                      : 'border-l-2 border-transparent hover:bg-stone-800'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-amber-400' : 'text-stone-200'}`}>
                      {recipe.name}
                    </p>
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      {getHydration(recipe)} hydration · {recipe.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <button
                      onClick={e => handleAddToPlan(e, recipe)}
                      className="p-1 text-stone-500 hover:text-amber-500 transition-colors"
                      title="Add to Batch Planner"
                    >
                      <ClipboardIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(recipe.id); }}
                      className="p-1 text-stone-500 hover:text-red-500 transition-colors"
                      title="Delete recipe"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* New Formula Button */}
      <div className="p-3 border-t border-stone-800">
        <button
          onClick={onCreate}
          className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors"
        >
          + New Formula
        </button>
      </div>
    </div>
  );
};

export default RecipeLibrary;
```

**Step 3: Verify types**

```bash
npx tsc --noEmit
```
Expected: errors about `onEdit` prop no longer existing in RecipeLibrary (RecipeManagement.tsx still passes `onEdit`). That's fine — we fix RecipeManagement in the next task.

**Step 4: Commit**

```bash
git add components/RecipeLibrary.tsx
git commit -m "refactor: RecipeLibrary becomes compact list with selected state"
```

---

### Task 5: Refactor RecipeManagement to split panel

Library (320px) and Workbench (flex-grow) render side by side. No more view swapping.

**Files:**
- Modify: `components/RecipeManagement.tsx`

**Step 1: Replace RecipeManagement.tsx**

```tsx
import React, { useState, useEffect } from 'react';
import RecipeCalculator from './RecipeCalculator';
import RecipeLibrary from './RecipeLibrary';
import { SavedRecipe } from '../types';

const RecipeManagement: React.FC = () => {
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [activeRecipe, setActiveRecipe] = useState<SavedRecipe | null>(null);
  const [isNewRecipe, setIsNewRecipe] = useState(false);

  useEffect(() => {
    const loadRecipes = () => {
      const saved = localStorage.getItem('sourdough_recipes');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const migrated = parsed.map((r: any) => ({
            ...r,
            version: r.version || 1,
            history: r.history || [],
          }));
          setSavedRecipes(migrated);
        } catch (e) {
          console.error('Failed to load recipes', e);
        }
      }
    };
    loadRecipes();
  }, []);

  const handleSelect = (recipe: SavedRecipe) => {
    setActiveRecipe(recipe);
    setIsNewRecipe(false);
  };

  const handleCreate = () => {
    setActiveRecipe(null);
    setIsNewRecipe(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this recipe? This cannot be undone.')) {
      const updated = savedRecipes.filter(r => r.id !== id);
      setSavedRecipes(updated);
      localStorage.setItem('sourdough_recipes', JSON.stringify(updated));
      if (activeRecipe?.id === id) {
        setActiveRecipe(null);
        setIsNewRecipe(false);
      }
    }
  };

  const handleSaved = () => {
    // Reload recipes from localStorage after save
    const saved = localStorage.getItem('sourdough_recipes');
    if (saved) {
      try {
        setSavedRecipes(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to reload recipes', e);
      }
    }
    setIsNewRecipe(false);
  };

  const showWorkbench = activeRecipe !== null || isNewRecipe;

  return (
    <div className="flex h-full gap-0 -mx-8 -my-8 overflow-hidden" style={{ height: 'calc(100vh - 0px)' }}>
      {/* Library Panel */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-stone-800 bg-stone-900">
        <div className="px-4 py-4 border-b border-stone-800">
          <h2 className="text-sm font-black uppercase tracking-widest text-stone-400">Recipe Library</h2>
        </div>
        <RecipeLibrary
          recipes={savedRecipes}
          selectedId={activeRecipe?.id ?? null}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onDelete={handleDelete}
        />
      </div>

      {/* Workbench Panel */}
      <div className="flex-1 overflow-y-auto bg-stone-950 px-8 py-8">
        {showWorkbench ? (
          <RecipeCalculator
            key={activeRecipe?.id ?? 'new'}
            initialRecipe={activeRecipe}
            onBack={() => { setActiveRecipe(null); setIsNewRecipe(false); }}
            onSaved={handleSaved}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg className="w-12 h-12 text-stone-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-stone-500 text-sm font-medium">Select a recipe or create a new one</p>
            <button
              onClick={handleCreate}
              className="mt-4 px-4 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors"
            >
              + New Formula
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeManagement;
```

Note: `RecipeCalculator` may not currently accept an `onSaved` prop. Check its signature — if it only has `onBack`, pass `onBack` only and remove the `onSaved` call. The key thing is the split panel layout renders correctly.

**Step 2: Check RecipeCalculator's props**

```bash
grep -n "interface\|Props\|onBack\|onSave" /Users/kevin/sourdough-pro-ai/components/RecipeCalculator.tsx | head -20
```

If `onSaved` doesn't exist in `RecipeCalculatorProps`, remove it from the JSX (just use `onBack`).

**Step 3: Verify types**

```bash
npx tsc --noEmit
```

**Step 4: Check in browser** — Recipe Management should show two panels side by side. Clicking a recipe in the list loads it in the right panel.

**Step 5: Commit**

```bash
git add components/RecipeManagement.tsx components/RecipeLibrary.tsx
git commit -m "feat: Recipe Management split panel — library and workbench side by side"
```

---

### Task 6: Restructure BatchPlanner — Recipe Queue layout

Rename "Add Recipes" to "Recipe Queue" with two sections. Move the Commit button to the Master List footer.

**Files:**
- Modify: `components/BatchPlanner.tsx`

**Step 1: Replace the JSX return in BatchPlanner.tsx**

Find the `return (` block (line 186 onwards) and replace only the JSX — all state, effects, and handlers above line 186 stay exactly the same:

```tsx
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-100 mb-1">Batch Production Planner</h2>
        <p className="text-stone-400">Combine multiple recipes into a master production list.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Recipe Queue — left column */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* YOUR RECIPES */}
          <div className="bg-stone-900 rounded-lg border border-stone-800 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-stone-800">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-500">Your Recipes</h3>
            </div>
            <ul className="divide-y divide-stone-800 max-h-64 overflow-y-auto">
              {savedRecipes.length === 0 ? (
                <li className="px-4 py-4 text-xs text-stone-500 italic">No saved recipes yet.</li>
              ) : (
                savedRecipes.map(recipe => (
                  <li key={recipe.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-stone-800 transition-colors">
                    <div className="min-w-0 flex-1 mr-2">
                      <p className="text-sm font-medium text-stone-200 truncate">{recipe.name}</p>
                      <p className="text-[10px] text-stone-500">v{recipe.version} · {recipe.numberOfLoaves} @ {recipe.weightPerLoaf}g</p>
                    </div>
                    <button
                      onClick={() => addToPlan(recipe)}
                      className="flex-shrink-0 text-xs px-2 py-1 rounded-md bg-stone-800 border border-stone-700 text-stone-300 hover:text-amber-400 hover:border-amber-600 transition-colors"
                    >
                      +
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* IN YOUR PLAN */}
          <div className="bg-stone-900 rounded-lg border border-stone-800 overflow-hidden flex-1">
            <div className="px-4 py-2.5 border-b border-stone-800 flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-500">In Your Plan</h3>
              {plannerItems.length > 0 && (
                <button onClick={() => setPlannerItems([])} className="text-[10px] text-red-500 hover:text-red-400">Clear All</button>
              )}
            </div>
            {plannerItems.length === 0 ? (
              <div className="px-4 py-6 flex flex-col items-center text-center">
                <p className="text-xs text-stone-500 italic">Add recipes from above ↑</p>
              </div>
            ) : (
              <ul className="divide-y divide-stone-800">
                {plannerItems.map(item => (
                  <li key={item.uniqueId} className="px-4 py-3">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-stone-200 truncate mr-2">{item.recipe.name}</span>
                      <button onClick={() => removeFromPlan(item.uniqueId)} className="text-stone-600 hover:text-red-500 text-base leading-none flex-shrink-0">&times;</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-500">Loaves:</span>
                      <input
                        type="number"
                        value={item.count}
                        onChange={e => updatePlanCount(item.uniqueId, e.target.value)}
                        className="w-16 px-2 py-1 text-xs border border-stone-700 bg-stone-950 rounded text-stone-200 focus:border-amber-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-stone-500">× {item.recipe.weightPerLoaf}g</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Master Production List — right column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Batch Scaling (only shown when plan has items) */}
          {plannerItems.length > 0 && (
            <div className="bg-stone-900 rounded-lg border border-stone-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold text-stone-200 mb-0.5">Batch Scaling</h3>
                <p className="text-[10px] text-stone-500">Adjust volume while preserving percentages.</p>
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex rounded-md overflow-hidden border border-stone-700">
                  <button
                    onClick={() => setBatchScalingMode('percentage')}
                    className={`px-3 py-1.5 text-xs font-medium ${batchScalingMode === 'percentage' ? 'bg-amber-600 text-white' : 'bg-stone-900 text-stone-400'}`}
                  >%</button>
                  <button
                    onClick={() => setBatchScalingMode('weight')}
                    className={`px-3 py-1.5 text-xs font-medium border-l border-stone-700 ${batchScalingMode === 'weight' ? 'bg-amber-600 text-white' : 'bg-stone-900 text-stone-400'}`}
                  >Weight</button>
                </div>
                <input
                  type="number"
                  value={batchScaleValue}
                  onChange={e => setBatchScaleValue(e.target.value)}
                  className="w-24 px-2 py-1.5 text-xs border border-stone-700 bg-stone-950 rounded text-stone-200 focus:border-amber-500 focus:outline-none"
                  placeholder={batchScalingMode === 'percentage' ? '%' : 'grams'}
                />
                <button onClick={applyBatchScaling} className="px-3 py-1.5 text-xs font-bold rounded bg-amber-600 hover:bg-amber-700 text-white">Apply</button>
              </div>
            </div>
          )}

          {/* Master List */}
          <div className="bg-stone-900 rounded-lg border border-stone-800 overflow-hidden flex flex-col flex-1">
            {/* Header */}
            <div className="bg-stone-950 px-5 py-3.5 flex justify-between items-center border-b border-stone-800">
              <h3 className="text-sm font-bold text-stone-100">Master Production List</h3>
              <div className="text-right">
                <span className="text-xs text-stone-500">{(plannerSummary.totalDough / 1000).toFixed(2)} kg · </span>
                <span className="text-sm font-bold text-amber-400">${plannerSummary.totalCost.toFixed(2)}</span>
              </div>
            </div>

            {/* Table or empty state */}
            {Object.keys(plannerSummary.summary).length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-stone-500">
                <p className="text-sm">Add recipes from the queue to see production requirements.</p>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="min-w-full divide-y divide-stone-800">
                  <thead className="bg-stone-950/40 sticky top-0">
                    <tr>
                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-stone-500">Ingredient</th>
                      <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-widest text-stone-500">Total Weight</th>
                      <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-widest text-stone-500">Stock After Bake</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {Object.entries(plannerSummary.summary).map(([name, data]) => {
                      const itemData = data as { weight: number; cost: number };
                      const invItem = inventory.find(i => i.name.toLowerCase().trim() === name.toLowerCase().trim());
                      const remaining = invItem ? invItem.quantity - itemData.weight : null;
                      return (
                        <tr key={name} className="hover:bg-stone-800/30 transition-colors">
                          <td className="px-5 py-3.5 text-sm text-stone-200">{name}</td>
                          <td className="px-5 py-3.5 text-sm text-stone-400 text-right">
                            {itemData.weight >= 1000 ? `${(itemData.weight / 1000).toFixed(2)} kg` : `${itemData.weight.toFixed(0)} g`}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-right">
                            {remaining !== null ? (
                              <span className={remaining < 0 ? 'text-red-500 font-bold' : 'text-stone-500'}>
                                {(remaining / 1000).toFixed(2)} kg
                              </span>
                            ) : (
                              <span className="text-stone-600 italic text-xs">Untracked</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Commit button — pinned to bottom */}
            {plannerItems.length > 0 && (
              <div className="px-5 py-3.5 border-t border-stone-800 flex justify-end">
                <button
                  onClick={handleCommitBake}
                  className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Commit & Start Bake
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
```

**Step 2: Verify types**

```bash
npx tsc --noEmit
```

**Step 3: Check in browser** — Batch Planner should show Recipe Queue on left, Master List on right.

**Step 4: Commit**

```bash
git add components/BatchPlanner.tsx
git commit -m "refactor: BatchPlanner Recipe Queue layout with inline commit button"
```

---

### Task 7: Baker's Assistant — add placeholder to response area

Small quality-of-life fix for the empty response box.

**Files:**
- Modify: `components/BakersAssistant.tsx`

**Step 1: Find the response area div**

```bash
grep -n "min-h\|response\|answer\|result\|output" /Users/kevin/sourdough-pro-ai/components/BakersAssistant.tsx | head -20
```

**Step 2: Add placeholder text**

Find the empty response container (the large empty div below the input). Add a placeholder when there's no response:

```tsx
{/* Where the response div is currently empty or conditionally rendered, wrap it: */}
{!response && !isLoading && (
  <div className="flex items-center justify-center h-full">
    <p className="text-stone-600 text-sm italic">Your answer will appear here…</p>
  </div>
)}
```

The exact implementation depends on how the component currently renders the response — read the file and make the minimal change to show placeholder text when there is no response and it's not loading.

**Step 3: Verify types**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add components/BakersAssistant.tsx
git commit -m "fix: add placeholder text to Baker's Assistant response area"
```

---

### Task 8: Cost Analysis — sticky table header

**Files:**
- Modify: `components/CostAnalysis.tsx`

**Step 1: Find the table header row**

```bash
grep -n "thead\|sticky\|th " /Users/kevin/sourdough-pro-ai/components/CostAnalysis.tsx | head -10
```

**Step 2: Add `sticky top-0` to the `<thead>` element**

Find the `<thead>` tag and add `sticky top-0 z-10` to its className. The exact change:

```tsx
// Before:
<thead className="bg-stone-50 dark:bg-stone-950/80">
// After:
<thead className="bg-stone-50 dark:bg-stone-950/80 sticky top-0 z-10">
```

**Step 3: Verify types and check browser**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add components/CostAnalysis.tsx
git commit -m "fix: sticky table header in Cost Analysis"
```

---

### Task 9: Final check and cleanup

**Step 1: Full type check**

```bash
npx tsc --noEmit
```

Expected: no new errors introduced by this work.

**Step 2: Visual review in browser**

Navigate through all tabs and verify:
- [ ] Sidebar shows on left, always expanded
- [ ] Active tab/sub-tab gets amber left border + amber text
- [ ] Dark mode toggle at sidebar bottom works
- [ ] Recipe Management: library on left, workbench on right, selecting a recipe loads it without page swap
- [ ] Batch Planner: Recipe Queue left, Master List right, Commit button at Master List bottom
- [ ] Inventory: unchanged layout, functions correctly
- [ ] Cost Analysis: sticky header when scrolling
- [ ] Baking Lab: no internal sidebar, sub-tabs driven by main sidebar, Baker's Assistant has placeholder

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup after layout redesign"
```
