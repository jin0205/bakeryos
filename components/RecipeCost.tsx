
import React, { useMemo, useState } from 'react';
import { Ingredient, InventoryItem } from '../types';
import { BoxIcon } from './icons/BoxIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import Spinner from './Spinner';
import { suggestIngredientCost } from '../services/claudeService';

interface RecipeCostProps {
  ingredients: Ingredient[];
  totalFlour: number;
  numberOfLoaves: number;
  onUpdateIngredientCost: (id: number, value: string) => void;
  inventory: InventoryItem[];
}

const RecipeCost: React.FC<RecipeCostProps> = ({
  ingredients,
  totalFlour,
  numberOfLoaves,
  onUpdateIngredientCost,
  inventory
}) => {
  const [loadingSuggestion, setLoadingSuggestion] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, number>>({});

  const getInventoryCost = (name: string): number | undefined => {
      const match = inventory.find(i => i.name.toLowerCase().trim() === name.toLowerCase().trim());
      return match ? match.costPerKg : undefined;
  };

  const handleSuggestCost = async (name: string, id: number) => {
      setLoadingSuggestion(id);
      const suggestedPrice = await suggestIngredientCost(name);
      if (suggestedPrice !== null && suggestedPrice > 0) {
          setSuggestions(prev => ({ ...prev, [id.toString()]: suggestedPrice }));
      }
      setLoadingSuggestion(null);
  };

  const applySuggestion = (id: number, price: number) => {
      onUpdateIngredientCost(id, price.toFixed(2));
      const newSuggestions = { ...suggestions };
      delete newSuggestions[id.toString()];
      setSuggestions(newSuggestions);
  };

  const calculation = useMemo(() => {
      let totalRecipeCost = 0;
      const breakdown = ingredients.map(ing => {
          const weight = (totalFlour * (ing.percentage || 0)) / 100;
          const invCost = getInventoryCost(ing.name);
          const effectiveCostPerKg = invCost !== undefined ? invCost : (ing.costPerKg || 0);
          const cost = (weight / 1000) * effectiveCostPerKg;
          totalRecipeCost += cost;
          return { 
              ...ing, 
              weight, 
              cost, 
              costPerKg: effectiveCostPerKg,
              usingInventory: invCost !== undefined
          };
      });
      const costPerLoaf = numberOfLoaves > 0 ? totalRecipeCost / numberOfLoaves : 0;
      return { breakdown, totalRecipeCost, costPerLoaf };
  }, [totalFlour, ingredients, numberOfLoaves, inventory]);

  if (totalFlour <= 0) return null;

  return (
    <div className="bg-white dark:bg-stone-900/40 rounded-2xl border border-stone-200 dark:border-stone-800/60 p-8 shadow-sm transition-colors animate-fade-in mb-20">
      <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-stone-800 dark:text-stone-100 tracking-tight">
            Cost Analysis
          </h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 border border-stone-200 dark:border-stone-700 px-2.5 py-1 rounded-md bg-stone-50 dark:bg-stone-950">
            Prices per kg
          </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-stone-50/50 dark:bg-stone-800/20">
            <tr>
              <th className="px-4 py-3 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Ingredient</th>
              <th className="px-4 py-3 text-right text-[10px] font-black text-stone-400 uppercase tracking-widest">Weight</th>
              <th className="px-4 py-3 text-right text-[10px] font-black text-stone-400 uppercase tracking-widest">Price ($/kg)</th>
              <th className="px-4 py-3 text-right text-[10px] font-black text-stone-400 uppercase tracking-widest">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800/40">
            {calculation.breakdown.map(item => (
                <tr key={item.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/20 transition-colors">
                    <td className="px-4 py-4 text-sm font-medium text-stone-800 dark:text-stone-200">
                        {item.name || 'Unnamed'}
                        {item.usingInventory && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 uppercase tracking-tighter">
                                <BoxIcon className="w-2.5 h-2.5 mr-1" /> Inv
                            </span>
                        )}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-stone-500 dark:text-stone-400 text-right">{item.weight.toFixed(0)}g</td>
                    <td className="px-4 py-4 text-right">
                         <div className="flex flex-col items-end">
                             <div className="flex items-center justify-end gap-3">
                                {item.usingInventory ? (
                                    <span className="text-sm font-bold text-stone-800 dark:text-stone-100">${item.costPerKg?.toFixed(2)}</span>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleSuggestCost(item.name, item.id)}
                                            disabled={loadingSuggestion === item.id || !item.name}
                                            aria-label="Auto-suggest market price"
                                            className="p-1.5 text-stone-300 dark:text-stone-600 hover:text-amber-600 dark:hover:text-amber-400 transition-colors disabled:opacity-50"
                                            title="Auto-suggest market price"
                                        >
                                            {loadingSuggestion === item.id ? <Spinner /> : <SparklesIcon className="w-4 h-4" />}
                                        </button>
                                        <div className="relative rounded-lg shadow-sm w-28">
                                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                                <span className="text-stone-400 dark:text-stone-600 text-[11px] font-bold">$</span>
                                            </div>
                                            <input
                                            type="number"
                                            step="0.01"
                                            value={item.costPerKg || ''}
                                            onChange={(e) => onUpdateIngredientCost(item.id, e.target.value)}
                                            className="bg-stone-100/50 dark:bg-stone-950/50 border-none block w-full text-[11px] font-black rounded-lg pl-6 py-2 text-right focus:ring-2 focus:ring-amber-500/20 dark:text-stone-100"
                                            placeholder="0.00"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                            {suggestions[item.id.toString()] !== undefined && !item.usingInventory && (
                                <button 
                                    onClick={() => applySuggestion(item.id, suggestions[item.id.toString()])}
                                    className="text-[9px] text-amber-600 dark:text-amber-500 font-black hover:underline mt-1 uppercase tracking-widest"
                                >
                                    Est: ${suggestions[item.id.toString()].toFixed(2)} &larr; Apply
                                </button>
                            )}
                        </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-stone-800 dark:text-stone-200 text-right font-bold">
                        ${item.cost.toFixed(2)}
                    </td>
                </tr>
            ))}
            
            <tr className="bg-amber-50/50 dark:bg-amber-900/10 transition-colors">
                <td className="px-6 py-5 text-stone-800 dark:text-stone-100 text-base font-black tracking-tight">Total Batch Cost</td>
                <td className="px-4 py-5"></td>
                <td className="px-4 py-5 text-right">
                    <span className="block font-black text-amber-700 dark:text-amber-500 text-sm tracking-tight">${calculation.costPerLoaf.toFixed(2)} / loaf</span>
                </td>
                <td className="px-6 py-5 text-right text-amber-700 dark:text-amber-500 font-black text-2xl tracking-tighter">
                    ${calculation.totalRecipeCost.toFixed(2)}
                </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecipeCost;
