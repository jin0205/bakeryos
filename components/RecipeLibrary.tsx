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
          onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest' | 'az')}
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
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
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
