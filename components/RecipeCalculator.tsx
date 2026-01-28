
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Ingredient, RecipeSnapshot, SavedRecipe, InventoryItem } from '../types';
import RecipeCost from './RecipeCost';
import { BoxIcon } from './icons/BoxIcon';

export const COMMON_FLOURS = [
  'Bread Flour', 'Strong White Flour', 'Whole Wheat Flour', 'Rye Flour', 'Spelt Flour', 'Type 00', 'T55', 'Manitoba'
];

export const COMMON_ADDINS = [
  'Water', 'Levain', 'Salt', 'Instant Yeast', 'Olive Oil', 'Butter', 'Sugar', 'Honey', 'Walnuts', 'Seeds'
];

type RoundingMode = 'exact' | '1g' | '5g';

interface RecipeCalculatorProps {
    initialRecipe?: SavedRecipe | null;
    onBack: () => void;
}

const RecipeCalculator: React.FC<RecipeCalculatorProps> = ({ initialRecipe, onBack }) => {
  const [numberOfLoaves, setNumberOfLoaves] = useState<number>(1);
  const [weightPerLoaf, setWeightPerLoaf] = useState<number>(500);
  const [roundingMode, setRoundingMode] = useState<RoundingMode>('1g');
  
  const [flours, setFlours] = useState<Ingredient[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  
  const [recipeName, setRecipeName] = useState<string>('');
  const [currentRecipeId, setCurrentRecipeId] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => {
    if (initialRecipe) {
      setCurrentRecipeId(initialRecipe.id);
      setRecipeName(initialRecipe.name);
      setNumberOfLoaves(initialRecipe.numberOfLoaves);
      setWeightPerLoaf(initialRecipe.weightPerLoaf);
      setFlours(initialRecipe.flours || []);
      setIngredients(initialRecipe.ingredients || []);
    } else {
        setFlours([{ id: Date.now(), name: '', percentage: 100 }]);
        setIngredients([]);
    }
    const invStr = localStorage.getItem('sourdough_inventory');
    if (invStr) setInventory(JSON.parse(invStr));
  }, [initialRecipe]);

  const totalFlourSum = useMemo(() => flours.reduce((s, f) => s + (f.percentage || 0), 0), [flours]);
  const totalOtherSum = useMemo(() => ingredients.reduce((s, i) => s + (i.percentage || 0), 0), [ingredients]);
  const targetBatchWeight = numberOfLoaves * weightPerLoaf;
  
  const flourBaseWeight = useMemo(() => {
    const formulaMultiplier = 1 + (totalOtherSum / 100);
    return formulaMultiplier > 0 ? targetBatchWeight / formulaMultiplier : 0;
  }, [targetBatchWeight, totalOtherSum]);

  const getDisplayWeight = (weight: number) => {
    if (roundingMode === '1g') return Math.round(weight);
    if (roundingMode === '5g') return Math.round(weight / 5) * 5;
    return parseFloat(weight.toFixed(1));
  };

  const updateItem = (type: 'flour' | 'ingredient', id: number, field: keyof Ingredient, value: any) => {
    const setter = type === 'flour' ? setFlours : setIngredients;
    setter(prev => prev.map(item => {
      if (item.id === id) {
        if (field === 'name') {
           const match = inventory.find(inv => inv.name.toLowerCase() === value.toLowerCase());
           return { ...item, name: value, inventoryId: match?.id };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleWeightChange = (type: 'flour' | 'ingredient', id: number, weight: number) => {
    if (flourBaseWeight <= 0) return;
    const newPct = (weight / flourBaseWeight) * 100;
    updateItem(type, id, 'percentage', parseFloat(newPct.toFixed(2)));
  };

  const handleSave = () => {
    if (!recipeName) return alert("Recipe name required");
    if (flours.length === 0) return alert("At least one flour is required");
    if (Math.abs(totalFlourSum - 100) > 0.01) return alert("Flour blend must total 100%");
    
    const recipesStr = localStorage.getItem('sourdough_recipes');
    const existing: SavedRecipe[] = recipesStr ? JSON.parse(recipesStr) : [];
    
    const newRecipe: SavedRecipe = {
      id: currentRecipeId || Date.now().toString(),
      name: recipeName,
      numberOfLoaves,
      weightPerLoaf,
      flours,
      ingredients,
      date: new Date().toLocaleDateString(),
      version: initialRecipe ? initialRecipe.version + 1 : 1,
      history: initialRecipe ? [initialRecipe, ...initialRecipe.history] : []
    };

    const updated = currentRecipeId 
      ? existing.map(r => r.id === currentRecipeId ? newRecipe : r)
      : [...existing, newRecipe];

    localStorage.setItem('sourdough_recipes', JSON.stringify(updated));
    alert("Recipe Saved");
    onBack();
  };

  const renderRow = (item: Ingredient, type: 'flour' | 'ingredient') => {
    const weight = (flourBaseWeight * item.percentage) / 100;
    return (
      <tr key={item.id} className="border-b border-stone-100 dark:border-stone-800/40 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors">
        <td className="py-2 px-4">
          <input 
            type="text" 
            value={item.name} 
            onChange={e => updateItem(type, item.id, 'name', e.target.value)}
            className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium dark:text-stone-300"
            placeholder={type === 'flour' ? "e.g. Bread Flour" : "e.g. Water"}
          />
        </td>
        <td className="py-2 px-4 text-right">
          <div className="flex items-center justify-end">
            <input 
              type="number" 
              value={item.percentage || ''} 
              placeholder="0"
              onChange={e => updateItem(type, item.id, 'percentage', parseFloat(e.target.value) || 0)}
              className="w-16 bg-transparent border-none text-right focus:ring-0 text-sm font-bold text-amber-600 dark:text-amber-500"
            />
            <span className="text-stone-400 dark:text-stone-500 text-[10px] ml-0.5">%</span>
          </div>
        </td>
        <td className="py-2 px-4 text-right">
          <div className="flex items-center justify-end">
            <input 
              type="number" 
              value={getDisplayWeight(weight) || ''} 
              placeholder="0"
              onChange={e => handleWeightChange(type, item.id, parseFloat(e.target.value) || 0)}
              className="w-24 bg-transparent border-none text-right focus:ring-0 text-sm font-bold dark:text-stone-200"
            />
            <span className="text-stone-400 dark:text-stone-500 text-[10px] ml-0.5">g</span>
          </div>
        </td>
        <td className="py-2 px-4 text-right w-8">
          <button 
            onClick={() => (type === 'flour' ? setFlours : setIngredients)(prev => prev.filter(i => i.id !== item.id))}
            className="text-stone-300 dark:text-stone-600 hover:text-red-500 transition-colors"
          >
            &times;
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <h2 className="text-3xl font-bold text-stone-800 dark:text-stone-100">Recipe Workbench</h2>
           <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">Formulate, scale, and analyze your dough.</p>
        </div>
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 text-sm flex items-center gap-1 transition-colors">
              &larr; Back to Library
            </button>
            <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-stone-400">Round 1g</span>
                <button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition-all">
                  Save Recipe
                </button>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-stone-900/40 rounded-2xl border border-stone-200 dark:border-stone-800/60 p-8 shadow-sm transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest">Recipe Name</label>
                <input type="text" value={recipeName} onChange={e => setRecipeName(e.target.value)} className="w-full bg-stone-50/50 dark:bg-stone-950/50 border-stone-200 dark:border-stone-800 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-amber-500/20" placeholder="e.g. House Sourdough" />
            </div>
            <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest">Target Yield (Loaves)</label>
                <input type="number" value={numberOfLoaves} onChange={e => setNumberOfLoaves(parseInt(e.target.value) || 0)} className="w-full bg-stone-50/50 dark:bg-stone-950/50 border-stone-200 dark:border-stone-800 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-amber-500/20" />
            </div>
            <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest">Weight / Loaf (g)</label>
                <input type="number" value={weightPerLoaf} onChange={e => setWeightPerLoaf(parseInt(e.target.value) || 0)} className="w-full bg-stone-50/50 dark:bg-stone-950/50 border-stone-200 dark:border-stone-800 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-amber-500/20" />
            </div>
        </div>

        <div className="space-y-8">
            <section>
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-[11px] font-black text-stone-500 uppercase tracking-[0.1em]">Flour Blend (Total must be 100%)</h3>
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end">
                         <span className="text-[9px] font-bold text-green-500 uppercase tracking-wider mb-0.5">percentage</span>
                         <span className={`text-lg font-black ${Math.abs(totalFlourSum - 100) > 0.1 ? 'text-red-500' : 'text-green-500'}`}>
                           {totalFlourSum.toFixed(1)}%
                         </span>
                      </div>
                    </div>
                </div>
                <div className="bg-stone-50/30 dark:bg-stone-950/20 rounded-xl overflow-hidden border border-stone-100 dark:border-stone-800">
                    <table className="w-full text-left">
                        <thead className="bg-stone-100/50 dark:bg-stone-800/40 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                            <tr>
                                <th className="py-3 px-4">Flour Type</th>
                                <th className="py-3 px-4 text-right">Baker's %</th>
                                <th className="py-3 px-4 text-right">Weight</th>
                                <th className="py-3 px-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800/40">
                            {flours.map(f => renderRow(f, 'flour'))}
                            <tr>
                                <td colSpan={4} className="p-3">
                                    <button onClick={() => setFlours([...flours, { id: Date.now(), name: '', percentage: flours.length === 0 ? 100 : 0 }])} className="text-[10px] text-amber-600 font-black hover:text-amber-700 uppercase tracking-widest px-1">+ Add Flour</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <section>
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-[11px] font-black text-stone-500 uppercase tracking-[0.1em]">Non-Flour Ingredients</h3>
                </div>
                <div className="bg-stone-50/30 dark:bg-stone-950/20 rounded-xl overflow-hidden border border-stone-100 dark:border-stone-800">
                    <table className="w-full text-left">
                        <thead className="bg-stone-100/50 dark:bg-stone-800/40 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                            <tr>
                                <th className="py-3 px-4">Ingredient</th>
                                <th className="py-3 px-4 text-right">Baker's %</th>
                                <th className="py-3 px-4 text-right">Weight</th>
                                <th className="py-3 px-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800/40">
                            {ingredients.map(i => renderRow(i, 'ingredient'))}
                            <tr>
                                <td colSpan={4} className="p-3">
                                    <button onClick={() => setIngredients([...ingredients, { id: Date.now(), name: '', percentage: 0 }])} className="text-[10px] text-amber-600 font-black hover:text-amber-700 uppercase tracking-widest px-1">+ Add Ingredient</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
      </div>

      <RecipeCost 
        ingredients={[...flours, ...ingredients]} 
        totalFlour={flourBaseWeight} 
        numberOfLoaves={numberOfLoaves} 
        onUpdateIngredientCost={(id, val) => {
            const up = (list: Ingredient[]) => list.map(i => i.id === id ? { ...i, costPerKg: parseFloat(val) } : i);
            setFlours(up(flours)); setIngredients(up(ingredients));
        }}
        inventory={inventory}
      />
    </div>
  );
};

export default RecipeCalculator;
