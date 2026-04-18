import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SavedRecipe, PlannerItem, InventoryItem, Ingredient } from '../types';
import { storageService } from '../services/storageService';

interface BatchPlannerProps {
  onCreateWorkOrder?: (items: PlannerItem[], scheduledDate: string, status: 'draft' | 'scheduled') => void;
}

const BatchPlanner: React.FC<BatchPlannerProps> = ({ onCreateWorkOrder }) => {
  const [plannerItems, setPlannerItems] = useState<PlannerItem[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // Scaling State
  const [batchScalingMode, setBatchScalingMode] = useState<'percentage' | 'weight'>('percentage');
  const [batchScaleValue, setBatchScaleValue] = useState<string>('');

  // Work Order State
  const [showWOMenu, setShowWOMenu] = useState<boolean>(false);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [woStatus, setWoStatus] = useState<'draft' | 'scheduled'>('scheduled');

  const isInitialMount = useRef(true);

  // Load saved recipes, persisted plan, and inventory
  useEffect(() => {
    const currentRecipes = storageService.load<SavedRecipe>('bakeryos_recipes');
    setSavedRecipes(currentRecipes);

    const currentPlan = storageService.load<PlannerItem>('bakeryos_planner_items');
    const recipeMap = new Map(currentRecipes.map(r => [r.id, r]));
    const validPlannerItems: PlannerItem[] = [];
    let hasChanges = false;

    currentPlan.forEach(item => {
      const freshRecipe = recipeMap.get(item.recipe.id);
      if (!freshRecipe) { hasChanges = true; return; }
      if (freshRecipe.version !== item.recipe.version) {
        validPlannerItems.push({ ...item, recipe: freshRecipe });
        hasChanges = true;
      } else {
        validPlannerItems.push(item);
      }
    });

    setPlannerItems(validPlannerItems);
    if (hasChanges) storageService.save('bakeryos_planner_items', validPlannerItems);

    setInventory(storageService.load<InventoryItem>('bakeryos_inventory'));
  }, []);

  // Persist plan changes
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    storageService.save('bakeryos_planner_items', plannerItems);
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
      storageService.save('bakeryos_inventory', updatedInventory);

      setPlannerItems([]);
      storageService.save('bakeryos_planner_items', []);

      alert(`Bake committed successfully! Stock adjusted.${missingItems.length > 0 ? '\n\nNote: The following items were used but were not found in inventory: ' + missingItems.join(', ') : ''}`);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">PRODUCTION / Batch Builder</p>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">Batch Builder</h1>
          {plannerItems.length > 0 && (
            <div className="flex items-center gap-2 relative">
              {/* Save as Work Order */}
              <div className="relative">
                <button
                  onClick={() => setShowWOMenu(!showWOMenu)}
                  className="border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Save as Work Order
                </button>
                {showWOMenu && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-xl p-4 z-10">
                    <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3">New Work Order</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Scheduled Date</label>
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={e => setScheduledDate(e.target.value)}
                          className="w-full text-sm border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 rounded-lg px-3 py-2 text-stone-800 dark:text-stone-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Status</label>
                        <div className="flex gap-2">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" name="woStatus" value="scheduled" checked={woStatus === 'scheduled'} onChange={() => setWoStatus('scheduled')} className="accent-amber-600" />
                            <span className="text-sm text-stone-700 dark:text-stone-300">Scheduled</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" name="woStatus" value="draft" checked={woStatus === 'draft'} onChange={() => setWoStatus('draft')} className="accent-amber-600" />
                            <span className="text-sm text-stone-700 dark:text-stone-300">Draft</span>
                          </label>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onCreateWorkOrder?.(plannerItems, scheduledDate, woStatus);
                          setShowWOMenu(false);
                          setScheduledDate('');
                        }}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-lg transition-colors"
                      >
                        Save Work Order
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Release to Production */}
              <button
                onClick={handleCommitBake}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Release to Production
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-stone-900/60 p-4 rounded-lg border border-stone-200 dark:border-stone-800 shadow-sm transition-colors text-sm">
            <h3 className="font-semibold text-stone-800 dark:text-stone-200 mb-3">Add Recipes</h3>
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {savedRecipes.map(recipe => (
                <li key={recipe.id} className="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-800/40 rounded hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors">
                  <div className="truncate mr-2">
                    <p className="text-sm font-medium text-stone-700 dark:text-stone-200 truncate">{recipe.name}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">v{recipe.version} • {recipe.numberOfLoaves} @ {recipe.weightPerLoaf}g</p>
                  </div>
                  <button onClick={() => addToPlan(recipe)} className="text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-2 py-1 rounded text-stone-600 dark:text-stone-300 hover:text-amber-600 transition-colors">Add</button>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white dark:bg-stone-900/60 p-4 rounded-lg border border-stone-200 dark:border-stone-800 shadow-sm transition-colors text-sm">
            <div className="flex justify-between items-center mb-3">
               <h3 className="font-semibold text-stone-800 dark:text-stone-200">Current Plan</h3>
               {plannerItems.length > 0 && (
                   <button onClick={() => setPlannerItems([])} className="text-xs text-red-500 hover:text-red-700">Clear All</button>
               )}
            </div>
            {plannerItems.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400 italic">Plan is empty.</p>
            ) : (
              <ul className="space-y-3">
                {plannerItems.map((item) => (
                  <li key={item.uniqueId} className="border-b border-stone-100 dark:border-stone-800/40 pb-2 last:border-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium text-stone-800 dark:text-stone-200">{item.recipe.name}</span>
                      <button onClick={() => removeFromPlan(item.uniqueId)} className="text-red-400 hover:text-red-600 text-xs px-1">&times;</button>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <label className="text-stone-500 dark:text-stone-400 text-xs">Loaves:</label>
                      <input
                        type="number"
                        value={item.count}
                        onChange={(e) => updatePlanCount(item.uniqueId, e.target.value)}
                        className="w-16 p-1 text-xs border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 rounded focus:border-amber-500 dark:text-stone-100"
                      />
                      <span className="text-stone-400 dark:text-stone-500 text-xs">x {item.recipe.weightPerLoaf}g</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {plannerItems.length > 0 && (
              <div className="bg-white dark:bg-stone-900/60 p-4 rounded-lg border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
                  <div className="flex-grow">
                      <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100 mb-1">Batch Scaling</h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400">Preserve all baker's percentages while adjusting volume.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-end">
                      <div className="flex rounded-md shadow-sm">
                          <button onClick={() => setBatchScalingMode('percentage')} className={`px-3 py-1.5 text-xs font-medium rounded-l-md border ${batchScalingMode === 'percentage' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-700'}`}>%</button>
                          <button onClick={() => setBatchScalingMode('weight')} className={`px-3 py-1.5 text-xs font-medium rounded-r-md border-t border-b border-r ${batchScalingMode === 'weight' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-700'}`}>Total Weight</button>
                      </div>
                      <div className="flex gap-2">
                        <input type="number" value={batchScaleValue} onChange={(e) => setBatchScaleValue(e.target.value)} className="block w-32 px-3 py-1.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 rounded-md text-sm dark:text-stone-100" placeholder={batchScalingMode === 'percentage' ? "%" : "grams"} />
                        <button onClick={applyBatchScaling} className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-md hover:bg-amber-700">Apply</button>
                      </div>
                  </div>
              </div>
          )}

          <div className="bg-white dark:bg-stone-900/60 rounded-lg border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden transition-colors">
            <div className="bg-stone-800 dark:bg-stone-950 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold">Master Production List</h3>
              <div className="text-right">
                  <div className="text-sm opacity-80">{(plannerSummary.totalDough / 1000).toFixed(2)} kg total dough</div>
                  <div className="text-xl font-bold text-amber-400">${plannerSummary.totalCost.toFixed(2)} cost</div>
              </div>
            </div>

            {Object.keys(plannerSummary.summary).length === 0 ? (
              <div className="p-8 text-center text-stone-500 dark:text-stone-400">Add recipes to view the production requirements.</div>
            ) : (
              <table className="min-w-full divide-y divide-stone-200 dark:divide-stone-800/60">
                <thead className="bg-stone-50 dark:bg-stone-950/40">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Ingredient</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Total Weight</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Stock After Bake</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800/40">
                  {Object.entries(plannerSummary.summary).map(([name, data]) => {
                    // Fix: Added type assertion to fix unknown type error on lines 297 and 301
                    const itemData = data as { weight: number; cost: number };
                    const invItem = inventory.find(i => i.name.toLowerCase().trim() === name.toLowerCase().trim());
                    const remaining = invItem ? invItem.quantity - itemData.weight : null;
                    return (
                      <tr key={name} className="hover:bg-stone-50 dark:hover:bg-stone-800/30">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900 dark:text-stone-100">{name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 dark:text-stone-400 text-right">{itemData.weight >= 1000 ? `${(itemData.weight / 1000).toFixed(2)} kg` : `${itemData.weight.toFixed(0)} g`}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          {remaining !== null ? (
                            <span className={remaining < 0 ? 'text-red-600 font-bold' : 'text-stone-500'}>
                              {(remaining / 1000).toFixed(2)} kg
                            </span>
                          ) : (
                            <span className="text-stone-400 dark:text-stone-500 italic">Untracked</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchPlanner;