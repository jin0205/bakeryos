import React, { useState, useEffect } from 'react';
import { getComplexResponse } from '../services/geminiService';
import { SavedRecipe } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import Spinner from './Spinner';

const FermentationEngine: React.FC = () => {
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [temp, setTemp] = useState('24');
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [hydration, setHydration] = useState('75');
  const [levain, setLevain] = useState('20');
  const [humidity, setHumidity] = useState('50');
  const [pressure, setPressure] = useState('1013');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      const saved: SavedRecipe[] = JSON.parse(localStorage.getItem('sourdough_recipes') || '[]');
      setRecipes(saved);
    } catch {
      // ignore
    }
  }, []);

  const handleRecipeSelect = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    if (!recipeId) return;

    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    // Calculate hydration: water weight / total flour weight * 100
    const totalFlourPct = recipe.flours.reduce((sum, f) => sum + f.percentage, 0);
    const waterIngredient = recipe.ingredients.find(ing => /water/i.test(ing.name));
    if (totalFlourPct > 0 && waterIngredient) {
      const h = Math.round((waterIngredient.percentage / totalFlourPct) * 100);
      setHydration(h.toString());
    }

    // Calculate levain %: find ingredient named levain or starter
    const levainIngredient = recipe.ingredients.find(ing => /levain|starter/i.test(ing.name));
    if (levainIngredient) {
      setLevain(Math.round(levainIngredient.percentage).toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!temp || !hydration || !levain) return;

    setIsLoading(true);
    setResult('');

    const prompt = `Act as a master sourdough fermentation expert. Perform a predictive analysis for a dough with the following parameters:

- Ambient/Dough Temperature: ${temp}°${tempUnit}
- Hydration: ${hydration}%
- Levain Inoculation: ${levain}% (Baker's Percentage)
- Relative Humidity: ${humidity}%
- Atmospheric Pressure: ${pressure} hPa

Please provide a detailed Fermentation Model including:
1. **Estimated Duration:** A predicted time range for bulk fermentation to reach optimal structure/rise.
2. **Progression Timeline:** A step-by-step chronological breakdown (e.g., Hour 1, Hour 2...) describing the biological activity (yeast vs. bacteria balance), pH changes, and physical dough changes.
3. **Environmental Impact:** Analyze how the specific Humidity and Pressure values provided will affect:
   - **Dough Temperature Fluctuations:** How ambient air might heat or cool the dough over time (evaporative cooling vs heat retention).
   - **Skin Formation:** Risk of crusting based on humidity.
   - **Gas Retention:** How atmospheric pressure influences bubble expansion.
4. **The "Sweet Spot":** Precise visual and tactile cues that indicate the exact moment to end bulk fermentation and shape (e.g., % rise, jiggle, bubble structure).
5. **Risk Factors:** Specific warnings based on these variables (e.g., if temp is high -> proteolytic degradation; if hydration is high -> structure collapse).

Use thinking steps to calculate the metabolic rate based on the temperature and inoculation.`;

    const response = await getComplexResponse(prompt);
    setResult(response);
    setIsLoading(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Fermentation Engine</h2>
        <p className="text-stone-600 dark:text-stone-400 mt-0.5">Model fermentation kinetics. Input environmental variables to predict bulk fermentation time and optimal shaping windows.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-stone-900 p-6 rounded-lg border border-stone-200 dark:border-stone-800 shadow-sm mb-6 transition-colors">
        {/* Recipe selector */}
        {recipes.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Load from Recipe Library
              <span className="ml-2 text-xs font-normal text-stone-400 dark:text-stone-500">(auto-fills hydration & levain)</span>
            </label>
            <select
              value={selectedRecipeId}
              onChange={e => handleRecipeSelect(e.target.value)}
              className="block w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 sm:text-sm dark:text-stone-100"
            >
              <option value="">— Select a recipe —</option>
              {recipes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Dough Temperature</label>
            <div className="flex">
              <input
                type="number"
                value={temp}
                onChange={e => setTemp(e.target.value)}
                className="block w-full px-3 py-2 bg-white dark:bg-stone-950 border border-r-0 border-stone-300 dark:border-stone-700 rounded-l-md shadow-sm focus:ring-amber-500 focus:border-amber-500 sm:text-sm dark:text-stone-100"
                placeholder="24"
              />
              <select
                value={tempUnit}
                onChange={e => setTempUnit(e.target.value as 'C' | 'F')}
                className="inline-flex items-center px-3 py-2 border border-l-0 border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 sm:text-sm rounded-r-md focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="C">°C</option>
                <option value="F">°F</option>
              </select>
            </div>
          </div>

          {/* Hydration */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Hydration</label>
            <div className="relative rounded-md shadow-sm">
              <input
                type="number"
                value={hydration}
                onChange={e => setHydration(e.target.value)}
                className="focus:ring-amber-500 focus:border-amber-500 block w-full pr-10 sm:text-sm border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 rounded-md py-2 px-3 dark:text-stone-100"
                placeholder="75"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-stone-500 dark:text-stone-400 sm:text-sm">%</span>
              </div>
            </div>
          </div>

          {/* Levain */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Levain Percentage</label>
            <div className="relative rounded-md shadow-sm">
              <input
                type="number"
                value={levain}
                onChange={e => setLevain(e.target.value)}
                className="focus:ring-amber-500 focus:border-amber-500 block w-full pr-10 sm:text-sm border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 rounded-md py-2 px-3 dark:text-stone-100"
                placeholder="20"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-stone-500 dark:text-stone-400 sm:text-sm">%</span>
              </div>
            </div>
          </div>

          {/* Humidity */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Relative Humidity</label>
            <div className="relative rounded-md shadow-sm">
              <input
                type="number"
                value={humidity}
                onChange={e => setHumidity(e.target.value)}
                className="focus:ring-amber-500 focus:border-amber-500 block w-full pr-10 sm:text-sm border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 rounded-md py-2 px-3 dark:text-stone-100"
                placeholder="50"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-stone-500 dark:text-stone-400 sm:text-sm">%</span>
              </div>
            </div>
          </div>

          {/* Pressure */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Pressure (hPa)</label>
            <input
              type="number"
              value={pressure}
              onChange={e => setPressure(e.target.value)}
              className="focus:ring-amber-500 focus:border-amber-500 block w-full sm:text-sm border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 rounded-md py-2 px-3 dark:text-stone-100 shadow-sm"
              placeholder="1013"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || !temp || !hydration || !levain}
            className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-stone-800 dark:bg-amber-600 hover:bg-stone-900 dark:hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-700 disabled:bg-stone-400 dark:disabled:bg-stone-700 transition-colors"
          >
            {isLoading ? <Spinner /> : 'Simulate Fermentation'}
          </button>
        </div>
      </form>

      {/* Result area */}
      {(isLoading || result) && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 shadow-sm min-h-[200px] transition-colors">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Spinner />
              <p className="text-stone-500 dark:text-stone-400 text-sm">Modeling biological activity...</p>
            </div>
          )}
          {!isLoading && result && (
            <div className="animate-fade-in">
              <MarkdownRenderer content={result} />
            </div>
          )}
        </div>
      )}

      {!isLoading && !result && (
        <div className="text-center py-10 text-stone-400 dark:text-stone-600 text-sm italic">
          Input parameters above to model fermentation kinetics.
        </div>
      )}
    </div>
  );
};

export default FermentationEngine;
