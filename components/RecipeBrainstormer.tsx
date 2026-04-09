
import React, { useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { brainstormRecipe, BrainstormedRecipeJSON } from '../services/claudeService';
import { SavedRecipe, Ingredient } from '../types';

interface RecipeBrainstormerProps {
  onNavigateToLibrary?: () => void;
}

type UiState = 'idle' | 'loading' | 'preview' | 'error';

interface EditableIngredient {
  id: number;
  name: string;
  percentage: number;
}

interface EditableRecipe {
  name: string;
  description: string;
  numberOfLoaves: number;
  flours: EditableIngredient[];
  ingredients: EditableIngredient[];
}

const EXAMPLE_PROMPTS = [
  '75% hydration country loaf with 20% rye flour',
  'Soft sandwich bread with honey and rolled oats',
  'High-hydration Tartine-style with 10% whole wheat',
];

const RecipeBrainstormer: React.FC<RecipeBrainstormerProps> = ({ onNavigateToLibrary }) => {
  const [uiState, setUiState] = useState<UiState>('idle');
  const [description, setDescription] = useState('');
  const [flourWeight, setFlourWeight] = useState<number>(1000);
  const [editableRecipe, setEditableRecipe] = useState<EditableRecipe | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [savedName, setSavedName] = useState('');

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setUiState('loading');
    setErrorMessage('');
    setSavedName('');
    try {
      const result: BrainstormedRecipeJSON = await brainstormRecipe(description, flourWeight);
      setEditableRecipe({
        name: result.name,
        description: result.description,
        numberOfLoaves: result.numberOfLoaves || 1,
        flours: result.flours.map((f, i) => ({ id: i + 1, name: f.name, percentage: f.percentage })),
        ingredients: result.ingredients.map((ing, i) => ({
          id: (result.flours.length || 0) + i + 1,
          name: ing.name,
          percentage: ing.percentage,
        })),
      });
      setUiState('preview');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setUiState('error');
    }
  };

  const handleSave = () => {
    if (!editableRecipe) return;

    const buildIngredients = (items: EditableIngredient[]): Ingredient[] =>
      items.map(item => ({
        id: item.id,
        name: item.name,
        percentage: parseFloat(item.percentage.toFixed(1)),
        weight: parseFloat(((item.percentage / 100) * flourWeight).toFixed(1)),
      }));

    const flours = buildIngredients(editableRecipe.flours);
    const ingredients = buildIngredients(editableRecipe.ingredients);

    const totalDoughWeight = [...flours, ...ingredients].reduce((sum, i) => sum + (i.weight ?? 0), 0);
    const weightPerLoaf = parseFloat((totalDoughWeight / (editableRecipe.numberOfLoaves || 1)).toFixed(1));

    const newRecipe: SavedRecipe = {
      id: Date.now().toString(),
      name: editableRecipe.name,
      numberOfLoaves: editableRecipe.numberOfLoaves,
      weightPerLoaf,
      targetLoafWeight: weightPerLoaf,
      flours,
      ingredients,
      date: new Date().toLocaleDateString(),
      version: 1,
      history: [],
    };

    const stored = localStorage.getItem('sourdough_recipes');
    let existing: SavedRecipe[] = [];
    if (stored) {
      try { existing = JSON.parse(stored); } catch { /* ignore */ }
    }
    localStorage.setItem('sourdough_recipes', JSON.stringify([...existing, newRecipe]));
    setSavedName(newRecipe.name);
    setUiState('idle');
    setEditableRecipe(null);
    setDescription('');
  };

  const handleStartOver = () => {
    setUiState('idle');
    setEditableRecipe(null);
    setErrorMessage('');
  };

  // Derived stats from editableRecipe
  const getStats = () => {
    if (!editableRecipe) return { hydration: 0, levain: 0, totalDough: 0 };
    const water = editableRecipe.ingredients.find(i => /water/i.test(i.name));
    const levain = editableRecipe.ingredients.find(i => /levain|starter/i.test(i.name));
    const totalDough =
      flourWeight +
      editableRecipe.ingredients.reduce((sum, i) => sum + (i.percentage / 100) * flourWeight, 0);
    return {
      hydration: water ? water.percentage : 0,
      levain: levain ? levain.percentage : 0,
      totalDough: Math.round(totalDough),
    };
  };

  const updateFlour = (id: number, field: 'name' | 'percentage', value: string) => {
    if (!editableRecipe) return;
    setEditableRecipe({
      ...editableRecipe,
      flours: editableRecipe.flours.map(f =>
        f.id === id ? { ...f, [field]: field === 'percentage' ? parseFloat(value) || 0 : value } : f
      ),
    });
  };

  const updateIngredient = (id: number, field: 'name' | 'percentage', value: string) => {
    if (!editableRecipe) return;
    setEditableRecipe({
      ...editableRecipe,
      ingredients: editableRecipe.ingredients.map(i =>
        i.id === id ? { ...i, [field]: field === 'percentage' ? parseFloat(value) || 0 : value } : i
      ),
    });
  };

  const stats = getStats();

  const inputBase =
    'w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors';

  const tableInputName =
    'w-full px-2 py-1 bg-transparent border border-transparent rounded focus:border-stone-300 dark:focus:border-stone-600 focus:outline-none focus:bg-white dark:focus:bg-stone-700 text-sm text-stone-800 dark:text-stone-100 transition-colors';

  const tableInputPct =
    'w-20 px-2 py-1 bg-transparent border border-transparent rounded focus:border-stone-300 dark:focus:border-stone-600 focus:outline-none focus:bg-white dark:focus:bg-stone-700 text-sm text-stone-800 dark:text-stone-100 text-right transition-colors';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Recipe Brainstormer</h2>
        <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
          Describe your dream sourdough and AI will generate a complete formula with Baker&apos;s percentages.
        </p>
      </div>

      {/* Success banner */}
      {savedName && (
        <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3">
          <p className="text-sm text-green-800 dark:text-green-300 font-medium">
            &ldquo;{savedName}&rdquo; saved to your Formula Library.
          </p>
          {onNavigateToLibrary && (
            <button
              onClick={onNavigateToLibrary}
              className="text-sm text-green-700 dark:text-green-400 underline hover:no-underline ml-4 flex-shrink-0"
            >
              View in Library
            </button>
          )}
        </div>
      )}

      {/* Input form — shown when idle, error, or loading */}
      {uiState !== 'preview' && (
        <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6 space-y-5">
          {/* Description textarea */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
              Describe your recipe idea
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="e.g., A 75% hydration country loaf with 20% whole wheat and a touch of honey, mild tang, open crumb"
              className={inputBase}
              disabled={uiState === 'loading'}
            />
          </div>

          {/* Example prompt chips */}
          <div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mb-2">Quick ideas:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => setDescription(prompt)}
                  disabled={uiState === 'loading'}
                  className="px-3 py-1.5 text-xs bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-full hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 dark:hover:text-amber-400 transition-colors disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Base flour weight */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-stone-700 dark:text-stone-300 flex-shrink-0">
              Base Flour Weight
            </label>
            <input
              type="number"
              value={flourWeight}
              onChange={e => setFlourWeight(Math.max(100, parseInt(e.target.value) || 1000))}
              min={100}
              max={10000}
              step={50}
              disabled={uiState === 'loading'}
              className="w-28 px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors disabled:opacity-50"
            />
            <span className="text-sm text-stone-500 dark:text-stone-400">g</span>
            <span className="text-xs text-stone-400 dark:text-stone-500">
              (controls gram weights; Baker&apos;s % stay fixed)
            </span>
          </div>

          {/* Error message */}
          {uiState === 'error' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
              <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
            </div>
          )}

          {/* Generate button */}
          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={!description.trim() || uiState === 'loading'}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {uiState === 'loading' ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4" />
                  Generate Recipe
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Preview / Edit panel */}
      {uiState === 'preview' && editableRecipe && (
        <div className="space-y-5">
          {/* Preview header */}
          <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                    <SparklesIcon className="h-3 w-3" />
                    AI Generated
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1 uppercase tracking-wide">
                    Recipe Name
                  </label>
                  <input
                    type="text"
                    value={editableRecipe.name}
                    onChange={e => setEditableRecipe({ ...editableRecipe, name: e.target.value })}
                    className="w-full px-3 py-2 text-lg font-semibold bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
                  />
                </div>
                <p className="text-sm text-stone-500 dark:text-stone-400 italic">{editableRecipe.description}</p>
              </div>
              <button
                onClick={handleStartOver}
                className="flex-shrink-0 px-3 py-1.5 text-sm text-stone-600 dark:text-stone-400 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              >
                ← Start Over
              </button>
            </div>

            {/* Batch row */}
            <div className="flex items-center gap-6 pt-2 border-t border-stone-100 dark:border-stone-700">
              <div className="flex items-center gap-2">
                <label className="text-sm text-stone-600 dark:text-stone-400">Loaves</label>
                <input
                  type="number"
                  value={editableRecipe.numberOfLoaves}
                  onChange={e =>
                    setEditableRecipe({
                      ...editableRecipe,
                      numberOfLoaves: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  min={1}
                  max={50}
                  className="w-16 px-2 py-1 text-sm bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 rounded-lg text-stone-900 dark:text-stone-100 text-center focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
                />
              </div>
              <div className="text-sm text-stone-500 dark:text-stone-400">
                Total dough:{' '}
                <span className="font-medium text-stone-700 dark:text-stone-300">{stats.totalDough}g</span>
              </div>
              <div className="text-sm text-stone-500 dark:text-stone-400">
                Per loaf:{' '}
                <span className="font-medium text-stone-700 dark:text-stone-300">
                  ~{Math.round(stats.totalDough / editableRecipe.numberOfLoaves)}g
                </span>
              </div>
            </div>
          </div>

          {/* Flours table */}
          <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
            <div className="px-6 py-3 border-b border-stone-100 dark:border-stone-700">
              <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wide">
                Flours
              </h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-xs text-stone-500 dark:text-stone-400 border-b border-stone-100 dark:border-stone-700">
                  <th className="px-6 py-2 text-left font-medium">Ingredient</th>
                  <th className="px-4 py-2 text-right font-medium">Baker&apos;s %</th>
                  <th className="px-6 py-2 text-right font-medium">Weight (g)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                {editableRecipe.flours.map(flour => (
                  <tr key={flour.id}>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={flour.name}
                        onChange={e => updateFlour(flour.id, 'name', e.target.value)}
                        className={tableInputName}
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number"
                        value={flour.percentage}
                        onChange={e => updateFlour(flour.id, 'percentage', e.target.value)}
                        step={0.1}
                        min={0}
                        className={tableInputPct}
                      />
                      <span className="text-xs text-stone-400 ml-0.5">%</span>
                    </td>
                    <td className="px-6 py-2 text-right text-sm text-stone-600 dark:text-stone-400 tabular-nums">
                      {((flour.percentage / 100) * flourWeight).toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Ingredients table */}
          <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
            <div className="px-6 py-3 border-b border-stone-100 dark:border-stone-700">
              <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wide">
                Ingredients
              </h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-xs text-stone-500 dark:text-stone-400 border-b border-stone-100 dark:border-stone-700">
                  <th className="px-6 py-2 text-left font-medium">Ingredient</th>
                  <th className="px-4 py-2 text-right font-medium">Baker&apos;s %</th>
                  <th className="px-6 py-2 text-right font-medium">Weight (g)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                {editableRecipe.ingredients.map(ing => (
                  <tr key={ing.id}>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={ing.name}
                        onChange={e => updateIngredient(ing.id, 'name', e.target.value)}
                        className={tableInputName}
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number"
                        value={ing.percentage}
                        onChange={e => updateIngredient(ing.id, 'percentage', e.target.value)}
                        step={0.1}
                        min={0}
                        className={tableInputPct}
                      />
                      <span className="text-xs text-stone-400 ml-0.5">%</span>
                    </td>
                    <td className="px-6 py-2 text-right text-sm text-stone-600 dark:text-stone-400 tabular-nums">
                      {((ing.percentage / 100) * flourWeight).toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Hydration', value: `${stats.hydration.toFixed(1)}%` },
              { label: 'Levain', value: stats.levain > 0 ? `${stats.levain.toFixed(1)}%` : '—' },
              { label: 'Total Flour', value: `${flourWeight}g` },
              { label: 'Total Dough', value: `${stats.totalDough}g` },
            ].map(stat => (
              <div
                key={stat.label}
                className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-3 text-center"
              >
                <p className="text-xs text-stone-500 dark:text-stone-400">{stat.label}</p>
                <p className="text-lg font-semibold text-stone-800 dark:text-stone-100 mt-0.5">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Action row */}
          <div className="flex justify-between items-center pt-1">
            <button
              onClick={handleStartOver}
              className="px-4 py-2 text-stone-600 dark:text-stone-400 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-sm"
            >
              Start Over
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
            >
              Save to Formula Library
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeBrainstormer;
