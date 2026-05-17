import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { SavedRecipe, PlannerItem, InventoryItem, Ingredient } from '../types';
import { storageService } from '../services/storageService';

interface BatchPlannerProps {
  onCreateWorkOrder?: (items: PlannerItem[], scheduledDate: string, status: 'draft' | 'scheduled') => void;
}

type WizardStep = 1 | 2 | 3 | 4;

const STEP_LABELS = ['Select Recipes', 'Set Counts', 'Stock Impact', 'Confirm'];

function fmtWeight(g: number): string {
  return g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g.toFixed(0)} g`;
}

interface StockTableProps {
  summary: Record<string, { weight: number; cost: number }>;
  inventory: InventoryItem[];
}

const StockTable: React.FC<StockTableProps> = ({ summary, inventory }) => (
  <div className="overflow-hidden rounded-lg border border-stone-200 dark:border-stone-700">
    <table className="min-w-full">
      <thead>
        <tr className="bg-stone-50 dark:bg-stone-900/60 border-b border-stone-200 dark:border-stone-700">
          <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-stone-400">Ingredient</th>
          <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-widest text-stone-400">Required</th>
          <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-widest text-stone-400">In Stock</th>
          <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-widest text-stone-400">After Bake</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
        {(Object.entries(summary) as [string, { weight: number; cost: number }][]).map(([name, data]) => {
          const inv = inventory.find(i => i.name.toLowerCase().trim() === name.toLowerCase().trim());
          const remaining = inv ? inv.quantity - data.weight : null;
          const deficit = remaining !== null && remaining < 0;
          return (
            <tr key={name} className={deficit ? 'bg-red-50 dark:bg-red-900/10' : 'hover:bg-stone-50 dark:hover:bg-stone-800/30'}>
              <td className="px-4 py-3 text-sm font-medium text-stone-900 dark:text-stone-100 whitespace-nowrap">
                {name}
                {deficit && (
                  <span className="ml-2 text-[9px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
                    Deficit
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-sm font-mono text-right text-stone-700 dark:text-stone-300 whitespace-nowrap">
                {fmtWeight(data.weight)}
              </td>
              <td className="px-4 py-3 text-sm font-mono text-right text-stone-500 dark:text-stone-400 whitespace-nowrap">
                {inv ? fmtWeight(inv.quantity) : <span className="italic text-stone-300 dark:text-stone-600">untracked</span>}
              </td>
              <td className={`px-4 py-3 text-sm font-mono font-bold text-right whitespace-nowrap ${
                deficit ? 'text-red-600 dark:text-red-400' :
                remaining !== null ? 'text-stone-500 dark:text-stone-400' :
                'text-stone-300 dark:text-stone-600'
              }`}>
                {remaining !== null ? fmtWeight(remaining) : '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const BatchPlanner: React.FC<BatchPlannerProps> = ({ onCreateWorkOrder }) => {
  const [plannerItems, setPlannerItems] = useState<PlannerItem[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [batchScalingMode, setBatchScalingMode] = useState<'percentage' | 'weight'>('percentage');
  const [batchScaleValue, setBatchScaleValue] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [woStatus, setWoStatus] = useState<'draft' | 'scheduled'>('scheduled');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  useEffect(() => {
    const currentRecipes = storageService.load<SavedRecipe>('bakeryos_recipes');
    setSavedRecipes(currentRecipes);

    const currentPlan = storageService.load<PlannerItem>('bakeryos_planner_items');
    const recipeMap = new Map(currentRecipes.map(r => [r.id, r]));
    const validItems: PlannerItem[] = [];
    let changed = false;

    currentPlan.forEach(item => {
      const fresh = recipeMap.get(item.recipe.id);
      if (!fresh) { changed = true; return; }
      if (fresh.version !== item.recipe.version) {
        validItems.push({ ...item, recipe: fresh });
        changed = true;
      } else {
        validItems.push(item);
      }
    });

    setPlannerItems(validItems);
    if (changed) storageService.save('bakeryos_planner_items', validItems);
    setInventory(storageService.load<InventoryItem>('bakeryos_inventory'));
  }, []);

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    storageService.save('bakeryos_planner_items', plannerItems);
  }, [plannerItems]);

  const addToPlan = (recipe: SavedRecipe) => {
    setPlannerItems(prev => [...prev, {
      uniqueId: Date.now().toString() + Math.random().toString().slice(2, 5),
      recipe,
      count: recipe.numberOfLoaves,
    }]);
  };

  const removeFromPlan = (uniqueId: string) =>
    setPlannerItems(prev => prev.filter(i => i.uniqueId !== uniqueId));

  const updatePlanCount = (uniqueId: string, val: string) => {
    const count = parseFloat(val);
    setPlannerItems(prev =>
      prev.map(i => i.uniqueId === uniqueId ? { ...i, count: isNaN(count) ? 0 : count } : i)
    );
  };

  const plannerSummary = useMemo<{ summary: Record<string, { weight: number; cost: number }>; totalDough: number; totalCost: number }>(() => {
    const summary: Record<string, { weight: number; cost: number }> = {};
    let totalDough = 0;
    let totalCost = 0;

    const getCostPerKg = (name: string, inventoryId?: string, snapshotCost?: number): number => {
      if (inventoryId) {
        const item = inventory.find(i => i.id === inventoryId);
        if (item?.costPerKg) return item.costPerKg;
      }
      const match = inventory.find(i => i.name.toLowerCase().trim() === name.toLowerCase().trim());
      if (match?.costPerKg) return match.costPerKg;
      return snapshotCost || 0;
    };

    plannerItems.forEach(({ recipe, count }) => {
      const batchWeight = (Number(count) || 0) * (Number(recipe.weightPerLoaf) || 0);
      totalDough += batchWeight;

      const flours: Ingredient[] = recipe.flours || [];
      const flourPct = flours.reduce((s, f) => s + (f.percentage || 0), 0) || 100;
      const ingPct = recipe.ingredients.reduce((s, i) => s + (i.percentage || 0), 0);
      const flourWeight = (flourPct + ingPct) > 0 ? batchWeight / ((flourPct + ingPct) / 100) : 0;

      const processItems = (list: Ingredient[]) => list.forEach(ing => {
        if (!ing.name) return;
        const name = ing.name.trim();
        const weight = (flourWeight * (Number(ing.percentage) || 0)) / 100;
        if (!summary[name]) summary[name] = { weight: 0, cost: 0 };
        const cost = (weight / 1000) * getCostPerKg(name, ing.inventoryId, ing.costPerKg);
        summary[name].weight += weight;
        summary[name].cost += cost;
        totalCost += cost;
      });

      processItems(flours);
      processItems(recipe.ingredients);
    });

    return { summary, totalDough, totalCost };
  }, [plannerItems, inventory]);

  const applyBatchScaling = () => {
    const val = parseFloat(batchScaleValue);
    if (isNaN(val) || val <= 0 || !plannerItems.length) return;
    const factor = batchScalingMode === 'percentage'
      ? val / 100
      : val / (plannerSummary.totalDough || 1);
    setPlannerItems(prev =>
      prev.map(item => ({ ...item, count: parseFloat((item.count * factor).toFixed(2)) }))
    );
    setBatchScaleValue('');
  };

  const executeCommitBake = () => {
    const updated = [...inventory];
    const missing: string[] = [];

    (Object.entries(plannerSummary.summary) as [string, { weight: number; cost: number }][]).forEach(([name, data]) => {
      const idx = updated.findIndex(i => i.name.toLowerCase().trim() === name.toLowerCase().trim());
      if (idx > -1) {
        updated[idx].quantity -= data.weight;
        updated[idx].lastUpdated = new Date().toISOString();
      } else {
        missing.push(name);
      }
    });

    setInventory(updated);
    storageService.save('bakeryos_inventory', updated);
    setPlannerItems([]);
    storageService.save('bakeryos_planner_items', []);
    setWizardStep(1);

    showToast(
      missing.length
        ? `Bake committed. Not found in inventory: ${missing.join(', ')}.`
        : 'Bake committed. Stock adjusted.'
    );
  };

  const filteredRecipes = useMemo(() => {
    if (!recipeSearch.trim()) return savedRecipes;
    const q = recipeSearch.toLowerCase();
    return savedRecipes.filter(r => r.name.toLowerCase().includes(q));
  }, [savedRecipes, recipeSearch]);

  const hasDeficit = useMemo(() =>
    (Object.entries(plannerSummary.summary) as [string, { weight: number; cost: number }][]).some(([name, data]) => {
      const inv = inventory.find(i => i.name.toLowerCase().trim() === name.toLowerCase().trim());
      return inv ? inv.quantity - data.weight < 0 : false;
    }),
    [plannerSummary.summary, inventory]
  );

  const canNext =
    wizardStep === 1 ? plannerItems.length > 0 :
    wizardStep === 2 ? plannerItems.length > 0 && plannerItems.every(i => i.count > 0) :
    true;

  const stepTo = (step: WizardStep) => setWizardStep(step);

  const DeficitBanner = () => (
    <div className="flex items-start gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-lg">
      <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p className="text-sm text-red-700 dark:text-red-300">
        Some ingredients have insufficient stock. Highlighted rows show where you're short.
      </p>
    </div>
  );

  return (
    <div className="animate-fade-in">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-sm text-center">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">PRODUCTION / Batch Planner</p>
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">Batch Planner</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {([1, 2, 3, 4] as WizardStep[]).map((step, i) => (
          <React.Fragment key={step}>
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
                wizardStep > step ? 'bg-amber-600 text-white' :
                wizardStep === step ? 'bg-amber-600 text-white' :
                'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500'
              }`}>
                {wizardStep > step ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : step}
              </div>
              <span className={`text-sm font-medium hidden sm:block transition-colors ${
                wizardStep >= step ? 'text-stone-900 dark:text-stone-100' : 'text-stone-400 dark:text-stone-500'
              }`}>
                {STEP_LABELS[i]}
              </span>
            </div>
            {i < 3 && (
              <div className={`flex-1 h-px mx-3 transition-colors ${
                wizardStep > step ? 'bg-amber-600' : 'bg-stone-200 dark:bg-stone-700'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-64">

        {/* Step 1: Select Recipes */}
        {wizardStep === 1 && (
          <div className="space-y-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search recipes..."
                value={recipeSearch}
                onChange={e => setRecipeSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
              />
            </div>

            {savedRecipes.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-stone-400">No recipes saved. Create one in Formula Library first.</p>
              </div>
            ) : filteredRecipes.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-stone-400 italic">No recipes match your search.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredRecipes.map(recipe => {
                  const isAdded = plannerItems.some(i => i.recipe.id === recipe.id);
                  return (
                    <div
                      key={recipe.id}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                        isAdded
                          ? 'border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10'
                          : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-200 dark:hover:border-stone-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">{recipe.name}</p>
                        <p className="text-xs text-stone-400 mt-0.5">v{recipe.version} · {recipe.numberOfLoaves} loaves · {recipe.weightPerLoaf}g each</p>
                      </div>
                      <button
                        onClick={() => addToPlan(recipe)}
                        className={`ml-4 flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                          isAdded
                            ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/30'
                            : 'bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:text-amber-700 hover:border-amber-300'
                        }`}
                      >
                        {isAdded ? '+ Add Again' : 'Add'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {plannerItems.length > 0 && (
              <div className="border-t border-stone-100 dark:border-stone-800 pt-4 mt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2.5">In Your Plan</p>
                <div className="flex flex-wrap gap-2">
                  {plannerItems.map(item => (
                    <span key={item.uniqueId} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-full text-xs font-medium">
                      {item.recipe.name}
                      <button
                        onClick={() => removeFromPlan(item.uniqueId)}
                        className="w-4 h-4 rounded-full flex items-center justify-center text-stone-400 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                        aria-label={`Remove ${item.recipe.name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Set Counts */}
        {wizardStep === 2 && (
          <div className="space-y-6">
            {plannerItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-stone-400 italic">No recipes in plan.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Recipes</p>
                  <button
                    onClick={() => setPlannerItems([])}
                    className="text-xs text-stone-400 hover:text-red-500 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                {plannerItems.map(item => {
                  const totalWeight = (Number(item.count) || 0) * (Number(item.recipe.weightPerLoaf) || 0);
                  return (
                    <div key={item.uniqueId} className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">{item.recipe.name}</p>
                        <p className="text-xs text-stone-400 mt-0.5">{item.recipe.weightPerLoaf}g per loaf</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <label className="text-xs text-stone-400 whitespace-nowrap">Loaves</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.count}
                          onChange={e => updatePlanCount(item.uniqueId, e.target.value)}
                          className="w-20 px-2 py-1.5 text-sm text-right font-mono border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 rounded-md focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-stone-100"
                        />
                      </div>
                      <div className="w-24 text-right flex-shrink-0">
                        <p className="text-sm font-mono font-bold text-stone-800 dark:text-stone-200">{fmtWeight(totalWeight)}</p>
                        <p className="text-xs text-stone-400">dough</p>
                      </div>
                      <button
                        onClick={() => removeFromPlan(item.uniqueId)}
                        className="text-stone-300 hover:text-red-500 dark:text-stone-600 dark:hover:text-red-400 transition-colors flex-shrink-0"
                        aria-label={`Remove ${item.recipe.name}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {plannerItems.length > 0 && (
              <div className="border-t border-stone-100 dark:border-stone-800 pt-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Batch Scaling</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex rounded-md overflow-hidden border border-stone-200 dark:border-stone-700">
                    <button
                      onClick={() => setBatchScalingMode('percentage')}
                      aria-pressed={batchScalingMode === 'percentage'}
                      className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                        batchScalingMode === 'percentage'
                          ? 'bg-amber-600 text-white'
                          : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
                      }`}
                    >
                      % Scale
                    </button>
                    <button
                      onClick={() => setBatchScalingMode('weight')}
                      aria-pressed={batchScalingMode === 'weight'}
                      className={`px-3 py-1.5 text-xs font-semibold border-l border-stone-200 dark:border-stone-700 transition-colors ${
                        batchScalingMode === 'weight'
                          ? 'bg-amber-600 text-white'
                          : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
                      }`}
                    >
                      Target Weight
                    </button>
                  </div>
                  <input
                    type="number"
                    value={batchScaleValue}
                    onChange={e => setBatchScaleValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && applyBatchScaling()}
                    placeholder={batchScalingMode === 'percentage' ? 'e.g. 150' : 'grams'}
                    className="w-28 px-3 py-1.5 text-sm border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 rounded-md focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-stone-100"
                  />
                  <button
                    onClick={applyBatchScaling}
                    className="px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
                  >
                    Apply
                  </button>
                  <p className="text-xs text-stone-400">Preserves baker's percentages while adjusting volume.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Stock Impact */}
        {wizardStep === 3 && (
          <div className="space-y-4">
            {hasDeficit && <DeficitBanner />}
            {Object.keys(plannerSummary.summary).length === 0 ? (
              <div className="py-12 text-center text-stone-400 text-sm">No ingredients to display.</div>
            ) : (
              <StockTable summary={plannerSummary.summary} inventory={inventory} />
            )}
          </div>
        )}

        {/* Step 4: Confirm */}
        {wizardStep === 4 && (
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Batch Summary</p>
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {plannerItems.map(item => {
                  const weight = (Number(item.count) || 0) * (Number(item.recipe.weightPerLoaf) || 0);
                  return (
                    <div key={item.uniqueId} className="flex justify-between items-center py-2.5">
                      <span className="text-sm text-stone-800 dark:text-stone-200">{item.recipe.name}</span>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-stone-400">{item.count} loaves</span>
                        <span className="font-mono font-bold text-stone-800 dark:text-stone-200 w-20 text-right">{fmtWeight(weight)}</span>
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-sm font-bold text-stone-900 dark:text-stone-100">Total</span>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-stone-400">{plannerItems.reduce((s, i) => s + i.count, 0)} loaves</span>
                    <span className="font-mono font-bold text-stone-900 dark:text-stone-50 w-20 text-right">{fmtWeight(plannerSummary.totalDough)}</span>
                  </div>
                </div>
              </div>
            </div>

            {Object.keys(plannerSummary.summary).length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Stock Impact After Release</p>
                {hasDeficit && (
                  <div className="mb-3">
                    <DeficitBanner />
                  </div>
                )}
                <StockTable summary={plannerSummary.summary} inventory={inventory} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-t border-stone-100 dark:border-stone-800 pt-5">
              <div>
                <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1.5">Scheduled Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-stone-900 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1.5">Work Order Status</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="woStatus" value="scheduled" checked={woStatus === 'scheduled'} onChange={() => setWoStatus('scheduled')} className="accent-amber-600" />
                    <span className="text-sm text-stone-700 dark:text-stone-300">Scheduled</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="woStatus" value="draft" checked={woStatus === 'draft'} onChange={() => setWoStatus('draft')} className="accent-amber-600" />
                    <span className="text-sm text-stone-700 dark:text-stone-300">Draft</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wizard footer: running summary + navigation */}
      <div className="border-t border-stone-200 dark:border-stone-700 pt-5 mt-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 text-sm flex-wrap">
            {plannerItems.length > 0 ? (
              <>
                <span>
                  <span className="font-mono font-bold text-stone-900 dark:text-stone-100">{fmtWeight(plannerSummary.totalDough)}</span>
                  <span className="ml-1.5 text-stone-400">dough</span>
                </span>
                <span>
                  <span className="font-mono font-bold text-amber-600">${plannerSummary.totalCost.toFixed(2)}</span>
                  <span className="ml-1.5 text-stone-400">est. cost</span>
                </span>
                <span>
                  <span className="font-mono font-bold text-stone-900 dark:text-stone-100">{plannerItems.length}</span>
                  <span className="ml-1.5 text-stone-400">recipe{plannerItems.length !== 1 ? 's' : ''}</span>
                </span>
              </>
            ) : (
              <span className="text-stone-400">No recipes selected</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {wizardStep > 1 && (
              <button
                onClick={() => stepTo((wizardStep - 1) as WizardStep)}
                className="px-4 py-2 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
              >
                Back
              </button>
            )}
            {wizardStep < 4 && (
              <button
                onClick={() => stepTo((wizardStep + 1) as WizardStep)}
                disabled={!canNext}
                className="px-4 py-2 text-sm font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {wizardStep === 3 ? 'Review & Confirm' : 'Next'}
              </button>
            )}
            {wizardStep === 4 && (
              <>
                {onCreateWorkOrder && (
                  <button
                    onClick={() => {
                      onCreateWorkOrder(plannerItems, scheduledDate, woStatus);
                      setScheduledDate('');
                      setWizardStep(1);
                      showToast('Work order saved.');
                    }}
                    className="px-4 py-2 text-sm font-semibold border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Save Work Order
                  </button>
                )}
                <button
                  onClick={executeCommitBake}
                  className="px-4 py-2 text-sm font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Release to Production
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchPlanner;
