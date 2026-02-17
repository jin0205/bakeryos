
import React, { useState, useEffect, useMemo } from 'react';
import { Ingredient, SavedRecipe, InventoryItem } from '../types';

interface RecipeCalculatorProps {
    initialRecipe?: SavedRecipe | null;
    onBack: () => void;
}

const RecipeCalculator: React.FC<RecipeCalculatorProps> = ({ initialRecipe, onBack }) => {
  // --- STATE ---
  const [recipeName, setRecipeName] = useState<string>('');
  const [numberOfLoaves, setNumberOfLoaves] = useState<number>(1);
  const [weightPerLoaf, setWeightPerLoaf] = useState<number>(1000); // Default to 1kg loaf
  
  // Weights are the Source of Truth. 
  // Percentages are derived for display.
  const [flours, setFlours] = useState<Ingredient[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  
  const [currentRecipeId, setCurrentRecipeId] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // --- INITIALIZATION ---
  useEffect(() => {
    // Load Inventory for autocomplete/costing (if needed later)
    const invStr = localStorage.getItem('sourdough_inventory');
    if (invStr) setInventory(JSON.parse(invStr));

    if (initialRecipe) {
      // Edit Mode
      setCurrentRecipeId(initialRecipe.id);
      setRecipeName(initialRecipe.name);
      setNumberOfLoaves(initialRecipe.numberOfLoaves);
      setWeightPerLoaf(initialRecipe.weightPerLoaf);
      
      // We must reconstruct weights if they aren't fully populated in the save
      // Logic: Saved recipe has weights. If not (legacy), derive from %.
      const totalBatchWeight = initialRecipe.numberOfLoaves * initialRecipe.weightPerLoaf;
      
      // Check if we have valid weights in the saved object
      const hasWeights = initialRecipe.flours.some(f => f.weight && f.weight > 0);
      
      if (hasWeights) {
          setFlours(initialRecipe.flours.map(f => ({ ...f, weight: f.weight || 0 })));
          setIngredients(initialRecipe.ingredients.map(i => ({ ...i, weight: i.weight || 0 })));
      } else {
          // Legacy Fallback: Calculate from percentages
          const totalFlourPct = initialRecipe.flours.reduce((sum, f) => sum + (f.percentage || 0), 0) || 100;
          const totalIngPct = initialRecipe.ingredients.reduce((sum, i) => sum + (i.percentage || 0), 0);
          const totalFormulaPct = totalFlourPct + totalIngPct;
          
          const baseFlourWeight = totalFormulaPct > 0 ? totalBatchWeight / (totalFormulaPct / 100) : 0;
          
          setFlours(initialRecipe.flours.map(f => ({
              ...f,
              weight: (baseFlourWeight * (f.percentage || 0)) / 100
          })));
          setIngredients(initialRecipe.ingredients.map(i => ({
              ...i,
              weight: (baseFlourWeight * (i.percentage || 0)) / 100
          })));
      }

    } else {
      // New Recipe Mode
      // Default: 1000g Flour, 750g Water, 20g Salt, 200g Levain (~1970g total)
      // Scaled to 1 loaf of 1000g
      setNumberOfLoaves(1);
      setWeightPerLoaf(1000);
      
      // Let's start with a simple 100% flour base of 500g
      setFlours([
          { id: 1, name: 'Bread Flour', percentage: 100, weight: 500 }
      ]);
      setIngredients([
          { id: 2, name: 'Water', percentage: 75, weight: 375 },
          { id: 3, name: 'Salt', percentage: 2, weight: 10 },
          { id: 4, name: 'Levain', percentage: 20, weight: 100 }
      ]);
    }
  }, [initialRecipe]);

  // --- DERIVED STATE ---
  const totalFlourWeight = useMemo(() => {
      return flours.reduce((sum, f) => sum + (f.weight || 0), 0);
  }, [flours]);

  const totalIngredientsWeight = useMemo(() => {
      return ingredients.reduce((sum, i) => sum + (i.weight || 0), 0);
  }, [ingredients]);

  const totalBatchWeight = totalFlourWeight + totalIngredientsWeight;

  // Sync weightPerLoaf display when ingredients change
  // We only update this if the change wasn't triggered by the yield input itself
  // To avoid circular loops, we just calculate it for display or let it drift?
  // Better UX: If I add water, my loaf gets heavier. 
  useEffect(() => {
      if (numberOfLoaves > 0) {
          const newWeight = totalBatchWeight / numberOfLoaves;
          // Only update if difference is significant to avoid jitter
          if (Math.abs(newWeight - weightPerLoaf) > 1) {
              setWeightPerLoaf(Math.round(newWeight));
          }
      }
  }, [totalBatchWeight, numberOfLoaves]);


  // --- HANDLERS ---

  // Scaling Handler: Changing Target Yield (Loaves or Weight/Loaf)
  const handleScale = (type: 'count' | 'weight', value: number) => {
      if (value <= 0) return;
      
      let newTotalBatchWeight = 0;
      
      if (type === 'count') {
          // User wants X loaves of CURRENT weight/loaf
          setNumberOfLoaves(value);
          newTotalBatchWeight = value * weightPerLoaf;
      } else {
          // User wants CURRENT loaves of X weight
          setWeightPerLoaf(value);
          newTotalBatchWeight = numberOfLoaves * value;
      }

      // Calculate Scaling Factor
      // If current weight is 0, we can't scale.
      if (totalBatchWeight <= 0) return;
      
      const ratio = newTotalBatchWeight / totalBatchWeight;
      
      // Apply to all items
      setFlours(prev => prev.map(f => ({ ...f, weight: (f.weight || 0) * ratio })));
      setIngredients(prev => prev.map(i => ({ ...i, weight: (i.weight || 0) * ratio })));
  };

  const updateItemWeight = (isFlour: boolean, id: number, val: number) => {
      const setter = isFlour ? setFlours : setIngredients;
      setter(prev => prev.map(item => item.id === id ? { ...item, weight: val } : item));
  };

  const updateItemName = (isFlour: boolean, id: number, val: string) => {
    const setter = isFlour ? setFlours : setIngredients;
    setter(prev => prev.map(item => {
        if (item.id === id) {
             const match = inventory.find(inv => inv.name.toLowerCase() === val.toLowerCase());
             return { ...item, name: val, inventoryId: match?.id };
        }
        return item;
    }));
  };

  const removeItem = (isFlour: boolean, id: number) => {
      const setter = isFlour ? setFlours : setIngredients;
      setter(prev => prev.filter(item => item.id !== id));
  };

  const addItem = (isFlour: boolean) => {
      const newItem: Ingredient = { 
          id: Date.now(), 
          name: '', 
          weight: 0, 
          percentage: 0 
      };
      (isFlour ? setFlours : setIngredients)(prev => [...prev, newItem]);
  };

  const handleSave = () => {
      if (!recipeName) return alert("Please name your recipe.");
      if (flours.length === 0) return alert("You need at least one flour.");
      
      // Create snapshot with calculated percentages
      const finalFlours = flours.map(f => ({
          ...f,
          percentage: totalFlourWeight > 0 ? parseFloat(((f.weight || 0) / totalFlourWeight * 100).toFixed(1)) : 0
      }));
      
      const finalIngredients = ingredients.map(i => ({
          ...i,
          percentage: totalFlourWeight > 0 ? parseFloat(((i.weight || 0) / totalFlourWeight * 100).toFixed(1)) : 0
      }));

      const newRecipe: SavedRecipe = {
          id: currentRecipeId || Date.now().toString(),
          name: recipeName,
          numberOfLoaves,
          weightPerLoaf,
          flours: finalFlours,
          ingredients: finalIngredients,
          date: new Date().toLocaleDateString(),
          version: initialRecipe ? initialRecipe.version + 1 : 1,
          history: initialRecipe ? [initialRecipe, ...initialRecipe.history] : []
      };

      const recipesStr = localStorage.getItem('sourdough_recipes');
      const existing: SavedRecipe[] = recipesStr ? JSON.parse(recipesStr) : [];
      const updated = currentRecipeId 
        ? existing.map(r => r.id === currentRecipeId ? newRecipe : r)
        : [...existing, newRecipe];

      localStorage.setItem('sourdough_recipes', JSON.stringify(updated));
      alert("Recipe saved successfully.");
      onBack();
  };

  // --- RENDER HELPERS ---
  const renderTable = (items: Ingredient[], isFlour: boolean) => (
      <div className="bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
              <thead className="bg-stone-50 dark:bg-stone-950 text-stone-500 dark:text-stone-400 font-medium border-b border-stone-200 dark:border-stone-800">
                  <tr>
                      <th className="py-3 px-4 w-1/2">{isFlour ? 'Flour' : 'Ingredient'}</th>
                      <th className="py-3 px-4 text-right w-1/4">Weight (g)</th>
                      <th className="py-3 px-4 text-right w-1/4">Baker's %</th>
                      <th className="py-3 px-2 w-8"></th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {items.map(item => {
                      const pct = totalFlourWeight > 0 ? ((item.weight || 0) / totalFlourWeight) * 100 : 0;
                      return (
                          <tr key={item.id} className="group hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                              <td className="p-2">
                                  <input 
                                    type="text" 
                                    className="w-full bg-transparent border-transparent focus:border-amber-500 focus:ring-0 rounded font-medium text-stone-800 dark:text-stone-200"
                                    placeholder={isFlour ? "e.g. Bread Flour" : "e.g. Water"}
                                    value={item.name}
                                    onChange={e => updateItemName(isFlour, item.id, e.target.value)}
                                  />
                              </td>
                              <td className="p-2 text-right">
                                  <input 
                                    type="number" 
                                    className="w-full text-right bg-transparent border-transparent focus:border-amber-500 focus:ring-0 rounded font-bold text-stone-800 dark:text-stone-200"
                                    placeholder="0"
                                    value={item.weight === 0 ? '' : Math.round(item.weight || 0)}
                                    onChange={e => updateItemWeight(isFlour, item.id, parseFloat(e.target.value) || 0)}
                                  />
                              </td>
                              <td className="p-2 text-right">
                                  <span className="block w-full py-2 px-3 text-stone-500 dark:text-stone-500 font-mono text-xs">
                                      {pct.toFixed(1)}%
                                  </span>
                              </td>
                              <td className="p-2 text-center">
                                  <button 
                                    onClick={() => removeItem(isFlour, item.id)}
                                    className="text-stone-300 hover:text-red-500 transition-colors px-2"
                                  >
                                      &times;
                                  </button>
                              </td>
                          </tr>
                      );
                  })}
                  <tr>
                      <td colSpan={4} className="p-2">
                          <button 
                            onClick={() => addItem(isFlour)}
                            className="w-full py-2 text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition-colors dashed-border"
                          >
                              + Add {isFlour ? 'Flour' : 'Ingredient'}
                          </button>
                      </td>
                  </tr>
              </tbody>
          </table>
      </div>
  );

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
            <button onClick={onBack} className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 flex items-center gap-1 text-sm font-medium transition-colors">
                &larr; Back
            </button>
            <button 
                onClick={handleSave}
                className="bg-stone-800 dark:bg-amber-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm hover:shadow-md transition-all hover:scale-105"
            >
                Save Recipe
            </button>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl p-6 md:p-10">
            
            {/* Top Config */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10 pb-8 border-b border-stone-100 dark:border-stone-800">
                <div className="md:col-span-6">
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Recipe Name</label>
                    <input 
                        type="text" 
                        value={recipeName}
                        onChange={e => setRecipeName(e.target.value)}
                        className="w-full text-2xl font-bold bg-transparent border-0 border-b-2 border-stone-200 dark:border-stone-800 focus:border-amber-500 focus:ring-0 px-0 py-2 text-stone-800 dark:text-stone-100 placeholder-stone-300"
                        placeholder="My Masterpiece"
                    />
                </div>
                <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Loaves (Yield)</label>
                    <input 
                        type="number" 
                        value={numberOfLoaves}
                        onChange={e => handleScale('count', parseFloat(e.target.value) || 0)}
                        className="w-full bg-stone-50 dark:bg-stone-900 border-transparent focus:border-amber-500 focus:ring-amber-500 rounded-lg text-lg font-bold text-center"
                    />
                </div>
                <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Weight / Loaf</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            value={Math.round(weightPerLoaf)}
                            onChange={e => handleScale('weight', parseFloat(e.target.value) || 0)}
                            className="w-full bg-stone-50 dark:bg-stone-900 border-transparent focus:border-amber-500 focus:ring-amber-500 rounded-lg text-lg font-bold text-center pr-8"
                        />
                        <span className="absolute right-3 top-3 text-stone-400 text-xs font-bold">g</span>
                    </div>
                </div>
            </div>

            {/* Flour Section */}
            <div className="mb-8">
                <div className="flex justify-between items-end mb-3">
                    <h3 className="text-sm font-black text-stone-700 dark:text-stone-300 uppercase tracking-wide">
                        Flour Blend
                    </h3>
                    <div className="text-right">
                        <span className="text-xs text-stone-400 uppercase font-bold mr-2">Total Flour</span>
                        <span className="text-xl font-black text-stone-800 dark:text-stone-100">{Math.round(totalFlourWeight)}g</span>
                        <span className="ml-2 text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">100%</span>
                    </div>
                </div>
                {renderTable(flours, true)}
                {flours.length === 0 && (
                    <div className="text-center p-4 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 rounded mt-2">
                        Critcal: You must add at least one flour to establish the recipe base (100%).
                    </div>
                )}
            </div>

            {/* Ingredient Section */}
            <div>
                <div className="flex justify-between items-end mb-3">
                    <h3 className="text-sm font-black text-stone-700 dark:text-stone-300 uppercase tracking-wide">
                        Other Ingredients
                    </h3>
                     <div className="text-right">
                        <span className="text-xs text-stone-400 uppercase font-bold mr-2">Total Batch</span>
                        <span className="text-xl font-black text-stone-800 dark:text-stone-100">{Math.round(totalBatchWeight)}g</span>
                    </div>
                </div>
                {renderTable(ingredients, false)}
            </div>

            {/* Summary Footer */}
            <div className="mt-8 pt-8 border-t border-stone-100 dark:border-stone-800 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-stone-50 dark:bg-stone-900 p-4 rounded-lg">
                    <span className="block text-xs font-bold text-stone-400 uppercase">Hydration</span>
                    <span className="block text-2xl font-black text-amber-600">
                        {totalFlourWeight > 0 
                            ? ((ingredients.find(i => i.name.toLowerCase().includes('water'))?.weight || 0) / totalFlourWeight * 100).toFixed(1) 
                            : '0.0'}%
                    </span>
                </div>
                <div className="bg-stone-50 dark:bg-stone-900 p-4 rounded-lg">
                    <span className="block text-xs font-bold text-stone-400 uppercase">Inoculation</span>
                    <span className="block text-2xl font-black text-stone-700 dark:text-stone-300">
                         {totalFlourWeight > 0 
                            ? ((ingredients.find(i => i.name.toLowerCase().includes('levain') || i.name.toLowerCase().includes('starter'))?.weight || 0) / totalFlourWeight * 100).toFixed(1) 
                            : '0.0'}%
                    </span>
                </div>
                <div className="bg-stone-50 dark:bg-stone-900 p-4 rounded-lg">
                     <span className="block text-xs font-bold text-stone-400 uppercase">Salt</span>
                     <span className="block text-2xl font-black text-stone-700 dark:text-stone-300">
                        {totalFlourWeight > 0 
                            ? ((ingredients.find(i => i.name.toLowerCase().includes('salt'))?.weight || 0) / totalFlourWeight * 100).toFixed(1) 
                            : '0.0'}%
                     </span>
                </div>
                <div className="bg-stone-50 dark:bg-stone-900 p-4 rounded-lg">
                     <span className="block text-xs font-bold text-stone-400 uppercase">Total Yield</span>
                     <span className="block text-2xl font-black text-stone-700 dark:text-stone-300">
                        {numberOfLoaves} x {Math.round(weightPerLoaf)}g
                     </span>
                </div>
            </div>
        </div>
    </div>
  );
};

export default RecipeCalculator;
