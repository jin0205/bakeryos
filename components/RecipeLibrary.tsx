
import React, { useState, useMemo } from 'react';
import { SavedRecipe, PlannerItem } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { PanelPayload } from '../App';

interface RecipeLibraryProps {
  recipes: SavedRecipe[];
  onEdit: (recipe: SavedRecipe) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onOpenPanel?: (p: PanelPayload) => void;
}

const RecipeLibrary: React.FC<RecipeLibraryProps> = ({ recipes, onEdit, onCreate, onDelete, onOpenPanel }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'az'>('newest');

  const getHydration = (recipe: SavedRecipe): string => {
    const water = recipe.ingredients.find(i => i.name.toLowerCase().includes('water'));
    if (!water) return '—';
    return `${water.percentage}%`;
  };

  const getYield = (recipe: SavedRecipe): string => {
    const target = recipe.targetLoafWeight || 600;
    const totalFlourWeight = (recipe.flours || []).reduce((sum, f) => sum + (f.weight || 0), 0);
    const totalIngWeight = (recipe.ingredients || []).reduce((sum, i) => sum + (i.weight || 0), 0);
    const totalMass = totalFlourWeight + totalIngWeight;
    const loaves = totalMass / target;
    return `${loaves.toFixed(1)} × ${target}g`;
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
      alert(`Added "${recipe.name}" to Batch Builder`);
    } catch (err) {
      console.error('Failed to add to planner', err);
    }
  };

  const filteredAndSortedRecipes = useMemo(() => {
    let result = [...recipes];
    if (searchTerm) {
      result = result.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    result.sort((a, b) => {
      if (sortOrder === 'newest') return parseInt(b.id) - parseInt(a.id);
      if (sortOrder === 'oldest') return parseInt(a.id) - parseInt(b.id);
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [recipes, searchTerm, sortOrder]);

  return (
    <div className="animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div className="relative w-full sm:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-4 w-4 text-stone-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search formulas…"
            className="block w-full pl-9 pr-8 py-2 text-sm border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 rounded-md focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-stone-100"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 cursor-pointer transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as any)}
            className="text-sm border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 dark:text-stone-200 rounded-md px-3 py-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="az">Name (A–Z)</option>
          </select>
          <button
            onClick={onCreate}
            className="px-4 py-2 text-sm font-semibold rounded-md text-white bg-amber-600 hover:bg-amber-700 transition-colors"
          >
            + New Formula
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
        {filteredAndSortedRecipes.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardIcon className="mx-auto h-10 w-10 text-stone-300 dark:text-stone-700" />
            <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
              {searchTerm ? `No formulas matching "${searchTerm}"` : 'Your library is empty.'}
            </p>
            {!searchTerm && (
              <button
                onClick={onCreate}
                className="mt-4 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors cursor-pointer"
              >
                + New Formula
              </button>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-stone-200 dark:divide-stone-800/60">
            <thead className="bg-stone-50 dark:bg-stone-950/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Formula</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Version</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Hydration</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Yield</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800/40">
              {filteredAndSortedRecipes.map(recipe => (
                <tr
                  key={recipe.id}
                  onClick={() => onOpenPanel ? onOpenPanel({ type: 'formula', data: recipe }) : onEdit(recipe)}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenPanel ? onOpenPanel({ type: 'formula', data: recipe }) : onEdit(recipe); } }}
                  className="hover:bg-stone-50 dark:hover:bg-stone-800/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {recipe.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 px-1.5 py-0.5 rounded">
                      v{recipe.version}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-500 dark:text-stone-400">{recipe.date}</td>
                  <td className="px-4 py-3 text-sm text-right text-stone-600 dark:text-stone-300 font-medium">{getHydration(recipe)}</td>
                  <td className="px-4 py-3 text-sm text-right text-stone-600 dark:text-stone-300">{getYield(recipe)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center items-center gap-3">
                      <button
                        onClick={e => { e.stopPropagation(); onEdit(recipe); }}
                        aria-label="Edit formula"
                        className="text-stone-400 hover:text-amber-600 transition-colors cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={e => handleAddToPlan(e, recipe)}
                        aria-label="Add to Batch Builder"
                        className="text-stone-400 hover:text-amber-600 transition-colors cursor-pointer"
                      >
                        <ClipboardIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); onDelete(recipe.id); }}
                        aria-label={`Delete ${recipe.name}`}
                        className="text-stone-300 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default RecipeLibrary;
