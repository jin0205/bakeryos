import React, { useState, useEffect } from 'react';
import RecipeCalculator from './RecipeCalculator';
import RecipeLibrary from './RecipeLibrary';
import RecipeImporter from './RecipeImporter';
import { SavedRecipe } from '../types';

type ViewMode = 'library' | 'workbench' | 'importer';

const RecipeManagement: React.FC = () => {
    const [view, setView] = useState<ViewMode>('library');
    const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
    const [activeRecipe, setActiveRecipe] = useState<SavedRecipe | null>(null);

    useEffect(() => {
        const loadRecipes = () => {
            const saved = localStorage.getItem('sourdough_recipes');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    const migrated = parsed.map((r: any) => ({
                        ...r,
                        version: r.version || 1,
                        history: r.history || []
                    }));
                    setSavedRecipes(migrated);
                } catch (e) {
                    console.error('Failed to load recipes', e);
                }
            }
        };
        loadRecipes();
    }, [view]);

    const handleEditRecipe = (recipe: SavedRecipe) => {
        setActiveRecipe(recipe);
        setView('workbench');
    };

    const handleCreateRecipe = () => {
        setActiveRecipe(null);
        setView('workbench');
    };

    const handleDeleteRecipe = (id: string) => {
        if (window.confirm('Are you sure you want to delete this recipe? This cannot be undone.')) {
            const updated = savedRecipes.filter(r => r.id !== id);
            setSavedRecipes(updated);
            localStorage.setItem('sourdough_recipes', JSON.stringify(updated));
        }
    };

    const handleBackToLibrary = () => {
        setActiveRecipe(null);
        setView('library');
    };

    const breadcrumb = view === 'library' ? 'FORMULA LIBRARY'
        : view === 'workbench' ? 'FORMULAS / Formula Workbench'
        : 'FORMULAS / Import Recipe';

    const heading = view === 'library' ? 'Formula Library'
        : view === 'workbench' ? 'Formula Workbench'
        : 'Import Recipe';

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">
                    {breadcrumb}
                </p>
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                        {heading}
                    </h1>
                    {view === 'library' && (
                        <button
                            onClick={() => setView('importer')}
                            className="px-4 py-2 text-stone-600 dark:text-stone-400 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-sm font-medium border border-stone-200 dark:border-stone-700"
                        >
                            Import Recipe
                        </button>
                    )}
                </div>
            </div>

            {view === 'library' && (
                <RecipeLibrary
                    recipes={savedRecipes}
                    onEdit={handleEditRecipe}
                    onCreate={handleCreateRecipe}
                    onDelete={handleDeleteRecipe}
                />
            )}
            {view === 'workbench' && (
                <div className="animate-fade-in">
                    <RecipeCalculator
                        initialRecipe={activeRecipe}
                        onBack={handleBackToLibrary}
                    />
                </div>
            )}
            {view === 'importer' && (
                <div className="animate-fade-in">
                    <button
                        onClick={handleBackToLibrary}
                        className="mb-4 px-4 py-2 text-stone-600 dark:text-stone-400 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-sm"
                    >
                        ← Back to Library
                    </button>
                    <RecipeImporter />
                </div>
            )}
        </div>
    );
};

export default RecipeManagement;
