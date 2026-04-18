## SalesTracker Component — Design Response

### TypeScript Types Used

All types come from the existing `types.ts` — no new types are needed:

```typescript
import { WorkOrder, WorkOrderLineItem } from '../types';
```

Key fields consumed:
- `WorkOrder.status: WorkOrderStatus` — filtered to `'complete'`
- `WorkOrder.completedAt: string | null` — ISO timestamp used to scope to the current week
- `WorkOrder.estimatedCost: number` — summed per recipe
- `WorkOrder.lineItems: WorkOrderLineItem[]` — each item has `recipeName: string` used as the grouping key

---

### localStorage Key

```
bakeryos_work_orders
```

Confirmed at lines 26 and 37 of `components/WorkOrders.tsx`. `SalesTracker` reads this key read-only and never writes back.

---

### Week Scoping Logic

"This week" = Monday 00:00 through Sunday 23:59 local time:

```typescript
function getWeekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const diffToMonday = now.getDay() === 0 ? -6 : 1 - now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}
```

---

### Aggregation Logic

`estimatedCost` is a single total on `WorkOrder`, not split per line item. The best available approximation is to pro-rate by unit count share across `lineItems`:

```typescript
const revenueByRecipe = useMemo(() => {
  const { start, end } = getWeekBounds();
  const completed = workOrders.filter(wo => {
    if (wo.status !== 'complete' || !wo.completedAt) return false;
    const d = new Date(wo.completedAt);
    return d >= start && d <= end;
  });

  const map: Record<string, number> = {};
  completed.forEach(wo => {
    const totalUnits = wo.lineItems.reduce((s, li) => s + li.count, 0);
    wo.lineItems.forEach(li => {
      const share = li.count / totalUnits;
      map[li.recipeName] = (map[li.recipeName] ?? 0) + wo.estimatedCost * share;
    });
  });

  return Object.entries(map)
    .map(([recipeName, revenue]) => ({ recipeName, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
}, [workOrders]);
```

---

### Component Structure

```typescript
const SalesTracker: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('bakeryos_work_orders');
    if (stored) {
      try { setWorkOrders(JSON.parse(stored)); }
      catch (e) { console.error('Failed to load work orders', e); }
    }
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Module header */}
      {/* KPI strip: week total, recipes produced, WO count */}
      {/* Table: recipe | est. cost | % of week | tfoot total row */}
      {/* Empty state when no completed WOs this week */}
    </div>
  );
};
```

---

### Integration Steps

1. Create `components/SalesTracker.tsx`.
2. Add `'sales'` to the `Tab` union in `Sidebar.tsx`, `mainNavItems`, and `App.tsx`'s tab switcher.
3. No new localStorage keys, no new types, no backend changes required.
