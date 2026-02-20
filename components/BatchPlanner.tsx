import React, { useState, useEffect, useMemo } from 'react';
import { SavedRecipe, PlannerItem, InventoryItem, Ingredient } from '../types';

const BatchPlanner: React.FC = () => {
  const [plannerItems, setPlannerItems] = useState<PlannerItem[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // Scaling State
  const [batchScalingMode, setBatchScalingMode] = useState<'percentage' | 'weight'>('percentage');
  const [batchScaleValue, setBatchScaleValue] = useState<string>('');

  // Load saved recipes, persisted plan, and inventory
  useEffect(() => {
    const recipesStr = localStorage.getItem('sourdough_recipes');
    let currentRecipes: SavedRecipe[] = [];
    if (recipesStr) {
      try {
        currentRecipes = JSON.parse(recipesStr);
        setSavedRecipes(currentRecipes);
      } catch (e) {
        console.error('Failed to load recipes', e);
      }
    }

    const planStr = localStorage.getItem('sourdough_planner_items');
    let currentPlan: PlannerItem[] = [];
    if (planStr) {
      try {
        currentPlan = JSON.parse(planStr);
      } catch (e) {
        console.error('Failed to load plan', e);
      }
    }

    const validPlannerItems: PlannerItem[] = [];
    let hasChanges = false;
    const recipeMap = new Map(currentRecipes.map(r => [r.id, r]));

    currentPlan.forEach(item => {
        const freshRecipe = recipeMap.get(item.recipe.id);
        if (!freshRecipe) {
             hasChanges = true;
             return;
        }

        if (freshRecipe.version !== item.recipe.version) {
             validPlannerItems.push({ ...item, recipe: freshRecipe });
             hasChanges = true;
        } else {
             validPlannerItems.push(item);
        }
    });

    setPlannerItems(validPlannerItems);
    if (hasChanges) {
        localStorage.setItem('sourdough_planner_items', JSON.stringify(validPlannerItems));
    }

    const invStr = localStorage.getItem('sourdough_inventory');
    if (invStr) {
        try {
            setInventory(JSON.parse(invStr));
        } catch (e) {
            console.error('Failed to load inventory', e);
        }
    }
  }, []);

  // Persist plan changes
  useEffect(() => {
    localStorage.setItem('sourdough_planner_items', JSON.stringify(plannerItems));
  }, [plannerItems]);

  const addToPlan = (recipe: SavedRecipe) => {
    const newItem: PlannerItem = {
      uniqueId: Date.now().toString() + Math.random().toString().slice(2, 5),
      recipe: recipe,
      count: recipe.numberOfLoaves
    };
    setPlannerItems([...plannerItems, newItem]);
  };

  const removeFromPlan = (uniqueId: string) => {
    setPlannerItems(plannerItems.filter(i => i.uniqueId !== uniqueId));
  };

  const updatePlanCount = (uniqueId: string, countStr: string) => {
    const count = parseFloat(countStr);
    setPlannerItems(plannerItems.map(i =>
      i.uniqueId === uniqueId ? { ...i, count: isNaN(count) ? 0 : count } : i
    ));
  };

  const plannerSummary = useMemo<{ summary: Record<string, { weight: number, cost: number }>; totalDough: number; totalCost: number }>(() => {
    const summary: Record<string, { weight: number, cost: number }> = {};
    let totalDough: number = 0;
    let totalCost: number = 0;

    const getCostPerKg = (name: string, inventoryId?: string, snapshotCost?: number): number => {
        if (inventoryId) {
            const item = inventory.find(i => i.id === inventoryId);
            if (item && item.costPerKg) return item.costPerKg;
        }
        const match = inventory.find(i => i.name.toLowerCase().trim() === name.toLowerCase().trim());
        if (match && match.costPerKg) return match.costPerKg;
        return snapshotCost || 0;
    };

    plannerItems.forEach(item => {
      const { recipe, count } = item;
      const targetBatchWeight = (Number(count) || 0) * (Number(recipe.weightPerLoaf) || 0);
      totalDough += targetBatchWeight;

      let flours: Ingredient[] = recipe.flours || [];
      const totalFlourPct = flours.reduce((sum, f) => sum + (f.percentage || 0), 0) || 100;
      const totalIngPct = recipe.ingredients.reduce((sum, ing) => sum + (ing.percentage || 0), 0);
      const totalFormulaPct = totalFlourPct + totalIngPct;

      const totalFlourWeight = totalFormulaPct > 0 ? targetBatchWeight / (totalFormulaPct / 100) : 0;

      const processItems = (list: Ingredient[]) => {
          list.forEach(ing => {
              if (!ing.name) return;
              const name = ing.name.trim();
              const weight = (totalFlourWeight * (Number(ing.percentage) || 0)) / 100;
              if (!summary[name]) summary[name] = { weight: 0, cost: 0 };
              const costPerKg = getCostPerKg(name, ing.inventoryId, ing.costPerKg);
              const cost = (weight / 1000) * costPerKg;
              // Fix: Added type assertion to fix unknown type error on line 167
              const current = summary[name] as { weight: number, cost: number };
              current.weight += weight;
              current.cost += cost;
              totalCost += cost;
          });
      };

      processItems(flours);
      processItems(recipe.ingredients);
    });

    return { summary, totalDough, totalCost };
  }, [plannerItems, inventory]);

  const applyBatchScaling = () => {
      const val = parseFloat(batchScaleValue);
      if (isNaN(val) || val <= 0) return;
      if (plannerItems.length === 0) return;
      let factor = batchScalingMode === 'percentage' ? val / 100 : val / (plannerSummary.totalDough || 1);
      const updatedItems = plannerItems.map(item => ({
          ...item,
          count: parseFloat((item.count * factor).toFixed(2))
      }));
      setPlannerItems(updatedItems);
      setBatchScaleValue('');
  };

  const handleCommitBake = () => {
      if (plannerItems.length === 0) return;
      if (!window.confirm("Commit this batch? This will subtract the required ingredients from your inventory stock and clear the planner.")) return;

      const updatedInventory = [...inventory];
      let missingItems: string[] = [];

      Object.entries(plannerSummary.summary).forEach(([name, data]) => {
          const invItemIndex = updatedInventory.findIndex(i => i.name.toLowerCase().trim() === name.toLowerCase().trim());
          if (invItemIndex > -1) {
              // Fix: Added type assertion to fix potential unknown type error when accessing data.weight
              const itemData = data as { weight: number };
              updatedInventory[invItemIndex].quantity -= itemData.weight;
              updatedInventory[invItemIndex].lastUpdated = new Date().toISOString();
          } else {
              missingItems.push(name);
          }
      });

      setInventory(updatedInventory);
      localStorage.setItem('sourdough_inventory', JSON.stringify(updatedInventory));
      
      setPlannerItems([]);
      localStorage.setItem('sourdough_planner_items', JSON.stringify([]));

      alert(`Bake committed successfully! Stock adjusted.${missingItems.length > 0 ? '\n\nNote: The following items were used but were not found in inventory: ' + missingItems.join(', ') : ''}`);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-100 mb-1">Batch Production Planner</h2>
        <p className="text-stone-400">Combine multiple recipes into a master production list.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recipe Queue — left column */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* YOUR RECIPES */}
          <div className="bg-stone-900 rounded-lg border border-stone-800 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-stone-800">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-500">Your Recipes</h3>
            </div>
            {savedRecipes.length === 0 ? (
              <p className="px-4 py-4 text-xs text-stone-500 italic">No saved recipes yet.</p>
            ) : (
              <ul className="divide-y divide-stone-800 max-h-64 overflow-y-auto">
                {savedRecipes.map(recipe => (
                  <li key={recipe.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-stone-800 transition-colors">
                    <div className="min-w-0 flex-1 mr-2">
                      <p className="text-sm font-medium text-stone-200 truncate">{recipe.name}</p>
                      <p className="text-[10px] text-stone-500">v{recipe.version} · {recipe.numberOfLoaves} @ {recipe.weightPerLoaf}g</p>
                    </div>
                    <button
                      onClick={() => addToPlan(recipe)}
                      className="flex-shrink-0 text-xs px-2 py-1 rounded-md bg-stone-800 border border-stone-700 text-stone-300 hover:text-amber-400 hover:border-amber-600 transition-colors"
                    >
                      +
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* IN YOUR PLAN */}
          <div className="bg-stone-900 rounded-lg border border-stone-800 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-stone-800 flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-500">In Your Plan</h3>
              {plannerItems.length > 0 && (
                <button onClick={() => setPlannerItems([])} className="text-[10px] text-red-500 hover:text-red-400 transition-colors">Clear All</button>
              )}
            </div>
            {plannerItems.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-stone-500 italic">Add recipes from above ↑</p>
              </div>
            ) : (
              <ul className="divide-y divide-stone-800">
                {plannerItems.map(item => (
                  <li key={item.uniqueId} className="px-4 py-3">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-stone-200 truncate mr-2">{item.recipe.name}</span>
                      <button onClick={() => removeFromPlan(item.uniqueId)} className="text-stone-600 hover:text-red-500 text-base leading-none flex-shrink-0 transition-colors">&times;</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-500">Loaves:</span>
                      <input
                        type="number"
                        value={item.count}
                        onChange={e => updatePlanCount(item.uniqueId, e.target.value)}
                        className="w-16 px-2 py-1 text-xs border border-stone-700 bg-stone-950 rounded text-stone-200 focus:border-amber-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-stone-500">× {item.recipe.weightPerLoaf}g</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Master Production List — right column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Batch Scaling (only shown when plan has items) */}
          {plannerItems.length > 0 && (
            <div className="bg-stone-900 rounded-lg border border-stone-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold text-stone-200 mb-0.5">Batch Scaling</h3>
                <p className="text-[10px] text-stone-500">Preserve baker's percentages while adjusting volume.</p>
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex rounded-md overflow-hidden border border-stone-700">
                  <button
                    onClick={() => setBatchScalingMode('percentage')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${batchScalingMode === 'percentage' ? 'bg-amber-600 text-white' : 'bg-stone-900 text-stone-400 hover:text-stone-200'}`}
                  >%</button>
                  <button
                    onClick={() => setBatchScalingMode('weight')}
                    className={`px-3 py-1.5 text-xs font-medium border-l border-stone-700 transition-colors ${batchScalingMode === 'weight' ? 'bg-amber-600 text-white' : 'bg-stone-900 text-stone-400 hover:text-stone-200'}`}
                  >Weight</button>
                </div>
                <input
                  type="number"
                  value={batchScaleValue}
                  onChange={e => setBatchScaleValue(e.target.value)}
                  className="w-24 px-2 py-1.5 text-xs border border-stone-700 bg-stone-950 rounded text-stone-200 focus:border-amber-500 focus:outline-none"
                  placeholder={batchScalingMode === 'percentage' ? '%' : 'grams'}
                />
                <button onClick={applyBatchScaling} className="px-3 py-1.5 text-xs font-bold rounded bg-amber-600 hover:bg-amber-700 text-white transition-colors">Apply</button>
              </div>
            </div>
          )}

          {/* Master List */}
          <div className="bg-stone-900 rounded-lg border border-stone-800 overflow-hidden flex flex-col">
            <div className="bg-stone-950 px-5 py-3.5 flex justify-between items-center border-b border-stone-800">
              <h3 className="text-sm font-bold text-stone-100">Master Production List</h3>
              <div className="text-right">
                <span className="text-xs text-stone-500">{(plannerSummary.totalDough / 1000).toFixed(2)} kg · </span>
                <span className="text-sm font-bold text-amber-400">${plannerSummary.totalCost.toFixed(2)}</span>
              </div>
            </div>

            {Object.keys(plannerSummary.summary).length === 0 ? (
              <div className="py-12 text-center text-stone-500 text-sm">
                Add recipes from the queue to see production requirements.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-800">
                  <thead className="bg-stone-950/40">
                    <tr>
                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-stone-500">Ingredient</th>
                      <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-widest text-stone-500">Total Weight</th>
                      <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-widest text-stone-500">Stock After Bake</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {Object.entries(plannerSummary.summary).map(([name, data]) => {
                      const itemData = data as { weight: number; cost: number };
                      const invItem = inventory.find(i => i.name.toLowerCase().trim() === name.toLowerCase().trim());
                      const remaining = invItem ? invItem.quantity - itemData.weight : null;
                      return (
                        <tr key={name} className="hover:bg-stone-800/30 transition-colors">
                          <td className="px-5 py-3.5 text-sm text-stone-200">{name}</td>
                          <td className="px-5 py-3.5 text-sm text-stone-400 text-right">
                            {itemData.weight >= 1000 ? `${(itemData.weight / 1000).toFixed(2)} kg` : `${itemData.weight.toFixed(0)} g`}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-right">
                            {remaining !== null ? (
                              <span className={remaining < 0 ? 'text-red-500 font-bold' : 'text-stone-500'}>
                                {(remaining / 1000).toFixed(2)} kg
                              </span>
                            ) : (
                              <span className="text-stone-600 italic text-xs">Untracked</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Commit button — pinned to Master List footer */}
            {plannerItems.length > 0 && (
              <div className="px-5 py-3.5 border-t border-stone-800 flex justify-end">
                <button
                  onClick={handleCommitBake}
                  className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Commit & Start Bake
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchPlanner;