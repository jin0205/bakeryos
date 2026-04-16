
import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem, PlannerItem, UnitOfMeasure } from '../types';
import { PanelPayload } from '../App';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { BoxIcon } from './icons/BoxIcon';

const COMMON_INGREDIENTS_LIST = [
  'Bread Flour', 'Whole Wheat Flour', 'Rye Flour', 'Spelt Flour', 'Water', 'Levain', 'Salt', 'Instant Yeast',
  'Butter', 'Milk', 'Eggs', 'Sugar', 'Honey', 'Olive Oil', 'Walnuts', 'Raisins', 'Chocolate Chips',
];

const AlertTriangleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
  </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface InventoryManagementProps {
  onOpenPanel?: (p: PanelPayload) => void;
}

const InventoryManagement: React.FC<InventoryManagementProps> = ({ onOpenPanel }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [plannerItems, setPlannerItems] = useState<PlannerItem[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Procurement Form State
  const [newItemName, setNewItemName] = useState('');
  const [qtyOrdered, setQtyOrdered] = useState('1');
  const [weightPerItem, setWeightPerItem] = useState('');
  const [unit, setUnit] = useState<UnitOfMeasure>('lb');
  const [itemsPerPackage, setItemsPerPackage] = useState('1');
  const [costPerPackage, setCostPerPackage] = useState('');

  useEffect(() => {
    const loadData = () => {
      const invStr = localStorage.getItem('sourdough_inventory');
      if (invStr) {
        try { setInventory(JSON.parse(invStr)); } catch (e) { console.error('Failed to load inventory', e); }
      }
      const planStr = localStorage.getItem('sourdough_planner_items');
      if (planStr) {
        try { setPlannerItems(JSON.parse(planStr) || []); } catch (e) { console.error('Failed to load planner', e); }
      }
    };
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const saveInventory = (next: InventoryItem[]) => {
    setInventory(next);
    localStorage.setItem('sourdough_inventory', JSON.stringify(next));
  };

  const convertToGrams = (amount: number, fromUnit: UnitOfMeasure): number => {
    switch (fromUnit) {
      case 'lb': return amount * 453.592;
      case 'oz': return amount * 28.3495;
      case 'kg': return amount * 1000;
      case 'ml': return amount;
      default:   return amount;
    }
  };

  const procurementPreview = useMemo(() => {
    const pCost   = parseFloat(costPerPackage) || 0;
    const pQty    = parseFloat(qtyOrdered) || 0;
    const iCount  = parseFloat(itemsPerPackage) || 1;
    const iWeight = parseFloat(weightPerItem) || 0;
    if (iWeight <= 0 || pQty <= 0) return null;
    const singleItemGrams    = convertToGrams(iWeight, unit);
    const gramsPerPackage    = singleItemGrams * iCount;
    const totalGramsReceived = gramsPerPackage * pQty;
    const totalCost          = pCost * pQty;
    const costPerKg          = totalCost / (totalGramsReceived / 1000);
    const costPerItem        = iCount > 1 ? pCost / iCount : null;
    return { totalGramsReceived, totalCost, costPerKg, costPerItem, gramsPerPackage };
  }, [qtyOrdered, weightPerItem, unit, itemsPerPackage, costPerPackage]);

  const addInventoryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !procurementPreview) return;
    const existingIndex = inventory.findIndex(
      i => i.name.toLowerCase().trim() === newItemName.toLowerCase().trim()
    );
    let updated = [...inventory];
    if (existingIndex > -1) {
      const item = updated[existingIndex];
      const combined = item.quantity + procurementPreview.totalGramsReceived;
      const weightedCost =
        combined > 0
          ? ((item.costPerKg || 0) * item.quantity + procurementPreview.costPerKg * procurementPreview.totalGramsReceived) / combined
          : procurementPreview.costPerKg;
      updated[existingIndex] = { ...item, quantity: combined, costPerKg: weightedCost, lastUpdated: new Date().toISOString() };
    } else {
      updated.push({
        id: Date.now().toString(),
        name: newItemName.trim(),
        quantity: procurementPreview.totalGramsReceived,
        costPerKg: procurementPreview.costPerKg,
        lastUpdated: new Date().toISOString(),
        packageWeight: parseFloat(weightPerItem),
        packageUnit: unit,
        itemsPerPackage: parseFloat(itemsPerPackage),
        costPerPackage: parseFloat(costPerPackage),
      });
    }
    saveInventory(updated);
    setNewItemName('');
    setWeightPerItem('');
    setCostPerPackage('');
    setQtyOrdered('1');
    setItemsPerPackage('1');
  };

  const confirmDelete = (id: string) => {
    saveInventory(inventory.filter(i => i.id !== id));
    setDeleteConfirmId(null);
  };

  const requirements = useMemo(() => {
    const reqs: Record<string, number> = {};
    plannerItems.forEach(({ recipe, count }) => {
      const totalMass = (Number(count) || 0) * (Number(recipe.weightPerLoaf) || 0);
      const allIngs   = [...(recipe.flours || []), ...(recipe.ingredients || [])];
      const totalPct  = allIngs.reduce((sum, i) => sum + (Number(i.percentage) || 0), 0);
      const baseFlour = totalPct > 0 ? totalMass / (totalPct / 100) : 0;
      allIngs.forEach(ing => {
        const w = (baseFlour * (Number(ing.percentage) || 0)) / 100;
        reqs[ing.name] = (reqs[ing.name] || 0) + w;
      });
    });
    return reqs;
  }, [plannerItems]);

  // Summary stats
  const stats = useMemo(() => {
    const totalValue  = inventory.reduce((s, i) => s + ((i.costPerKg || 0) * i.quantity) / 1000, 0);
    const lowStock    = inventory.filter(i => {
      const req     = requirements[i.name] || 0;
      const balance = i.quantity - req;
      return balance >= 0 && balance < 2000;
    }).length;
    const deficit = inventory.filter(i => {
      const req = requirements[i.name] || 0;
      return i.quantity - req < 0;
    }).length;
    return { totalValue, lowStock, deficit, total: inventory.length };
  }, [inventory, requirements]);

  const ledgerRows = useMemo(() => {
    const tracked   = inventory.map(i => ({ ...i, isInventory: true as const }));
    const untracked = Object.entries(requirements)
      .filter(([name]) => !inventory.some(i => i.name.toLowerCase() === name.toLowerCase()))
      .map(([name]) => ({
        id: name, name, quantity: 0, lastUpdated: '', isInventory: false as const,
      }));
    return [...tracked, ...untracked].sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory, requirements]);

  const inputBase =
    'w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors text-sm text-stone-900 dark:text-stone-100 font-medium';

  return (
    <div className="space-y-6">
      <datalist id="common-ingredients">
        {COMMON_INGREDIENTS_LIST.map((n, i) => <option key={i} value={n} />)}
      </datalist>

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">INVENTORY</p>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Ingredient Stock</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Track procurement, cost normalization, and production allocation</p>
        </div>
        {plannerItems.length > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
            <CalculatorIcon className="w-3.5 h-3.5" />
            {plannerItems.length} formula{plannerItems.length !== 1 ? 's' : ''} queued
          </span>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Stock Value', value: `$${stats.totalValue.toFixed(2)}`, sub: 'at cost', accent: false },
          { label: 'Items Tracked',     value: stats.total,                        sub: 'ingredients', accent: false },
          { label: 'Low Stock',         value: stats.lowStock,                     sub: '< 2 kg remaining', accent: stats.lowStock > 0 },
          { label: 'Deficit',           value: stats.deficit,                      sub: 'need restock', accent: stats.deficit > 0 },
        ].map(({ label, value, sub, accent }) => (
          <div
            key={label}
            className={`bg-white dark:bg-stone-800 rounded-xl border p-4 ${
              accent
                ? 'border-amber-300 dark:border-amber-700/60'
                : 'border-stone-200 dark:border-stone-700'
            }`}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">{label}</p>
            <p className={`text-2xl font-black font-mono ${accent ? 'text-amber-600 dark:text-amber-400' : 'text-stone-900 dark:text-stone-50'}`}>
              {value}
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Procurement Form */}
      <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/40 flex items-center gap-2">
          <BoxIcon className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">Receive New Stock</h2>
        </div>
        <form onSubmit={addInventoryItem} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Ingredient */}
            <div className="md:col-span-4">
              <label htmlFor="inv-ingredient" className="block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1.5">
                Ingredient
              </label>
              <input
                id="inv-ingredient"
                type="text"
                list="common-ingredients"
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                placeholder="e.g. Bread Flour"
                className={inputBase}
              />
            </div>

            {/* Qty Ordered */}
            <div className="md:col-span-2">
              <label htmlFor="inv-qty" className="block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1.5">
                Qty Ordered
              </label>
              <input
                id="inv-qty"
                type="number"
                min="1"
                value={qtyOrdered}
                onChange={e => setQtyOrdered(e.target.value)}
                className={inputBase}
              />
              <span className="text-[9px] text-stone-400 mt-1 block">Bags / Cases</span>
            </div>

            {/* Weight per Item */}
            <div className="md:col-span-3">
              <label htmlFor="inv-weight" className="block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1.5">
                Weight per Item
              </label>
              <div className="flex">
                <input
                  id="inv-weight"
                  type="number"
                  step="0.01"
                  value={weightPerItem}
                  onChange={e => setWeightPerItem(e.target.value)}
                  placeholder="50"
                  className="flex-1 px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-r-0 border-stone-200 dark:border-stone-700 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors text-sm text-stone-900 dark:text-stone-100 font-medium"
                />
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value as UnitOfMeasure)}
                  aria-label="Unit of measure"
                  className="bg-stone-100 dark:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-r-lg px-2 text-xs font-bold uppercase text-stone-600 dark:text-stone-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
                >
                  <option value="lb">lb</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="oz">oz</option>
                  <option value="ml">ml</option>
                </select>
              </div>
            </div>

            {/* Cost per Package */}
            <div className="md:col-span-3">
              <label htmlFor="inv-cost" className="block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1.5">
                Cost per Bag / Case
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm pointer-events-none">$</span>
                <input
                  id="inv-cost"
                  type="number"
                  step="0.01"
                  value={costPerPackage}
                  onChange={e => setCostPerPackage(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors text-sm text-stone-900 dark:text-stone-100 font-medium"
                />
              </div>
            </div>

            {/* Items per Package */}
            <div className="md:col-span-4">
              <label htmlFor="inv-items" className="block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1.5">
                Items per Package <span className="normal-case font-normal text-stone-400">(optional)</span>
              </label>
              <input
                id="inv-items"
                type="number"
                value={itemsPerPackage}
                onChange={e => setItemsPerPackage(e.target.value)}
                placeholder="1  (e.g. 60 for a case of eggs)"
                className={inputBase}
              />
            </div>

            {/* Submit */}
            <div className="md:col-span-8 flex items-end">
              <button
                type="submit"
                disabled={!newItemName.trim() || !procurementPreview}
                className="w-full py-2.5 bg-amber-600 text-white rounded-lg font-semibold text-sm hover:bg-amber-700 disabled:bg-stone-200 dark:disabled:bg-stone-700 disabled:text-stone-400 dark:disabled:text-stone-500 disabled:cursor-not-allowed transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              >
                Add to Stock
              </button>
            </div>
          </div>

          {/* Procurement Preview */}
          {procurementPreview && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4">
              <div>
                <span className="block text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Total Weight</span>
                <span className="text-xl font-black font-mono text-stone-800 dark:text-stone-100">
                  {procurementPreview.totalGramsReceived >= 1000
                    ? `${(procurementPreview.totalGramsReceived / 1000).toFixed(2)} kg`
                    : `${procurementPreview.totalGramsReceived.toFixed(0)} g`}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Normalized Cost</span>
                <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                  ${procurementPreview.costPerKg.toFixed(2)}<span className="text-sm font-medium"> / kg</span>
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Total Investment</span>
                <span className="text-xl font-black font-mono text-stone-800 dark:text-stone-100">
                  ${procurementPreview.totalCost.toFixed(2)}
                </span>
              </div>
              {procurementPreview.costPerItem && (
                <div>
                  <span className="block text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Cost per Item</span>
                  <span className="text-xl font-black font-mono text-stone-800 dark:text-stone-100">
                    ${procurementPreview.costPerItem.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Stock Ledger */}
      <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/40">
          <h2 className="text-xs font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">Stock Ledger</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-900/20">
                <th className="text-left py-3 px-6 font-semibold text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wider">Ingredient</th>
                <th className="text-right py-3 px-6 font-semibold text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wider">Current Stock</th>
                <th className="text-right py-3 px-6 font-semibold text-amber-500 dark:text-amber-400 text-xs uppercase tracking-wider">Allocated</th>
                <th className="text-right py-3 px-6 font-semibold text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wider">Balance</th>
                <th className="text-right py-3 px-6 font-semibold text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wider">Cost / kg</th>
                <th className="py-3 px-6" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-700/50">
              {ledgerRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-stone-400 text-sm">
                    No inventory recorded. Start by receiving stock above.
                  </td>
                </tr>
              ) : (
                ledgerRows.map((item, idx) => {
                  const req      = requirements[item.name] || 0;
                  const balance  = item.quantity - req;
                  const isLow    = item.isInventory && balance >= 0 && balance < 2000;
                  const isCrit   = balance < 0;
                  const isEven   = idx % 2 === 0;

                  return (
                    <tr
                      key={item.id}
                      onClick={item.isInventory && onOpenPanel ? () => {
                        const { isInventory, ...inventoryItem } = item;
                        onOpenPanel({ type: 'inventory', data: inventoryItem as InventoryItem });
                      } : undefined}
                      className={`hover:bg-amber-50/40 dark:hover:bg-amber-900/10 transition-colors duration-150 ${
                        isEven ? 'bg-white dark:bg-stone-800' : 'bg-stone-50/50 dark:bg-stone-900/20'
                      } ${item.isInventory && onOpenPanel ? 'cursor-pointer' : ''}`}
                    >
                      {/* Ingredient + badge */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-semibold text-stone-900 dark:text-stone-100">{item.name}</span>
                          {!item.isInventory && (
                            <span className="text-[9px] bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wide">
                              Not Tracked
                            </span>
                          )}
                          {isLow && (
                            <span className="inline-flex items-center gap-1 text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wide">
                              <AlertTriangleIcon className="w-2.5 h-2.5" aria-hidden="true" /> Low Stock
                            </span>
                          )}
                          {isCrit && (
                            <span className="inline-flex items-center gap-1 text-[9px] bg-red-600 dark:bg-red-700/80 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wide">
                              <AlertTriangleIcon className="w-2.5 h-2.5" aria-hidden="true" /> Deficit
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Current Stock */}
                      <td className="py-4 px-6 text-right">
                        {item.isInventory ? (
                          <div>
                            <div className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                              {(item.quantity / 1000).toFixed(2)} kg
                            </div>
                            <div className="text-[10px] font-mono text-stone-400">
                              {(item.quantity / 453.592).toFixed(1)} lbs
                            </div>
                          </div>
                        ) : (
                          <span className="text-stone-300 dark:text-stone-600">—</span>
                        )}
                      </td>

                      {/* Allocated */}
                      <td className="py-4 px-6 text-right">
                        <span className={`font-mono font-semibold ${req > 0 ? 'text-amber-600' : 'text-stone-300 dark:text-stone-600'}`}>
                          {req > 0 ? `${(req / 1000).toFixed(2)} kg` : '—'}
                        </span>
                      </td>

                      {/* Balance */}
                      <td className="py-4 px-6 text-right">
                        <span className={`font-mono font-black ${isCrit ? 'text-red-600 dark:text-red-400' : 'text-stone-900 dark:text-stone-100'}`}>
                          {(balance / 1000).toFixed(2)} kg
                        </span>
                      </td>

                      {/* Cost/kg */}
                      <td className="py-4 px-6 text-right">
                        <span className="font-mono text-stone-600 dark:text-stone-300">
                          {(item as InventoryItem).costPerKg
                            ? `$${(item as InventoryItem).costPerKg!.toFixed(2)}`
                            : <span className="text-stone-300 dark:text-stone-600">—</span>}
                        </span>
                      </td>

                      {/* Delete */}
                      <td className="py-4 px-6 text-right">
                        {item.isInventory && (
                          deleteConfirmId === item.id ? (
                            <div role="status" aria-live="polite" className="flex items-center justify-end gap-1.5">
                              <span className="text-[10px] text-stone-500 dark:text-stone-400">Remove?</span>
                              <button
                                onClick={() => confirmDelete(item.id)}
                                className="text-[10px] font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-red-500 rounded"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 cursor-pointer transition-colors"
                                aria-label="Cancel delete"
                              >
                                <XIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(item.id)}
                              aria-label={`Delete ${item.name}`}
                              className="text-stone-300 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 cursor-pointer transition-colors duration-150"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )
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
