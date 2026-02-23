
import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem, PlannerItem, UnitOfMeasure, SavedRecipe } from '../types';
import { CalculatorIcon } from './icons/CalculatorIcon';

const COMMON_INGREDIENTS_LIST = [
  'Bread Flour', 'Whole Wheat Flour', 'Rye Flour', 'Spelt Flour', 'Water', 'Levain', 'Salt', 'Instant Yeast', 
  'Butter', 'Milk', 'Eggs', 'Sugar', 'Honey', 'Olive Oil', 'Walnuts', 'Raisins', 'Chocolate Chips'
];

const InventoryManagement: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [plannerItems, setPlannerItems] = useState<PlannerItem[]>([]);
  
  // Procurement Form State
  const [newItemName, setNewItemName] = useState('');
  const [qtyOrdered, setQtyOrdered] = useState('1'); // How many packages/cases
  const [weightPerItem, setWeightPerItem] = useState(''); // 50 for 50lb bag OR 50 for 50g egg
  const [unit, setUnit] = useState<UnitOfMeasure>('lb');
  const [itemsPerPackage, setItemsPerPackage] = useState('1'); // 1 for a bag, 60 for case of eggs
  const [costPerPackage, setCostPerPackage] = useState('');

  // Load Data
  useEffect(() => {
    const loadData = () => {
        const invStr = localStorage.getItem('sourdough_inventory');
        if (invStr) {
          try { setInventory(JSON.parse(invStr)); } catch (e) { console.error('Failed to load inventory', e); }
        }

        const planStr = localStorage.getItem('sourdough_planner_items');
        if (planStr) {
          try { setPlannerItems(JSON.parse(planStr) || []); } catch (e) { console.error('Failed to load planner items', e); }
        }
    };
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const saveInventory = (newInv: InventoryItem[]) => {
      setInventory(newInv);
      localStorage.setItem('sourdough_inventory', JSON.stringify(newInv));
  };

  const convertToGrams = (amount: number, fromUnit: UnitOfMeasure): number => {
      switch (fromUnit) {
          case 'lb': return amount * 453.592;
          case 'oz': return amount * 28.3495;
          case 'kg': return amount * 1000;
          case 'ml': return amount; // Assuming density 1 for water/juice/milk
          default: return amount;
      }
  };

  // Professional Procurement Logic
  const procurementPreview = useMemo(() => {
      const pCost = parseFloat(costPerPackage) || 0;
      const pQty = parseFloat(qtyOrdered) || 0;
      const iCount = parseFloat(itemsPerPackage) || 1;
      const iWeight = parseFloat(weightPerItem) || 0;

      if (iWeight <= 0 || pQty <= 0) return null;

      const singleItemGrams = convertToGrams(iWeight, unit);
      const gramsPerPackage = singleItemGrams * iCount;
      const totalGramsReceived = gramsPerPackage * pQty;
      const totalCost = pCost * pQty;
      
      const costPerKg = (totalCost / (totalGramsReceived / 1000));
      const costPerItem = iCount > 1 ? (pCost / iCount) : null;

      return {
          totalGramsReceived,
          totalCost,
          costPerKg,
          costPerItem,
          gramsPerPackage
      };
  }, [qtyOrdered, weightPerItem, unit, itemsPerPackage, costPerPackage]);

  const addInventoryItem = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newItemName.trim() || !procurementPreview) return;

      const existingIndex = inventory.findIndex(i => i.name.toLowerCase().trim() === newItemName.toLowerCase().trim());
      
      let updatedInventory = [...inventory];
      
      if (existingIndex > -1) {
          const item = updatedInventory[existingIndex];
          // Average the cost per kg based on new vs old volume
          const totalExistingGrams = item.quantity;
          const totalNewGrams = procurementPreview.totalGramsReceived;
          const combinedGrams = totalExistingGrams + totalNewGrams;
          
          const weightedCost = combinedGrams > 0 
            ? ((item.costPerKg || 0) * totalExistingGrams + procurementPreview.costPerKg * totalNewGrams) / combinedGrams
            : procurementPreview.costPerKg;

          updatedInventory[existingIndex] = {
              ...item,
              quantity: combinedGrams,
              costPerKg: weightedCost,
              lastUpdated: new Date().toISOString()
          };
      } else {
          updatedInventory.push({
              id: Date.now().toString(),
              name: newItemName.trim(),
              quantity: procurementPreview.totalGramsReceived,
              costPerKg: procurementPreview.costPerKg,
              lastUpdated: new Date().toISOString(),
              packageWeight: parseFloat(weightPerItem),
              packageUnit: unit,
              itemsPerPackage: parseFloat(itemsPerPackage),
              costPerPackage: parseFloat(costPerPackage)
          });
      }

      saveInventory(updatedInventory);
      
      // Clear specific form fields but keep unit for next entry
      setNewItemName('');
      setWeightPerItem('');
      setCostPerPackage('');
      setQtyOrdered('1');
      setItemsPerPackage('1');
  };

  const deleteItem = (id: string) => {
      if (window.confirm("Delete this inventory item?")) {
          saveInventory(inventory.filter(i => i.id !== id));
      }
  };

  const requirements = useMemo(() => {
    const reqs: Record<string, number> = {};
    plannerItems.forEach(item => {
        const { recipe, count } = item;
        const totalMass = (Number(count) || 0) * (Number(recipe.weightPerLoaf) || 0);
        
        const allIngs = [...(recipe.flours || []), ...(recipe.ingredients || [])];
        const totalPct = allIngs.reduce((sum, i) => sum + (Number(i.percentage) || 0), 0);
        const flourPct = (recipe.flours || []).reduce((sum, i) => sum + (Number(i.percentage) || 0), 0) || 100;
        
        const baseFlourWeight = totalMass / (totalPct / 100);

        allIngs.forEach(ing => {
            const weight = (baseFlourWeight * (Number(ing.percentage) || 0)) / 100;
            reqs[ing.name] = (reqs[ing.name] || 0) + weight;
        });
    });
    return reqs;
  }, [plannerItems]);

  return (
    <div className="animate-fade-in">
      <datalist id="common-ingredients">
        {COMMON_INGREDIENTS_LIST.map((name, idx) => <option key={idx} value={name} />)}
      </datalist>

      <div className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">OPERATIONS / Inventory</p>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">Inventory</h1>
          {plannerItems.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded px-2.5 py-1">
              <CalculatorIcon className="w-3.5 h-3.5" />
              {plannerItems.length} formula{plannerItems.length !== 1 ? 's' : ''} in Batch Builder
            </span>
          )}
        </div>
      </div>

      {/* Procurement Form */}
      <div className="bg-white dark:bg-stone-900/60 rounded-lg border border-stone-200 dark:border-stone-800 shadow-sm mb-4 overflow-hidden transition-colors">
        <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/40">
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider">Receive New Inventory</h3>
        </div>
        <div className="p-4">
        <form onSubmit={addInventoryItem}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
            <div className="md:col-span-4">
              <label className="block text-[10px] font-black text-stone-500 uppercase mb-2">Ingredient</label>
              <input
                type="text"
                list="common-ingredients"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g. Bread Flour"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:ring-2 focus:ring-amber-500 transition-all font-medium text-sm dark:text-stone-100"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-stone-500 uppercase mb-2">Qty Ordered</label>
              <input
                type="number"
                value={qtyOrdered}
                onChange={(e) => setQtyOrdered(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:ring-2 focus:ring-amber-500 transition-all font-medium text-sm dark:text-stone-100"
              />
              <span className="text-[9px] text-stone-400 mt-1 block">Bags/Cases</span>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[10px] font-black text-stone-500 uppercase mb-2">Weight per Item</label>
              <div className="flex">
                <input
                  type="number"
                  step="0.01"
                  value={weightPerItem}
                  onChange={(e) => setWeightPerItem(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-r-0 border-stone-300 dark:border-stone-700 rounded-l-md focus:ring-2 focus:ring-amber-500 transition-all font-medium text-sm dark:text-stone-100"
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as UnitOfMeasure)}
                  className="bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-r-md px-2 text-xs font-semibold uppercase text-stone-600 dark:text-stone-300"
                >
                  <option value="lb">lb</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="oz">oz</option>
                  <option value="ml">ml</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[10px] font-black text-stone-500 uppercase mb-2">Cost per Bag/Case</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-stone-400 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={costPerPackage}
                  onChange={(e) => setCostPerPackage(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-md focus:ring-2 focus:ring-amber-500 transition-all font-medium text-sm dark:text-stone-100"
                />
              </div>
            </div>

            <div className="md:col-span-4">
              <label className="block text-[10px] font-black text-stone-500 uppercase mb-2">Items per Package (Optional)</label>
              <input
                type="number"
                value={itemsPerPackage}
                onChange={(e) => setItemsPerPackage(e.target.value)}
                placeholder="1 (e.g. 60 for eggs)"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:ring-2 focus:ring-amber-500 transition-all font-medium text-sm dark:text-stone-100"
              />
            </div>

            <div className="md:col-span-8 flex items-end">
              <button
                type="submit"
                disabled={!newItemName || !procurementPreview}
                className="w-full py-2.5 bg-stone-900 dark:bg-amber-600 text-white rounded-md font-semibold text-sm uppercase tracking-wider hover:bg-stone-800 dark:hover:bg-amber-700 disabled:bg-stone-200 dark:disabled:bg-stone-800 disabled:cursor-not-allowed transition-all"
              >
                Add to Stock
              </button>
            </div>
          </div>

          {procurementPreview && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-stone-50 dark:bg-stone-950/50 p-4 rounded-lg border border-stone-200 dark:border-stone-800 animate-fade-in transition-colors">
              <div>
                <span className="block text-[9px] font-black text-stone-400 uppercase tracking-widest">Total Weight</span>
                <span className="text-xl font-black text-stone-800 dark:text-stone-200">
                  {procurementPreview.totalGramsReceived >= 1000 
                    ? `${(procurementPreview.totalGramsReceived / 1000).toFixed(2)} kg` 
                    : `${procurementPreview.totalGramsReceived.toFixed(0)} g`}
                </span>
              </div>
              <div>
                <span className="block text-[9px] font-black text-stone-400 uppercase tracking-widest">Normalized Cost</span>
                <span className="text-xl font-black text-amber-600">
                  ${procurementPreview.costPerKg.toFixed(2)} / kg
                </span>
              </div>
              <div>
                <span className="block text-[9px] font-black text-stone-400 uppercase tracking-widest">Total Investment</span>
                <span className="text-xl font-black text-stone-800 dark:text-stone-200">${procurementPreview.totalCost.toFixed(2)}</span>
              </div>
              {procurementPreview.costPerItem && (
                <div>
                  <span className="block text-[9px] font-black text-stone-400 uppercase tracking-widest">Cost Per Item</span>
                  <span className="text-xl font-black text-stone-800 dark:text-stone-200">
                    ${procurementPreview.costPerItem.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}
        </form>
        </div>
      </div>

      {/* Inventory Display */}
      <div className="bg-white dark:bg-stone-900/60 rounded-lg border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden transition-colors">
        <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/40">
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider">Stock Ledger</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-stone-50 dark:bg-stone-950/50 border-b border-stone-100 dark:border-stone-800">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Ingredient</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Current Stock</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-amber-500 uppercase tracking-wider">Allocated</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Balance</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Cost/KG</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-stone-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/50">
              {inventory.length === 0 && Object.keys(requirements).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-stone-400 italic text-sm">No inventory recorded. Start by receiving stock above.</td>
                </tr>
              ) : (
                // Displaying merged view of inventory + missing requirements
                [...inventory.map(i => ({ ...i, isInventory: true })), 
                 ...Object.entries(requirements)
                   .filter(([name]) => !inventory.some(i => i.name.toLowerCase() === name.toLowerCase()))
                   .map(([name, weight]) => ({ name, quantity: 0, isInventory: false, id: name }))]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((item: any) => {
                    const req = requirements[item.name] || 0;
                    const balance = item.quantity - req;
                    const isLow = item.isInventory && balance < 2000;
                    const isCritical = balance < 0;

                    return (
                      <tr key={item.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-stone-900 dark:text-stone-100">{item.name}</div>
                          {!item.isInventory && <span className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase font-black">Not Tracked</span>}
                          {isLow && !isCritical && <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase font-black">Low Stock</span>}
                          {isCritical && <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded-full uppercase font-black">Restock Deficit</span>}
                        </td>
                        <td className="px-6 py-5 text-right font-medium text-stone-500 dark:text-stone-400">
                          {item.isInventory ? (
                            <>
                              <div className="text-stone-900 dark:text-stone-100">{(item.quantity / 1000).toFixed(2)} kg</div>
                              <div className="text-[10px] opacity-60">{(item.quantity / 453.592).toFixed(1)} lbs</div>
                            </>
                          ) : '—'}
                        </td>
                        <td className="px-6 py-5 text-right font-bold text-amber-600">
                          {req > 0 ? (req / 1000).toFixed(2) + ' kg' : '—'}
                        </td>
                        <td className={`px-6 py-5 text-right font-black ${isCritical ? 'text-red-600' : 'text-stone-900 dark:text-stone-100'}`}>
                          {(balance / 1000).toFixed(2)} kg
                        </td>
                        <td className="px-6 py-5 text-right font-bold text-stone-800 dark:text-stone-300">
                          {item.costPerKg ? `$${item.costPerKg.toFixed(2)}` : '—'}
                        </td>
                        <td className="px-6 py-5 text-center">
                          {item.isInventory && (
                            <button
                              onClick={() => deleteItem(item.id)}
                              aria-label={`Delete ${item.name}`}
                              className="text-stone-300 hover:text-red-500 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryManagement;
