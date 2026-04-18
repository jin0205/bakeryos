import React, { useState, useEffect } from 'react';
import { WorkOrder, WorkOrderStatus } from '../types';
import { storageService } from '../services/storageService';

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

const WOCard: React.FC<{ wo: WorkOrder; onUpdate: (updated: WorkOrder) => void }> = ({ wo, onUpdate }) => {
  const updateStatus = (newStatus: WorkOrderStatus) => {
    const now = new Date().toISOString();
    onUpdate({
      ...wo,
      status: newStatus,
      startedAt: newStatus === 'in-production' ? now : wo.startedAt,
      completedAt: newStatus === 'complete' ? now : wo.completedAt,
    });
  };

  return (
    <div className="bg-white dark:bg-stone-900/60 rounded-lg border border-stone-200 dark:border-stone-800 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-mono font-bold text-stone-500 dark:text-stone-400">{wo.id}</p>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 mt-0.5">
            {wo.lineItems.map(li => li.recipeName).join(', ')}
          </p>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${STATUS_BADGE[wo.status]}`}>
          {STATUS_LABEL[wo.status]}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-500 dark:text-stone-400">{wo.totalDoughKg.toFixed(2)} kg dough</p>
        <div className="flex gap-2">
          {wo.status === 'scheduled' && (
            <button
              onClick={() => updateStatus('in-production')}
              className="px-2.5 py-1 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              Release to Prod
            </button>
          )}
          {wo.status === 'in-production' && (
            <button
              onClick={() => updateStatus('complete')}
              className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Mark Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{ title: string; count: number }> = ({ title, count }) => (
  <div className="flex items-center gap-3 mb-3">
    <h2 className="text-sm font-bold text-stone-700 dark:text-stone-300">{title}</h2>
    <span className="text-xs bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400 px-2 py-0.5 rounded-full font-semibold">{count}</span>
    <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
  </div>
);

const ProductionSchedule: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  useEffect(() => {
    const stored = storageService.load<WorkOrder>('bakeryos_work_orders');
    setWorkOrders(stored);
  }, []);

  const handleUpdate = (updated: WorkOrder) => {
    const newList = workOrders.map(wo => wo.id === updated.id ? updated : wo);
    setWorkOrders(newList);
    storageService.save('bakeryos_work_orders', newList);
  };

  const today = new Date().toISOString().split('T')[0];
  const endOfWeek = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const groups = {
    inProduction: workOrders.filter(w => w.status === 'in-production'),
    today:        workOrders.filter(w => w.status === 'scheduled' && w.scheduledDate === today),
    thisWeek:     workOrders.filter(w => w.status === 'scheduled' && w.scheduledDate! > today && w.scheduledDate! <= endOfWeek),
    upcoming:     workOrders.filter(w => w.status === 'scheduled' && w.scheduledDate! > endOfWeek),
    unscheduled:  workOrders.filter(w => w.status === 'draft'),
  };

  const hasAny = Object.values(groups).some(g => g.length > 0);

  return (
    <div className="animate-fade-in">
      {/* Module Header */}
      <div className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">PRODUCTION / Schedule</p>
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">Production Schedule</h1>
      </div>

      {!hasAny ? (
        <div className="bg-white dark:bg-stone-900/60 rounded-lg border border-stone-200 dark:border-stone-800 p-12 text-center shadow-sm">
          <p className="text-sm text-stone-400">No active or scheduled work orders.</p>
          <p className="text-xs text-stone-400 mt-1">Create work orders from the Batch Builder.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.inProduction.length > 0 && (
            <div>
              <SectionHeader title="In Production" count={groups.inProduction.length} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.inProduction.map(wo => <WOCard key={wo.id} wo={wo} onUpdate={handleUpdate} />)}
              </div>
            </div>
          )}
          {groups.today.length > 0 && (
            <div>
              <SectionHeader title="Today" count={groups.today.length} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.today.map(wo => <WOCard key={wo.id} wo={wo} onUpdate={handleUpdate} />)}
              </div>
            </div>
          )}
          {groups.thisWeek.length > 0 && (
            <div>
              <SectionHeader title="This Week" count={groups.thisWeek.length} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.thisWeek.map(wo => <WOCard key={wo.id} wo={wo} onUpdate={handleUpdate} />)}
              </div>
            </div>
          )}
          {groups.upcoming.length > 0 && (
            <div>
              <SectionHeader title="Upcoming" count={groups.upcoming.length} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.upcoming.map(wo => <WOCard key={wo.id} wo={wo} onUpdate={handleUpdate} />)}
              </div>
            </div>
          )}
          {groups.unscheduled.length > 0 && (
            <div>
              <SectionHeader title="Unscheduled (Draft)" count={groups.unscheduled.length} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.unscheduled.map(wo => <WOCard key={wo.id} wo={wo} onUpdate={handleUpdate} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductionSchedule;
