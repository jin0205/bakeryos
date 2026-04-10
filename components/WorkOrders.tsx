import React, { useState, useEffect } from 'react';
import { WorkOrder, WorkOrderStatus } from '../types';

const STATUS_BADGE: Record<WorkOrderStatus, string> = {
  'draft':         'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
  'scheduled':     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'in-production': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'complete':      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  'draft': 'Draft',
  'scheduled': 'Scheduled',
  'in-production': 'In Production',
  'complete': 'Complete',
};

const WorkOrders: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [filter, setFilter] = useState<WorkOrderStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scheduleDateInputs, setScheduleDateInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    const stored = localStorage.getItem('bakeryos_work_orders');
    if (stored) {
      try {
        setWorkOrders(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load work orders', e);
      }
    }
  }, []);

  const saveWorkOrders = (updated: WorkOrder[]) => {
    setWorkOrders(updated);
    localStorage.setItem('bakeryos_work_orders', JSON.stringify(updated));
  };

  const updateStatus = (id: string, newStatus: WorkOrderStatus, scheduledDate?: string) => {
    const updated = workOrders.map(wo => {
      if (wo.id !== id) return wo;
      const now = new Date().toISOString();
      return {
        ...wo,
        status: newStatus,
        scheduledDate: scheduledDate !== undefined ? scheduledDate : wo.scheduledDate,
        startedAt: newStatus === 'in-production' ? now : wo.startedAt,
        completedAt: newStatus === 'complete' ? now : wo.completedAt,
      };
    });
    saveWorkOrders(updated);
  };

  const updateNotes = (id: string, notes: string) => {
    const updated = workOrders.map(wo => wo.id === id ? { ...wo, notes } : wo);
    saveWorkOrders(updated);
  };

  const deleteWorkOrder = (id: string) => {
    if (!window.confirm('Delete this work order? This cannot be undone.')) return;
    saveWorkOrders(workOrders.filter(wo => wo.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const filtered = filter === 'all' ? workOrders : workOrders.filter(wo => wo.status === filter);
  const counts = {
    draft: workOrders.filter(w => w.status === 'draft').length,
    scheduled: workOrders.filter(w => w.status === 'scheduled').length,
    'in-production': workOrders.filter(w => w.status === 'in-production').length,
    complete: workOrders.filter(w => w.status === 'complete').length,
  };

  const filterTabs: Array<WorkOrderStatus | 'all'> = ['all', 'draft', 'scheduled', 'in-production', 'complete'];

  return (
    <div className="animate-fade-in">
      {/* Module Header */}
      <div className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">PRODUCTION / Work Orders</p>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">Work Orders</h1>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {(['draft', 'scheduled', 'in-production', 'complete'] as WorkOrderStatus[]).map(status => (
          <div key={status} className="bg-white dark:bg-stone-900/60 rounded-lg border border-stone-200 dark:border-stone-800 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">{STATUS_LABEL[status]}</p>
            <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{counts[status]}</p>
          </div>
        ))}
      </div>

      {/* Filter Tab Bar */}
      <div className="flex gap-1 mb-4 bg-stone-100 dark:bg-stone-800/60 p-1 rounded-lg w-fit">
        {filterTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              filter === tab
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
            }`}
          >
            {tab === 'all' ? 'All' : STATUS_LABEL[tab as WorkOrderStatus]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-stone-900/60 rounded-lg border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-stone-400 dark:text-stone-500">
            <p className="text-sm">No work orders found.</p>
            {filter === 'all' ? (
              <button
                onClick={() => { window.location.hash = '#/production/batch-builder'; }}
                className="mt-4 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors cursor-pointer"
              >
                Open Batch Builder
              </button>
            ) : (
              <p className="text-xs mt-1">No {filter} orders.</p>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-stone-200 dark:divide-stone-800/60">
            <thead className="bg-stone-50 dark:bg-stone-950/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">WO #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Scheduled</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Formulas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Dough</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Est. Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-stone-500 uppercase tracking-wider">›</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800/40">
              {filtered.map(wo => (
                <React.Fragment key={wo.id}>
                  <tr
                    className="hover:bg-stone-50 dark:hover:bg-stone-800/30 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === wo.id ? null : wo.id)}
                  >
                    <td className="px-4 py-3 text-sm font-mono font-bold text-stone-900 dark:text-stone-100">{wo.id}</td>
                    <td className="px-4 py-3 text-sm text-stone-600 dark:text-stone-400">
                      {wo.scheduledDate || <span className="italic text-stone-400">Unscheduled</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700 dark:text-stone-300">
                      {wo.lineItems.map(li => li.recipeName).join(', ')}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-600 dark:text-stone-400 text-right">
                      {wo.totalDoughKg.toFixed(2)} kg
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-600 dark:text-stone-400 text-right">
                      ${wo.estimatedCost.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${STATUS_BADGE[wo.status]}`}>
                        {STATUS_LABEL[wo.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-stone-400">
                      <span className={`text-lg transition-transform inline-block ${expandedId === wo.id ? 'rotate-90' : ''}`}>›</span>
                    </td>
                  </tr>

                  {/* Expanded Panel */}
                  {expandedId === wo.id && (
                    <tr>
                      <td colSpan={7} className="bg-stone-50 dark:bg-stone-950/30 px-6 py-4 border-b border-stone-200 dark:border-stone-800">
                        <div className="space-y-4">
                          {/* Line Items */}
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Line Items</p>
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="text-xs text-stone-500">
                                  <th className="text-left font-medium pb-1">Formula</th>
                                  <th className="text-right font-medium pb-1">Count</th>
                                  <th className="text-right font-medium pb-1">Weight/Unit</th>
                                  <th className="text-right font-medium pb-1">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-200 dark:divide-stone-800/40">
                                {wo.lineItems.map((li, idx) => (
                                  <tr key={idx}>
                                    <td className="py-1 text-stone-800 dark:text-stone-200 font-medium">{li.recipeName} <span className="text-xs text-stone-400">v{li.recipeVersion}</span></td>
                                    <td className="py-1 text-right text-stone-600 dark:text-stone-400">{li.count}</td>
                                    <td className="py-1 text-right text-stone-600 dark:text-stone-400">{li.weightPerUnit}g</td>
                                    <td className="py-1 text-right text-stone-600 dark:text-stone-400">{((li.count * li.weightPerUnit) / 1000).toFixed(2)} kg</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Ingredient Requirements */}
                          {wo.lineItems.some(li => Object.keys(li.ingredientRequirements).length > 0) && (
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Ingredient Requirements</p>
                              <div className="flex flex-wrap gap-2">
                                {Array.from(
                                  wo.lineItems.reduce((acc, li) => {
                                    Object.entries(li.ingredientRequirements).forEach(([name, weight]) => {
                                      acc.set(name, (acc.get(name) || 0) + weight);
                                    });
                                    return acc;
                                  }, new Map<string, number>())
                                ).map(([name, weight]) => (
                                  <span key={name} className="text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded px-2 py-1 text-stone-600 dark:text-stone-300">
                                    {name}: {weight >= 1000 ? `${(weight / 1000).toFixed(2)} kg` : `${weight.toFixed(0)} g`}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Notes</p>
                            <textarea
                              defaultValue={wo.notes}
                              onBlur={(e) => updateNotes(wo.id, e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 text-sm border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 rounded-lg text-stone-800 dark:text-stone-200 resize-none focus:ring-2 focus:ring-amber-500 focus:outline-none"
                              placeholder="Add production notes…"
                            />
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-3">
                            {wo.status === 'draft' && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="date"
                                  value={scheduleDateInputs[wo.id] || ''}
                                  onChange={e => setScheduleDateInputs(prev => ({ ...prev, [wo.id]: e.target.value }))}
                                  className="text-sm border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 rounded-lg px-3 py-1.5 text-stone-800 dark:text-stone-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                />
                                <button
                                  onClick={() => updateStatus(wo.id, 'scheduled', scheduleDateInputs[wo.id] || null!)}
                                  className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  Schedule
                                </button>
                              </div>
                            )}
                            {wo.status === 'scheduled' && (
                              <button
                                onClick={() => updateStatus(wo.id, 'in-production')}
                                className="px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                              >
                                Release to Production
                              </button>
                            )}
                            {wo.status === 'in-production' && (
                              <button
                                onClick={() => updateStatus(wo.id, 'complete')}
                                className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                              >
                                Mark Complete
                              </button>
                            )}
                            {wo.status === 'draft' && (
                              <button
                                onClick={() => deleteWorkOrder(wo.id)}
                                className="px-3 py-1.5 text-xs font-semibold text-red-500 border border-red-200 dark:border-red-900/40 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default WorkOrders;
