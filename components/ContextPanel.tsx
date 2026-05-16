import React, { useEffect } from 'react';
import { PanelPayload } from '../App';

interface ContextPanelProps {
  panel: PanelPayload | null;
  onClose: () => void;
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

function fmt(g: number): string {
  return g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g.toFixed(0)} g`;
}

const ContextPanel: React.FC<ContextPanelProps> = ({ panel, onClose }) => {
  const isOpen = panel !== null;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  let title = '';
  let content: React.ReactNode = null;

  if (panel) {
    switch (panel.type) {
      case 'formula': {
        const r = panel.data;
        const allIngs = [...(r.flours || []), ...(r.ingredients || [])];
        const totalFlour = (r.flours || []).reduce((s, f) => s + (Number(f.percentage) || 0), 0);
        title = 'Formula Detail';
        content = (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">{r.name}</h3>
              <p className="text-xs text-stone-400 mt-0.5">v{r.version} · {r.date}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Ingredients (Baker's %)</p>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-xs text-stone-400">
                    <th className="text-left font-medium pb-1.5">Ingredient</th>
                    <th className="text-right font-medium pb-1.5">%</th>
                    <th className="text-right font-medium pb-1.5">Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800/40">
                  {allIngs.map((ing, i) => (
                    <tr key={i}>
                      <td className="py-1.5 text-stone-800 dark:text-stone-200">{ing.name}</td>
                      <td className="py-1.5 text-right text-stone-500 dark:text-stone-400">{ing.percentage}%</td>
                      <td className="py-1.5 text-right text-stone-500 dark:text-stone-400">
                        {ing.weight != null ? fmt(ing.weight) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {r.baseFlourCostPerKg && totalFlour > 0 && (
              <div className="bg-stone-50 dark:bg-stone-800/60 rounded-lg p-3">
                <p className="text-xs text-stone-400 mb-0.5">Base Flour Cost</p>
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                  ${r.baseFlourCostPerKg.toFixed(2)}/kg
                </p>
              </div>
            )}
            <div className="pt-2">
              <button
                onClick={() => { window.location.hash = '#/formulas'; onClose(); }}
                className="text-sm text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                Open in Formula Workbench →
              </button>
            </div>
          </div>
        );
        break;
      }

      case 'work-order': {
        const wo = panel.data;
        const allReqs = wo.lineItems.reduce((acc, li) => {
          Object.entries(li.ingredientRequirements).forEach(([name, w]) => {
            acc[name] = (acc[name] || 0) + w;
          });
          return acc;
        }, {} as Record<string, number>);
        title = 'Work Order';
        content = (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-mono">{wo.id}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${STATUS_BADGE[wo.status]}`}>
                  {STATUS_LABEL[wo.status]}
                </span>
                {wo.scheduledDate && (
                  <span className="text-xs text-stone-400">{wo.scheduledDate}</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Line Items</p>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-xs text-stone-400">
                    <th className="text-left font-medium pb-1.5">Formula</th>
                    <th className="text-right font-medium pb-1.5">Qty</th>
                    <th className="text-right font-medium pb-1.5">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800/40">
                  {wo.lineItems.map((li, i) => (
                    <tr key={i}>
                      <td className="py-1.5 text-stone-800 dark:text-stone-200">
                        {li.recipeName}
                        <span className="ml-1 text-[10px] text-stone-400">v{li.recipeVersion}</span>
                      </td>
                      <td className="py-1.5 text-right text-stone-500 dark:text-stone-400">{li.count}</td>
                      <td className="py-1.5 text-right text-stone-500 dark:text-stone-400">
                        {((li.count * li.weightPerUnit) / 1000).toFixed(2)} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {Object.keys(allReqs).length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Ingredient Requirements</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(allReqs).map(([name, w]: [string, number]) => (
                    <span key={name} className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded">
                      {name}: {fmt(w)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-stone-50 dark:bg-stone-800/60 rounded-lg p-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-stone-400">Total Dough</p>
                <p className="font-semibold text-stone-700 dark:text-stone-300">{wo.totalDoughKg.toFixed(2)} kg</p>
              </div>
              <div>
                <p className="text-xs text-stone-400">Est. Cost</p>
                <p className="font-semibold text-stone-700 dark:text-stone-300">${wo.estimatedCost.toFixed(2)}</p>
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={() => { window.location.hash = '#/production/work-orders'; onClose(); }}
                className="text-sm text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                Open in Work Orders →
              </button>
            </div>
          </div>
        );
        break;
      }

      case 'inventory': {
        const item = panel.data;
        const isLow = item.quantity < 2000;
        title = 'Inventory Item';
        content = (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">{item.name}</h3>
              {isLow && (
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded font-black uppercase tracking-wide">
                  Low Stock
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-stone-50 dark:bg-stone-800/60 rounded-lg p-3">
                <p className="text-xs text-stone-400 mb-0.5">On Hand</p>
                <p className="text-lg font-bold text-stone-900 dark:text-stone-100">{fmt(item.quantity)}</p>
              </div>
              {item.costPerKg != null && (
                <div className="bg-stone-50 dark:bg-stone-800/60 rounded-lg p-3">
                  <p className="text-xs text-stone-400 mb-0.5">Cost / kg</p>
                  <p className="text-lg font-bold text-stone-900 dark:text-stone-100">${item.costPerKg.toFixed(2)}</p>
                </div>
              )}
            </div>
            {item.lastUpdated && (
              <p className="text-xs text-stone-400">Last updated: {new Date(item.lastUpdated).toLocaleDateString()}</p>
            )}
            <div className="pt-2">
              <button
                onClick={() => { window.location.hash = '#/inventory'; onClose(); }}
                className="text-sm text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                Open in Inventory →
              </button>
            </div>
          </div>
        );
        break;
      }

      case 'kpi-work-orders': {
        title = 'Active Work Orders';
        content = panel.items.length === 0 ? (
          <p className="text-sm text-stone-400">No active work orders.</p>
        ) : (
          <div className="space-y-3">
            {panel.items.map(wo => (
              <div key={wo.id} className="bg-stone-50 dark:bg-stone-800/60 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-mono font-bold text-stone-900 dark:text-stone-100">{wo.id}</span>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${STATUS_BADGE[wo.status]}`}>
                    {STATUS_LABEL[wo.status]}
                  </span>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {wo.lineItems.map(li => li.recipeName).join(', ')}
                </p>
                <p className="text-xs text-stone-400 mt-0.5">{wo.totalDoughKg.toFixed(2)} kg · {wo.scheduledDate || 'Unscheduled'}</p>
              </div>
            ))}
            <button
              onClick={() => { window.location.hash = '#/production/work-orders'; onClose(); }}
              className="text-sm text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              View all in Work Orders →
            </button>
          </div>
        );
        break;
      }

      case 'kpi-inventory': {
        title = 'Low Stock Items';
        content = panel.items.length === 0 ? (
          <p className="text-sm text-stone-400">All inventory levels are healthy.</p>
        ) : (
          <div className="space-y-2">
            {panel.items.map(item => (
              <div key={item.id} className="bg-stone-50 dark:bg-stone-800/60 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm font-medium text-stone-900 dark:text-stone-100">{item.name}</span>
                <span className="text-sm text-amber-600 dark:text-amber-400 font-semibold">{fmt(item.quantity)}</span>
              </div>
            ))}
            <button
              onClick={() => { window.location.hash = '#/inventory'; onClose(); }}
              className="text-sm text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              Open Inventory →
            </button>
          </div>
        );
        break;
      }

      case 'kpi-formulas': {
        title = `All Formulas (${panel.items.length})`;
        content = panel.items.length === 0 ? (
          <p className="text-sm text-stone-400">No formulas saved yet.</p>
        ) : (
          <div className="space-y-2">
            {panel.items.map(r => (
              <div key={r.id} className="bg-stone-50 dark:bg-stone-800/60 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-900 dark:text-stone-100">{r.name}</span>
                  <span className="text-xs text-stone-400 font-mono">v{r.version}</span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">{r.date}</p>
              </div>
            ))}
            <button
              onClick={() => { window.location.hash = '#/formulas'; onClose(); }}
              className="text-sm text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              Open Formula Library →
            </button>
          </div>
        );
        break;
      }

      case 'kpi-batch': {
        title = 'Current Batch Plan';
        content = panel.items.length === 0 ? (
          <p className="text-sm text-stone-400">Batch plan is empty.</p>
        ) : (
          <div className="space-y-2">
            {panel.items.map(item => (
              <div key={item.uniqueId} className="bg-stone-50 dark:bg-stone-800/60 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm font-medium text-stone-900 dark:text-stone-100">{item.recipe.name}</span>
                <span className="text-xs text-stone-500 dark:text-stone-400">{item.count} units</span>
              </div>
            ))}
            <button
              onClick={() => { window.location.hash = '#/production/batch-builder'; onClose(); }}
              className="text-sm text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              Open Batch Builder →
            </button>
          </div>
        );
        break;
      }
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white dark:bg-stone-800 border-l border-stone-200 dark:border-stone-800 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex-shrink-0">
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-stone-800 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {content}
        </div>
      </div>
    </>
  );
};

export default ContextPanel;
