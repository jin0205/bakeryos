import React, { useState, useRef, useCallback, useMemo } from 'react';
import { WorkOrder, SavedRecipe, InventoryItem, PlannerItem } from '../types';
import { PanelPayload } from '../App';
import { storageService } from '../services/storageService';

type Tab = 'home' | 'formulas' | 'production' | 'inventory' | 'cost' | 'lab';

interface DashboardProps {
  onOpenPanel: (p: PanelPayload) => void;
  onNavigate: (tab: Tab) => void;
}

const STATUS_BADGE: Record<string, string> = {
  'draft':         'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
  'scheduled':     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'in-production': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'complete':      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const STATUS_LABEL: Record<string, string> = {
  'draft': 'Draft', 'scheduled': 'Scheduled',
  'in-production': 'In Production', 'complete': 'Complete',
};

const exportData = () => {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('bakeryos_'));
  const data: Record<string, unknown> = {};
  for (const key of keys) {
    try { data[key] = JSON.parse(localStorage.getItem(key) ?? 'null'); }
    catch { data[key] = localStorage.getItem(key); }
  }
  const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bakeryos-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
};

const Dashboard: React.FC<DashboardProps> = ({ onOpenPanel, onNavigate }) => {
  const workOrders  = useMemo(() => storageService.load<WorkOrder>('bakeryos_work_orders'),    []);
  const recipes     = useMemo(() => storageService.load<SavedRecipe>('bakeryos_recipes'),       []);
  const inventory   = useMemo(() => storageService.load<InventoryItem>('bakeryos_inventory'),   []);
  const planItems   = useMemo(() => storageService.load<PlannerItem>('bakeryos_planner_items'), []);

  const activeWOs   = workOrders.filter(w => w.status === 'scheduled' || w.status === 'in-production');
  const lowStock    = inventory.filter(i => i.quantity < 2000);

  const todayStr    = new Date().toISOString().slice(0, 10);
  const todayWOs    = workOrders.filter(w =>
    (w.status === 'scheduled' || w.status === 'in-production') &&
    w.scheduledDate === todayStr
  );

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const kpiCards = [
    {
      label: 'Active Work Orders',
      value: activeWOs.length,
      sub: `${workOrders.filter(w => w.status === 'in-production').length} in production`,
      accent: activeWOs.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400',
      border: activeWOs.length > 0 ? 'border-amber-200 dark:border-amber-800/40' : 'border-stone-200 dark:border-stone-800',
      onClick: () => onOpenPanel({ type: 'kpi-work-orders', items: activeWOs }),
    },
    {
      label: 'Low Stock Items',
      value: lowStock.length,
      sub: `of ${inventory.length} tracked`,
      accent: lowStock.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-stone-400',
      border: lowStock.length > 0 ? 'border-red-200 dark:border-red-800/40' : 'border-stone-200 dark:border-stone-800',
      onClick: () => onOpenPanel({ type: 'kpi-inventory', items: lowStock }),
    },
    {
      label: 'Formulas',
      value: recipes.length,
      sub: 'in library',
      accent: 'text-stone-700 dark:text-stone-200',
      border: 'border-stone-200 dark:border-stone-800',
      onClick: () => onOpenPanel({ type: 'kpi-formulas', items: recipes }),
    },
    {
      label: 'Batch Plan',
      value: planItems.length,
      sub: `${planItems.reduce((s, i) => s + i.count, 0)} total units`,
      accent: planItems.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400',
      border: 'border-stone-200 dark:border-stone-800',
      onClick: () => onOpenPanel({ type: 'kpi-batch', items: planItems }),
    },
  ];

  const importRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const backup = JSON.parse(ev.target?.result as string) as { version: number; data: Record<string, unknown> };
        if (!backup.data) throw new Error('Invalid backup');
        Object.entries(backup.data).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
        window.location.reload();
      } catch {
        alert('Could not read backup file. Make sure it is a BakeryOS export.');
        setImporting(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">HOME</p>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">Production Overview</h1>
        </div>
        <span className="text-sm text-stone-400 dark:text-stone-500 mt-1">{today}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(card => (
          <button
            key={card.label}
            onClick={card.onClick}
            className={`bg-white dark:bg-stone-900/60 rounded-xl border ${card.border} px-5 py-4 shadow-sm text-left hover:shadow-md transition-shadow cursor-pointer`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 leading-tight">{card.label}</p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-1.5 leading-snug">{card.sub}</p>
              </div>
              <p className={`text-3xl font-black tabular-nums shrink-0 ${card.accent}`}>{card.value}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Today's Schedule */}
      <div className="bg-white dark:bg-stone-900/60 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800">
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">Today's Schedule</h2>
        </div>
        {todayWOs.length === 0 ? (
          <div className="px-5 py-8 text-center text-stone-400 dark:text-stone-500 text-sm">
            No work orders scheduled for today.
            <button
              onClick={() => { onNavigate('production'); }}
              className="block mx-auto mt-3 text-xs text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              Go to Production →
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-stone-100 dark:divide-stone-800/60">
            <thead className="bg-stone-50 dark:bg-stone-950/40">
              <tr>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">WO #</th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">Formulas</th>
                <th className="px-5 py-2.5 text-right text-xs font-medium text-stone-400 uppercase tracking-wider">Dough</th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/40">
              {todayWOs.map(wo => (
                <tr
                  key={wo.id}
                  tabIndex={0}
                  onClick={() => onOpenPanel({ type: 'work-order', data: wo })}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenPanel({ type: 'work-order', data: wo }); } }}
                  aria-label={`View work order ${wo.id}`}
                  className="hover:bg-stone-50 dark:hover:bg-stone-800/30 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3 text-sm font-mono font-bold text-stone-900 dark:text-stone-100">{wo.id}</td>
                  <td className="px-5 py-3 text-sm text-stone-600 dark:text-stone-300">
                    {wo.lineItems.map(li => li.recipeName).join(', ')}
                  </td>
                  <td className="px-5 py-3 text-sm text-right text-stone-500 dark:text-stone-400">
                    {wo.totalDoughKg.toFixed(2)} kg
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${STATUS_BADGE[wo.status]}`}>
                      {STATUS_LABEL[wo.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Quick Actions</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => { onNavigate('production'); window.location.hash = '#/production/batch-builder'; }}
            className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors cursor-pointer"
          >
            + New Work Order
          </button>
          <button
            onClick={() => onNavigate('formulas')}
            className="px-4 py-2 text-stone-600 dark:text-stone-400 text-sm font-medium rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Browse Formulas
          </button>
          <button
            onClick={() => onNavigate('inventory')}
            className="px-4 py-2 text-stone-600 dark:text-stone-400 text-sm font-medium rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            View Inventory
          </button>
          <button
            onClick={() => onNavigate('cost')}
            className="px-4 py-2 text-stone-600 dark:text-stone-400 text-sm font-medium rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Cost & Margin
          </button>
        </div>
      </div>

      {/* Data backup */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Data</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportData}
            className="px-4 py-2 text-stone-600 dark:text-stone-400 text-sm font-medium rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            Export Backup
          </button>
          <button
            onClick={() => importRef.current?.click()}
            disabled={importing}
            className="px-4 py-2 text-stone-600 dark:text-stone-400 text-sm font-medium rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors disabled:opacity-50"
          >
            {importing ? 'Importing…' : 'Restore Backup'}
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
