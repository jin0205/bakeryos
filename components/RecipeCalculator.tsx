
import React, { useState, useEffect, useMemo } from 'react';
import { Ingredient, SavedRecipe, InventoryItem } from '../types';
import { BoxIcon } from './icons/BoxIcon';

interface RecipeCalculatorProps {
    initialRecipe?: SavedRecipe | null;
    onBack: () => void;
}

const RecipeCalculator: React.FC<RecipeCalculatorProps> = ({ initialRecipe, onBack }) => {
  // --- STATE ---
  const [recipeName, setRecipeName] = useState<string>('');
  const [batchMultiplier, setBatchMultiplier] = useState<number>(1);
  const [targetLoafWeight, setTargetLoafWeight] = useState<number>(600); // Standard default
  
  const [flours, setFlours] = useState<Ingredient[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  
  const [currentRecipeId, setCurrentRecipeId] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // --- INITIALIZATION ---
  useEffect(() => {
    const invStr = localStorage.getItem('sourdough_inventory');
    if (invStr) setInventory(JSON.parse(invStr));

    if (initialRecipe) {
      setCurrentRecipeId(initialRecipe.id);
      setRecipeName(initialRecipe.name);
      setBatchMultiplier(initialRecipe.numberOfLoaves || 1);
      setTargetLoafWeight(initialRecipe.targetLoafWeight || 600);
      
      setFlours(initialRecipe.flours.map(f => ({ ...f, weight: f.weight || 0 })));
      setIngredients(initialRecipe.ingredients.map(i => ({ ...i, weight: i.weight || 0 })));
    } else {
      setBatchMultiplier(1);
      setTargetLoafWeight(600);
      setFlours([{ id: 1, name: 'Bread Flour', percentage: 100, weight: 500 }]);
      setIngredients([
          { id: 2, name: 'Water', percentage: 75, weight: 375 },
          { id: 3, name: 'Salt', percentage: 2, weight: 10 },
          { id: 4, name: 'Levain', percentage: 20, weight: 100 }
      ]);
    }
  }, [initialRecipe]);

  // --- DERIVED STATE ---
  const totalFlourWeight = useMemo(() => flours.reduce((sum, f) => sum + (f.weight || 0), 0), [flours]);
  const totalIngredientsWeight = useMemo(() => ingredients.reduce((sum, i) => sum + (i.weight || 0), 0), [ingredients]);
  const totalBatchWeight = totalFlourWeight + totalIngredientsWeight;
  
  // Decoupled Yield Calculation
  const calculatedYield = targetLoafWeight > 0 ? totalBatchWeight / targetLoafWeight : 0;

  // --- HANDLERS ---
  const handleScaleBatch = (newMultiplier: number) => {
      if (isNaN(newMultiplier) || newMultiplier <= 0) {
          setBatchMultiplier(newMultiplier); 
          return;
      }
      if (batchMultiplier <= 0 || isNaN(batchMultiplier)) {
          setBatchMultiplier(newMultiplier);
          return;
      }
      const ratio = newMultiplier / batchMultiplier;
      setFlours(prev => prev.map(f => ({ ...f, weight: (f.weight || 0) * ratio })));
      setIngredients(prev => prev.map(i => ({ ...i, weight: (i.weight || 0) * ratio })));
      setBatchMultiplier(newMultiplier);
  };

  const updateItemWeight = (isFlour: boolean, id: number, val: number) => {
      const setter = isFlour ? setFlours : setIngredients;
      setter(prev => prev.map(item => item.id === id ? { ...item, weight: val } : item));
  };

  const updateItemName = (isFlour: boolean, id: number, val: string) => {
    const setter = isFlour ? setFlours : setIngredients;
    setter(prev => prev.map(item => {
        if (item.id === id) {
             const match = inventory.find(inv => inv.name.toLowerCase().trim() === val.toLowerCase().trim());
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
      const newItem: Ingredient = { id: Date.now(), name: '', weight: 0, percentage: 0 };
      (isFlour ? setFlours : setIngredients)(prev => [...prev, newItem]);
  };

  const handleSave = () => {
      if (!recipeName) return alert("Please name your recipe.");
      if (flours.length === 0) return alert("You need at least one flour.");
      
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
          numberOfLoaves: batchMultiplier,
          targetLoafWeight: targetLoafWeight,
          weightPerLoaf: parseFloat((totalBatchWeight / (batchMultiplier || 1)).toFixed(1)),
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
                      const isLinked = !!item.inventoryId;
                      return (
                          <tr key={item.id} className="group hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                              <td className="p-2">
                                  <div className="flex items-center gap-2">
                                      <div className="relative flex-grow">
                                          <input type="text" list="inventory-autocomplete" className={`w-full bg-transparent border-transparent focus:border-amber-500 focus:ring-0 rounded font-medium ${isLinked ? 'text-amber-700 dark:text-amber-500' : 'text-stone-800 dark:text-stone-200'}`} placeholder={isFlour ? "e.g. Bread Flour" : "e.g. Water"} value={item.name} onChange={e => updateItemName(isFlour, item.id, e.target.value)} />
                                      </div>
                                      {isLinked && <BoxIcon className="w-4 h-4 text-amber-500 opacity-60 flex-shrink-0" title="Linked to Inventory Stock" />}
                                  </div>
                              </td>
                              <td className="p-2 text-right">
                                  <input type="number" className="w-full text-right bg-transparent border-transparent focus:border-amber-500 focus:ring-0 rounded font-bold text-stone-800 dark:text-stone-200" placeholder="0" value={item.weight === 0 ? '' : Math.round(item.weight || 0)} onChange={e => updateItemWeight(isFlour, item.id, parseFloat(e.target.value) || 0)} />
                              </td>
                              <td className="p-2 text-right text-stone-500 dark:text-stone-500 font-mono text-xs">{pct.toFixed(1)}%</td>
                              <td className="p-2 text-center">
                                  <button onClick={() => removeItem(isFlour, item.id)} className="text-stone-300 hover:text-red-500 transition-colors px-2">&times;</button>
                              </td>
                          </tr>
                      );
                  })}
                  <tr>
                      <td colSpan={4} className="p-2">
                          <button onClick={() => addItem(isFlour)} className="w-full py-2 text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition-colors dashed-border">+ Add {isFlour ? 'Flour' : 'Ingredient'}</button>
                      </td>
                  </tr>
              </tbody>
          </table>
      </div>
  );

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
        <datalist id="inventory-autocomplete">{inventory.map(item => <option key={item.id} value={item.name} />)}</datalist>

        <div className="flex items-center justify-between">
            <button onClick={onBack} className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 flex items-center gap-1 text-sm font-medium transition-colors">&larr; Back</button>
            <div className="flex items-center gap-4">
                <div className="hidden sm:block text-right">
                    <div className="text-[10px] font-black uppercase text-stone-400">Total Mass</div>
                    <div className="text-xl font-black text-amber-600">{(totalBatchWeight / 1000).toFixed(2)}kg</div>
                </div>
                <button onClick={handleSave} className="bg-stone-800 dark:bg-amber-600 text-white px-8 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all">Save Recipe</button>
            </div>
        </div>

        <div className="bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-xl overflow-hidden transition-colors">
            {/* Top Config Header */}
            <div className="bg-stone-50 dark:bg-stone-900/40 p-8 md:p-10 border-b border-stone-100 dark:border-stone-800">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
                    <div className="md:col-span-4">
                        <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Recipe Name</label>
                        <input type="text" value={recipeName} onChange={e => setRecipeName(e.target.value)} className="w-full text-2xl font-black bg-transparent border-0 border-b-2 border-stone-200 dark:border-stone-800 focus:border-amber-500 focus:ring-0 px-0 py-2 text-stone-800 dark:text-stone-100 placeholder-stone-300" placeholder="Master Formula" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Batch Scale</label>
                        <input type="number" value={batchMultiplier} onChange={e => handleScaleBatch(parseFloat(e.target.value))} className="w-full bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-lg font-black text-center focus:ring-2 focus:ring-amber-500" min="0.1" step="0.1" />
                        <span className="text-[9px] text-stone-400 block mt-1 text-center font-bold">Multiplier</span>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Target Loaf</label>
                        <div className="relative">
                            <input type="number" value={targetLoafWeight} onChange={e => setTargetLoafWeight(parseFloat(e.target.value) || 0)} className="w-full bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-lg font-black text-center focus:ring-2 focus:ring-amber-500 pr-10" />
                            <span className="absolute right-3 top-4 text-stone-400 text-xs font-bold">g</span>
                        </div>
                         <span className="text-[9px] text-stone-400 block mt-1 text-center font-bold">Division Weight</span>
                    </div>
                    <div className="md:col-span-4">
                        <div className="bg-amber-600 rounded-2xl p-4 text-white shadow-lg shadow-amber-600/20 flex items-center justify-between">
                            <div>
                                <div className="text-[9px] font-black uppercase opacity-80 tracking-widest">Calculated Yield</div>
                                <div className="text-2xl font-black">{calculatedYield.toFixed(1)} Loaves</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[9px] font-black uppercase opacity-80 tracking-widest">At</div>
                                <div className="text-xl font-bold">{targetLoafWeight}g</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 md:p-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div>
                        <div className="flex justify-between items-end mb-4 px-2">
                            <h3 className="text-xs font-black text-stone-400 uppercase tracking-[0.2em]">Flour Blend</h3>
                            <span className="text-sm font-bold text-stone-800 dark:text-stone-200">{Math.round(totalFlourWeight)}g Total</span>
                        </div>
                        {renderTable(flours, true)}
                    </div>
                    <div>
                        <div className="flex justify-between items-end mb-4 px-2">
                            <h3 className="text-xs font-black text-stone-400 uppercase tracking-[0.2em]">Other Ingredients</h3>
                            <span className="text-sm font-bold text-stone-800 dark:text-stone-200">{(totalBatchWeight/1000).toFixed(2)}kg Dough</span>
                        </div>
                        {renderTable(ingredients, false)}
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-stone-100 dark:border-stone-800 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-stone-50 dark:bg-stone-900/50 p-6 rounded-2xl border border-stone-100 dark:border-stone-800 transition-colors">
                        <span className="block text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">Hydration</span>
                        <span className="block text-2xl font-black text-amber-600">
                            {totalFlourWeight > 0 ? ((ingredients.find(i => i.name.toLowerCase().includes('water'))?.weight || 0) / totalFlourWeight * 100).toFixed(1) : '0.0'}%
                        </span>
                    </div>
                    <div className="bg-stone-50 dark:bg-stone-900/50 p-6 rounded-2xl border border-stone-100 dark:border-stone-800 transition-colors">
                        <span className="block text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">Inoculation</span>
                        <span className="block text-2xl font-black text-stone-700 dark:text-stone-300">
                             {totalFlourWeight > 0 ? ((ingredients.find(i => i.name.toLowerCase().includes('levain') || i.name.toLowerCase().includes('starter'))?.weight || 0) / totalFlourWeight * 100).toFixed(1) : '0.0'}%
                        </span>
                    </div>
                    <div className="bg-stone-50 dark:bg-stone-900/50 p-6 rounded-2xl border border-stone-100 dark:border-stone-800 transition-colors">
                         <span className="block text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">Salt</span>
                         <span className="block text-2xl font-black text-stone-700 dark:text-stone-300">
                            {totalFlourWeight > 0 ? ((ingredients.find(i => i.name.toLowerCase().includes('salt'))?.weight || 0) / totalFlourWeight * 100).toFixed(1) : '0.0'}%
                         </span>
                    </div>
                    <div className="bg-stone-50 dark:bg-stone-900/50 p-6 rounded-2xl border border-stone-100 dark:border-stone-800 transition-colors">
                         <span className="block text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">Scaling Factor</span>
                         <span className="block text-2xl font-black text-stone-700 dark:text-stone-300">x{batchMultiplier}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default RecipeCalculator;
