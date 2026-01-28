
import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem, PlannerItem, UnitOfMeasure, SavedRecipe } from '../types';
import { CalculatorIcon } from './icons/CalculatorIcon';

// Import the common lists for consistency. 
const COMMON_INGREDIENTS_LIST = [
  // Flours
  'Bread Flour', 'Strong White Flour', 'All-Purpose Flour', 'Whole Wheat Flour', 
  'Whole Grain Flour', 'High Gluten Flour', 'Pastry Flour', 'Cake Flour',
  'Rye Flour', 'Whole Rye Flour', 'Medium Rye', 'Dark Rye', 'Pumpernickel',
  'Spelt Flour', 'White Spelt', 'Semolina', 'Durum Flour', 
  'Einkorn', 'Emmer', 'Kamut (Khorasan)', 'Barley Flour', 'Buckwheat Flour',
  'Type 00', 'Type 0', 'Type 1', 'Type 2', 'Integrale',
  'T45', 'T55', 'T65', 'T80', 'T110', 'T150', 'T170',
  'Manitoba', 'Rice Flour', 'Cornmeal',
  // Liquids & Starters
  'Water', 'Levain', 'Stiff Levain', 'Poolish', 'Biga', 'Milk', 'Buttermilk', 'Beer', 'Coffee',
  // Salts & Yeasts
  'Salt', 'Sea Salt', 'Kosher Salt', 'Instant Yeast', 'Active Dry Yeast', 'Fresh Yeast',
  // Fats
  'Olive Oil', 'Butter', 'Lard', 'Vegetable Oil', 'Coconut Oil',
  // Sweeteners
  'Sugar', 'Brown Sugar', 'Honey', 'Molasses', 'Maple Syrup', 'Malt Syrup', 'Diastatic Malt Powder', 'Non-Diastatic Malt',
  // Inclusions
  'Raisins', 'Cranberries', 'Walnuts', 'Pecans', 'Sunflower Seeds', 'Sesame Seeds', 'Pumpkin Seeds', 
  'Flax Seeds', 'Chia Seeds', 'Poppy Seeds', 'Oats', 'Rolled Oats',
  'Chocolate Chips', 'Cocoa Powder', 'Cinnamon', 'Cardamom', 'Cheese', 'Olives', 'Garlic'
];

const InventoryManagement: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [plannerItems, setPlannerItems] = useState<PlannerItem[]>([]);
  
  // Form State
  const [newItemName, setNewItemName] = useState('');
  
  // Package Input State
  const [packageWeight, setPackageWeight] = useState('');
  const [packageUnit, setPackageUnit] = useState<UnitOfMeasure>('lb');
  const [costPerPackage, setCostPerPackage] = useState('');
  const [itemsPerPackage, setItemsPerPackage] = useState('1');

  // Load Data & Sync Planner
  useEffect(() => {
    const loadData = () => {
        const invStr = localStorage.getItem('sourdough_inventory');
        if (invStr) {
            try {
                setInventory(JSON.parse(invStr));
            } catch (e) {
                console.error("Error parsing inventory", e);
            }
        }

        const recipesStr = localStorage.getItem('sourdough_recipes');
        const planStr = localStorage.getItem('sourdough_planner_items');
        
        let currentRecipes: SavedRecipe[] = [];
        let currentPlan: PlannerItem[] = [];

        if (recipesStr) {
            try {
                currentRecipes = JSON.parse(recipesStr);
            } catch (e) { console.error(e); }
        }

        if (planStr) {
             try {
                currentPlan = JSON.parse(planStr);
            } catch (e) { console.error(e); }
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
    };

    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  useEffect(() => {
      if (inventory.length > 0) {
          localStorage.setItem('sourdough_inventory', JSON.stringify(inventory));
      }
  }, [inventory]);

  const convertToGrams = (weight: number, unit: UnitOfMeasure): number => {
      switch (unit) {
          case 'lb': return weight * 453.592;
          case 'oz': return weight * 28.3495;
          case 'kg': return weight * 1000;
          case 'g': return weight;
          default: return weight;
      }
  };

  const previewCalculation = useMemo(() => {
      const weight = parseFloat(packageWeight) || 0;
      const cost = parseFloat(costPerPackage) || 0;
      const count = parseFloat(itemsPerPackage) || 1;

      if (weight <= 0) return null;

      const singleItemGrams = convertToGrams(weight, packageUnit);
      const totalGrams = singleItemGrams * count;
      const costPerKg = totalGrams > 0 ? (cost / totalGrams) * 1000 : 0;

      return {
          totalWeightDisplay: totalGrams >= 1000 ? `${(totalGrams/1000).toFixed(2)} kg` : `${totalGrams.toFixed(0)} g`,
          totalGrams,
          costPerKg
      };
  }, [packageWeight, packageUnit, costPerPackage, itemsPerPackage]);


  const requirements = useMemo(() => {
    const reqs: Record<string, number> = {};
    plannerItems.forEach(item => {
        const { recipe, count } = item;
        const targetBatchWeight = (Number(count) || 0) * (Number(recipe.weightPerLoaf) || 0);
        
        let flours = recipe.flours || [];
        if (flours.length === 0 && recipe.baseFlourName) {
            flours = [{ id: 1, name: recipe.baseFlourName, percentage: 100 }];
        }

        const totalFlourPct = flours.reduce((sum, f) => sum + (Number(f.percentage) || 0), 0);
        const totalIngPct = recipe.ingredients.reduce((sum, ing) => sum + (Number(ing.percentage) || 0), 0);
        const totalFormulaPct = totalFlourPct + totalIngPct;

        const totalFlourWeight = totalFormulaPct > 0 ? targetBatchWeight / (totalFormulaPct / 100) : 0;

        const processList = (list: any[]) => {
            list.forEach(ing => {
                if (!ing.name) return;
                const weight = (totalFlourWeight * (Number(ing.percentage) || 0)) / 100;
                const name = ing.name.trim();
                reqs[name] = (reqs[name] || 0) + weight;
            });
        };

        processList(flours);
        processList(recipe.ingredients);
    });
    return reqs;
  }, [plannerItems]);

  const addInventoryItem = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newItemName.trim() || !previewCalculation) return;

      const newItem: InventoryItem = {
          id: Date.now().toString(),
          name: newItemName.trim(),
          quantity: previewCalculation.totalGrams,
          costPerKg: previewCalculation.costPerKg,
          lastUpdated: new Date().toISOString(),
          packageWeight: parseFloat(packageWeight),
          packageUnit,
          itemsPerPackage: parseFloat(itemsPerPackage),
          costPerPackage: parseFloat(costPerPackage)
      };

      const updatedInventory = [...inventory, newItem];
      setInventory(updatedInventory);
      localStorage.setItem('sourdough_inventory', JSON.stringify(updatedInventory));
      
      setNewItemName('');
      setPackageWeight('');
      setCostPerPackage('');
      setItemsPerPackage('1');
  };

  const deleteItem = (id: string) => {
      if (window.confirm("Delete this inventory item?")) {
          const updated = inventory.filter(i => i.id !== id);
          setInventory(updated);
          localStorage.setItem('sourdough_inventory', JSON.stringify(updated));
      }
  };

  const tableRows = useMemo(() => {
      const rows: {
          id?: string;
          name: string;
          inStock: number;
          allocated: number;
          balance: number;
          cost?: number;
          packageDetails?: string;
          status: 'critical' | 'low' | 'healthy' | 'untracked';
      }[] = [];

      inventory.forEach(item => {
          const reqKey = Object.keys(requirements).find(k => k.toLowerCase() === item.name.toLowerCase());
          const allocated = reqKey ? (requirements[reqKey] as number) : 0;
          const balance = item.quantity - allocated;
          
          let pkgDetails = '';
          if (item.packageWeight) {
             pkgDetails = `${item.itemsPerPackage} x ${item.packageWeight}${item.packageUnit} @ $${item.costPerPackage}`;
          }

          let status: 'critical' | 'low' | 'healthy' | 'untracked' = 'healthy';
          if (balance < 0) status = 'critical';
          else if (balance < 2000) status = 'low'; // Fixed threshold of 2kg for "low"

          rows.push({
              id: item.id,
              name: item.name,
              inStock: item.quantity,
              allocated: allocated,
              balance: balance,
              cost: item.costPerKg,
              packageDetails: pkgDetails,
              status
          });
      });

      Object.entries(requirements).forEach(([reqName, value]) => {
          const reqAmount = value as number;
          const exists = rows.some(r => r.name.toLowerCase() === reqName.toLowerCase());
          if (!exists) {
              rows.push({
                  name: reqName,
                  inStock: 0,
                  allocated: reqAmount,
                  balance: -reqAmount,
                  cost: undefined,
                  status: 'untracked'
              });
          }
      });

      return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory, requirements]);

  return (
    <div className="animate-fade-in">
       <datalist id="common-ingredients">
            {COMMON_INGREDIENTS_LIST.map((name, idx) => (
                <option key={idx} value={name} />
            ))}
       </datalist>

       <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-1">Inventory Management</h2>
            <p className="text-stone-600 dark:text-stone-400">Track stock with smart unit conversions.</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg p-3 flex items-center text-amber-800 dark:text-amber-400 text-sm transition-colors">
            <CalculatorIcon className="w-5 h-5 mr-2" />
            <span>
                Allocated stock updates automatically from the <strong>Batch Planner</strong>.
            </span>
        </div>
      </div>

      {/* Add New Item Form */}
      <div className="bg-white dark:bg-stone-900/60 p-6 rounded-lg border border-stone-200 dark:border-stone-800 shadow-sm mb-8 transition-colors">
          <h3 className="font-semibold text-stone-800 dark:text-stone-100 mb-4 border-b border-stone-100 dark:border-stone-800/40 pb-2">Receive New Stock</h3>
          <form onSubmit={addInventoryItem}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                  <div className="lg:col-span-2">
                      <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Ingredient Name</label>
                      <input
                        type="text"
                        list="common-ingredients" 
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="e.g., King Arthur Bread Flour"
                        className="block w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm dark:text-stone-100"
                      />
                  </div>
                  
                  <div>
                      <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Weight / Package</label>
                      <div className="flex">
                        <input
                            type="number"
                            step="0.01"
                            value={packageWeight}
                            onChange={(e) => setPackageWeight(e.target.value)}
                            placeholder="5"
                            className="block w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-r-0 border-stone-300 dark:border-stone-700 focus:ring-amber-500 focus:border-amber-500 sm:text-sm dark:text-stone-100"
                        />
                        <select
                            value={packageUnit}
                            onChange={(e) => setPackageUnit(e.target.value as UnitOfMeasure)}
                            className="inline-flex items-center px-2 py-2 border border-l-0 border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 sm:text-sm rounded-r-md focus:ring-amber-500 focus:border-amber-500"
                        >
                            <option value="lb">lb</option>
                            <option value="oz">oz</option>
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                        </select>
                      </div>
                  </div>

                  <div>
                      <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Cost / Package</label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-stone-500 dark:text-stone-400 sm:text-sm">$</span>
                        </div>
                        <input
                            type="number"
                            step="0.01"
                            value={costPerPackage}
                            onChange={(e) => setCostPerPackage(e.target.value)}
                            placeholder="0.00"
                            className="block w-full pl-7 px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-md focus:ring-amber-500 focus:border-amber-500 sm:text-sm dark:text-stone-100"
                        />
                      </div>
                  </div>

                  <div>
                      <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Items / Package</label>
                      <input
                        type="number"
                        step="1"
                        value={itemsPerPackage}
                        onChange={(e) => setItemsPerPackage(e.target.value)}
                        placeholder="1"
                        className="block w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm dark:text-stone-100"
                      />
                      <span className="text-[10px] text-stone-400 dark:text-stone-500">e.g., Case of 12</span>
                  </div>
              </div>

              <div className="flex items-center justify-between bg-stone-50 dark:bg-stone-800/40 p-3 rounded-md border border-stone-200 dark:border-stone-700/60 transition-colors">
                  <div className="flex gap-6 text-sm">
                      <div>
                          <span className="text-stone-500 dark:text-stone-400 block text-xs">Total Weight</span>
                          <span className="font-semibold text-stone-800 dark:text-stone-100">{previewCalculation ? previewCalculation.totalWeightDisplay : '-'}</span>
                      </div>
                      <div>
                           <span className="text-stone-500 dark:text-stone-400 block text-xs">Calculated Cost</span>
                           <span className="font-semibold text-stone-800 dark:text-stone-100">{previewCalculation ? `$${previewCalculation.costPerKg.toFixed(2)} / kg` : '-'}</span>
                      </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!newItemName || !previewCalculation}
                    className="px-6 py-2 bg-stone-800 dark:bg-amber-600 text-white rounded-md hover:bg-stone-900 dark:hover:bg-amber-700 disabled:bg-stone-300 dark:disabled:bg-stone-800 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                  >
                      Add to Inventory
                  </button>
              </div>
          </form>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-stone-900/60 rounded-lg border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200 dark:divide-stone-800/60">
                <thead className="bg-stone-50 dark:bg-stone-950/40">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Ingredient</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Last Purchase</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">In Stock</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider text-amber-600">Allocated</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Balance</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Value</th>
                        <th className="px-6 py-3"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800/40">
                    {tableRows.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-6 py-10 text-center text-stone-500 dark:text-stone-400 bg-white dark:bg-transparent transition-colors">
                                Inventory empty. Add items above.
                            </td>
                        </tr>
                    ) : (
                        tableRows.map((row, idx) => (
                            <tr key={row.id || `missing-${idx}`} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-stone-900 dark:text-stone-100">{row.name}</div>
                                    {!row.id && <span className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 rounded">Not tracked</span>}
                                </td>
                                <td className="px-6 py-4 text-xs text-stone-500 dark:text-stone-400">
                                    {row.packageDetails || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-stone-600 dark:text-stone-400">
                                    {row.id ? (row.inStock / 1000).toFixed(2) : '-'} kg
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-amber-700 dark:text-amber-400 font-medium text-sm">
                                    {row.allocated > 0 ? (row.allocated / 1000).toFixed(2) : '-'} kg
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <div className="flex flex-col items-end">
                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-bold shadow-sm ${
                                            row.status === 'critical' ? 'bg-red-100 text-red-800 border border-red-200' :
                                            row.status === 'low' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                            row.status === 'untracked' ? 'bg-stone-100 text-stone-500 border border-stone-200' :
                                            'bg-green-50 text-green-700 border border-green-100'
                                        }`}>
                                            {row.status === 'critical' && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                            )}
                                            {row.status === 'low' && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            )}
                                            {(row.balance / 1000).toFixed(2)} kg
                                        </div>
                                        {row.status === 'critical' && (
                                            <span className="text-[10px] font-black uppercase text-red-600 mt-1 animate-pulse">Deficit / Restock</span>
                                        )}
                                        {row.status === 'low' && (
                                            <span className="text-[10px] font-bold uppercase text-amber-600 mt-1">Low Inventory</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-stone-600 dark:text-stone-400">
                                   {row.cost ? `$${row.cost.toFixed(2)}/kg` : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {row.id && (
                                        <button onClick={() => deleteItem(row.id!)} className="text-stone-400 dark:text-stone-500 hover:text-red-600 transition-colors">
                                            Delete
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};

export default InventoryManagement;
