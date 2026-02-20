import React, { useState, useEffect } from 'react';
import RecipeCalculator from './RecipeCalculator';
import RecipeLibrary from './RecipeLibrary';
import { SavedRecipe } from '../types';

const RecipeManagement: React.FC = () => {
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [activeRecipe, setActiveRecipe] = useState<SavedRecipe | null>(null);
  const [isNewRecipe, setIsNewRecipe] = useState(false);

  useEffect(() => {
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

  const handleBack = () => {
    setActiveRecipe(null);
    setIsNewRecipe(false);
    // Reload from localStorage to pick up any saves
    const saved = localStorage.getItem('sourdough_recipes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedRecipes(parsed.map((r: any) => ({
          ...r,
          version: r.version || 1,
          history: r.history || [],
        })));
      } catch (e) {
        console.error('Failed to reload recipes', e);
      }
    }
  };

  const showWorkbench = activeRecipe !== null || isNewRecipe;

  return (
    <div
      className="flex gap-0 -mx-8 -my-8 overflow-hidden"
      style={{ height: 'calc(100vh - 0px)', minHeight: '600px' }}
    >
      {/* Library Panel — fixed 288px */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-stone-800 bg-stone-900">
        <div className="px-4 py-3 border-b border-stone-800">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-stone-500">Recipe Library</h2>
        </div>
        <RecipeLibrary
          recipes={savedRecipes}
          selectedId={activeRecipe?.id ?? null}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onDelete={handleDelete}
        />
      </div>

      {/* Workbench Panel — flex-grow */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        {showWorkbench ? (
          <RecipeCalculator
            key={activeRecipe?.id ?? 'new'}
            initialRecipe={activeRecipe}
            onBack={handleBack}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg className="w-12 h-12 text-stone-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-stone-500 text-sm font-medium">Select a recipe or create a new one.</p>
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
