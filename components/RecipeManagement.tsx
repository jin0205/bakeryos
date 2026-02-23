import React, { useState, useEffect } from 'react';
import RecipeCalculator from './RecipeCalculator';
import RecipeLibrary from './RecipeLibrary';
import { SavedRecipe } from '../types';

type ViewMode = 'library' | 'workbench';

const RecipeManagement: React.FC = () => {
    const [view, setView] = useState<ViewMode>('library');
    const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
    const [activeRecipe, setActiveRecipe] = useState<SavedRecipe | null>(null);

    // Load recipes on mount and when view changes to library (to catch updates)
    useEffect(() => {
        const loadRecipes = () => {
            const saved = localStorage.getItem('sourdough_recipes');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    // Ensure legacy data has required fields
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

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">
                    FORMULAS / {view === 'library' ? 'Formula Library' : 'Formula Workbench'}
                </p>
                <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                    {view === 'library' ? 'Formula Library' : 'Formula Workbench'}
                </h1>
            </div>

            {view === 'library' ? (
                <RecipeLibrary 
                    recipes={savedRecipes}
                    onEdit={handleEditRecipe}
                    onCreate={handleCreateRecipe}
                    onDelete={handleDeleteRecipe}
                />
            ) : (
                <div className="animate-fade-in">
                    <RecipeCalculator 
                        initialRecipe={activeRecipe}
                        onBack={handleBackToLibrary}
                    />
                </div>
            )}
        </div>
    );
};

export default RecipeManagement;