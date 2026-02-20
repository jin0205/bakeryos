
import React, { useState, useEffect, useMemo } from 'react';
import { SavedRecipe, InventoryItem, Ingredient } from '../types';
import { BoxIcon } from './icons/BoxIcon';

const CostAnalysis: React.FC = () => {
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const recipesStr = localStorage.getItem('sourdough_recipes');
    if (recipesStr) {
        try {
            const parsed = JSON.parse(recipesStr);
            setSavedRecipes(parsed);
        } catch (e) { console.error(e); }
    }

    const invStr = localStorage.getItem('sourdough_inventory');
    if (invStr) setInventory(JSON.parse(invStr));
  }, []);

  // Helper to resolve cost and source
  const resolveCost = (name: string, inventoryId?: string, snapshotCost?: number): { price: number, source: 'inventory' | 'manual' } => {
      if (inventoryId) {
          const item = inventory.find(i => i.id === inventoryId);
          if (item && item.costPerKg) return { price: item.costPerKg, source: 'inventory' };
      }
      const match = inventory.find(i => i.name.toLowerCase().trim() === name.toLowerCase().trim());
      if (match && match.costPerKg) return { price: match.costPerKg, source: 'inventory' };
      return { price: snapshotCost || 0, source: 'manual' };
  };

  const analysis = useMemo(() => {
    return savedRecipes.map(recipe => {
        const targetDoughWeight = recipe.numberOfLoaves * recipe.weightPerLoaf;
        let flours: Ingredient[] = [];
        if (recipe.flours && recipe.flours.length > 0) {
            flours = recipe.flours;
        } else if (recipe.baseFlourName) {
            flours = [{
                id: 1, name: recipe.baseFlourName, percentage: 100, 
                inventoryId: recipe.baseFlourInventoryId, costPerKg: recipe.baseFlourCostPerKg
            }];
        }

        const totalFlourPercentage = flours.reduce((sum, f) => sum + (f.percentage || 0), 0);
        const totalIngPercentage = recipe.ingredients.reduce((sum, ing) => sum + (ing.percentage || 0), 0);
        const totalFormulaPercentage = totalFlourPercentage + totalIngPercentage;

        const totalFlourWeight = totalFormulaPercentage > 0 
            ? targetDoughWeight / (totalFormulaPercentage / 100) 
            : 0;

        let inventoryItemsCount = 0;
        let totalItemsCount = 0;
        let totalBatchCost = 0;
        const allItems = [...flours, ...recipe.ingredients];

        allItems.forEach(item => {
            totalItemsCount++;
            const weight = (totalFlourWeight * (item.percentage || 0)) / 100;
            const res = resolveCost(item.name, item.inventoryId, item.costPerKg);
            if (res.source === 'inventory') inventoryItemsCount++;
            const itemCost = (weight / 1000) * res.price;
            totalBatchCost += itemCost;
        });

        const costPerLoaf = recipe.numberOfLoaves > 0 ? totalBatchCost / recipe.numberOfLoaves : 0;

        let inventoryStatus: 'none' | 'partial' | 'full' = 'none';
        if (inventoryItemsCount === totalItemsCount && totalItemsCount > 0) inventoryStatus = 'full';
        else if (inventoryItemsCount > 0) inventoryStatus = 'partial';

        return {
            ...recipe,
            totalBatchCost,
            costPerLoaf,
            inventoryStatus
        };
    }).sort((a, b) => b.costPerLoaf - a.costPerLoaf);
  }, [savedRecipes, inventory]);

  return (
    <div className="animate-fade-in">
        <div className="mb-6">
            <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-1">Cost Analysis</h2>
            <p className="text-stone-600 dark:text-stone-400">Profitability breakdown for all saved recipes based on real-time inventory prices.</p>
        </div>

        <div className="bg-white dark:bg-stone-900/60 rounded-lg border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden transition-colors">
            <table className="min-w-full divide-y divide-stone-200 dark:divide-stone-800/60">
                <thead className="bg-stone-50 dark:bg-stone-950/40">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Recipe Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Batch Specs</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Total Batch Cost</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider text-amber-700 dark:text-amber-500">Cost Per Loaf</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-transparent divide-y divide-stone-200 dark:divide-stone-800/40">
                    {analysis.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-stone-500 dark:text-stone-400 transition-colors">
                                No recipes found. Create recipes in the Recipe Management tab.
                            </td>
                        </tr>
                    ) : (
                        analysis.map(row => (
                            <tr key={row.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-stone-900 dark:text-stone-100">{row.name}</div>
                                    <div className="text-xs text-stone-500 dark:text-stone-500">v{row.version} • {row.date}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-stone-600 dark:text-stone-400">
                                    {row.numberOfLoaves} loaves @ {row.weightPerLoaf}g
                                </td>
                                <td className="px-6 py-4 text-right text-sm text-stone-800 dark:text-stone-200">
                                    ${row.totalBatchCost.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {row.inventoryStatus === 'full' && (
                                            <BoxIcon className="w-4 h-4 text-green-600" title="Calculated using live inventory prices" />
                                        )}
                                        {row.inventoryStatus === 'partial' && (
                                            <BoxIcon className="w-4 h-4 text-amber-500" title="Partially calculated using inventory prices" />
                                        )}
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400">
                                            ${row.costPerLoaf.toFixed(2)}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        <div className="mt-6 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-lg p-4 flex items-start gap-3 transition-colors">
             <BoxIcon className="w-6 h-6 text-stone-400 mt-1" />
             <div>
                 <h4 className="font-medium text-stone-800 dark:text-stone-100 text-sm">How is this calculated?</h4>
                 <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                     Costs are calculated dynamically using the current "Cost Per Kg" from your <strong>Inventory Management</strong>. 
                     <br/>
                     <span className="inline-flex items-center gap-1 mt-1"><BoxIcon className="w-3 h-3 text-green-600" /> Green icon:</span> All ingredient prices derived from Inventory.
                     <br/>
                     <span className="inline-flex items-center gap-1"><BoxIcon className="w-3 h-3 text-amber-500" /> Amber icon:</span> Some prices derived from Inventory, others from saved manual values.
                 </p>
             </div>
        </div>
    </div>
  );
};

export default CostAnalysis;
