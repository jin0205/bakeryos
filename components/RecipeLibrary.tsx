
import React, { useState, useMemo } from 'react';
import { SavedRecipe, PlannerItem } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';

interface RecipeLibraryProps {
  recipes: SavedRecipe[];
  onEdit: (recipe: SavedRecipe) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

const RecipeLibrary: React.FC<RecipeLibraryProps> = ({ recipes, onEdit, onCreate, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'az'>('newest');

  const getHydration = (recipe: SavedRecipe): string => {
    let totalFlourPct = 100;
    if (recipe.flours && recipe.flours.length > 0) {
        totalFlourPct = recipe.flours.reduce((sum, f) => sum + (f.percentage || 0), 0);
    }
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
            recipe: recipe,
            count: recipe.numberOfLoaves
        };
        
        const updated = [...existing, newItem];
        localStorage.setItem('sourdough_planner_items', JSON.stringify(updated));
        alert(`Added "${recipe.name}" to Batch Planner`);
    } catch (err) {
        console.error("Failed to add to planner", err);
    }
  };

  const filteredAndSortedRecipes = useMemo(() => {
    let result = [...recipes];
    if (searchTerm) {
      result = result.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    result.sort((a, b) => {
      if (sortOrder === 'newest') return parseInt(b.id) - parseInt(a.id);
      else if (sortOrder === 'oldest') return parseInt(a.id) - parseInt(b.id);
      else return a.name.localeCompare(b.name);
    });
    return result;
  }, [recipes, searchTerm, sortOrder]);

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex-grow w-full md:w-auto">
          <div className="relative rounded-md shadow-sm max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-4 w-4 text-stone-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search your recipe book..."
              className="focus:ring-amber-500 focus:border-amber-500 block w-full pl-9 sm:text-sm border-stone-300 dark:border-stone-700 dark:bg-stone-900 rounded-md py-2.5 dark:text-stone-100"
            />
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
            <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="block pl-3 pr-8 py-2 text-base border-stone-300 dark:border-stone-700 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md bg-white dark:bg-stone-900 dark:text-stone-200 shadow-sm cursor-pointer"
            >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="az">Name (A-Z)</option>
            </select>
            <button
                onClick={onCreate}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 whitespace-nowrap"
            >
                <span className="text-lg mr-1">+</span> New Recipe
            </button>
        </div>
      </div>

      {filteredAndSortedRecipes.length === 0 ? (
        <div className="text-center py-20 bg-stone-50 dark:bg-stone-900/50 rounded-xl border-2 border-dashed border-stone-200 dark:border-stone-800">
           <CalculatorIcon className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-700" />
           <p className="mt-4 text-stone-500 dark:text-stone-400 font-medium">No recipes found.</p>
           <button onClick={onCreate} className="mt-2 text-amber-600 hover:text-amber-800 font-medium text-sm">Create your first formula</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedRecipes.map(recipe => (
                <div 
                    key={recipe.id} 
                    onClick={() => onEdit(recipe)}
                    className="group bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-900 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col"
                >
                    <div className="p-5 flex-grow">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors line-clamp-1" title={recipe.name}>
                                {recipe.name}
                            </h3>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                                v{recipe.version}
                            </span>
                        </div>
                        <p className="text-xs text-stone-400 dark:text-stone-500 mb-4">{recipe.date}</p>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-stone-50 dark:bg-stone-950/50 p-2 rounded border border-stone-100 dark:border-stone-800">
                                <span className="block text-xs text-stone-500 dark:text-stone-500 uppercase tracking-wide">Hydration</span>
                                <span className="font-semibold text-stone-800 dark:text-stone-200">{getHydration(recipe)}</span>
                            </div>
                            <div className="bg-stone-50 dark:bg-stone-950/50 p-2 rounded border border-stone-100 dark:border-stone-800">
                                <span className="block text-xs text-stone-500 dark:text-stone-500 uppercase tracking-wide">Yield</span>
                                <span className="font-semibold text-stone-800 dark:text-stone-200">{recipe.numberOfLoaves} x {recipe.weightPerLoaf}g</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-stone-50 dark:bg-stone-950 px-5 py-3 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center">
                        <span className="text-xs text-stone-500 dark:text-stone-400 font-medium group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            Open Workbench &rarr;
                        </span>
                        <div className="flex items-center gap-2">
                             <button
                                onClick={(e) => handleAddToPlan(e, recipe)}
                                className="text-stone-400 dark:text-stone-600 hover:text-amber-600 p-1 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                title="Add to Batch Planner"
                            >
                                <ClipboardIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(recipe.id); }}
                                className="text-stone-400 dark:text-stone-600 hover:text-red-600 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Delete Recipe"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default RecipeLibrary;
